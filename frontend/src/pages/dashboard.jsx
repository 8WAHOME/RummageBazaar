// src/pages/dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { api } from "../utils/api.js";
import ProductCard from "../components/productCard.jsx";
import Loader from "../components/loader.jsx";

/**
 * Seller Dashboard
 * - List seller's listings
 * - Mark as sold (PATCH /products/:id/sold)
 * - Delete listing (DELETE /products/:id)
 * - Orders placeholder
 *
 * Behavior:
 * - Sellers CANNOT edit (edit button hidden).
 * - Admins see Edit (and can delete).
 */

export default function Dashboard() {
  const { user, session } = useClerk();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  // helper: is current user an admin? (set this in Clerk publicMetadata or your DB)
  const isAdmin = Boolean(user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "Admin");

  async function load() {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api(`/products?userId=${user.id}`, "GET");
      setItems(Array.isArray(res) ? res : []);
      setError(null);
    } catch (err) {
      console.error("Dashboard load:", err);
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // seller or admin can mark as sold
  const markAsSold = async (productId) => {
    if (!user?.id) return alert("Not signed in");
    if (!confirm("Mark this listing as SOLD?")) return;
    setBusyId(productId);
    try {
      const token = await session.getToken();
      await api(`/products/${productId}/sold`, "PATCH", {}, token);
      setItems((prev) => prev.map((p) => (p._id === productId ? { ...p, status: "sold" } : p)));
    } catch (err) {
      console.error("Mark sold error:", err);
      alert(err.message || "Failed to mark as sold");
    } finally {
      setBusyId(null);
    }
  };

  // delete: allow seller or admin (you can restrict to admin if you prefer)
  const removeListing = async (productId) => {
    if (!user?.id) return alert("Not signed in");
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setBusyId(productId);
    try {
      const token = await session.getToken();
      await api(`/products/${productId}`, "DELETE", {}, token);
      setItems((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Failed to delete listing");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">My Dashboard</h2>
        <div className="flex gap-3">
          <Link to="/create" className="bg-emerald-600 text-white px-4 py-2 rounded">Create Listing</Link>
          <button onClick={load} className="px-3 py-2 border rounded">Refresh</button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <section>
        <h3 className="text-xl mb-3">My Listings</h3>

        {items.length === 0 ? (
          <div className="p-6 bg-white rounded shadow text-center">
            <p>No listings yet.</p>
            <Link to="/create" className="mt-3 inline-block bg-emerald-600 text-white px-4 py-2 rounded">Create your first listing</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((p) => (
              <div key={p._id} className="bg-white rounded shadow p-3">
                <ProductCard item={p} />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    {/* Edit only visible for admins */}
                    {isAdmin && (
                      <button onClick={() => navigate(`/create?edit=${p._id}`)} className="px-3 py-1 bg-gray-100 rounded">
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => markAsSold(p._id)}
                      disabled={busyId === p._id || p.status === "sold"}
                      className={`px-3 py-1 rounded ${p.status === "sold" ? "bg-red-100 text-red-700" : "bg-red-600 text-white"}`}
                      aria-label={p.status === "sold" ? "Already sold" : "Mark as sold"}
                    >
                      {busyId === p._id ? "..." : p.status === "sold" ? "SOLD" : "Mark as Sold"}
                    </button>
                  </div>

                  <div>
                    <button
                      onClick={() => removeListing(p._1d || p._id)}
                      disabled={busyId === p._id}
                      className="px-3 py-1 bg-gray-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h3 className="text-xl mb-3">Orders (placeholder)</h3>
        <div className="bg-white rounded p-4 shadow text-sm text-gray-600">
          Orders and messages will appear here as the system evolves. (Placeholder)
        </div>
      </section>
    </div>
  );
}
