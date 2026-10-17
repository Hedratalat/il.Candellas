import {
  Instagram,
  MessageCircle,
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { Link } from "react-router-dom";

const socialLinks = [
  { Icon: Instagram, href: "https://www.instagram.com/il.candellas/" },
  {
    Icon: FaTiktok,
    href: "https://www.tiktok.com/@ilcandellas?_t=ZS-8yuIE7gpsN3&_r=1&fbclid=PAZXh0bgNhZW0CMTEAcGRvZgJzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAadHwi4fU6SQgs1i1fmj5wt5QcUVNQBr481mRIJYOvZhqg7ReBeCN0hGTCO2YQ_aem_zFMkarUGsCHijxDEUvJ6hA",
  },
  { Icon: MessageCircle, href: "https://wa.me/+97337721142" },
];

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Products", to: "/products" },
  { label: "My Orders", to: "/myOrders" },
  { label: "Contact", to: "/contact" },
];

const services = [
  "Premium Scented Candles",
  "Custom & Personalized Candles",
  "Gift Sets & Special Occasions",
  "Secure Online Shopping Experience",
  "Fast Delivery Across Bahrain",
];

const contactItems = [
  { Icon: MapPin, text: "Bahrain" },
  { Icon: Phone, text: "+973 37721142" },
  { Icon: Mail, text: "ilcandellas.store@gmail.com" },
  { Icon: Clock, text: "Sat–Fri: 9:00 AM - 6:00 PM" },
];

const headingClass = "text-xl font-semibold mb-2 font-playfair";

function SocialLinks({ justify }) {
  return (
    <>
      <p className="font-medium text-warmWhite text-lg mb-2">Follow Us</p>
      <div className={`flex ${justify} space-x-3`}>
        {socialLinks.map(({ Icon, href }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer">
            <Icon className="w-5 h-5 text-warmWhite/70 hover:text-warmWhite" />
          </a>
        ))}
      </div>
    </>
  );
}

export default function Footer() {
  return (
    <footer className="bg-terracotta text-warmWhite mt-9">
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left font-poppins">
        <div className="md:col-span-1">
          <h3 className="text-2xl font-semibold mb-2 font-playfair">
            il.Candellas
          </h3>
          <p className="text-warmWhite/70 text-base leading-relaxed mb-3">
            Discover our collection of scented candles, hand-poured with premium
            fragrances to bring warmth, calm, and a cozy glow to every corner of
            your home.
          </p>

          {/* السوشيال ميديا  نسخة الديسكتوب */}
          <div className="hidden md:block">
            <SocialLinks justify="justify-start" />
          </div>
        </div>

        <div>
          <h3 className={headingClass}>Quick Links</h3>
          <ul className="flex flex-col  gap-3  md:pt-2 text-warmWhite/70 text-base md:text-lg font-medium">
            {quickLinks.map(({ label, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="hover:text-warmWhite transition-colors duration-300"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* الخدمات */}
        <div>
          <h3 className={headingClass}>Our Services</h3>
          <ul className="space-y-1 text-warmWhite/70 text-base">
            {services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>

        {/* التواصل */}
        <div>
          <h3 className={headingClass}>Contact Us</h3>
          <div className="space-y-2 text-warmWhite/70 text-base">
            {contactItems.map(({ Icon, text }) => (
              <p
                key={text}
                className="flex justify-center md:justify-start items-center gap-2"
              >
                <Icon className="w-4 h-4 text-warmWhite" /> {text}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/*  السوشيال ميديا نسخة الموبايل */}
      <div className="block md:hidden text-center mt-4">
        <SocialLinks justify="justify-center" />
      </div>

      <div className="border-t border-warmWhite/30 text-center py-3 mt-4">
        <p className="text-warmWhite/70 text-sm md:text-base">
          © 2026 il.Candellas. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
