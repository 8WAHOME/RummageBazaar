// src/pages/ProductDetail.jsx - FULLY UPDATED
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, parseApiError } from "../utils/api.js";
import { notification } from "../utils/notifications.js";
import Loader from "../components/loader.jsx";
import { 
  FaWhatsapp, 
  FaTag, 
  FaMapMarkerAlt, 
  FaUser, 
  FaPhone, 
  FaArrowLeft,
  FaShare,
  FaHeart,
  FaRegHeart,
  FaEye,
  FaClock,
  FaShieldAlt
} from "react-icons/fa";
import { useClerk } from "@clerk/clerk-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session } = useClerk();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainIndex, setMainIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      setError(null);
      const data = await api(`/products/${id}`, "GET");
      
      if (data?.success) {
        setItem(data.product || data);
      } else if (data) {
        setItem(data);
      } else {
        throw new Error("Product not found");
      }
      
      // Track view count
      try {
        await api(`/products/${id}/view`, "POST");
      } catch (viewError) {
        console.log("View count update failed:", viewError);
      }
    } catch (err) {
      console.error("Product load error:", err);
      const parsedError = parseApiError(err);
      setError(parsedError.message || "Failed to load product");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader />;
  if (!item && error) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
          <FaEye className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Product Not Found</h1>
        <p className="text-gray-600 mb-8 text-lg">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => navigate(-1)}
            className="bg-gray-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-200 flex items-center gap-3"
          >
            <FaArrowLeft />
            Go Back
          </button>
          <button 
            onClick={() => navigate("/browse")}
            className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-200"
          >
            Browse Listings
          </button>
        </div>
      </div>
    </div>
  );

  if (!item) return null;

  const isDonation = Number(item.price) === 0 || item.isDonation;
  const isSold = item.status === "sold" || item.sold === true;
  const isPending = item.status === "pending";

  const isSeller = user?.id === item.userId;
  const isAdmin = user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "Admin";
  const showViews = isSeller || isAdmin;

  const formatPhoneNumber = (phone, countryCode = "+254") => {
    if (!phone) return "";
    const cleanPhone = phone.toString().replace(/\D/g, '');
    if (!cleanPhone) return "";
    
    let formattedNumber = cleanPhone;
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedNumber = cleanPhone;
    }
    else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedNumber = countryCode.replace('+', '') + cleanPhone.slice(1);
    }
    else if (cleanPhone.length === 9) {
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    else {
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    
    return `+${formattedNumber}`;
  };

  const countryCode = item.countryCode || "+254";
  const formattedPhone = formatPhoneNumber(item.sellerPhone, countryCode);
  
  const whatsappHref = formattedPhone
    ? `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(
        `Hi! I'm interested in your product: "${item.title}" (${isDonation ? "FREE" : `KSH ${(item.price || 0)?.toLocaleString()}`}). On RummageBazaar Is it still available?`
      )}`
    : null;

  const isOwner = user?.id === item.userId;
  const pendingQuery = searchParams.get("pending");

  async function handleMarkSold() {
    if (!isOwner && !isAdmin) {
      notification.error("Only the seller or admin can mark this listing as sold.");
      return;
    }
    
    // Use browser confirm for now, but you can replace with your ConfirmModal
    if (!window.confirm("Mark this item as sold? This cannot be undone.")) return;

    setBusy(true);
    try {
      const token = await session.getToken();
      const result = await api(`/products/${id}/sold`, "PATCH", {}, token);
      
      if (result?.success) {
        await loadProduct();
        notification.success("Product marked as sold successfully!");
      } else {
        throw new Error(result?.error || "Failed to mark as sold");
      }
    } catch (err) {
      console.error(err);
      notification.error(err.message || "Failed to mark as sold");
    } finally {
      setBusy(false);
    }
  }

  const shareProduct = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out this ${isDonation ? 'free item' : `item for KSH ${(item.price || 0)?.toLocaleString()}`} on RummageBazaar`,
          url: window.location.href,
        });
        notification.success("Shared successfully!");
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      notification.success('Product link copied to clipboard!');
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    notification.success(isLiked ? "Removed from favorites" : "Added to favorites");
  };

  const StatusBadge = () => {
    if (isSold) {
      return (
        <span className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg">
          <FaEye className="w-4 h-4 mr-2" />
          SOLD OUT
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
          <FaClock className="w-4 h-4 mr-2" />
          UNDER REVIEW
        </span>
      );
    }
    if (isDonation) {
      return (
        <span className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg">
          <FaHeart className="w-4 h-4 mr-2" />
          FREE DONATION
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
        <FaShieldAlt className="w-4 h-4 mr-2" />
        AVAILABLE
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-3 text-gray-600 hover:text-gray-900 font-semibold transition-all duration-200 hover:gap-4"
          >
            <FaArrowLeft className="w-5 h-5" />
            Back to Browse
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={shareProduct}
              className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-emerald-50 hover:text-emerald-600"
              title="Share this listing"
            >
              <FaShare className="w-5 h-5" />
            </button>
            <button
              onClick={toggleLike}
              className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-red-50"
              title={isLiked ? "Remove from favorites" : "Add to favorites"}
            >
              {isLiked ? (
                <FaHeart className="w-5 h-5 text-red-500" />
              ) : (
                <FaRegHeart className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {pendingQuery === "true" && !isPending && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-bold text-yellow-800 text-lg">Listing Processing</h3>
                <p className="text-yellow-700">Your listing is being processed and will be visible soon.</p>
              </div>
            </div>
          </div>
        )}

        {isPending && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-bold text-blue-800 text-lg">Under Review</h3>
                <p className="text-blue-700">Your listing is being reviewed and will be visible once approved.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Image Gallery */}
          <div className="space-y-6">
            {/* Main Image */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="relative h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                {item.images?.length ? (
                  <>
                    <img 
                      src={item.images[mainIndex] || "/api/placeholder/400/300"} 
                      alt={`${item.title} - Image ${mainIndex + 1}`}
                      onLoad={() => setImageLoading(false)}
                      onError={(e) => {
                        e.target.src = "/api/placeholder/400/300";
                        setImageLoading(false);
                      }}
                      className={`w-full h-full object-cover transition-opacity duration-500 ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                    />
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-lg font-medium">No Image Available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {item.images?.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {item.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setMainIndex(idx);
                      setImageLoading(true);
                    }}
                    className={`flex-shrink-0 border-4 rounded-2xl overflow-hidden transition-all duration-300 ${
                      idx === mainIndex 
                        ? "border-emerald-500 shadow-lg scale-105" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img 
                      src={img || "/api/placeholder/100/100"} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-24 h-24 object-cover"
                      onError={(e) => e.target.src = "/api/placeholder/100/100"}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
              
              {/* Title and Status */}
              <div className="flex flex-col gap-6 mb-8">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
                    {item.title || "Untitled Item"}
                  </h1>
                  <div className="flex items-center gap-4">
                    <StatusBadge />
                    {showViews && (item.views || 0) > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        <FaEye className="w-3 h-3" />
                        <span className="font-semibold">{item.views || 0} views</span>
                        {(isSeller || isAdmin) && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                            {isSeller ? "Your listing" : "Admin view"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-extrabold text-emerald-600">
                      {isDonation ? "FREE" : `Ksh ${Number(item.price || 0).toLocaleString()}`}
                    </div>
                    {isDonation ? (
                      <p className="text-emerald-700 font-semibold mt-2 text-lg">This item is being given away for free</p>
                    ) : item.originalPrice && (
                      <div className="text-lg text-gray-500 line-through mt-1">
                        KSH {Number(item.originalPrice || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 leading-relaxed text-lg">{item.description || "No description provided"}</p>
              </div>

              {/* Product Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FaTag className="text-blue-600 text-lg" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Category</div>
                    <div className="font-semibold text-gray-900 capitalize text-lg">{item.category || "Other"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FaUser className="text-green-600 text-lg" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Condition</div>
                    <div className="font-semibold text-gray-900 capitalize text-lg">{item.condition || "Good"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FaMapMarkerAlt className="text-purple-600 text-lg" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 font-medium">Location</div>
                    <div className="font-semibold text-gray-900 text-lg">{item.location || "Not specified"}</div>
                  </div>
                </div>

                {formattedPhone && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <FaPhone className="text-orange-600 text-lg" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 font-medium">Contact Phone</div>
                      <div className="font-semibold text-gray-900 text-lg">{formattedPhone}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Section */}
              {!isSold && formattedPhone && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Seller</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{formattedPhone}</div>
                        <div className="text-sm text-gray-600">Country: {countryCode}</div>
                      </div>
                    </div>
                    {whatsappHref && (
                      <a 
                        href={whatsappHref} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center justify-center gap-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl w-full text-lg hover:scale-105"
                      >
                        <FaWhatsapp className="text-2xl" /> 
                        Chat on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Admin/Owner Actions */}
              {(isOwner || isAdmin) && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Listing Management</h4>
                  <div className="flex flex-wrap gap-3">
                    {!isSold && (
                      <button 
                        onClick={handleMarkSold} 
                        disabled={busy} 
                        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        {busy ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </div>
                        ) : (
                          "Mark as Sold"
                        )}
                      </button>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => navigate(`/create?edit=${item._id || item.id}`)} 
                        className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        Edit Listing (Admin)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Listing Date */}
              {item.createdAt && (
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-6 pt-6 border-t border-gray-200">
                  <FaClock className="w-4 h-4" />
                  <span>Listed on {new Date(item.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}