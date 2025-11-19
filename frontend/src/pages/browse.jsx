import React, { useEffect, useState } from "react";
import { api } from "../utils/api.js";
import { Link } from "react-router-dom";
import Loader from "../components/loader.jsx";

export default function Browse() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/products", "GET");
        setProducts(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Browse load:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = ["All", "Phones", "Electronics", "Furniture", "Clothing", "Books", "Other"];

  const filtered = products.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (!q) return true;
    const s = `${p.title} ${p.description} ${p.category}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings, e.g. 'iPhone', 'sofa'..."
            className="w-full border rounded px-4 py-2"
          />
        </div>

        <div className="flex gap-2 items-center">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-3 py-2">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Link to="/create" className="bg-emerald-600 text-white px-3 py-2 rounded-md">Sell Item</Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 bg-white rounded shadow text-center">No listings found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <Link key={p._id} to={`/products/${p._id}`} className="group">
              <div className="bg-white rounded shadow overflow-hidden hover:shadow-lg transition">
                <img src={p.images?.[0] || "/placeholder.jpg"} alt={p.title} className="w-full h-48 object-cover group-hover:scale-105 transform transition" />
                <div className="p-3">
                  <h3 className="font-semibold">{p.title}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-emerald-700 font-bold">{Number(p.price || 0) === 0 ? "FREE" : `KSH ${p.price}`}</div>
                    <div className="text-xs text-gray-500">{p.category}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
