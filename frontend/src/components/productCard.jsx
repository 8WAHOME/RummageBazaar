import React from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

/**
 * Props:
 *  - item: { _id, title, price, images, category, sellerPhone, status, isDonation }
 */
export default function ProductCard({ item }) {
  const isSold = item?.status === "sold" || item?.sold === true;
  const isDonation = item?.isDonation || Number(item?.price || 0) === 0;
  const whatsappHref = item?.sellerPhone
    ? `https://wa.me/${item.sellerPhone}?text=${encodeURIComponent(`Hi! I'm interested in "${item.title}" listed for KSH ${item.price}. Is it still available?`)}`
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
          <div className="text-xl font-bold text-gray-900">{isDonation ? "FREE" : `KSH ${Number(item.price || 0).toLocaleString()}`}</div>
          <div className="flex items-center gap-2">
            <Link to={`/products/${item._id}`} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">View</Link>
            {whatsappHref && !isSold && (
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center gap-2">
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
