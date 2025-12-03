// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import ProductCard from "../components/productCard";
import Loader from "../components/loader";
import { Link } from "react-router-dom";
import { categories, popularCategories } from "../utils/categories";
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

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredItems, setFeaturedItems] = useState([]);

  async function load() {
    try {
      const data = await api("/products");
      console.log("Home API Response:", data); // Debug log
      
      // Handle different response formats
      let products = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data && data.products) {
        products = data.products;
      } else if (data && data.success && data.products) {
        products = data.products;
      }
      
      console.log("Processed products:", products); // Debug log
      
      // Validate and fix product images
      const validatedProducts = products.map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : 
               product.image ? [product.image] : 
               ['/api/placeholder/400/300'],
        price: product.price || 0,
        title: product.title || 'Untitled Item',
        location: product.location || 'Location not specified'
      }));
      
      setItems(validatedProducts);
      setFeaturedItems(validatedProducts.slice(0, 8));
    } catch (err) {
      console.error("Home load error", err);
      setItems([]);
      setFeaturedItems([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>

        <div className="relative max-w-7xl mx-auto px-4 py-24 lg:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Welcome to{" "}
            <span className="block bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent">
              RummageBazaar
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-emerald-100 max-w-3xl mx-auto">
            Your premier marketplace for Donation, Buying and Selling quality items.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/browse"
              className="bg-white text-emerald-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-2"
            >
              <ShoppingBagIcon className="w-5 h-5" />
              Start Shopping
            </Link>

            <Link
              to="/create"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-emerald-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <CubeIcon className="w-5 h-5" />
              Sell an Item
            </Link>
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Popular Categories
          </h2>
          <p className="text-xl text-gray-600">
            Explore top categories filled with quality items.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {popularCategories.map((catName) => {
            const IconComponent = categoryIcons[catName] || CubeIcon;
            return (
              <Link
                key={catName}
                to={`/browse?category=${encodeURIComponent(catName)}`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 border border-gray-100"
              >
                <div className="p-6 text-center">
                  {/* Professional Icon Container */}
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="font-bold text-gray-800 group-hover:text-emerald-700 transition-colors text-sm leading-tight">
                    {catName}
                  </h3>
                  
                  {/* View More Indicator */}
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs text-emerald-600 font-semibold">
                      View Items →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED LISTINGS */}
      <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24 bg-white rounded-3xl shadow-sm -mt-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Fresh Listings
          </h2>
          <p className="text-xl text-gray-600">Recently added items you might love.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : featuredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <CubeIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No listings yet</h3>
            <p className="text-gray-500 mb-6">Be the first to list an item!</p>
            <Link
              to="/create"
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CubeIcon className="w-4 h-4" />
              Create First Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredItems.map((item) => (
              <ProductCard key={item._id} item={item} />
            ))}
          </div>
        )}

        {!loading && featuredItems.length > 0 && (
          <div className="text-center mt-12">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-700 transform hover:scale-105 shadow-lg transition-all"
            >
              <ShoppingBagIcon className="w-5 h-5" />
              View All Listings →
            </Link>
          </div>
        )}
      </section>

      {/* STATS SECTION */}
      <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { icon: ShoppingBagIcon, value: "1000+", label: "Active Listings" },
            { icon: HeartIcon, value: "98%", label: "Satisfied Users" },
            { icon: GlobeAltIcon, value: "50+", label: "Cities Covered" },
            { icon: TrophyIcon, value: "4.9/5", label: "User Rating" },
          ].map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold text-emerald-600 mb-2">{stat.value}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Find Your Next Treasure?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands of Donators Buyers and Sellers on RummageBazaar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/browse"
              className="bg-white text-emerald-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBagIcon className="w-5 h-5" />
              Browse Listings
            </Link>
            <Link
              to="/create"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CubeIcon className="w-5 h-5" />
              Start Selling
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}