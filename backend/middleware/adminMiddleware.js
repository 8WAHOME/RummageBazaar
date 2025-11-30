// backend/middleware/adminMiddleware.js
import User from "../models/userModel.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (err) {
    console.error("ADMIN MIDDLEWARE ERROR:", err);
    res.status(500).json({ error: "Server error checking admin status" });
  }
};