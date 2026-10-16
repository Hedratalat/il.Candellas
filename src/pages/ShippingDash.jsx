import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Edit, X } from "lucide-react";
import { db } from "../firebase";

export default function ShippingDash() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [fee, setFee] = useState("");
  const [adding, setAdding] = useState(false);

  const [selectedEdit, setSelectedEdit] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editFee, setEditFee] = useState("");
  const [selectedDelete, setSelectedDelete] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "ShippingZones"),
      (snap) => {
        setZones(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error loading shipping zones:", err);
        toast.error("Failed to load shipping zones");
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = label.trim();
    const price = Number(fee);

    if (!name) return toast.error("Please enter the zone name");
    if (fee === "" || isNaN(price) || price < 0)
      return toast.error("Please enter a valid shipping fee");
    if (zones.some((z) => z.label.trim().toLowerCase() === name.toLowerCase()))
      return toast.error("This zone already exists");

    setAdding(true);
    try {
      await addDoc(collection(db, "ShippingZones"), {
        label: name,
        fee: price,
        createdAt: serverTimestamp(),
      });
      setLabel("");
      setFee("");
      toast.success("Zone added successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add zone");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (zone) => {
    setEditLabel(zone.label);
    setEditFee(String(zone.fee));
    setSelectedEdit(zone.id);
  };

  const handleSaveEdit = async () => {
    const name = editLabel.trim();
    const price = Number(editFee);

    if (!name || editFee === "" || isNaN(price) || price < 0) {
      toast.error("Please check the name and the fee");
      return;
    }

    try {
      await updateDoc(doc(db, "ShippingZones", selectedEdit), {
        label: name,
        fee: price,
      });
      toast.success("Zone updated successfully");
      setSelectedEdit(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update zone");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "ShippingZones", id));
      toast.success("Zone deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete zone");
    } finally {
      setSelectedDelete(null);
    }
  };

  const inputCls =
    "p-4 rounded-xl border border-beige w-full focus:outline-none focus:ring-2 focus:ring-sage text-brown bg-warmWhite placeholder-warmGray text-lg";

  const modalInputCls = "border border-slate-300 rounded-xl px-3 py-2 text-sm";

  const zoneToDelete = zones.find((z) => z.id === selectedDelete);

  return (
    <div className="font-poppins px-5 py-10">
      <motion.h2
        className="text-3xl font-playfair text-brown mb-8 text-center font-semibold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Shipping Zones
      </motion.h2>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-6 max-w-2xl mb-12"
      >
        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">Zone Name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            data-gramm="false"
            data-gramm_editor="false"
            placeholder="e.g. Muharraq"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-brown font-medium mb-2">
            Shipping Fee (BHD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="e.g. 1.500"
            className={inputCls}
          />
        </div>

        <motion.button
          type="submit"
          disabled={adding}
          whileTap={{ scale: 0.97 }}
          className={`mt-2 w-fit px-10 py-3 rounded-xl font-semibold text-warmWhite text-lg transition-all shadow-md ${
            adding
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-terracotta hover:bg-terracottaDark"
          }`}
        >
          {adding ? "Adding..." : "Add Zone"}
        </motion.button>
      </form>

      {/* Zones List */}
      <h3 className="text-2xl font-playfair text-brown mb-6 font-semibold">
        Zones & Shipping Fees
      </h3>

      {loading ? (
        <p className="text-warmGray text-sm">Loading...</p>
      ) : zones.length === 0 ? (
        <p className="text-warmGray text-sm">
          No zones added yet. Add your first zone using the form above.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone, index) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-warmWhite rounded-2xl shadow-md p-5 border border-beige flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-brown font-playfair">
                  {zone.label}
                </h3>
                <p className="text-sage font-bold mt-2">{zone.fee} BHD</p>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => handleEdit(zone)}
                  className="bg-sage text-white px-4 py-2 rounded-full hover:bg-sageDark transition"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => setSelectedDelete(zone.id)}
                  className="bg-terracotta text-white px-4 py-2 rounded-full hover:bg-terracottaDark transition"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
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
                Delete Zone?
              </h3>
              <p className="text-warmGray font-poppins mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-brown">
                  "{zoneToDelete?.label}"
                </span>
                ? Previous orders won't be affected.
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
              className="bg-warmWhite rounded-2xl p-6 max-w-sm w-full shadow-lg border border-beige overflow-auto"
            >
              <h3 className="text-xl font-semibold text-brown font-playfair mb-5">
                Edit Zone
              </h3>

              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">Zone Name</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className={modalInputCls}
                />
              </div>

              <div className="flex flex-col mb-3">
                <label className="text-brown font-medium mb-1">
                  Shipping Fee (BHD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  className={modalInputCls}
                />
              </div>

              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={handleSaveEdit}
                  className="bg-sage text-white px-5 py-2 rounded-full hover:bg-sageDark transition"
                >
                  Save
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
    </div>
  );
}
