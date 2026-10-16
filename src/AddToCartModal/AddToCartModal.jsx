import { useState } from "react";
import { motion } from "framer-motion";
import {
  collection,
  addDoc,
  updateDoc,
  increment,
  query,
  where,
  getDocs,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { X, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";

const round3 = (n) => Number(n.toFixed(3));

export default function AddToCartModal({ product, onClose }) {
  const [color, setColor] = useState(null);
  const [extraCount, setExtraCount] = useState(0);
  const [customize, setCustomize] = useState("");
  const [colorError, setColorError] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = product.colors || [];
  const bundle = product.bundle?.enabled ? product.bundle : null;
  const basePrice = Number(product.numericPrice ?? product.price) || 0;
  const extraPrice = bundle ? Number(bundle.extraPrice) || 0 : 0;
  const unitPrice = round3(basePrice + extraCount * extraPrice);
  const days = product.productionDays;
  const mainImage = color?.imageUrl || product.imageUrl;

  const handleAdd = async () => {
    if (colors.length > 0 && !color) {
      setColorError(true);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("Please login to add items to your cart");
      return;
    }

    setSaving(true);
    try {
      const cleanCustomize = customize.trim();
      const lineKey = [
        product.id,
        color?.name || "",
        extraCount,
        cleanCustomize.toLowerCase(),
      ].join("|");

      const cartRef = collection(db, "users", user.uid, "cart");
      const existing = await getDocs(
        query(cartRef, where("lineKey", "==", lineKey)),
      );

      if (!existing.empty) {
        await updateDoc(
          doc(db, "users", user.uid, "cart", existing.docs[0].id),
          { quantity: increment(1) },
        );
      } else {
        await addDoc(cartRef, {
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          category: product.category || "",
          price: basePrice,
          unitPrice,
          quantity: 1,
          color: color ? { name: color.name, imageUrl: color.imageUrl } : null,
          bundle: bundle
            ? { itemName: bundle.itemName, extraCount, extraPrice }
            : null,
          customize: cleanCustomize,
          productionDays: typeof days === "number" ? days : null,
          lineKey,
        });
      }

      toast.success("Added to cart");
      onClose();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-warmWhite rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-lg border border-beige text-left font-poppins"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white/90 p-2 rounded-full hover:bg-terracotta hover:text-white transition"
        >
          <X size={20} />
        </button>

        {/* الصورة الكبيرة (بتتغير حسب اللون المختار) */}
        <div className="w-full bg-white">
          <motion.img
            key={mainImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            src={mainImage}
            alt={color?.name || product.name}
            className="w-full h-72 sm:h-80 object-cover"
          />
        </div>

        <div className="p-6">
          {/* الاسم والسعر */}
          <div className="mb-5">
            <h3 className="text-2xl font-semibold text-brown font-playfair">
              {product.name}
            </h3>
            {typeof days === "number" && days > 0 && (
              <p className="text-warmGray text-sm mt-1">
                Ready in {days} {days === 1 ? "day" : "days"}
              </p>
            )}
          </div>

          {/* الألوان */}
          {colors.length > 0 && (
            <div className="mb-6">
              <label className="text-brown font-medium mb-3 block">
                Color{color ? `: ${color.name}` : ""}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      setColorError(false);
                    }}
                    className="flex flex-col items-center gap-1"
                  >
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className={`w-full aspect-square object-cover rounded-xl border-2 transition ${
                        color?.name === c.name
                          ? "border-terracotta ring-2 ring-terracotta/40"
                          : "border-beige hover:border-sage"
                      }`}
                    />
                    <span className="text-xs text-brown text-center">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
              {colorError && (
                <p className="text-red-500 text-sm mt-2">
                  Please select a color
                </p>
              )}
            </div>
          )}

          {/* الباقة */}
          {bundle && (
            <div className="mb-6">
              <label className="text-brown font-medium mb-2 block">
                Extra {bundle.itemName}{" "}
                <span className="text-warmGray text-xs">
                  (+{extraPrice} BHD each)
                </span>
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setExtraCount((n) => Math.max(0, n - 1))}
                  disabled={extraCount === 0}
                  className="p-2 rounded-full bg-sage text-white disabled:opacity-40 hover:bg-sageDark transition"
                >
                  <Minus size={16} />
                </button>
                <span className="text-lg font-semibold text-brown w-8 text-center">
                  {extraCount}
                </span>
                <button
                  type="button"
                  onClick={() => setExtraCount((n) => n + 1)}
                  className="p-2 rounded-full bg-sage text-white hover:bg-sageDark transition"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Customize */}
          <div className="mb-6">
            <label className="text-brown font-medium mb-2 block">
              Customize{" "}
              <span className="text-warmGray text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={customize}
              onChange={(e) => setCustomize(e.target.value)}
              maxLength={100}
              data-gramm="false"
              data-gramm_editor="false"
              placeholder="e.g. Name to write on the candle"
              className="p-3 rounded-xl border border-beige w-full focus:outline-none focus:ring-2 focus:ring-sage text-brown bg-white placeholder-warmGray"
            />
          </div>

          <div className="flex items-center justify-between border-t border-beige pt-4">
            <span className="text-xl font-bold text-sage">{unitPrice} BHD</span>
            <button
              onClick={handleAdd}
              disabled={saving}
              className={`px-6 py-2 rounded-full text-white font-medium transition ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-terracotta hover:bg-terracottaDark"
              }`}
            >
              {saving ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
