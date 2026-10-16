import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Edit, X, Plus, Trash2 } from "lucide-react";

const emptyEdit = {
  id: null,
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  file: null,
  order: "",
  outOfStock: false,
  productionDays: "",
  bundleEnabled: false,
  bundleItemName: "",
  bundleExtraPrice: "",
};

const editInput = "border border-slate-300 rounded-xl px-3 py-2 text-sm";

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [selectedDelete, setSelectedDelete] = useState(null);
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [editData, setEditData] = useState(emptyEdit);
  const [editColors, setEditColors] = useState([]); // [{ id, name, imageUrl }]
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Products"), (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // ترتيب المنتجات: order الأصغر الأول، اللي ملوش order في الآخر
  const sortedProducts = [...products].sort((a, b) => {
    const ao = typeof a.order === "number" ? a.order : Infinity;
    const bo = typeof b.order === "number" ? b.order : Infinity;
    if (ao !== bo) return ao - bo;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "Products", id));
      toast.success("Product deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setSelectedDelete(null);
    }
  };

  const handleEdit = (product) => {
    setEditData({
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      file: null,
      order: typeof product.order === "number" ? product.order : "",
      outOfStock: !!product.outOfStock,
      productionDays:
        typeof product.productionDays === "number"
          ? product.productionDays
          : "",
      bundleEnabled: !!product.bundle?.enabled,
      bundleItemName: product.bundle?.itemName || "",
      bundleExtraPrice: product.bundle?.extraPrice ?? "",
    });
    setEditColors(
      (product.colors || []).map((c, i) => ({
        id: `${product.id}-${i}`,
        name: c.name,
        imageUrl: c.imageUrl,
      })),
    );
    setSelectedEdit(product.id);
  };

  const uploadImageCloudinary = async (file) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "handmade_upload");
    data.append("folder", "handmade_uploads");
    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dciqod9kj/image/upload",
        { method: "POST", body: data },
      );
      const json = await res.json();
      return json.secure_url;
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Failed to upload image. Please try again.");
      return null;
    }
  };

  // ---- Colors (edit) ----
  const addColor = () => {
    setEditColors((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name: "", imageUrl: "" },
    ]);
  };

  const updateColor = (id, changes) => {
    setEditColors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    );
  };

  const removeColor = (id) => {
    setEditColors((prev) => prev.filter((c) => c.id !== id));
  };

  const handleColorFile = async (id, file) => {
    if (!file) return;
    setSaving(true);
    const url = await uploadImageCloudinary(file);
    if (url) {
      updateColor(id, { imageUrl: url });
      toast.success("Color image uploaded");
    }
    setSaving(false);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveEdit = async () => {
    if (editColors.some((c) => !c.name.trim() || !c.imageUrl)) {
      toast.error("Each color needs a name and an image.");
      return;
    }
    if (
      editData.bundleEnabled &&
      (!editData.bundleItemName.trim() || editData.bundleExtraPrice === "")
    ) {
      toast.error("Please fill the bundle item name and extra price.");
      return;
    }

    setSaving(true);
    let imageUrl = editData.imageUrl;

    if (editData.file) {
      const uploadedUrl = await uploadImageCloudinary(editData.file);
      if (!uploadedUrl) {
        setSaving(false);
        return;
      }
      imageUrl = uploadedUrl;
    }

    try {
      await updateDoc(doc(db, "Products", editData.id), {
        name: editData.name,
        description: editData.description,
        price: Number(editData.price),
        category: editData.category,
        imageUrl: imageUrl,
        order: editData.order === "" ? null : Number(editData.order),
        outOfStock: editData.outOfStock,
        productionDays:
          editData.productionDays === ""
            ? null
            : Number(editData.productionDays),
        colors: editColors.map((c) => ({
          name: c.name.trim(),
          imageUrl: c.imageUrl,
        })),
        bundle: editData.bundleEnabled
          ? {
              enabled: true,
              itemName: editData.bundleItemName.trim(),
              extraPrice: Number(editData.bundleExtraPrice),
            }
          : { enabled: false },
      });
      toast.success("Product updated successfully!");
      setSelectedEdit(null);
    } catch (error) {
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  // Pagination calculations
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  return (
    <section className="p-6 md:p-12 min-h-screen">
      <h2 className="text-3xl font-playfair text-brown mb-8 text-center font-semibold">
        Products Management
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-warmWhite rounded-2xl shadow-md p-5 border border-beige flex flex-col justify-between"
          >
            <div>
              <div className="relative">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={`w-full h-40 object-cover rounded-lg mb-3 ${
                    product.outOfStock ? "opacity-60" : ""
                  }`}
                />
                {typeof product.order === "number" && (
                  <span className="absolute top-2 left-2 bg-sage text-white text-xs px-2 py-1 rounded-full">
                    #{product.order}
                  </span>
                )}
                {product.outOfStock && (
                  <span className="absolute top-2 right-2 bg-terracotta text-white text-xs px-2 py-1 rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-brown font-playfair">
                {product.name}
              </h3>
              <p className="text-warmGray text-sm">{product.description}</p>
              <p className="text-sage font-bold mt-2">{product.price} BHD</p>
              <p className="text-warmGray text-sm">{product.category}</p>

              {typeof product.productionDays === "number" && (
                <p className="text-warmGray text-sm mt-1">
                  Production: {product.productionDays} day(s)
                </p>
              )}

              {product.bundle?.enabled && (
                <p className="text-warmGray text-sm mt-1">
                  Bundle: +{product.bundle.extraPrice} BHD per extra{" "}
                  {product.bundle.itemName}
                </p>
              )}

              {product.colors?.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {product.colors.map((c, i) => (
                    <img
                      key={i}
                      src={c.imageUrl}
                      alt={c.name}
                      title={c.name}
                      className="w-8 h-8 rounded-full object-cover border border-beige"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => handleEdit(product)}
                className="bg-sage text-white px-4 py-2 rounded-full hover:bg-sageDark transition"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => setSelectedDelete(product.id)}
                className="bg-terracotta text-white px-4 py-2 rounded-full hover:bg-terracottaDark transition"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-full border ${
                currentPage === i + 1
                  ? "bg-sage text-white border-sage"
                  : "bg-warmWhite text-brown border-beige"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {selectedDelete && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-warmWhite rounded-2xl p-6 max-w-md w-full text-center shadow-lg border border-beige"
            >
              <h3 className="text-xl font-semibold text-brown font-playfair mb-3">
                Delete Product?
              </h3>
              <p className="text-warmGray font-poppins mb-6">
                Are you sure you want to delete this product? This action cannot
                be undone.
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleDelete(selectedDelete)}
                  className="bg-terracotta text-white px-5 py-2 rounded-full hover:bg-terracottaDark transition"
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

      {/* Edit Popup */}
      <AnimatePresence>
        {selectedEdit && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-warmWhite rounded-2xl p-6 max-w-md w-full max-h-[90vh] shadow-lg border border-beige overflow-y-auto"
            >
              <h3 className="text-xl font-semibold text-brown font-playfair mb-5">
                Edit Product
              </h3>

              {/* Image */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditData({ ...editData, file: e.target.files[0] })
                  }
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm cursor-pointer"
                />
                {editData.imageUrl && (
                  <img
                    src={editData.imageUrl}
                    alt="Preview"
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>

              {/* Name */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleEditChange}
                  className={editInput}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editData.description}
                  onChange={handleEditChange}
                  className={editInput}
                  rows={2}
                />
              </div>

              {/* Price */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">
                  Price (BHD)
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  value={editData.price}
                  onChange={handleEditChange}
                  className={editInput}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  value={editData.category}
                  onChange={handleEditChange}
                  className={editInput}
                />
              </div>

              {/* Order */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">
                  Display Order{" "}
                  <span className="text-warmGray text-xs">
                    (1 = first, empty = last)
                  </span>
                </label>
                <input
                  type="number"
                  name="order"
                  min="1"
                  step="1"
                  value={editData.order}
                  onChange={handleEditChange}
                  className={editInput}
                />
              </div>

              {/* Production Days */}
              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">
                  Production Time (days)
                </label>
                <input
                  type="number"
                  name="productionDays"
                  min="0"
                  step="1"
                  value={editData.productionDays}
                  onChange={handleEditChange}
                  className={editInput}
                />
              </div>

              {/* Out of Stock */}
              <label className="flex items-center gap-3 text-brown font-medium cursor-pointer mb-4">
                <input
                  type="checkbox"
                  name="outOfStock"
                  checked={editData.outOfStock}
                  onChange={handleEditChange}
                  className="w-5 h-5 accent-terracotta"
                />
                Out of Stock
              </label>

              {/* Colors */}
              <div className="flex flex-col gap-3 mb-4">
                <label className="text-brown font-medium">Colors</label>

                {editColors.map((color) => (
                  <div
                    key={color.id}
                    className="flex flex-col gap-2 p-3 rounded-xl border border-beige"
                  >
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) =>
                        updateColor(color.id, { name: e.target.value })
                      }
                      placeholder="Color name"
                      className={editInput}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleColorFile(color.id, e.target.files[0])
                        }
                        className="flex-1 min-w-0 border border-slate-300 rounded-xl px-3 py-2 text-xs cursor-pointer"
                      />
                      {color.imageUrl && (
                        <img
                          src={color.imageUrl}
                          alt={color.name}
                          className="w-12 h-12 object-cover rounded-lg border border-beige"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeColor(color.id)}
                        className="bg-terracotta text-white p-2 rounded-full hover:bg-terracottaDark transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addColor}
                  className="flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-sage text-white text-sm hover:bg-sageDark transition"
                >
                  <Plus size={16} /> Add Color
                </button>
              </div>

              {/* Bundle */}
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-beige mb-2">
                <label className="flex items-center gap-3 text-brown font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="bundleEnabled"
                    checked={editData.bundleEnabled}
                    onChange={handleEditChange}
                    className="w-5 h-5 accent-terracotta"
                  />
                  Enable Bundle
                </label>
                {editData.bundleEnabled && (
                  <>
                    <input
                      type="text"
                      name="bundleItemName"
                      value={editData.bundleItemName}
                      onChange={handleEditChange}
                      placeholder="Item name (e.g. Candle)"
                      className={editInput}
                    />
                    <input
                      type="number"
                      name="bundleExtraPrice"
                      step="0.01"
                      min="0"
                      value={editData.bundleExtraPrice}
                      onChange={handleEditChange}
                      placeholder="Price per extra item (BHD)"
                      className={editInput}
                    />
                  </>
                )}
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className={`text-white px-5 py-2 rounded-full transition ${
                    saving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-sage hover:bg-sageDark"
                  }`}
                >
                  {saving ? "Please wait..." : "Save"}
                </button>
                <button
                  onClick={() => setSelectedEdit(null)}
                  className="bg-terracotta text-white px-5 py-2 rounded-full hover:bg-terracottaDark transition"
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
