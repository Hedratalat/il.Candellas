import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import { Link } from "react-router-dom";
import {
  Loader2,
  PackageOpen,
  ArrowRight,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  LogIn,
  Phone,
  MessageCircle,
} from "lucide-react";

const arrowVariants = {
  initial: { x: 0 },
  hover: { x: 5 },
};

const STATUSES = {
  pending: {
    label: "Pending",
    icon: Clock,
    badge: "bg-amber-100 text-amber-700 border-amber-300",
  },
  preparing: {
    label: "Preparing",
    icon: Package,
    badge: "bg-blue-100 text-blue-700 border-blue-300",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle2,
    badge: "bg-green-100 text-green-700 border-green-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    badge: "bg-red-100 text-red-700 border-red-300",
  },
};

const STEPS = ["pending", "preparing", "delivered"];

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

function StatusBadge({ status }) {
  const s = STATUSES[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full border whitespace-nowrap ${s.badge}`}
    >
      <Icon size={14} />
      {s.label}
    </span>
  );
}

function Tracker({ status }) {
  if (status === "cancelled") {
    return (
      <p className="text-sm text-red-600 font-medium flex items-center gap-2">
        <XCircle size={16} /> This order was cancelled
      </p>
    );
  }
  const current = STEPS.indexOf(status);
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const Icon = STATUSES[step].icon;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                  done ? "bg-sage text-white" : "bg-beige text-warmGray"
                }`}
              >
                <Icon size={16} />
              </div>
              <span
                className={`text-[11px] sm:text-xs font-medium ${
                  done ? "text-brown" : "text-warmGray"
                }`}
              >
                {STATUSES[step].label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 mb-5 rounded-full ${
                  i < current ? "bg-sage" : "bg-beige"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeOrders = null;

    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }
      setUser(u);
      setAuthReady(true);

      if (u) {
        setLoading(true);
        const q = query(collection(db, "orders"), where("userId", "==", u.uid));
        unsubscribeOrders = onSnapshot(
          q,
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort(
              (a, b) =>
                (b.timestamp?.toMillis?.() || 0) -
                (a.timestamp?.toMillis?.() || 0),
            );
            setOrders(list);
            setLoading(false);
          },
          (err) => {
            console.error("Error loading orders:", err);
            setLoading(false);
          },
        );
      } else {
        setOrders([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="mt-20 px-6 md:px-12 font-poppins text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-playfair font-bold text-brown text-center mb-10"
        >
          My Orders
        </motion.h2>

        {/* ⏳ Loading */}
        {!authReady || loading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="animate-spin text-sage" size={60} />
          </div>
        ) : !user ? (
          /* 🔒 Not logged in */
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <LogIn size={90} className="text-sage mb-4" />
            <p className="text-xl font-medium text-brown">
              Please login to see your orders.
            </p>
            <Link
              to="/login"
              className="mt-6 bg-terracotta text-white px-8 py-3 rounded-full hover:bg-terracottaDark transition"
            >
              Login
            </Link>
          </div>
        ) : orders.length === 0 ? (
          /* 📭 Empty */
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <PackageOpen size={100} className="text-sage mb-4" />
            </motion.div>
            <p className="text-xl font-medium text-brown">
              You haven’t placed any orders yet.
            </p>

            <Link to="/products">
              <motion.button
                whileHover="hover"
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="group mt-6 bg-white text-terracotta font-poppins px-8 py-3
    rounded-full shadow-lg flex items-center justify-center gap-3 mx-auto
    hover:bg-terracotta hover:text-white transition-all duration-300"
              >
                <span className="text-lg font-semibold tracking-wide">
                  Browse Products
                </span>
                <motion.span
                  variants={arrowVariants}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ArrowRight size={22} />
                </motion.span>
              </motion.button>
            </Link>
          </div>
        ) : (
          /* 📦 Orders */
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {orders.map((order, index) => {
              const status = normalizeStatus(order.status);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 8) * 0.05 }}
                  className="bg-white rounded-2xl shadow-md border border-beige p-5 sm:p-6 flex flex-col gap-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs sm:text-sm text-warmGray break-all">
                        {order.orderNumber || order.id}
                      </p>
                      <p className="text-xs text-warmGray mt-1">
                        {formatDate(order.timestamp)}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <Tracker status={status} />

                  <div className="flex flex-col gap-3 border-t border-beige pt-4">
                    {(order.items || []).map((item, idx) => {
                      const qty = Number(item.quantity) || 1;
                      const unit = Number(item.unitPrice ?? item.price) || 0;
                      return (
                        <div key={idx} className="flex gap-3 items-start">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg border border-beige shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-sm">
                            <p className="font-semibold text-brown">
                              {item.name} × {qty}
                            </p>
                            {item.color && (
                              <p className="text-warmGray">
                                Color: {item.color.name}
                              </p>
                            )}
                            {item.bundle && item.bundle.extraCount > 0 && (
                              <p className="text-warmGray">
                                +{item.bundle.extraCount} extra{" "}
                                {item.bundle.itemName}
                              </p>
                            )}
                            {item.customize && (
                              <p className="text-warmGray">
                                Customize: {item.customize}
                              </p>
                            )}
                          </div>
                          <p className="text-base font-bold text-sage whitespace-nowrap pl-2">
                            {Number((unit * qty).toFixed(3))} BHD
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-beige pt-4 flex flex-col gap-2 text-brown">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Phone size={14} className="text-sage" /> Phone
                      </span>
                      <span className="font-semibold" dir="ltr">
                        {order.phone || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <MessageCircle size={14} className="text-green-600" />{" "}
                        WhatsApp
                      </span>
                      <span className="font-semibold" dir="ltr">
                        {order.whatsapp || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Payment</span>
                      <span className="font-semibold">
                        {order.paymentMethod || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="font-semibold">
                        {order.subtotal ?? 0} BHD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping ({order.city || "-"})</span>
                      <span className="font-semibold">
                        {order.shippingFee ?? 0} BHD
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold text-sage">
                        {order.totalPrice} BHD
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
