// src/pages/createListing.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { api } from "../utils/api.js";
import ImageUpload from "../components/ImageUpload.jsx";

export default function CreateListing() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const editing = params.get("edit");

  const { user, session } = useClerk();

  // Effect to handle editing check
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
    category: "",
    condition: "good",
    location: "",
  });

  const [imagesBase64, setImagesBase64] = useState([]); // array of base64 strings
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
      // validation
      if (
        !form.title ||
        !form.description ||
        (!form.price && !isDonation) ||
        !form.sellerPhone ||
        !form.category
      ) {
        alert(
          "Please fill required fields. Price is required unless marking as donation (tick Donate)."
        );
        setLoading(false);
        return;
      }

      const token = await session.getToken();

      // Build payload: images is array of base64 strings
      const payload = {
        ...form,
        price: isDonation ? 0 : Number(form.price || 0),
        images: imagesBase64, // backend expects base64 strings
        isDonation: !!isDonation,
        userId: user?.id, // fallback, backend prefers Clerk auth
      };

      const res = await api("/products", "POST", payload, token);

      if (res?._id) {
        // Navigate to product page with pending flag — informs user editing is disabled
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
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Create a New Listing</h2>

      <form onSubmit={submit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={5}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Price & Seller Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price (KSH)</label>
            <input
              name="price"
              value={form.price}
              onChange={onChange}
              type="number"
              disabled={isDonation}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Seller Phone</label>
            <input
              name="sellerPhone"
              value={form.sellerPhone}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Condition</label>
            <select
              name="condition"
              value={form.condition}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>
        </div>

        {/* Donation Checkbox */}
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isDonation}
              onChange={(e) => setIsDonation(e.target.checked)}
            />
            <span className="text-sm">This is a donation (item will be listed for free)</span>
          </label>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            name="location"
            value={form.location}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Image Upload */}
        <ImageUpload maxFiles={maxImages} onChange={(base64Arr) => setImagesBase64(base64Arr)} />

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700"
          >
            {loading ? "Saving..." : "Create Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}