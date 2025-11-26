// src/pages/productDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api.js";
import Loader from "../components/loader.jsx";
import { FaWhatsapp } from "react-icons/fa";
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

  // Format phone number with country code
  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    
    // Remove any existing country code and non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If phone already starts with country code, use as is
    if (cleanPhone.startsWith('254')) {
      return `+${cleanPhone}`;
    }
    
    // If phone starts with 0, remove it and add country code
    if (cleanPhone.startsWith('0')) {
      return `${selectedCountryCode}${cleanPhone.slice(1)}`;
    }
    
    // If phone is 9 digits (typical Kenyan number without 0), add country code
    if (cleanPhone.length === 9) {
      return `${selectedCountryCode}${cleanPhone}`;
    }
    
    // Default: just add country code
    return `${selectedCountryCode}${cleanPhone}`;
  };

  const formattedPhone = formatPhoneNumber(item.sellerPhone);
  
  const whatsappHref = formattedPhone
    ? `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(
        `Hi! I'm interested in your product: ${item.title} (${isDonation ? "FREE" : `KSH ${item.price}`}). Is it still available?`
      )}`
    : null;

  // determine admin (from Clerk public metadata) — set `publicMetadata.role = 'admin'` in Clerk for admin users
  const isAdmin = Boolean(user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "Admin");

  // owner by clerk id
  const isOwner = user?.id === item.userId;

  // show banner if create redirected with pending=true or server returned pending status
  const pendingQuery = searchParams.get("pending");
  const isPending = pendingQuery === "true" || item.status === "pending";

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {isPending && (
        <div className="p-4 rounded bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
          Your listing is created and pending confirmation. Editing is disabled for quality control.
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-4">
            <div className="bg-gray-100 rounded overflow-hidden mb-4 flex items-center justify-center" style={{ minHeight: 360 }}>
              {item.images?.length ? (
                <img src={item.images[mainIndex]} alt={`Image ${mainIndex + 1}`} className="w-full h-[360px] object-cover rounded" />
              ) : (
                <img src="/placeholder.jpg" className="w-full h-[360px] object-cover rounded" alt="placeholder" />
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {item.images?.map((img, idx) => (
                <button key={idx} onClick={() => setMainIndex(idx)} className={`flex-shrink-0 border ${idx === mainIndex ? "ring-2 ring-emerald-500" : ""} rounded overflow-hidden`}>
                  <img src={img} alt={`thumb-${idx}`} className="w-28 h-20 object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="md:w-1/2 p-6">
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <p className="mt-2 text-gray-700">{item.description}</p>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-3xl font-extrabold text-emerald-600">
                {isDonation ? "FREE" : `Ksh ${item.price}`}
              </div>

              <div className="flex items-center gap-3">
                {!isSold && whatsappHref && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <select 
                        value={selectedCountryCode}
                        onChange={(e) => setSelectedCountryCode(e.target.value)}
                        className="text-sm border rounded px-2 py-1 bg-gray-100"
                      >
                        <option value="+254">+254 (KE)</option>
                        <option value="+255">+255 (TZ)</option>
                        <option value="+256">+256 (UG)</option>
                        <option value="+257">+257 (BI)</option>
                        <option value="+250">+250 (RW)</option>
                        <option value="+211">+211 (SS)</option>
                        <option value="+1">+1 (US/CA)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+86">+86 (CN)</option>
                      </select>
                      <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">
                        <FaWhatsapp /> Chat Seller
                      </a>
                    </div>
                    <p className="text-xs text-gray-500">Phone: {formattedPhone}</p>
                  </div>
                )}
                {isSold && <span className="text-sm bg-red-100 px-3 py-1 rounded text-red-700 font-semibold">SOLD</span>}
              </div>
            </div>

            <div className="mt-6 space-y-1 text-sm text-gray-700">
              <div><strong>Category:</strong> {item.category}</div>
              <div><strong>Condition:</strong> {item.condition}</div>
              <div><strong>Location:</strong> {item.location || "Not specified"}</div>
              <div><strong>Seller Phone:</strong> {formattedPhone}</div>
            </div>

            <div className="mt-6 flex gap-3">
              {/* Mark as sold (owner or admin) */}
              {(isOwner || isAdmin) && !isSold && (
                <button onClick={handleMarkSold} disabled={busy} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  {busy ? "Processing..." : "Mark as Sold"}
                </button>
              )}

              {/* Edit — only admin */}
              {isAdmin && (
                <button onClick={() => navigate(`/create?edit=${item._id}`)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
                  Edit (admin)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}