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
  const [coordinates, setCoordinates] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const maxImages = 6;

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not supported by your browser', 'warning');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });
        
        // Reverse geocode to get address
        reverseGeocode(latitude, longitude);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMsg = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Location request timed out.';
            break;
          default:
            errorMsg += 'Please enter your location manually.';
        }
        
        showNotification(errorMsg, 'error');
        setGettingLocation(false);
      },
      { 
        timeout: 10000,
        enableHighAccuracy: true 
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setForm(prev => ({ ...prev, location: data.display_name }));
        showNotification('Location detected successfully!', 'success');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

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
  setErrorMessage("");

  // Validate required fields
  if (
    !form.title ||
    !form.description ||
    (!form.price && !isDonation) ||
    !form.sellerPhone ||
    !form.category ||
    !form.location ||
    imagesBase64.length === 0
  ) {
    showNotification(
      "Please fill all required fields including location and at least one image.",
      'error'
    );
    setLoading(false);
    return;
  }

  // Validate phone number
  const phoneRegex = /^(0|7|1)\d{8}$/;
  if (!phoneRegex.test(form.sellerPhone.replace(/\s/g, ''))) {
    showNotification(
      "Please enter a valid Kenyan phone number (10 digits starting with 0, 7, or 1)",
      'error'
    );
    setLoading(false);
    return;
  }

  // Validate price if not donation
  if (!isDonation && (Number(form.price) <= 0 || Number(form.price) > 100000000)) {
    showNotification(
      "Please enter a valid price between KSH 1 and KSH 100,000,000",
      'error'
    );
    setLoading(false);
    return;
  }

  // Validate description length
  if (form.description.length < 10) {
    showNotification(
      "Description must be at least 10 characters long",
      'error'
    );
    setLoading(false);
    return;
  }

  // Validate title length
  if (form.title.length < 3) {
    showNotification(
      "Title must be at least 3 characters long",
      'error'
    );
    setLoading(false);
    return;
  }

  try {
    const token = await session.getToken();

    const payload = {
      ...form,
      price: isDonation ? 0 : Number(form.price || 0),
      images: imagesBase64,
      isDonation: !!isDonation,
      userId: user?.id,
      coordinates: coordinates,
    };

    console.log('Creating listing with payload:', {
      ...payload,
      images: `[${payload.images.length} images]`
    });

    const res = await api("/products", "POST", payload, token);
    console.log('Server response:', res);

    // Handle different response formats
    if (res?.success) {
      const productId = res._id || res.product?._id;
      
      if (productId) {
        showNotification(
          `🎉 Listing created successfully! ${res.userUpgraded ? 'You are now a verified seller!' : ''}`,
          'success'
        );
        
        // Clear form
        setForm({
          title: "",
          description: "",
          price: "",
          sellerPhone: "",
          countryCode: "+254",
          category: "",
          condition: "good",
          location: "",
        });
        setImagesBase64([]);
        setIsDonation(false);
        setCoordinates(null);
        
        // Navigate to the product page with success state
        setTimeout(() => {
          navigate(`/products/${productId}?created=true`);
        }, 1500);
      } else {
        showNotification('Listing created but no product ID returned.', 'warning');
        navigate("/dashboard");
      }
    } else {
      showNotification(res?.error || 'Failed to create listing', 'error');
    }

  } catch (err) {
    console.error("Create listing error:", err);
    
    let errorMsg = "Could not create listing. Please try again.";
    if (err.message) {
      try {
        const errorData = JSON.parse(err.message);
        errorMsg = errorData.error || errorMsg;
      } catch {
        errorMsg = err.message || errorMsg;
      }
    }
    
    showNotification(errorMsg, 'error');
    setErrorMessage(errorMsg);
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
        
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {errorMessage}
          </div>
        )}
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
            maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Enter item title (e.g., iPhone 13 Pro Max - 256GB)"
          />
          <p className="text-xs text-gray-500 mt-1">Be descriptive and specific</p>
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
            minLength={10}
            maxLength={1000}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Describe your item in detail (condition, features, any defects, reason for selling)"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 10 characters. Include all relevant details.</p>
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
              min="0"
              max="100000000"
              step="1"
              disabled={isDonation}
              required={!isDonation}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="Enter price (e.g., 25000)"
            />
            <p className="text-xs text-gray-500 mt-1">Enter amount in Kenyan Shillings</p>
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
                pattern="[0-9]{9,10}"
                title="Enter phone number without leading 0 (e.g., 712345678)"
                placeholder="712345678"
                className="flex-1 border border-gray-300 rounded-r-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Enter phone number without country code (9-10 digits)</p>
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
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDonation}
              onChange={(e) => setIsDonation(e.target.checked)}
              className="rounded focus:ring-2 focus:ring-emerald-500 text-emerald-600 w-5 h-5 cursor-pointer"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">This is a donation (item will be listed for free)</span>
              <p className="text-xs text-gray-600 mt-1">Check this if you're giving away the item for free</p>
            </div>
          </label>
        </div>

        {/* Location Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-emerald-600" />
            Location *
          </label>
          
          <div className="space-y-4">
            {/* Auto-detect Location Button */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="flex items-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {gettingLocation ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Detecting Location...
                </>
              ) : (
                <>
                  <MapPinIcon className="w-5 h-5" />
                  Use My Current Location
                </>
              )}
            </button>

            {/* Location Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Address *
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={onChange}
                placeholder="Enter your location (e.g., Nairobi, Kenya or Westlands, Nairobi)"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                This helps buyers find items near them. Be specific (City, Area, Landmark)
              </p>
            </div>

            {/* Coordinates Display */}
            {coordinates && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckBadgeIcon className="w-4 h-4" />
                  <span>Location detected: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-emerald-600" />
            Images *
          </label>
          <ImageUpload maxFiles={maxImages} onChange={(base64Arr) => setImagesBase64(base64Arr)} />
          <p className="text-xs text-gray-500 mt-2">
            At least one image is required. Maximum {maxImages} images. 
            Use clear, well-lit photos from multiple angles.
          </p>
          
          {/* Show image count */}
          {imagesBase64.length > 0 && (
            <div className="mt-2 text-sm text-emerald-600 font-medium">
              {imagesBase64.length} image{imagesBase64.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Form Validation Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Before submitting, ensure:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              Title is descriptive (3+ characters)
            </li>
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              Description is detailed (10+ characters)
            </li>
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              Price is set (unless donation)
            </li>
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              Valid phone number entered
            </li>
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              Category selected
            </li>
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              Location provided
            </li>
            <li className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4" />
              At least one image uploaded
            </li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          
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