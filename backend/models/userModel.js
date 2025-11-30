// backend/models/userModel.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, index: true, unique: true },
    name: { type: String },
    email: { type: String, index: true },
    avatar: { type: String },
    bio: { type: String },
    role: { 
      type: String, 
      enum: ["user", "seller", "admin"], 
      default: "user" 
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    totalListings: { type: Number, default: 0 } // Track listings per user
  },
  { timestamps: true }
);

// Static method to check if user is admin
UserSchema.statics.isAdmin = async function(clerkId) {
  const user = await this.findOne({ clerkId });
  return user && user.role === 'admin';
};

const User = mongoose.model("User", UserSchema);

export default User;