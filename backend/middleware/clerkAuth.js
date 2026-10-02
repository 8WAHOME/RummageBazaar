// backend/middleware/clerkAuth.js
import { getAuth } from "@clerk/express";

// Protects a route: returns 401 JSON for unauthenticated requests.
// (requireAuth() from Clerk redirects to a sign-in page instead, which breaks fetch/axios calls.)
// Requires clerkMiddleware() to be mounted globally in server.js.
export default function clerkAuth(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}