// src/pages/productDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api.js";
import Loader from "../components/loader.jsx";
import { FaWhatsapp, FaTag, FaMapMarkerAlt, FaUser } from "react-icons/fa";
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
  const [selectedCountryCode, setSelectedCountryCode] = useState("+254");

  useEffect(() => {
    (async () => {
      try {
        const data = await api(`/products/${id}`, "GET");
        setItem(data);
        // Set country code from item if available, otherwise default to +254
        if (data.countryCode) {
          setSelectedCountryCode(data.countryCode);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Loader />;
  if (!item) return <div className="p-6">Product not found.</div>;

  const isDonation = Number(item.price) === 0 || item.isDonation;
  const isSold = item.status === "sold" || item.sold === true;
  const isPending = item.status === "pending";

  // Robust phone number formatting
  const formatPhoneNumber = (phone, countryCode = "+254") => {
    if (!phone) return "";
    
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone) return "";
    
    // Handle different phone number formats
    let formattedNumber = cleanPhone;
    
    // If phone starts with country code (without +), use as is
    if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedNumber = cleanPhone;
    }
    // If phone starts with 0, remove it and add country code
    else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      formattedNumber = countryCode.replace('+', '') + cleanPhone.slice(1);
    }
    // If phone is 9 digits (typical East African number without 0)
    else if (cleanPhone.length === 9) {
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    // If phone already includes country code with +
    else if (cleanPhone.startsWith('254') && cleanPhone.length === 12) {
      formattedNumber = cleanPhone;
    }
    // Default case - just use the cleaned number
    else {
      formattedNumber = countryCode.replace('+', '') + cleanPhone;
    }
    
    return `+${formattedNumber}`;
  };

  const formattedPhone = formatPhoneNumber(item.sellerPhone, selectedCountryCode);
  
  const whatsappHref = formattedPhone
    ? `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(
        `Hi! I'm interested in your product: ${item.title} (${isDonation ? "FREE" : `KSH ${item.price}`}). Is it still available?`
      )}`
    : null;

  const isAdmin = Boolean(user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "Admin");
  const isOwner = user?.id === item.userId;
  const pendingQuery = searchParams.get("pending");

  async function handleMarkSold() {
    if (!isOwner && !isAdmin) {
      alert("Only the seller or admin can mark this listing as sold.");
      return;
    }
    if (!window.confirm("Mark this item as sold? This cannot be undone.")) return;

    setBusy(true);
    try {
      const token = await session.getToken();
      await api(`/products/${id}/sold`, "PATCH", {}, token);
      const refreshed = await api(`/products/${id}`, "GET");
      setItem(refreshed);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to mark as sold");
    } finally {
      setBusy(false);
    }
  }

  // Status badge component
  const StatusBadge = () => {
    if (isSold) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">SOLD</span>;
    }
    if (isPending) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">PENDING</span>;
    }
    if (isDonation) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">DONATION</span>;
    }
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">AVAILABLE</span>;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Status Banners */}
      {pendingQuery === "true" && !isPending && (
        <div className="p-4 rounded bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
          Your listing is being processed and will be visible soon.
        </div>
      )}

      {isPending && (
        <div className="p-4 rounded bg-blue-50 border-l-4 border-blue-400 text-blue-800">
          Your listing is under review and will be visible once approved.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="md:flex">
          {/* Image Gallery */}
          <div className="md:w-1/2 p-4">
            <div className="bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center" style={{ minHeight: 360 }}>
              {item.images?.length ? (
                <img 
                  src={item.images[mainIndex]} 
                  alt={`${item.title} - Image ${mainIndex + 1}`} 
                  className="w-full h-[360px] object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-[360px] bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  No Image Available
                </div>
              )}
            </div>

            {item.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {item.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setMainIndex(idx)} 
                    className={`flex-shrink-0 border-2 ${idx === mainIndex ? "border-emerald-500" : "border-gray-300"} rounded-lg overflow-hidden transition-all duration-200`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-20 h-16 md:w-28 md:h-20 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="md:w-1/2 p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{item.title}</h1>
              <StatusBadge />
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>

            {/* Price Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-extrabold text-emerald-600">
                    {isDonation ? "FREE" : `Ksh ${Number(item.price).toLocaleString()}`}
                  </div>
                  {isDonation && (
                    <p className="text-sm text-green-600 mt-1">This is a donation item</p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Metadata */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-700">
                <FaTag className="mr-2 text-gray-400" />
                <strong className="w-20">Category:</strong>
                <span className="ml-2 capitalize">{item.category}</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <FaUser className="mr-2 text-gray-400" />
                <strong className="w-20">Condition:</strong>
                <span className="ml-2 capitalize">{item.condition}</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <FaMapMarkerAlt className="mr-2 text-gray-400" />
                <strong className="w-20">Location:</strong>
                <span className="ml-2">{item.location || "Not specified"}</span>
              </div>
            </div>

            {/* Contact Section */}
            {!isSold && formattedPhone && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Seller</h3>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-sm text-gray-700 font-medium">Country Code:</label>
                    <select 
                      value={selectedCountryCode}
                      onChange={(e) => setSelectedCountryCode(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="+254">+254 (Kenya)</option>
                      <option value="+255">+255 (Tanzania)</option>
                      <option value="+256">+256 (Uganda)</option>
                      <option value="+257">+257 (Burundi)</option>
                      <option value="+250">+250 (Rwanda)</option>
                      <option value="+211">+211 (South Sudan)</option>
                      <option value="+1">+1 (US/Canada)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+91">+91 (India)</option>
                      <option value="+86">+86 (China)</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm text-gray-700 font-medium">Phone:</span>
                    <span className="flex-1 text-sm bg-white px-3 py-2 rounded border border-gray-300">
                      {formattedPhone}
                    </span>
                  </div>
                  {whatsappHref && (
                    <a 
                      href={whatsappHref} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 w-full sm:w-auto"
                    >
                      <FaWhatsapp className="text-xl" /> 
                      Chat on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Admin/Owner Actions */}
            {(isOwner || isAdmin) && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Listing Management</h4>
                <div className="flex flex-wrap gap-2">
                  {!isSold && (
                    <button 
                      onClick={handleMarkSold} 
                      disabled={busy} 
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors duration-200"
                    >
                      {busy ? "Processing..." : "Mark as Sold"}
                    </button>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={() => navigate(`/create?edit=${item._id}`)} 
                      className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-medium transition-colors duration-200"
                    >
                      Edit Listing (Admin)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}