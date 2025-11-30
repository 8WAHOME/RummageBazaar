import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    sellerPhone: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    condition: { type: String, default: "good" },
    
    // Location fields for distance calculation
    location: { type: String, default: "" },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    
    images: {
      type: [String],
      required: true,
    },

    ecoScore: { type: Number, default: 0 },
    
    status: { 
      type: String, 
      default: "active", 
      enum: ["active", "sold", "inactive"] 
    },
    
    views: { type: Number, default: 0 },
    soldAt: { type: Date },
    countryCode: { type: String, default: "+254" },
    isDonation: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index for fast user product queries
productSchema.index({ userId: 1, createdAt: -1 });
productSchema.index({ status: 1 });
productSchema.index({ status: 1, soldAt: -1 });
// Geospatial index for location-based queries
productSchema.index({ "coordinates": "2dsphere" });

const Product = mongoose.model("Product", productSchema);
export default Product;