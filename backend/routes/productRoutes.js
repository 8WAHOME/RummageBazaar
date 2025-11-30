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
  incrementViewCount,
  getAllProductsAdmin,
  deleteProductAdmin,
  getProductsByLocation
} from "../controllers/productController.js";

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/location", getProductsByLocation); // New location-based endpoint
router.get("/:id", getProductById);
router.post("/:id/view", incrementViewCount);

// Protected routes
router.post("/", requireAuth(), createProduct);
router.patch("/:id/sold", requireAuth(), markProductAsSold);
router.delete("/:id", requireAuth(), deleteProduct);
router.get("/analytics/seller/:userId", requireAuth(), getSellerAnalytics);

// Admin only routes
router.get("/admin/all", requireAuth(), getAllProductsAdmin);
router.put("/:id", requireAuth(), updateProduct);
router.delete("/admin/:id", requireAuth(), deleteProductAdmin);

export default router;