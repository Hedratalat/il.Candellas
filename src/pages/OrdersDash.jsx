import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  X,
  Trash2,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
} from "lucide-react";

const STATUSES = {
  pending: {
    label: "Pending",
    icon: Clock,
    badge: "bg-amber-100 text-amber-700 border-amber-300",
    active: "bg-amber-500 text-white border-amber-500",
  },
  preparing: {
    label: "Preparing",
    icon: Package,
    badge: "bg-blue-100 text-blue-700 border-blue-300",
    active: "bg-blue-600 text-white border-blue-600",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    badge: "bg-green-100 text-green-700 border-green-300",
    active: "bg-green-600 text-white border-green-600",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    badge: "bg-red-100 text-red-700 border-red-300",
    active: "bg-red-600 text-white border-red-600",
  },
};

const STATUS_KEYS = Object.keys(STATUSES);

// الطلبات القديمة اللي كانت completed
const normalizeStatus = (s) => {
  if (s === "completed") return "delivered";
  return STATUSES[s] ? s : "pending";
};

const formatDate = (ts) => {
  try {
    return ts?.toDate().toLocaleString() || "-";
  } catch {
    return "-";
  }
};

const waLink = (phone) =>
  `https://wa.me/${String(phone || "").replace(/\D/g, "")}`;

function StatusBadge({ status }) {
  const s = STATUSES[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${s.badge}`}
    >
      <Icon size={13} />
      {s.label}
    </span>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1">
      <span className="text-warmGray">{label}</span>
      <span className="text-brown font-medium text-right break-words">
        {children}
      </span>
    </div>
  );
}

export default function OrdersDash() {
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDelete, setSelectedDelete] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort(
        (a, b) =>
          (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0),
      );
      setOrders(list);
    });
    return () => unsubscribe();
  }, []);

  // الطلب المفتوح بيتحدث لحظيًا
  const selectedOrder = orders.find((o) => o.id === selectedId) || null;

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUS_KEYS.forEach((k) => (c[k] = 0));
    orders.forEach((o) => {
      c[normalizeStatus(o.status)]++;
    });
    return c;
  }, [orders]);

  const cities = useMemo(
    () =>
      [...new Set(orders.map((o) => o.city).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && normalizeStatus(o.status) !== filter)
        return false;
      if (cityFilter !== "all" && o.city !== cityFilter) return false;
      if (!q) return true;
      return [o.orderNumber, o.name, o.phone, o.whatsapp, o.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [orders, filter, cityFilter, search]);

  const handleStatusChange = async (id, status) => {
    try {
      setUpdatingId(id);
      await updateDoc(doc(db, "orders", id), { status });
      toast.success(`Order marked as ${STATUSES[status].label}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "orders", id));
      toast.success("Order deleted successfully!");
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete order.");
    } finally {
      setSelectedDelete(null);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <section className="p-4 sm:p-6 md:p-12 min-h-screen font-poppins">
      <h2 className="text-3xl sm:text-4xl font-playfair text-brown mb-8 text-center font-bold">
        Orders Management
      </h2>

      {/* 🔎 Search */}
      <div className="max-w-xl mx-auto mb-6 relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-warmGray"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number, name or phone"
          className="w-full bg-white border border-beige rounded-full py-3 pl-11 pr-4 text-brown placeholder:text-warmGray focus:outline-none focus:ring-2 focus:ring-sage"
        />
      </div>

      {/* 🏷 Filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {["all", ...STATUS_KEYS].map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                active
                  ? "bg-terracotta text-white border-terracotta"
                  : "bg-white text-brown border-beige hover:bg-beige"
              }`}
            >
              {key === "all" ? "All" : STATUSES[key].label}{" "}
              <span className={active ? "text-white/80" : "text-warmGray"}>
                ({counts[key]})
              </span>
            </button>
          );
        })}
      </div>
      {/* 📍 City filter */}
      <div className="max-w-xs mx-auto mb-8">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="w-full bg-white border border-beige rounded-full py-3 px-4 text-brown focus:outline-none focus:ring-2 focus:ring-sage"
        >
          <option value="all">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 📦 Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-6xl mx-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-warmGray col-span-full py-10">
            No orders found.
          </p>
        ) : (
          filtered.map((order, index) => {
            const status = normalizeStatus(order.status);
            const itemsCount = (order.items || []).reduce(
              (sum, i) => sum + (Number(i.quantity) || 1),
              0,
            );
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-md p-5 border border-beige hover:shadow-lg transition flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-warmGray break-all">
                      {order.orderNumber || order.id}
                    </p>
                    <h3 className="text-xl font-semibold text-brown font-playfair truncate">
                      {order.name}
                    </h3>
                    <p className="text-xs text-warmGray mt-1">
                      {formatDate(order.timestamp)}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="text-sm text-warmGray">
                    <p>
                      {itemsCount} {itemsCount === 1 ? "item" : "items"} ·{" "}
                      {order.city || "-"}
                    </p>
                    <p>{order.paymentMethod || "-"}</p>
                  </div>
                  <p className="text-2xl font-bold text-terracotta whitespace-nowrap">
                    {order.totalPrice} BHD
                  </p>
                </div>

                {/* تغيير الحالة */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_KEYS.map((key) => {
                    const isActive = status === key;
                    return (
                      <button
                        key={key}
                        disabled={isActive || updatingId === order.id}
                        onClick={() => handleStatusChange(order.id, key)}
                        className={`text-xs font-semibold py-2 rounded-lg border transition disabled:cursor-default ${
                          isActive
                            ? STATUSES[key].active
                            : "bg-white text-brown border-beige hover:bg-beige"
                        }`}
                      >
                        {STATUSES[key].label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedId(order.id)}
                    className="flex-1 bg-terracotta text-white hover:bg-terracottaDark py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                  <button
                    onClick={() => setSelectedDelete(order.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
                    title="Delete order"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🔍 Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-warmWhite rounded-3xl p-5 sm:p-8 max-w-3xl w-full shadow-xl border border-beige overflow-y-auto max-h-[92vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-4 right-4 bg-beige text-terracotta hover:bg-terracotta hover:text-white w-9 h-9 flex items-center justify-center rounded-full transition"
              >
                <X size={18} />
              </button>

              <h3 className="text-2xl sm:text-3xl font-playfair text-brown mb-1 text-center font-bold">
                Order Details
              </h3>

              {/* رقم الطلب */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="font-mono text-sm text-warmGray break-all">
                  {selectedOrder.orderNumber || selectedOrder.id}
                </span>
                <button
                  onClick={() =>
                    copyText(selectedOrder.orderNumber || selectedOrder.id)
                  }
                  className="p-1.5 rounded-full bg-sage text-white hover:bg-sageDark transition shrink-0"
                >
                  <Copy size={13} />
                </button>
              </div>

              {/* الحالة */}
              <div className="bg-white border border-beige rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-brown">Order Status</p>
                  <StatusBadge status={normalizeStatus(selectedOrder.status)} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_KEYS.map((key) => {
                    const isActive =
                      normalizeStatus(selectedOrder.status) === key;
                    return (
                      <button
                        key={key}
                        disabled={isActive || updatingId === selectedOrder.id}
                        onClick={() =>
                          handleStatusChange(selectedOrder.id, key)
                        }
                        className={`text-sm font-semibold py-2 rounded-lg border transition disabled:cursor-default ${
                          isActive
                            ? STATUSES[key].active
                            : "bg-white text-brown border-beige hover:bg-beige"
                        }`}
                      >
                        {STATUSES[key].label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-warmGray mt-3 flex items-center gap-1">
                  <Clock size={12} /> {formatDate(selectedOrder.timestamp)}
                </p>
              </div>

              {/* العميل */}
              <div className="bg-white border border-beige rounded-2xl p-4 mb-4">
                <p className="font-semibold text-brown mb-2">Customer</p>
                <InfoRow label="Name">{selectedOrder.name}</InfoRow>
                <InfoRow label="Phone">
                  <span dir="ltr">{selectedOrder.phone || "-"}</span>
                </InfoRow>
                <InfoRow label="WhatsApp">
                  <span dir="ltr">{selectedOrder.whatsapp || "-"}</span>
                </InfoRow>

                <div className="flex gap-2 mt-3">
                  {selectedOrder.phone && (
                    <a
                      href={`tel:${selectedOrder.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-sage text-white hover:bg-sageDark py-2 rounded-full text-sm font-medium transition"
                    >
                      <Phone size={16} /> Call
                    </a>
                  )}
                  {selectedOrder.whatsapp && (
                    <a
                      href={waLink(selectedOrder.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 py-2 rounded-full text-sm font-medium transition"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* العنوان */}
              <div className="bg-white border border-beige rounded-2xl p-4 mb-4">
                <p className="font-semibold text-brown mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-sage" /> Delivery Address
                </p>
                <InfoRow label="City">{selectedOrder.city || "-"}</InfoRow>
                <InfoRow label="Area">{selectedOrder.area || "-"}</InfoRow>
                <InfoRow label="Address">
                  {selectedOrder.address || "-"}
                </InfoRow>
                {selectedOrder.floor && (
                  <InfoRow label="Floor">{selectedOrder.floor}</InfoRow>
                )}
              </div>

              {/* المنتجات */}
              <p className="font-semibold text-brown mb-2 flex items-center gap-2">
                <Truck size={16} className="text-sage" /> Items
              </p>
              <div className="space-y-3 mb-4">
                {(selectedOrder.items || []).map((item, idx) => {
                  const qty = Number(item.quantity) || 1;
                  const unit = Number(item.unitPrice ?? item.price) || 0;
                  return (
                    <div
                      key={idx}
                      className="flex gap-3 border border-beige rounded-xl p-3 bg-white"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg border border-beige shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-sm">
                        <h4 className="font-semibold text-brown text-base">
                          {item.name} × {qty}
                        </h4>
                        {item.category && (
                          <p className="text-warmGray">
                            Category: {item.category}
                          </p>
                        )}
                        {item.color && (
                          <p className="text-brown flex items-center gap-2 mt-1">
                            {item.color.imageUrl && (
                              <img
                                src={item.color.imageUrl}
                                alt={item.color.name}
                                className="w-4 h-4 rounded-full object-cover border border-beige"
                              />
                            )}
                            Color: {item.color.name}
                          </p>
                        )}
                        {item.bundle && item.bundle.extraCount > 0 && (
                          <p className="text-brown">
                            Bundle: +{item.bundle.extraCount} extra{" "}
                            {item.bundle.itemName}
                          </p>
                        )}
                        {item.customize && (
                          <p className="text-brown">
                            Customize: {item.customize}
                          </p>
                        )}
                        {typeof item.productionDays === "number" &&
                          item.productionDays > 0 && (
                            <p className="text-warmGray">
                              Ready in {item.productionDays}{" "}
                              {item.productionDays === 1 ? "day" : "days"}
                            </p>
                          )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-lg font-bold text-terracotta">
                          {(unit * qty).toFixed(3).replace(/\.?0+$/, "")} BHD
                        </p>
                        {qty > 1 && (
                          <p className="text-xs text-warmGray">{unit} each</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* الدفع */}
              <div className="bg-white border border-beige rounded-2xl p-4 mb-4">
                <p className="font-semibold text-brown mb-2">Payment</p>
                <InfoRow label="Method">
                  {selectedOrder.paymentMethod || "-"}
                </InfoRow>
                {selectedOrder.subtotal !== undefined && (
                  <InfoRow label="Subtotal">
                    {selectedOrder.subtotal} BHD
                  </InfoRow>
                )}
                {selectedOrder.shippingFee !== undefined && (
                  <InfoRow label="Shipping">
                    {selectedOrder.shippingFee} BHD
                  </InfoRow>
                )}
                {selectedOrder.maxProductionDays > 0 && (
                  <InfoRow label="Production time">
                    Up to {selectedOrder.maxProductionDays}{" "}
                    {selectedOrder.maxProductionDays === 1 ? "day" : "days"}
                  </InfoRow>
                )}
                <div className="flex justify-between items-center border-t border-beige mt-3 pt-3">
                  <span className="text-lg font-bold text-brown">Total</span>
                  <span className="text-2xl font-bold text-terracotta">
                    {selectedOrder.totalPrice} BHD
                  </span>
                </div>

                {selectedOrder.paymentReceiptUrl && (
                  <div className="mt-4">
                    <p className="text-sm text-warmGray mb-2">
                      Payment screenshot
                    </p>
                    <a
                      href={selectedOrder.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={selectedOrder.paymentReceiptUrl}
                        alt="Payment receipt"
                        className="max-h-72 w-full object-contain rounded-xl border border-beige bg-warmWhite"
                      />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedDelete(selectedOrder.id)}
                  className="px-5 py-3 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="flex-1 bg-terracotta text-white px-6 py-3 rounded-full hover:bg-terracottaDark transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🗑 Delete Confirmation */}
      <AnimatePresence>
        {selectedDelete && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-[60] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-warmWhite rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-beige"
            >
              <h3 className="text-xl font-semibold text-brown font-playfair mb-3">
                Delete Order?
              </h3>
              <p className="text-warmGray mb-6">
                Are you sure you want to delete this order? This action cannot
                be undone.
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleDelete(selectedDelete)}
                  className="bg-red-500 text-white px-5 py-2 rounded-full hover:bg-red-600 transition"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setSelectedDelete(null)}
                  className="bg-sage text-white px-5 py-2 rounded-full hover:bg-sageDark transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
