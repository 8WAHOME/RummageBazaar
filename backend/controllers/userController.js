// backend/controllers/userController.js
import User from "../models/userModel.js";

export const syncUser = async (req, res) => {
  try {
    const { id, email, firstName, lastName, imageUrl } = req.body;

    // Map frontend fields to backend model fields
    const clerkId = id;
    const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'User';
    const avatar = imageUrl;

    let user = await User.findOne({ clerkId });

    if (!user) {
      user = await User.create({ 
        clerkId, 
        email, 
        name, 
        avatar,
        role: "user" 
      });
    } else {
      // Update existing user
      user.email = email;
      user.name = name;
      user.avatar = avatar;
      await user.save();
    }

    return res.json({
      success: true,
      user: {
        id: user.clerkId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (err) {
    console.error("USER SYNC ERROR:", err);
    return res.status(500).json({ 
      error: "Failed to sync user",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};