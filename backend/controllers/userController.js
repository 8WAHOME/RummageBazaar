import User from "../models/userModel.js";

export const syncUser = async (req, res) => {
  try {
    const { clerkId, email, name, avatar } = req.body;

    let user = await User.findOne({ clerkId });

    if (!user) {
      user = await User.create({ clerkId, email, name, avatar });
    }

    return res.json(user);
  } catch (err) {
    console.error("USER SYNC ERROR:", err);
    return res.status(500).json({ error: "Failed to sync user" });
  }
};
