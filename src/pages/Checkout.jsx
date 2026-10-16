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
import { Loader2, CheckCircle2, ShoppingCart } from "lucide-react";
import { z } from "zod";
import Footer from "../Footer/Footer";

const round3 = (n) => Number(n.toFixed(3));

// ✅ Zod Schema للتحقق من البيانات
const checkoutSchema = z.object({
  name: z
    .string()
    .min(5, "Full name must be at least 5 characters")
    .max(35, "Full name must be less than 50 characters")
    .regex(/^[A-Za-z\s]+$/, "Full name must contain only letters"),
  zoneId: z.string().min(1, "Please select your city"),
  area: z
    .string()
    .min(4, "Area name must be valid")
    .regex(/^[A-Za-z0-9\s]+$/, "Area must contain letters or numbers only"),
  address: z
    .string()
    .min(5, "Address must be valid")
    .max(100, "Address is too long"),
  floor: z.string().optional(),
  phone: z
    .string()
    .regex(/^(\+973|00973)?[36][0-9]{7}$/, "Invalid Bahraini phone number"),
  paymentMethod: z.string().nonempty(),
});

export default function Checkout() {
  const location = useLocation();
  const { cartItems } = location.state || {};
  const items = Array.isArray(cartItems) ? cartItems : [];

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    zoneId: "",
    area: "",
    address: "",
    floor: "",
    phone: "",
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
      phone: formData.phone.replace(/\s/g, ""),
    };
    const validation = checkoutSchema.safeParse(cleanData);

    if (!validation.success) {
      const newErrors = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field) newErrors[field] = issue.message;
      });
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

      // حفظ الطلب في orders
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        name: cleanData.name,
        city: selectedZone.label,
        zoneId: selectedZone.id,
        area: cleanData.area,
        address: cleanData.address,
        floor: cleanData.floor || "",
        phone: cleanData.phone,
        paymentMethod: cleanData.paymentMethod,
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
      <div className="min-h-screen  px-4 sm:px-6 md:px-10 lg:px-20 py-10 font-poppins">
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto mb-6 bg-green-100 border border-green-400 text-green-800 rounded-xl p-4 flex items-center gap-3 shadow-md"
          >
            <CheckCircle2 size={28} className="text-green-600" />
            <p className="text-base sm:text-lg font-medium">
              Your order is <strong>pending</strong> and will be confirmed by
              phone or WhatsApp message.
            </p>
          </motion.div>
        )}

        {errors.general && (
          <p className="text-red-500 text-center mb-4">{errors.general}</p>
        )}

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-playfair font-bold text-brown text-center mb-10"
        >
          Checkout
        </motion.h1>

        {!success && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <InputField
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
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
                error={errors.area}
              />
              <InputField
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                error={errors.address}
              />
              <InputField
                label="Floor (Optional)"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                placeholder="e.g. 2nd floor"
              />
              <InputField
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +973 3xxxxxxx"
                error={errors.phone}
              />

              <div>
                <label className="block text-brown font-medium mb-1">
                  Payment Method
                </label>
                <input
                  type="text"
                  value="Cash on Delivery"
                  readOnly
                  className="w-full border border-beige bg-gray-50 rounded-lg p-3 text-gray-700 cursor-not-allowed"
                />
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

                <div className="mt-4 text-sm text-brown flex flex-col gap-1">
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
                    <div className="flex justify-between text-warmGray">
                      <span>Production time</span>
                      <span>
                        Up to {maxDays} {maxDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-xl font-semibold text-brown">
                  Total: <span className="text-sage">{total} BHD</span>
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="bg-sage text-white px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Confirm Order"
                )}
              </motion.button>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </>
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
