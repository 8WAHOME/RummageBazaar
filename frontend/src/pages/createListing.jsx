import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { api } from "../utils/api.js";
import ImageUpload from "../components/ImageUpload.jsx";
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
  PhotoIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  TagIcon,
  CheckBadgeIcon,
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

export default function CreateListing() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const editing = params.get("edit");

  const { user, session } = useClerk();

  useEffect(() => {
    if (editing) {
      alert("Editing is prohibited to maintain listing quality.");
      navigate("/dashboard");
    }
  }, [editing, navigate]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    sellerPhone: "",
    countryCode: "+254",
    category: "",
    condition: "good",
    location: "",
  });

  const [imagesBase64, setImagesBase64] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDonation, setIsDonation] = useState(false);

  const maxImages = 6;

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((s) => ({ ...s, [name]: checked }));
      return;
    }
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (
        !form.title ||
        !form.description ||
        (!form.price && !isDonation) ||
        !form.sellerPhone ||
        !form.category ||
        !form.location ||
        imagesBase64.length === 0
      ) {
        alert(
          "Please fill all required fields including location and at least one image. Price is required unless marking as donation."
        );
        setLoading(false);
        return;
      }

      const token = await session.getToken();

      const payload = {
        ...form,
        price: isDonation ? 0 : Number(form.price || 0),
        images: imagesBase64,
        isDonation: !!isDonation,
        userId: user?.id,
      };

      const res = await api("/products", "POST", payload, token);

      if (res?._id) {
        navigate(`/products/${res._id}?pending=true`);
      } else {
        alert("Listing created but response unexpected. Check server logs.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not create listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Create a New Listing
        </h2>
        <p className="text-gray-600">
          Fill in the details below to list your item
        </p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl shadow-lg p-6 space-y-8">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-emerald-600" />
            Title *
          </label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Enter item title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-emerald-600" />
            Description *
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={5}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Describe your item in detail"
          />
        </div>

        {/* Price & Seller Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />
              {isDonation ? "Price (Donation)" : "Price (KSH) *"}
            </label>
            <input
              name="price"
              value={form.price}
              onChange={onChange}
              type="number"
              disabled={isDonation}
              required={!isDonation}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Enter price"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <PhoneIcon className="w-5 h-5 text-emerald-600" />
              Seller Phone *
            </label>
            <div className="flex">
              <select 
                name="countryCode"
                value={form.countryCode}
                onChange={onChange}
                className="border border-gray-300 rounded-l-lg px-3 py-3 bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="+254">+254 (KE)</option>
                <option value="+255">+255 (TZ)</option>
                <option value="+256">+256 (UG)</option>
                <option value="+257">+257 (BI)</option>
                <option value="+250">+250 (RW)</option>
                <option value="+211">+211 (SS)</option>
              </select>
              <input
                name="sellerPhone"
                value={form.sellerPhone}
                onChange={onChange}
                required
                placeholder="712345678"
                className="flex-1 border border-gray-300 rounded-r-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Enter phone number without country code</p>
          </div>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-emerald-600" />
              Category *
            </label>
            <select
              name="category"
              value={form.category}
              onChange={onChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <CheckBadgeIcon className="w-5 h-5 text-emerald-600" />
              Condition
            </label>
            <select
              name="condition"
              value={form.condition}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="needs-repair">Needs Repair</option>
            </select>
          </div>
        </div>

        {/* Donation Checkbox */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isDonation}
              onChange={(e) => setIsDonation(e.target.checked)}
              className="rounded focus:ring-2 focus:ring-emerald-500 text-emerald-600"
            />
            <span className="text-sm font-medium text-gray-800">This is a donation (item will be listed for free)</span>
          </label>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-emerald-600" />
            Location *
          </label>
          <input
            name="location"
            value={form.location}
            onChange={onChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Enter item location"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-emerald-600" />
            Images *
          </label>
          <ImageUpload maxFiles={maxImages} onChange={(base64Arr) => setImagesBase64(base64Arr)} />
          <p className="text-xs text-gray-500 mt-2">At least one image is required. Maximum {maxImages} images.</p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 text-white px-8 py-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Listing...
              </>
            ) : (
              <>
                <CubeIcon className="w-5 h-5" />
                Create Listing
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}