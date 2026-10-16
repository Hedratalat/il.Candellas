import { useState } from "react";
import { motion } from "framer-motion";
import { db } from "../firebase";
import { collection, serverTimestamp, setDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

const initialData = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  order: "",
  outOfStock: false,
  productionDays: "",
  bundleEnabled: false,
  bundleItemName: "",
  bundleExtraPrice: "",
};

const inputClass =
  "p-4 rounded-xl border border-beige w-full focus:outline-none focus:ring-2 focus:ring-sage text-brown bg-warmWhite placeholder-warmGray text-lg";

export default function AddProducts() {
  const [productData, setProductData] = useState(initialData);
  const [colors, setColors] = useState([]); // [{ id, name, imageUrl }]
  const [loading, setLoading] = useState(false);

  // رفع الصورة على Cloudinary
  const uploadImageCloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "handmade_upload"); // preset خاص بالمشروع
    data.append("folder", "handmade_uploads"); // مجلد المشروع

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dciqod9kj/image/upload",
        {
          method: "POST",
          body: data,
        },
      );
      const json = await res.json();
      return json.secure_url; // رابط الصورة النهائي
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Failed to upload image. Please try again.");
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductData({
      ...productData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const uploadedUrl = await uploadImageCloudinary(file);
    if (uploadedUrl) {
      setProductData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      toast.success("Image uploaded successfully");
    }
    setLoading(false);
  };

  // ---- Colors ----
  const addColor = () => {
    setColors((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name: "", imageUrl: "" },
    ]);
  };

  const updateColor = (id, changes) => {
    setColors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    );
  };

  const removeColor = (id) => {
    setColors((prev) => prev.filter((c) => c.id !== id));
  };

  const handleColorFile = async (id, file) => {
    if (!file) return;
    setLoading(true);
    const url = await uploadImageCloudinary(file);
    if (url) {
      updateColor(id, { imageUrl: url });
      toast.success("Color image uploaded");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productData.imageUrl) {
      toast.error("Please upload an image before submitting.");
      return;
    }
    if (colors.some((c) => !c.name.trim() || !c.imageUrl)) {
      toast.error("Each color needs a name and an image.");
      return;
    }
    if (
      productData.bundleEnabled &&
      (!productData.bundleItemName.trim() ||
        productData.bundleExtraPrice === "")
    ) {
      toast.error("Please fill the bundle item name and extra price.");
      return;
    }
    setLoading(true);

    try {
      const newDocRef = doc(collection(db, "Products"));
      await setDoc(newDocRef, {
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        category: productData.category,
        imageUrl: productData.imageUrl,
        order: productData.order === "" ? null : Number(productData.order),
        outOfStock: productData.outOfStock,
        productionDays:
          productData.productionDays === ""
            ? null
            : Number(productData.productionDays),
        colors: colors.map((c) => ({
          name: c.name.trim(),
          imageUrl: c.imageUrl,
        })),
        bundle: productData.bundleEnabled
          ? {
              enabled: true,
              itemName: productData.bundleItemName.trim(),
              extraPrice: parseFloat(productData.bundleExtraPrice),
            }
          : { enabled: false },
        createdAt: serverTimestamp(),
      });

      toast.success("Product added successfully");
      setProductData(initialData);
      setColors([]);
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-poppins px-5 py-10">
      <motion.h2
        className="text-3xl font-playfair text-brown mb-8 text-center font-semibold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Add New Product
      </motion.h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
        {/* Product Name */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">Product Name</label>
          <input
            type="text"
            name="name"
            value={productData.name}
            onChange={handleChange}
            required
            data-gramm="false"
            data-gramm_editor="false"
            placeholder="Enter product name"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={productData.description}
            onChange={handleChange}
            required
            rows="4"
            data-gramm="false"
            data-gramm_editor="false"
            placeholder="Enter product description"
            className={inputClass}
          />
        </div>

        {/* Price */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">Price (BHD)</label>
          <input
            type="number"
            name="price"
            step="0.01"
            min="0"
            value={productData.price}
            onChange={handleChange}
            required
            placeholder="Enter product price"
            className={inputClass}
          />
        </div>

        {/* Category */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">
            Category <span className="text-warmGray text-sm">(optional)</span>
          </label>
          <input
            type="text"
            name="category"
            value={productData.category}
            onChange={handleChange}
            data-gramm="false"
            data-gramm_editor="false"
            placeholder="Enter category (optional)"
            className={inputClass}
          />
        </div>

        {/* Display Order */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">
            Display Order{" "}
            <span className="text-warmGray text-sm">
              (1 = first, empty = last)
            </span>
          </label>
          <input
            type="number"
            name="order"
            min="1"
            step="1"
            value={productData.order}
            onChange={handleChange}
            placeholder="e.g. 1"
            className={inputClass}
          />
        </div>

        {/* Production Days */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">
            Production Time (days){" "}
            <span className="text-warmGray text-sm">
              (made to order, optional)
            </span>
          </label>
          <input
            type="number"
            name="productionDays"
            min="0"
            step="1"
            value={productData.productionDays}
            onChange={handleChange}
            placeholder="e.g. 3"
            className={inputClass}
          />
        </div>

        {/* Out of Stock */}
        <label className="flex items-center gap-3 text-brown font-medium cursor-pointer">
          <input
            type="checkbox"
            name="outOfStock"
            checked={productData.outOfStock}
            onChange={handleChange}
            className="w-5 h-5 accent-terracotta"
          />
          Out of Stock
        </label>

        {/* Product Image */}
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm
      file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 
      file:text-white file:bg-terracotta file:hover:bg-terracottaDark
      file:cursor-pointer cursor-pointer"
          />
          {productData.imageUrl && (
            <img
              src={productData.imageUrl}
              alt="Preview"
              className="mt-3 w-32 h-32 object-cover rounded-lg border border-beige"
            />
          )}
        </div>

        {/* Colors */}
        <div className="flex flex-col gap-3">
          <label className="text-brown font-medium">
            Colors <span className="text-warmGray text-sm">(optional)</span>
          </label>

          {colors.map((color) => (
            <div
              key={color.id}
              className="flex flex-col gap-3 p-4 rounded-xl border border-beige bg-warmWhite"
            >
              <input
                type="text"
                value={color.name}
                onChange={(e) =>
                  updateColor(color.id, { name: e.target.value })
                }
                placeholder="Color name (e.g. Red)"
                data-gramm="false"
                data-gramm_editor="false"
                className="p-3 rounded-xl border border-beige w-full focus:outline-none focus:ring-2 focus:ring-sage text-brown bg-warmWhite placeholder-warmGray"
              />
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleColorFile(color.id, e.target.files[0])}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm cursor-pointer"
                />
                {color.imageUrl && (
                  <img
                    src={color.imageUrl}
                    alt={color.name}
                    className="w-14 h-14 object-cover rounded-lg border border-beige"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeColor(color.id)}
                  className="bg-terracotta text-white p-2 rounded-full hover:bg-terracottaDark transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addColor}
            className="flex items-center gap-2 w-fit px-5 py-2 rounded-full bg-sage text-white hover:bg-sageDark transition"
          >
            <Plus size={18} /> Add Color
          </button>
        </div>

        {/* Bundle */}
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-beige bg-warmWhite">
          <label className="flex items-center gap-3 text-brown font-medium cursor-pointer">
            <input
              type="checkbox"
              name="bundleEnabled"
              checked={productData.bundleEnabled}
              onChange={handleChange}
              className="w-5 h-5 accent-terracotta"
            />
            Enable Bundle{" "}
            <span className="text-warmGray text-sm">(optional)</span>
          </label>

          {productData.bundleEnabled && (
            <>
              <input
                type="text"
                name="bundleItemName"
                value={productData.bundleItemName}
                onChange={handleChange}
                placeholder="Item name (e.g. Candle, Rose)"
                data-gramm="false"
                data-gramm_editor="false"
                className="p-3 rounded-xl border border-beige w-full focus:outline-none focus:ring-2 focus:ring-sage text-brown bg-warmWhite placeholder-warmGray"
              />
              <input
                type="number"
                name="bundleExtraPrice"
                step="0.01"
                min="0"
                value={productData.bundleExtraPrice}
                onChange={handleChange}
                placeholder="Price per extra item (BHD)"
                className="p-3 rounded-xl border border-beige w-full focus:outline-none focus:ring-2 focus:ring-sage text-brown bg-warmWhite placeholder-warmGray"
              />
            </>
          )}
        </div>

        {/* Button */}
        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.97 }}
          className={`mt-4 w-fit px-10 py-3 rounded-xl font-semibold text-warmWhite text-lg transition-all shadow-md ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-terracotta hover:bg-terracottaDark"
          }`}
        >
          {loading ? "Please wait..." : "Add Product"}
        </motion.button>
      </form>
    </div>
  );
}
