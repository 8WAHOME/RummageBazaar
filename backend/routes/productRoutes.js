// backend/routes/productRoutes.js
import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createProduct,
  getProducts,
  getProductById,
  markProductAsSold,
  deleteProduct,
  getSellerAnalytics,
  updateProduct,
  incrementViewCount
} from "../controllers/productController.js";

const router = express.Router();

// GET all products with advanced filtering
router.get("/", getProducts);

// GET single product
router.get("/:id", getProductById);

// INCREMENT view count
router.post("/:id/view", incrementViewCount);

// CREATE product
router.post("/", requireAuth(), createProduct);

// MARK AS SOLD
router.patch("/:id/sold", requireAuth(), markProductAsSold);

// DELETE product
router.delete("/:id", requireAuth(), deleteProduct);

// GET seller analytics
router.get("/analytics/seller/:userId", requireAuth(), getSellerAnalytics);

// UPDATE product (admin only)
router.put("/:id", requireAuth(), updateProduct);

export default router;