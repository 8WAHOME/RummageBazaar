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

  const whatsappHref = item.sellerPhone
    ? `https://wa.me/${item.sellerPhone}?text=${encodeURIComponent(
        `Hi! I'm interested in your product: ${item.title} (KSH ${item.price}). Is it still available?`
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
                  <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">
                    <FaWhatsapp /> Chat Seller
                  </a>
                )}
                {isSold && <span className="text-sm bg-red-100 px-3 py-1 rounded text-red-700 font-semibold">SOLD</span>}
              </div>
            </div>

            <div className="mt-6 space-y-1 text-sm text-gray-700">
              <div><strong>Category:</strong> {item.category}</div>
              <div><strong>Condition:</strong> {item.condition}</div>
              <div><strong>Location:</strong> {item.location || "Not specified"}</div>
              <div><strong>Seller Phone:</strong> {item.sellerPhone}</div>
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
