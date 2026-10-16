import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import Navbar from "../Navbar/Navbar";
import { Link } from "react-router-dom";
import { Heart, X, PackageOpen, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import Footer from "../Footer/Footer";
import AddToCartModal from "../AddToCartModal/AddToCartModal";

const arrowVariants = {
  initial: { x: 0 },
  hover: { x: 5 },
};

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [liveProducts, setLiveProducts] = useState({}); // { productId: productData }
  const [selectedImage, setSelectedImage] = useState(null);
  const [cartProduct, setCartProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const favRef = collection(db, "users", user.uid, "favorites");
        const unsubscribeFavs = onSnapshot(favRef, (snapshot) => {
          setFavorites(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          );
        });
        return () => unsubscribeFavs();
      } else {
        setFavorites([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 📦 بيانات المنتجات الحالية (الألوان، الباقة، المخزون، أيام التصنيع)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Products"), (snapshot) => {
      const map = {};
      snapshot.docs.forEach((d) => {
        map[d.id] = { ...d.data(), id: d.id };
      });
      setLiveProducts(map);
    });
    return () => unsubscribe();
  }, []);

  // 🧡 إزالة من المفضلات
  const handleRemoveFavorite = async (productId) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Please login to add favorites");
        return;
      }

      const favRef = collection(db, "users", user.uid, "favorites");
      const q = query(favRef, where("id", "==", productId));
      const existing = await getDocs(q);

      if (!existing.empty) {
        const favDoc = existing.docs[0];
        await deleteDoc(doc(db, "users", user.uid, "favorites", favDoc.id));
        toast.error("Removed from favorites");
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Something went wrong");
    }
  };

  const handleOpenCart = (fav) => {
    const live = liveProducts[fav.id];
    if (!live) {
      toast.error("This product is no longer available");
      return;
    }
    if (live.outOfStock) return;
    setCartProduct({ ...live, numericPrice: Number(live.price) || 0 });
  };

  // 📄 Pagination logic
  const totalPages = Math.ceil(favorites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = favorites.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <>
      <Navbar />
      <div className="mt-20 px-6 md:px-12 font-poppins text-center">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-playfair text-brown font-semibold"
        >
          Your Favorite Products
        </motion.h2>

        {/* Favorites Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentItems.length > 0 ? (
            currentItems.map((fav, index) => {
              const live = liveProducts[fav.id];
              const product = live ? { ...fav, ...live, id: fav.id } : fav;
              const days = product.productionDays;

              return (
                <motion.div
                  key={fav.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.1,
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  viewport={{ once: true }}
                  className="group relative bg-warmWhite rounded-2xl shadow-md overflow-hidden border border-border hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setSelectedImage(product.imageUrl)}
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className={`w-full h-64 object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-500 ${
                        product.outOfStock ? "opacity-60" : ""
                      }`}
                    />
                    {product.outOfStock && (
                      <span className="absolute top-3 left-3 bg-terracotta text-white text-xs font-medium px-3 py-1 rounded-full">
                        Out of Stock
                      </span>
                    )}
                    <button
                      className="absolute top-3 right-3 p-3 rounded-full bg-terracotta text-white hover:bg-terracottaDark transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(fav.id);
                      }}
                    >
                      <Heart size={22} />
                    </button>
                  </div>

                  {/* محتوى الكارد */}
                  <div className="flex flex-col justify-between p-5 text-left flex-1">
                    <div>
                      <h3 className="text-xl font-semibold text-brown font-playfair">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-warmGray text-sm font-poppins">
                        {product.description}
                      </p>
                      {typeof days === "number" && days > 0 && (
                        <p className="mt-2 text-sage text-xs font-medium">
                          Ready in {days} {days === 1 ? "day" : "days"}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-lg font-bold text-sage">
                        {product.price ? `${product.price} BHD` : "N/A"}
                      </span>
                      <button
                        onClick={() => handleOpenCart(fav)}
                        disabled={product.outOfStock}
                        className={`px-4 py-2 rounded-full font-poppins text-sm font-medium transition-all duration-300 ${
                          product.outOfStock
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-terracotta text-white hover:bg-terracottaDark"
                        }`}
                      >
                        {product.outOfStock ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center min-h-[40vh] text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <PackageOpen size={100} className="text-sage mb-4" />
              </motion.div>
              <p className="text-xl font-medium text-brown font-poppins">
                You haven’t added any favorites yet.
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg border text-brown font-medium transition ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-beige"
              }`}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded-lg border font-medium transition ${
                  currentPage === i + 1
                    ? "bg-terracotta text-white"
                    : "text-brown hover:bg-beige"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg border text-brown font-medium transition ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-beige"
              }`}
            >
              Next
            </button>
          </div>
        )}

        {/* Add to Cart Popup */}
        {cartProduct && (
          <AddToCartModal
            product={cartProduct}
            onClose={() => setCartProduct(null)}
          />
        )}

        {/* Image Popup */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 bg-white/80 p-2 rounded-full hover:bg-terracotta hover:text-white transition"
                onClick={() => setSelectedImage(null)}
              >
                <X size={22} />
              </button>
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                src={selectedImage}
                alt="Product Preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
