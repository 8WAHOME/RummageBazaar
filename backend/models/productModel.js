import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true }, // Clerk user id

    sellerPhone: { type: String, required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },

    category: { type: String, required: true },
    condition: { type: String, default: "good" },

    // Must be an array of Cloudinary image URLs
    images: {
      type: [String],
      required: true,
    },

    location: { type: String, default: "" },

    ecoScore: { type: Number, default: 0 },
    status: { type: String, default: "available" },
  },
  { timestamps: true }
);

// Index for fast user product queries
productSchema.index({ userId: 1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
