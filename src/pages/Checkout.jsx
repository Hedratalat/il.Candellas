import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import Navbar from "../Navbar/Navbar";
import {
  Loader2,
  CheckCircle2,
  ShoppingCart,
  Banknote,
  Smartphone,
  Upload,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
  Phone,
} from "lucide-react";
import { z } from "zod";
import Footer from "../Footer/Footer";

const round3 = (n) => Number(n.toFixed(3));

const BENEFITPAY_URL =
  "https://play.google.com/store/apps/details?id=mobi.foo.benefit";
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5MB

const REQUIRED_MESSAGES = {
  name: "Please fill in your name",
  zoneId: "Please select your city",
  area: "Please fill in your area",
  address: "Please fill in your address",
  phone: "Please fill in your phone number",
  whatsapp: "Please fill in your WhatsApp number",
};

const bahrainPhoneRegex = /^(?:\+973|00973|973)?[36]\d{7}$/;

const cleanPhone = (value) => value.replace(/[\s-]/g, "");

const bahrainPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => bahrainPhoneRegex.test(cleanPhone(value)),
    "Enter a valid Bahrain phone number",
  )
  .transform((value) => "+973" + cleanPhone(value).slice(-8));

//zod
const checkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, "Full name must be at least 5 characters")
    .max(35, "Full name must be less than 35 characters")
    .regex(/^[A-Za-z\s]+$/, "Full name must contain only letters"),
  zoneId: z.string().min(1, "Please select your city"),
  area: z
    .string()
    .trim()
    .min(3, "Area name must be valid")
    .regex(/^[A-Za-z0-9\s]+$/, "Area must contain letters or numbers only"),
  address: z
    .string()
    .trim()
    .min(5, "Address must be valid")
    .max(100, "Address is too long"),
  floor: z.string().optional(),
  phone: bahrainPhoneSchema,
  whatsapp: bahrainPhoneSchema.refine(() => true),
  paymentMethod: z.string().nonempty(),
});

// 🔢 رقم الطلب
const generateOrderNumber = () => {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `ORD-${date}-${rand}`;
};

// ☁️ رفع صورة التحويل على Cloudinary
const uploadReceipt = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${
      import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    }/image/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) throw new Error("Receipt upload failed");
  const data = await res.json();
  return data.secure_url;
};

export default function Checkout() {
  const location = useLocation();
  const { cartItems } = location.state || {};
  const items = Array.isArray(cartItems) ? cartItems : [];

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    zoneId: "",
    area: "",
    address: "",
    floor: "",
    phone: "",
    whatsapp: "",
    paymentMethod: "Cash on Delivery",
  });

  // 🚚 جلب المدن ورسوم الشحن من Shipping
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "ShippingZones"),
      (snap) => {
        setZones(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      },
      (err) => console.error("Error loading shipping zones:", err),
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // تنضيف الـ preview
  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const { [field]: _removed, general: _g, ...rest } = prev;
      return rest;
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    clearError(e.target.name);
  };

  const handlePaymentChange = (method) => {
    setFormData((prev) => ({ ...prev, paymentMethod: method }));
    clearError("receipt");
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, receipt: "Please upload an image" }));
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      setErrors((prev) => ({
        ...prev,
        receipt: "Image must be less than 5MB",
      }));
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    clearError("receipt");
  };

  const handleCopyOrderNumber = async () => {
    if (!placedOrder) return;
    try {
      await navigator.clipboard.writeText(placedOrder.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const isBenefitPay = formData.paymentMethod === "BenefitPay";

  const selectedZone = zones.find((z) => z.id === formData.zoneId);
  const shippingFee = selectedZone ? Number(selectedZone.fee) || 0 : 0;

  const subtotal = round3(
    items.reduce(
      (sum, i) =>
        sum + (Number(i.unitPrice ?? i.price) || 0) * (Number(i.quantity) || 1),
      0,
    ),
  );
  const total = round3(subtotal + shippingFee);
  const maxDays = items.reduce(
    (max, i) =>
      typeof i.productionDays === "number" && i.productionDays > max
        ? i.productionDays
        : max,
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanData = {
      ...formData,
    };

    const newErrors = {};

    // 1) الخانات الفاضية الأول → رسالة بسيطة
    Object.entries(REQUIRED_MESSAGES).forEach(([field, message]) => {
      if (!String(cleanData[field] || "").trim()) {
        newErrors[field] = message;
      }
    });

    // 2) صورة التحويل لو BenefitPay
    if (isBenefitPay && !receiptFile) {
      newErrors.receipt = "Please upload your payment screenshot";
    }

    // 3) التفاصيل (Zod) للخانات اللي مش فاضية بس
    const validation = checkoutSchema.safeParse(cleanData);
    if (!validation.success) {
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field && !newErrors[field]) newErrors[field] = issue.message;
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!selectedZone) {
      setErrors({ zoneId: "Please select your city" });
      return;
    }

    setErrors({});

    const user = auth.currentUser;
    if (!user) {
      setErrors({ general: "Please login to complete your order" });
      return;
    }

    setLoading(true);

    try {
      // رفع صورة التحويل (BenefitPay فقط)
      let paymentReceiptUrl = "";
      if (isBenefitPay && receiptFile) {
        paymentReceiptUrl = await uploadReceipt(receiptFile);
      }

      const orderItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        imageUrl: i.imageUrl,
        category: i.category || "",
        price: Number(i.price) || 0,
        unitPrice: Number(i.unitPrice ?? i.price) || 0,
        quantity: Number(i.quantity) || 1,
        color: i.color || null,
        bundle: i.bundle || null,
        customize: i.customize || "",
        productionDays:
          typeof i.productionDays === "number" ? i.productionDays : null,
      }));

      const orderNumber = generateOrderNumber();

      // حفظ الطلب في orders
      await addDoc(collection(db, "orders"), {
        orderNumber,
        userId: user.uid,
        name: cleanData.name.trim(),
        city: selectedZone.label,
        zoneId: selectedZone.id,
        area: cleanData.area.trim(),
        address: cleanData.address.trim(),
        floor: cleanData.floor || "",
        phone: validation.data.phone,
        whatsapp: validation.data.whatsapp,
        paymentMethod: cleanData.paymentMethod,
        paymentReceiptUrl,
        items: orderItems,
        subtotal,
        shippingFee,
        totalPrice: total,
        maxProductionDays: maxDays,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      // مسح كل العناصر من cart بعد الطلب
      const cartRef = collection(db, "users", user.uid, "cart");
      const cartSnapshot = await getDocs(cartRef);
      for (const docItem of cartSnapshot.docs) {
        await deleteDoc(docItem.ref);
      }

      // بيانات صفحة النجاح
      setPlacedOrder({
        orderNumber,
        name: cleanData.name.trim(),
        phone: validation.data.phone,
        whatsapp: validation.data.whatsapp,
        city: selectedZone.label,
        paymentMethod: cleanData.paymentMethod,
        items: orderItems,
        subtotal,
        shippingFee,
        total,
        maxDays,
      });

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error saving order:", error);
      setErrors({ general: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  // لو مفيش منتجات (دخل الصفحة مباشرة) ومفيش طلب اتأكد
  if (items.length === 0 && !success) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 font-poppins">
          <ShoppingCart size={90} className="text-sage mb-4" />
          <p className="text-lg sm:text-xl text-brown font-medium mb-6">
            Your cart is empty
          </p>
          <Link
            to="/products"
            className="bg-terracotta text-white px-8 py-3 rounded-full hover:bg-terracottaDark transition"
          >
            Browse Products
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen px-4 sm:px-6 md:px-10 lg:px-20 py-10 font-poppins">
        {errors.general && (
          <p className="text-red-500 text-center mb-4">{errors.general}</p>
        )}

        {/* 🎉 Success */}
        {success && placedOrder && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-beige"
          >
            {/* Header */}
            <div className="bg-gradient-to-b from-sage/20 to-white px-6 pt-10 pb-6 text-center">
              <div className="relative mx-auto w-24 h-24 mb-5">
                <motion.span
                  className="absolute inset-0 rounded-full bg-sage/30"
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="relative w-24 h-24 rounded-full bg-sage flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 size={52} className="text-white" />
                </motion.div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-playfair font-bold text-brown mb-2">
                Order Placed Successfully
              </h2>
              <p className="text-warmGray text-sm sm:text-base">
                Thank you,{" "}
                <span className="font-semibold text-brown">
                  {placedOrder.name}
                </span>
                . Your order is <strong>pending</strong> confirmation.
              </p>
            </div>

            <div className="px-6 sm:px-10 pb-10 flex flex-col gap-6">
              {/* Order number */}
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-warmGray mb-2">
                  Order Number
                </p>
                <div className="inline-flex items-center gap-3 bg-sage/10 border border-sage/40 rounded-xl px-4 py-3 max-w-full">
                  <span className="font-mono font-bold text-brown text-base sm:text-lg break-all">
                    {placedOrder.orderNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyOrderNumber}
                    aria-label="Copy order number"
                    className="p-2 rounded-full bg-sage text-white hover:bg-sageDark transition shrink-0"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-warmGray mt-2">
                  Keep this number for any inquiry about your order.
                </p>
              </div>

              {/* WhatsApp notice */}
              <div className="flex items-start gap-3 bg-green-50 border border-green-300 rounded-xl p-4">
                <MessageCircle size={26} className="text-green-600 shrink-0" />
                <p className="text-sm sm:text-base text-green-900">
                  We will contact you on WhatsApp at{" "}
                  <strong dir="ltr">{placedOrder.whatsapp}</strong> to confirm
                  your order.
                </p>
              </div>

              {/* Contact details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-3 border border-beige rounded-xl p-3">
                  <Phone size={20} className="text-sage shrink-0" />
                  <div>
                    <p className="text-warmGray text-xs">Phone</p>
                    <p className="font-semibold text-brown" dir="ltr">
                      {placedOrder.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border border-beige rounded-xl p-3">
                  <MessageCircle
                    size={20}
                    className="text-green-600 shrink-0"
                  />
                  <div>
                    <p className="text-warmGray text-xs">WhatsApp</p>
                    <p className="font-semibold text-brown" dir="ltr">
                      {placedOrder.whatsapp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-semibold text-brown mb-3">
                  Your Order
                </h3>
                <div className="flex flex-col gap-3">
                  {placedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-start border border-beige rounded-xl p-3"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-semibold text-brown">
                          {item.name} × {item.quantity}
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
                      <p className="text-base sm:text-lg font-bold text-sage whitespace-nowrap pl-2">
                        {round3(item.unitPrice * item.quantity)} BHD
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm text-brown flex flex-col gap-1 border-t border-beige pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{placedOrder.subtotal} BHD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping ({placedOrder.city})</span>
                    <span>{placedOrder.shippingFee} BHD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment</span>
                    <span>{placedOrder.paymentMethod}</span>
                  </div>
                  {placedOrder.maxDays > 0 && (
                    <div className="flex justify-between text-warmGray">
                      <span>Production time</span>
                      <span>
                        Up to {placedOrder.maxDays}{" "}
                        {placedOrder.maxDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-brown mt-2">
                    <span>Total</span>
                    <span className="text-sage">{placedOrder.total} BHD</span>
                  </div>
                </div>
              </div>

              <Link
                to="/products"
                className="bg-sage text-white px-8 py-3 rounded-full font-medium text-center hover:bg-sageDark transition"
              >
                Continue Shopping
              </Link>
            </div>
          </motion.div>
        )}

        {!success && (
          <>
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl font-playfair font-bold text-brown text-center mb-10"
            >
              Checkout
            </motion.h2>

            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-10">
              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-5"
              >
                <InputField
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  error={errors.name}
                />

                {/* City (من Shipping Zones) */}
                <div>
                  <label className="block text-brown font-medium mb-1">
                    City
                  </label>
                  <select
                    name="zoneId"
                    value={formData.zoneId}
                    onChange={handleChange}
                    className={`w-full border rounded-lg p-3 bg-white focus:outline-none focus:ring-2 ${
                      errors.zoneId
                        ? "border-destructive focus:ring-destructive"
                        : "border-beige focus:ring-sage"
                    }`}
                  >
                    <option value="">Select your city</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label} — {z.fee} BHD
                      </option>
                    ))}
                  </select>
                  {errors.zoneId && (
                    <p className="text-red-500 text-sm mt-1">{errors.zoneId}</p>
                  )}
                </div>

                <InputField
                  label="Area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Enter your area"
                  error={errors.area}
                />
                <InputField
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  error={errors.address}
                />
                <InputField
                  label="Floor (Optional)"
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  placeholder="Enter your floor"
                />
                <InputField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  error={errors.phone}
                />
                <InputField
                  label="WhatsApp Number"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="Enter your WhatsApp number"
                  error={errors.whatsapp}
                />

                {/* 💳 Payment Method */}
                <div>
                  <label className="block text-brown font-medium mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PaymentOption
                      active={!isBenefitPay}
                      onClick={() => handlePaymentChange("Cash on Delivery")}
                      icon={<Banknote size={22} />}
                      title="Cash on Delivery"
                    />
                    <PaymentOption
                      active={isBenefitPay}
                      onClick={() => handlePaymentChange("BenefitPay")}
                      icon={<Smartphone size={22} />}
                      title="BenefitPay"
                    />
                  </div>

                  {isBenefitPay && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 border border-beige rounded-xl p-4 bg-gray-50"
                    >
                      <p className="text-sm text-brown mb-3">
                        Pay via{" "}
                        <a
                          href={BENEFITPAY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-sage underline"
                        >
                          BenefitPay
                          <ExternalLink size={14} />
                        </a>{" "}
                        then upload a screenshot of the transfer.
                      </p>

                      <label
                        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition hover:bg-white ${
                          errors.receipt ? "border-red-400" : "border-sage"
                        }`}
                      >
                        {receiptPreview ? (
                          <img
                            src={receiptPreview}
                            alt="Payment receipt"
                            className="max-h-56 rounded-lg object-contain"
                          />
                        ) : (
                          <>
                            <Upload size={28} className="text-sage" />
                            <span className="text-sm text-brown font-medium">
                              Upload payment screenshot
                            </span>
                          </>
                        )}
                        {receiptPreview && (
                          <span className="text-xs text-warmGray">
                            Tap to change
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                      </label>

                      {errors.receipt && (
                        <p className="text-red-500 text-sm mt-2">
                          {errors.receipt}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* ملخص الطلب */}
                <div className="border-t border-beige pt-5">
                  <h3 className="text-lg font-semibold text-brown mb-3">
                    Order Summary
                  </h3>
                  <div className="flex flex-col gap-3">
                    {items.map((item, idx) => {
                      const qty = Number(item.quantity) || 1;
                      const unit = Number(item.unitPrice ?? item.price) || 0;
                      return (
                        <div key={idx} className="flex gap-3 items-start">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                          <div className="flex-1 text-sm">
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
                          <p className="text-sm font-semibold text-sage whitespace-nowrap">
                            {round3(unit * qty)} BHD
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-lg sm:text-lg font-bold text-brown flex flex-col gap-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{subtotal} BHD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>
                        {selectedZone ? `${shippingFee} BHD` : "Select a city"}
                      </span>
                    </div>
                    {maxDays > 0 && (
                      <div className="flex justify-between text-sm font-normal text-warmGray">
                        <span>Production time</span>
                        <span>
                          Up to {maxDays} {maxDays === 1 ? "day" : "days"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <p className="text-2xl  font-bold text-brown">
                    Total: <span className="text-sage">{total} BHD</span>
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading}
                  className="bg-sage text-white px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Confirm Order"
                  )}
                </motion.button>
              </form>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

function PaymentOption({ active, onClick, icon, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 border rounded-xl p-4 text-left transition ${
        active
          ? "border-sage bg-sage/10 text-brown ring-2 ring-sage"
          : "border-beige bg-white text-brown hover:bg-gray-50"
      }`}
    >
      <span className={active ? "text-sage" : "text-warmGray"}>{icon}</span>
      <span className="font-medium">{title}</span>
    </button>
  );
}

function InputField({ label, name, value, onChange, placeholder, error }) {
  return (
    <div>
      <label className="block text-brown font-medium mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 ${
          error
            ? "border-destructive focus:ring-destructive"
            : "border-beige focus:ring-sage"
        }`}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
