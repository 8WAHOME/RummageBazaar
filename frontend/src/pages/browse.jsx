import React, { useEffect, useState } from "react";
import { api } from "../utils/api.js";
import { Link } from "react-router-dom";
import Loader from "../components/loader.jsx";
import { categories } from "../utils/categories.js";
import {
  DevicePhoneMobileIcon,
  HomeModernIcon,
  ShoppingBagIcon,
  BookOpenIcon,
  TrophyIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  BriefcaseIcon,
  HeartIcon,
  SparklesIcon,
  PuzzlePieceIcon,
  BabyIcon,
  PaintBrushIcon,
  MusicalNoteIcon,
  ScissorsIcon,
  WrenchIcon,
  GlobeAltIcon,
  CakeIcon,
  CogIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// Icon mapping for categories
const categoryIcons = {
  'Electronics': DevicePhoneMobileIcon,
  'Furniture & Home Decor': HomeModernIcon,
  'Fashion & Accessories': ShoppingBagIcon,
  'Books & Education': BookOpenIcon,
  'Sports & Outdoors': TrophyIcon,
  'Vehicles & Automotive': TruckIcon,
  'Real Estate': BuildingStorefrontIcon,
  'Jobs & Services': BriefcaseIcon,
  'Pets & Animals': HeartIcon,
  'Health & Beauty': SparklesIcon,
  'Toys & Games': PuzzlePieceIcon,
  'Baby & Kids': BabyIcon,
  'Art & Collectibles': PaintBrushIcon,
  'Musical Instruments': MusicalNoteIcon,
  'Office Supplies': ScissorsIcon,
  'Tools & DIY': WrenchIcon,
  'Travel & Luggage': GlobeAltIcon,
  'Food & Beverages': CakeIcon,
  'Agriculture & Farming': TruckIcon,
  'Industrial Equipment': CogIcon,
  'Other': CubeIcon,
};

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

  const filtered = products.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (!q) return true;
    const s = `${p.title} ${p.description} ${p.category}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Browse Listings
        </h1>
        <p className="text-gray-600">
          Discover amazing items from our community
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="md:col-span-2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings, e.g. 'iPhone', 'sofa'..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 items-center">
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)} 
            className="flex-1 border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Link 
            to="/create" 
            className="bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <PlusIcon className="w-5 h-5" />
            Sell Item
          </Link>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="mb-6 text-gray-600">
          Showing {filtered.length} of {products.length} listings
          {category !== 'All' && ` in ${category}`}
          {q && ` for "${q}"`}
        </div>
      )}

      {/* Listings Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-lg shadow text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No listings found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setQ('')}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Search
            </button>
            <button
              onClick={() => setCategory('All')}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Show All Categories
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((p) => {
            const CategoryIcon = categoryIcons[p.category] || CubeIcon;
            return (
              <Link key={p._id} to={`/products/${p._id}`} className="group">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={p.images?.[0] || "/placeholder.jpg"} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transform transition duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md">
                      <CategoryIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    {p.isDonation && (
                      <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        FREE
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1">{p.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-1 mb-3">{p.location}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-700 font-bold text-lg">
                        {Number(p.price || 0) === 0 ? "FREE" : `KSH ${p.price?.toLocaleString()}`}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                        <CategoryIcon className="w-3 h-3" />
                        {p.category}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}