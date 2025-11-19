import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();


// Middleware
app.use(cors());
app.use(express.json({limit : '500mb'}));  // Increased limit for image uploads

// Clerk Middleware – REQUIRED & CORRECT
app.use(clerkMiddleware());

// Routes
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);


app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Base route
app.get("/", (req, res) => {
  res.send("RummageBazaar API is running...");
});

// Connect to MongoDB & Start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.log(err));
