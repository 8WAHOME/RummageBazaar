import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, index: true, unique: true },
    name: { type: String },
    email: { type: String },
    avatar: { type: String },
    bio: { type: String },
    role: { type: String, enum: ["user", "seller", "admin"], default: "user" }
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
