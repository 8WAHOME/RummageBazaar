import React, { useEffect, useState } from "react";
import { api } from "../utils/api.js";
import { Link, useSearchParams } from "react-router-dom";
import Loader from "../components/loader.jsx";
import ProductCard from "../components/productCard.jsx";
import { categories, popularCategories } from "../utils/categories.js";
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
  XMarkIcon,
  MapPinIcon,
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
  'Baby & Kids': HeartIcon,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('search') || "");
  const [category, setCategory] = useState(searchParams.get('category') || "All");
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || "");
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(50); // Default 50km radius
  const [gettingLocation, setGettingLocation] = useState(false);

  // Load products with URL parameters
  useEffect(() => {
    loadProducts();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (category !== 'All') params.set('category', category);
    if (locationFilter) params.set('location', locationFilter);
    setSearchParams(params);
  }, [q, category, locationFilter, setSearchParams]);

  async function loadProducts() {
    try {
      let url = "/products";
      const params = new URLSearchParams();
      
      if (searchParams.get('category') && searchParams.get('category') !== 'All') {
        params.set('category', searchParams.get('category'));
      }
      if (searchParams.get('search')) {
        params.set('search', searchParams.get('search'));
      }
      if (searchParams.get('location')) {
        params.set('location', searchParams.get('location'));
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await api(url, "GET");
      setProducts(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Browse load:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        
        try {
          // Load products near user's location
          const res = await api(`/products/location?latitude=${latitude}&longitude=${longitude}&radius=${radius}&category=${category}`);
          setProducts(res.products || []);
        } catch (err) {
          console.error("Error loading nearby products:", err);
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please allow location access or search by location name.');
        setGettingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const clearLocationFilter = () => {
    setUserLocation(null);
    setLocationFilter("");
    loadProducts(); // Reload all products
  };

  const filtered = products.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (!q && !locationFilter) return true;
    
    const searchText = `${p.title} ${p.description} ${p.category} ${p.location}`.toLowerCase();
    const searchMatch = !q || searchText.includes(q.toLowerCase());
    const locationMatch = !locationFilter || p.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    return searchMatch && locationMatch;
  });

  const clearFilters = () => {
    setQ("");
    setCategory("All");
    setLocationFilter("");
    setUserLocation(null);
    setSearchParams({});
  };

  const hasActiveFilters = q || category !== "All" || locationFilter || userLocation;

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Discover Amazing Items
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find everything you need from our community of trusted sellers
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
            
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Listings
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by item, description, location..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full border border-gray-300 rounded-xl px-3 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="City, area..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link 
                to="/create" 
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Sell Item
              </Link>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Location Services Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-900">Find Items Near You</h4>
                  <p className="text-blue-700 text-sm">Discover listings in your area</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>Within 10km</option>
                  <option value={25}>Within 25km</option>
                  <option value={50}>Within 50km</option>
                  <option value={100}>Within 100km</option>
                </select>
                
                <button
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {gettingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Finding...
                    </>
                  ) : (
                    <>
                      <MapPinIcon className="w-4 h-4" />
                      Show Nearby
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Category Filters */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Popular Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {popularCategories.map((catName) => (
                <button
                  key={catName}
                  onClick={() => setCategory(catName)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    category === catName
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {catName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {userLocation ? `Items Within ${radius}km` : category !== 'All' ? category : 'All'} Listings
              {q && ` for "${q}"`}
              {locationFilter && ` in ${locationFilter}`}
            </h2>
            <p className="text-gray-600 mt-1">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'} found
              {products.length !== filtered.length && ` (filtered from ${products.length} total)`}
              {userLocation && ` near your location`}
            </p>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <option>Sort by: Newest</option>
              <option>Sort by: Price Low to High</option>
              <option>Sort by: Price High to Low</option>
              <option>Sort by: Distance</option>
              <option>Sort by: Most Viewed</option>
            </select>
          </div>
        </div>

        {/* Location Active Filter Badge */}
        {userLocation && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPinIcon className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Showing items within {radius}km of your location
                </span>
              </div>
              <button
                onClick={clearLocationFilter}
                className="text-green-700 hover:text-green-900 text-sm font-medium flex items-center gap-1"
              >
                <XMarkIcon className="w-4 h-4" />
                Clear location
              </button>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No listings found</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {q || category !== 'All' || locationFilter
                ? "Try adjusting your search criteria or browse all categories."
                : "Be the first to list an item in this category!"
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
              <Link
                to="/create"
                className="border-2 border-emerald-600 text-emerald-600 px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 hover:text-white transition-colors"
              >
                List Your Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product._id} item={product} />
            ))}
          </div>
        )}

        {/* Load More Section */}
        {filtered.length > 0 && filtered.length >= 12 && (
          <div className="text-center mt-12">
            <button className="bg-white text-emerald-600 border-2 border-emerald-600 px-8 py-3 rounded-xl font-semibold hover:bg-emerald-600 hover:text-white transition-all duration-200 transform hover:scale-105 shadow-lg">
              Load More Listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}