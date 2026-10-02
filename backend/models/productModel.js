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

    // Location
    location: { type: String, default: "" },

    // Plain coordinates: what the frontend sends and displays
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },

    // GeoJSON copy of the same point, used ONLY for radius queries.
    // GeoJSON order is [longitude, latitude]. No defaults, so listings without
    // coordinates simply have no `geo` field (and are skipped by the 2dsphere index).
    geo: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number], default: undefined }
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

// Indexes
productSchema.index({ userId: 1, createdAt: -1 });
productSchema.index({ status: 1 });
productSchema.index({ status: 1, soldAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ geo: "2dsphere" });
// Required by `search` ($text) in getProducts
productSchema.index({ title: "text", description: "text", location: "text" });

// Used by markProductAsSold (it was called in the controller but never defined)
productSchema.methods.markAsSold = function () {
  this.status = "sold";
  this.soldAt = new Date();
  return this.save();
};

// Used by getProductsByLocation (it was called in the controller but never defined)
productSchema.statics.findNearby = function (longitude, latitude, radiusKm = 50, options = {}) {
  const filter = {
    status: "active",
    geo: {
      $geoWithin: {
        $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], radiusKm / 6378.1]
      }
    }
  };
  if (options.category) filter.category = options.category;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .lean();
};

const Product = mongoose.model("Product", productSchema);
export default Product;