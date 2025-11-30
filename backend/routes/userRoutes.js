// backend/routes/userRoutes.js
import express from "express";
import { 
  syncUser, 
  getUserProfile,
  getAllUsers, 
  updateUserRole 
} from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// User sync
router.post("/sync", requireAuth(), syncUser);

// Get user profile
router.get("/profile/:userId", requireAuth(), getUserProfile);

// Admin routes
router.get("/", requireAuth(), getAllUsers);
router.patch("/:userId/role", requireAuth(), updateUserRole);

export default router;