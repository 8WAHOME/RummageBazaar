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
  viewCountLimiter,
  createProductLimiter,
  deleteProductAdmin,
  getProductsByLocation,
  getPlatformAnalytics
} from "../controllers/productController.js";

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/location", getProductsByLocation);
router.get("/:id", getProductById);
router.post("/:id/view", viewCountLimiter, incrementViewCount);

// Protected routes
router.post("/", requireAuth(), createProductLimiter, createProduct);
router.patch("/:id/sold", requireAuth(), markProductAsSold);
router.delete("/:id", requireAuth(), deleteProduct);
router.get("/analytics/seller/:userId", requireAuth(), getSellerAnalytics);

// Admin only routes
router.get("/admin/all", requireAuth(), getAllProductsAdmin);
router.put("/:id", requireAuth(), updateProduct);
router.delete("/admin/:id", requireAuth(), deleteProductAdmin);
router.get("/analytics/platform", requireAuth(), getPlatformAnalytics);

export default router;