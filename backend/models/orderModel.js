const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: String, required: true, index: true },   // Clerk user id
    sellerId: { type: String, required: true, index: true },  // Clerk user id
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["pending","accepted","shipped","delivered","cancelled"], default: "pending" },
    shippingAddress: { type: String, default: "" }, // optional for COD/ship
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
