// src/pages/browse.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../utils/api.js";
import ProductCard from "../components/productCard.jsx";
import { categories, popularCategories } from "../utils/categories.js";
import { notification } from "../utils/notifications.js";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const SORTS = {
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  "price-low": (a, b) => (a.price || 0) - (b.price || 0),
  "price-high": (a, b) => (b.price || 0) - (a.price || 0),
  views: (a, b) => (b.views || 0) - (a.views || 0),
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [locationFilter, setLocationFilter] = useState(searchParams.get("location") || "");
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(50);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const requestId = useRef(0);

  // Reload (debounced) whenever any filter changes
  useEffect(() => {
    const t = setTimeout(loadProducts, 300);
    return () => clearTimeout(t);
  }, [q, category, locationFilter, userLocation, radius]);

  // Keep the URL shareable
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (category !== "All") params.set("category", category);
    if (locationFilter) params.set("location", locationFilter);
    setSearchParams(params, { replace: true });
  }, [q, category, locationFilter]);

  async function loadProducts() {
    const myRequest = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "60" });
      if (category !== "All") params.set("category", category);
      if (q.trim()) params.set("search", q.trim());

      if (userLocation) {
        // Radius search: handled by the main /products endpoint
        params.set("latitude", userLocation.latitude);
        params.set("longitude", userLocation.longitude);
        params.set("radius", radius);
      } else if (locationFilter.trim()) {
        params.set("location", locationFilter.trim());
      }

      const res = await api(`/products?${params.toString()}`, "GET");
      if (myRequest !== requestId.current) return; // a newer request replaced this one

      const list = Array.isArray(res) ? res : res?.products || [];
      setProducts(
        list.map((p) => ({
          ...p,
          images: Array.isArray(p.images) && p.images.length ? p.images : p.image ? [p.image] : [],
          price: p.price || 0,
          title: p.title || "Untitled Item",
          location: p.location || "Location not specified",
          category: p.category || "Other",
          isDonation: !!p.isDonation,
          status: p.status || "active",
          views: p.views || 0,
          _id: p._id || p.id,
        }))
      );
    } catch (err) {
      if (myRequest !== requestId.current) return;
      console.error("Browse load error:", err);
      setProducts([]);
      notification.error(err.message || "Failed to load products");
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      notification.warning("Geolocation is not supported by your browser");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationFilter("");
        setGettingLocation(false);
      },
      (error) => {
        const reasons = {
          1: "Please allow location access in your browser settings.",
          2: "Location information is unavailable.",
          3: "Location request timed out.",
        };
        notification.error(`Unable to get your location. ${reasons[error.code] || ""}`);
        setGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  function clearFilters() {
    setQ("");
    setCategory("All");
    setLocationFilter("");
    setUserLocation(null);
    setSortBy("newest");
  }

  const sorted = [...products].sort(SORTS[sortBy] || SORTS.newest);
  const hasFilters = q || category !== "All" || locationFilter || userLocation;

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Find something great, nearby</h1>
          <p className="mt-3 text-emerald-50/90 text-lg max-w-2xl mx-auto">
            Buy, sell or give away quality second-hand items from your community.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-16">
        {/* Filter card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search items, descriptions…"
                className={`${inputBase} pl-11`}
                aria-label="Search listings"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${inputBase} md:col-span-3`}
              aria-label="Category"
            >
              <option value="All">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <input
              value={userLocation ? "" : locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              disabled={!!userLocation}
              placeholder={userLocation ? "Using your location" : "City or area"}
              className={`${inputBase} md:col-span-2 disabled:bg-slate-100`}
              aria-label="Location"
            />

            <Link
              to="/create"
              className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <PlusIcon className="w-5 h-5" /> Sell item
            </Link>
          </div>

          {/* Nearby */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {userLocation ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 pl-3 pr-2 py-1.5 text-sm font-medium">
                <MapPinIcon className="w-4 h-4" /> Within {radius} km of you
                <button
                  onClick={() => setUserLocation(null)}
                  className="rounded-full p-0.5 hover:bg-emerald-100"
                  aria-label="Clear nearby filter"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ) : (
              <button
                onClick={useMyLocation}
                disabled={gettingLocation}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition disabled:opacity-60"
              >
                <MapPinIcon className="w-4 h-4" />
                {gettingLocation ? "Finding you…" : "Near me"}
              </button>
            )}

            <select
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Search radius"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
              {popularCategories.map((name) => (
                <button
                  key={name}
                  onClick={() => setCategory(category === name ? "All" : name)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    category === name
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results header */}
        <div className="mt-10 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {category !== "All" ? category : "All listings"}
              {q && <span className="text-slate-500 font-medium"> · “{q}”</span>}
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              {loading ? "Updating…" : `${sorted.length} ${sorted.length === 1 ? "item" : "items"} found`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProducts}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Sort"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="views">Most viewed</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center">
              <MagnifyingGlassIcon className="w-9 h-9 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No listings found</h3>
            <p className="text-slate-500 mt-2 mb-6 max-w-md mx-auto">
              {userLocation
                ? `Nothing within ${radius} km yet. Try a larger radius, or search by city name instead.`
                : hasFilters
                ? "Try changing your search or filters."
                : "No listings yet. Be the first to list an item!"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {hasFilters && (
                <button onClick={clearFilters} className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700 transition">
                  Clear filters
                </button>
              )}
              <Link to="/create" className="rounded-xl border border-emerald-600 px-6 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50 transition">
                List an item
              </Link>
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {sorted.map((product) => (
              <ProductCard key={product._id} item={product} userLocation={userLocation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
