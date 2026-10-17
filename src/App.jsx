import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ButtonScroll from "./ButtonScroll/ButtonScroll";
import ProtectedRoute from "./pages/ProtectedRoute";
import "./App.css";
import ShippingDash from "./pages/ShippingDash";
import MyOrders from "./pages/MyOrders";

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Products = lazy(() => import("./pages/Products"));
const DashBoardLayout = lazy(() => import("./DashboardLayout/DashboardLayout"));
const AddProducts = lazy(() => import("./pages/AddProducts"));
const FeedbackDash = lazy(() => import("./pages/FeedbackDash"));
const MessageDash = lazy(() => import("./pages/MessageDash"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrdersDah = lazy(() => import("./pages/OrdersDash"));
const ProductsManagement = lazy(() => import("./pages/ProductsManagement"));

// Spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-cream">
    <div className="w-14 h-14 rounded-full border-4 border-beige border-t-terracotta animate-spin" />
  </div>
);

function App() {
  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/products" element={<Products />} />
            <Route path="/myOrders" element={<MyOrders />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashBoardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="addProducts" replace />} />
              <Route path="addProducts" element={<AddProducts />} />
              <Route
                path="productsManagement"
                element={<ProductsManagement />}
              />
              <Route path="shipping" element={<ShippingDash />} />
              <Route path="ordersDah" element={<OrdersDah />} />
              <Route path="feedback" element={<FeedbackDash />} />
              <Route path="message" element={<MessageDash />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ButtonScroll />
      <Toaster position="top-center" reverseOrder={false} />
    </>
  );
}

export default App;
