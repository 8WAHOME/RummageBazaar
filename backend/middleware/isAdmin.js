module.exports = function (req, res, next) {
  if (!process.env.ADMIN_ID) return res.status(500).json({ message: "Admin not configured" });
  if (req.clerkUserId !== process.env.ADMIN_ID) return res.status(403).json({ message: "Not admin" });
  next();
};
