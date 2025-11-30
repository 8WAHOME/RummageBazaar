// backend/controllers/userController.js
import User from "../models/userModel.js";

export const syncUser = async (req, res) => {
  try {
    const { id, email, firstName, lastName, imageUrl } = req.body;

    // Map frontend fields to backend model fields
    const clerkId = id;
    const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'User';
    const avatar = imageUrl;

    // Check if this should be an admin (based on email)
    const isAdmin = await checkIfAdmin(email);

    let user = await User.findOne({ clerkId });

    if (!user) {
      user = await User.create({ 
        clerkId, 
        email, 
        name, 
        avatar,
        role: isAdmin ? "admin" : "user", // Start as user, will become seller after first listing
        lastLogin: new Date()
      });
    } else {
      // Update existing user
      user.email = email;
      user.name = name;
      user.avatar = avatar;
      user.lastLogin = new Date();
      
      // Update role if email matches admin criteria
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
      
      await user.save();
    }

    return res.json({
      success: true,
      user: {
        id: user.clerkId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        isAdmin: user.role === 'admin',
        totalListings: user.totalListings || 0
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

// Update user to seller role after first listing
export const updateToSeller = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOneAndUpdate(
      { clerkId: userId, role: 'user' }, // Only update if currently a user
      { role: 'seller' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found or already a seller/admin" });
    }

    res.json({
      success: true,
      message: "User upgraded to seller successfully",
      user: {
        id: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("UPDATE TO SELLER ERROR:", err);
    res.status(500).json({ error: "Failed to update user role" });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    const { userId } = req.params;

    // Users can only view their own profile unless admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (clerkUserId !== userId && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to view this profile" });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user.clerkId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        isActive: user.isActive,
        totalListings: user.totalListings || 0,
        joinedDate: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (err) {
    console.error("GET USER PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Check if user is admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await User.find({}).select('-__v').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users: users.map(user => ({
        id: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        totalListings: user.totalListings || 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    });

  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    const { userId } = req.params;
    const { role } = req.body;

    // Check if requester is admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Validate role
    if (!['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      user: {
        id: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("UPDATE USER ROLE ERROR:", err);
    res.status(500).json({ error: "Failed to update user role" });
  }
};

// Helper function to determine admin status
async function checkIfAdmin(email) {
  if (!email) return false;
  
  // You can define admin emails in environment variables
  const adminEmails = process.env.ADMIN_EMAILS ? 
    process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : 
    ['8wahome@gmail.com', '8ndiritu@gmail.com'];
  
  console.log('Checking admin status for:', email.toLowerCase());
  console.log('Admin emails:', adminEmails);
  
  const isAdmin = adminEmails.includes(email.toLowerCase());
  console.log('Is admin?', isAdmin);
  
  return isAdmin;
}