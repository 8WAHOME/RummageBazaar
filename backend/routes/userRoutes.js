// backend/routes/userRoutes.js
import express from "express";
import { syncUser } from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.post("/sync", requireAuth(), syncUser);

export default router;