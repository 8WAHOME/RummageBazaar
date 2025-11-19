// backend/routes/productRoutes.js
import express from "express";
import { requireAuth } from "@clerk/express";
import Product from "../models/productModel.js";

import {
  createProduct,
  getProducts,
  getProductById,
  markProductAsSold
} from "../controllers/productController.js";

const router = express.Router();

/**
 * GET ALL PRODUCTS or USER PRODUCTS
 * /products
 * /products?userId=xxxx
 */
router.get("/", async (req, res) => {
  const { userId } = req.query;

  try {
    const filter = userId ? { userId } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// GET single product
router.get("/:id", getProductById);

// Create product
router.post("/", requireAuth(), createProduct);

// Mark as sold
router.patch("/:id/sold", requireAuth(), markProductAsSold);

// Delete listing
router.delete("/:id", requireAuth(), async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;


// router.delete("/:id", requireAuth(), deleteProduct);



