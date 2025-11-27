import React from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

/**
 * Props:
 *  - item: { _id, title, price, images, category, sellerPhone, countryCode, status, isDonation }
 */
export default function ProductCard({ item }) {
  const isSold = item?.status === "sold" || item?.sold === true;
  const isDonation = item?.isDonation || Number(item?.price || 0) === 0;
  
  // Robust phone number formatting with +254 as default
  const formatPhoneForWhatsApp = (phone, countryCode = "+254") => {
    if (!phone) return null;
    
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return null;
    
    let formattedNumber = cleanPhone;
    
    // Handle different phone number formats
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      // Already has Kenya country code
      formattedNumber = cleanPhone;
    }
    else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      // Kenyan number with leading 0 (07XXXXXXXX)
      formattedNumber = '254' + cleanPhone.slice(1);
    }
    else if (cleanPhone.length === 9) {
      // Kenyan number without leading 0 (7XXXXXXXX)
      formattedNumber = '254' + cleanPhone;
    }
    else if (cleanPhone.length === 12 && !cleanPhone.startsWith('254')) {
      // International number without country code, use provided country code
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    else if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      // 10-digit number without leading 0, assume it's international
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    else {
      // Default case - use country code with the number as-is
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    
    // Ensure it starts with + for WhatsApp
    return formattedNumber.startsWith('+') ? formattedNumber : `+${formattedNumber}`;
  };

  // Use stored countryCode or default to +254
  const storedCountryCode = item?.countryCode || "+254";
  const formattedPhone = formatPhoneForWhatsApp(item?.sellerPhone, storedCountryCode);
  
  const whatsappHref = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hi! I'm interested in "${item.title}" listed for ${isDonation ? "FREE" : `KSH ${item.price}`}. Is it still available?`)}`
    : null;

  return (
    <article className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative">
        <Link to={`/products/${item._id}`}>
          <img
            src={item?.images?.[0] || "/placeholder.jpg"}
            alt={item.title}
            className={`w-full h-56 object-cover ${isSold ? "opacity-60" : "hover:scale-105 transform transition"}`}
          />
        </Link>

        <div className="absolute left-3 top-3 flex gap-2">
          {isDonation && <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded">DONATION</span>}
          {isSold && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">SOLD</span>}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold line-clamp-2">{item.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{item.category}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">
            {isDonation ? "FREE" : `KSH ${Number(item.price || 0).toLocaleString()}`}
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/products/${item._id}`} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              View
            </Link>
            {whatsappHref && !isSold && (
              <a 
                href={whatsappHref} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center gap-2 transition-colors"
              >
                <FaWhatsapp />
                <span className="hidden sm:inline">Chat</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}