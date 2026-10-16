import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

export default function SideBarDash({ isOpen, setIsOpen }) {
  const navItems = [
    { to: "addProducts", label: "Add Products" },
    { to: "productsManagement", label: "Manage Products" },
    { to: "shipping", label: "Shipping" },
    { to: "ordersDah", label: "Orders" },
    { to: "feedback", label: "Feedback" },
    { to: "message", label: "Message" },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden"
        ></div>
      )}

      <aside
        className={`fixed lg:static top-0 left-0 min-h-screen bg-terracottaDark text-cream shadow-xl w-64 p-6 
          flex flex-col overflow-y-auto transition-transform duration-300 z-50 border-r border-beige/40
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0`}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-cream hover:text-warmWhite transition"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-playfair font-bold border-b border-beige/40 mb-8 pb-4 text-cream text-center">
          Dashboard
        </h2>

        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block text-lg font-medium rounded-xl px-4 py-2 cursor-pointer transition-all duration-200 
                    ${
                      isActive
                        ? "bg-cream text-terracotta shadow-md"
                        : "text-cream hover:bg-terracotta hover:text-warmWhite"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
