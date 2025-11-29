import React from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp, FaEye, FaHeart, FaRegHeart } from "react-icons/fa";
import { MdLocationOn } from "react-icons/md";

export default function ProductCard({ item }) {
  const isSold = item?.status === "sold" || item?.sold === true;
  const isDonation = item?.isDonation || Number(item?.price || 0) === 0;
  const [isLiked, setIsLiked] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Robust phone number formatting with +254 as default
  const formatPhoneForWhatsApp = (phone, countryCode = "+254") => {
    if (!phone) return null;
    
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return null;
    
    let formattedNumber = cleanPhone;
    
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedNumber = cleanPhone;
    }
    else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedNumber = '254' + cleanPhone.slice(1);
    }
    else if (cleanPhone.length === 9) {
      formattedNumber = '254' + cleanPhone;
    }
    else {
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    
    return formattedNumber.startsWith('+') ? formattedNumber : `+${formattedNumber}`;
  };

  const storedCountryCode = item?.countryCode || "+254";
  const formattedPhone = formatPhoneForWhatsApp(item?.sellerPhone, storedCountryCode);
  
  const whatsappHref = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hi! I'm interested in "${item.title}" listed for ${isDonation ? "FREE" : `KSH ${item.price?.toLocaleString()}`}. Is it still available?`)}`
    : null;

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = () => setImageError(true);

  return (
    <article className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-emerald-200">
      {/* Image Section */}
      <div className="relative overflow-hidden">
        <Link to={`/product/${item._id}`} className="block">
          <div className="relative h-64 w-full bg-gray-100">
            {!imageError ? (
              <>
                <img
                  src={item?.images?.[0] || "/api/placeholder/400/400"}
                  alt={item.title}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  } ${isSold ? "grayscale" : ""}`}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                <div className="text-center">
                  <div className="text-2xl mb-2">📷</div>
                  <div className="text-sm">No Image</div>
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {isDonation && (
            <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg">
              🎁 FREE
            </span>
          )}
          {isSold && (
            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg">
              SOLD
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            {isLiked ? (
              <FaHeart className="text-red-500 text-sm" />
            ) : (
              <FaRegHeart className="text-gray-600 text-sm" />
            )}
          </button>
        </div>

        {/* Views Counter */}
        {item.views > 0 && (
          <div className="absolute left-3 bottom-3 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            <FaEye className="text-xs" />
            <span>{item.views}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Category */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            {item.category}
          </span>
          {item.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MdLocationOn className="text-xs" />
              <span>{item.location.split(',')[0]}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <Link to={`/product/${item._id}`}>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight">
            {item.title}
          </h3>
        </Link>

        {/* Price & Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-gray-900">
              {isDonation ? (
                <span className="text-emerald-600">FREE</span>
              ) : (
                `KSH ${Number(item.price || 0).toLocaleString()}`
              )}
            </div>
            {!isDonation && item.originalPrice && (
              <div className="text-sm text-gray-500 line-through">
                KSH {Number(item.originalPrice).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to={`/product/${item._id}`}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <FaEye className="text-sm" />
              View
            </Link>
            
            {whatsappHref && !isSold && (
              <a 
                href={whatsappHref} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <FaWhatsapp className="text-lg" />
              </a>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {item.condition && (
              <span className="capitalize">Condition: {item.condition}</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {item.createdAt && (
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}