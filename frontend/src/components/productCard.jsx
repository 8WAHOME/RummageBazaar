import React from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp, FaEye, FaHeart, FaRegHeart } from "react-icons/fa";
import { MdLocationOn } from "react-icons/md";
import { useClerk } from "@clerk/clerk-react";

export default function ProductCard({ item }) {
  const { user } = useClerk();
  const isSold = item?.status === "sold" || item?.sold === true;
  const isDonation = item?.isDonation || Number(item?.price || 0) === 0;
  const [isLiked, setIsLiked] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState(null);

  // Calculate distance function - CORRECTLY PLACED
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Check if current user is the seller or admin
  const isSeller = user?.id === item?.userId;
  const isAdmin = user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "Admin";
  
  // Only show views to seller or admin
  const showViews = isSeller || isAdmin;

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

  // You'll need to set userLocation somewhere - here's a basic example:
  React.useEffect(() => {
    // Get user's location from browser or from user profile
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  return (
    <article className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 hover:border-emerald-200 relative">
      
      {/* Sold Overlay */}
      {isSold && (
        <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-2xl">
          <div className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-lg transform rotate-12">
            SOLD OUT
          </div>
        </div>
      )}

      {/* Image Section */}
      <div className="relative overflow-hidden">
        <Link to={`/products/${item._id}`} className="block">
          <div className="relative h-64 w-full bg-gradient-to-br from-gray-100 to-gray-200">
            {!imageError ? (
              <>
                <img
                  src={item?.images?.[0] || "/api/placeholder/400/400"}
                  alt={item.title}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  } ${isSold ? "grayscale" : ""}`}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                <div className="text-center">
                  <div className="text-3xl mb-2">📷</div>
                  <div className="text-sm font-medium">No Image</div>
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {isDonation && (
            <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-3 py-2 rounded-full font-bold shadow-2xl backdrop-blur-sm">
              FREE DONATION
            </span>
          )}
          {!isDonation && item.originalPrice && (
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-2 rounded-full font-bold shadow-2xl backdrop-blur-sm">
              SALE
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-2xl hover:scale-110 transition-all duration-300 hover:shadow-3xl"
          >
            {isLiked ? (
              <FaHeart className="text-red-500 text-base" />
            ) : (
              <FaRegHeart className="text-gray-600 text-base" />
            )}
          </button>
        </div>

        {/* Views Counter */}
        {showViews && item.views > 0 && (
          <div className="absolute left-3 bottom-3 flex items-center gap-1.5 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            <FaEye className="text-xs" />
            <span className="font-semibold">{item.views} views</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Category & Location */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            {item.category}
          </span>
          <div className="flex flex-col items-end gap-1">
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                <MdLocationOn className="text-xs" />
                <span>{item.location.split(',')[0]}</span>
              </div>
            )}
            {/* Distance display - CORRECTLY PLACED */}
            {userLocation && item.coordinates && (
              <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <MdLocationOn className="w-3 h-3" />
                <span>
                  {calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    item.coordinates.latitude,
                    item.coordinates.longitude
                  ).toFixed(1)}km away
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <Link to={`/products/${item._id}`}>
          <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-700 transition-colors duration-300 leading-tight text-lg">
            {item.title}
          </h3>
        </Link>

        {/* Condition & Date */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span className="capitalize font-medium">{item.condition || 'Good condition'}</span>
          {item.createdAt && (
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-2xl font-extrabold text-gray-900">
              {isDonation ? (
                <span className="text-emerald-600">FREE</span>
              ) : (
                `KSH ${Number(item.price || 0).toLocaleString()}`
              )}
            </div>
            {!isDonation && item.originalPrice && (
              <div className="text-sm text-gray-500 line-through font-medium">
                KSH {Number(item.originalPrice).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to={`/products/${item._id}`}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
            >
              <FaEye className="text-sm" />
              View
            </Link>
            
            {whatsappHref && !isSold && (
              <a 
                href={whatsappHref} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <FaWhatsapp className="text-lg" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}