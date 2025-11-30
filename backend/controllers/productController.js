// backend/controllers/productController.js
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import mongoose from 'mongoose';

/* -----------------------------------------------------
   GET ALL PRODUCTS (with error handling for empty database)
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    console.log('GET /api/products called with query:', req.query);
    
    const { userId, status, category, search } = req.query;
    
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Check if Product collection exists and has documents
    const collectionExists = mongoose.connection.db.collection('products');
    if (!collectionExists) {
      console.log('Products collection does not exist yet');
      return res.json([]); // Return empty array instead of error
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    console.log(`Found ${products.length} products`);
    
    return res.json(products);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    
    // If it's a "collection not found" error, return empty array
    if (err.message.includes('collection') && err.message.includes('not found')) {
      return res.json([]);
    }
    
    return res.status(500).json({ 
      error: "Failed to load products.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* -----------------------------------------------------
   GET SINGLE PRODUCT (with view tracking and privacy)
----------------------------------------------------- */
export const getProductById = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Check if viewer is the seller
    const isSeller = product.userId === clerkUserId;
    const isAdmin = await User.isAdmin(clerkUserId);

    // Prepare response data
    const productData = product.toObject();
    
    // Hide views from non-sellers/non-admins
    if (!isSeller && !isAdmin) {
      delete productData.views;
    }

    // Increment views when product is viewed by non-sellers (async)
    if (!isSeller) {
      product.views += 1;
      product.save().catch(err => console.error("View count update failed:", err));
    }

    return res.json(productData);

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID." });
    }
    
    return res.status(500).json({ error: "Failed to fetch product." });
  }
};

/* -----------------------------------------------------
   CREATE PRODUCT (with user listing count update)
----------------------------------------------------- */
export const createProduct = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    const {
      title,
      description,
      price,
      sellerPhone,
      countryCode,
      category,
      location,
      condition,
      images,
      isDonation
    } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters long." });
    }

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: "Description must be at least 10 characters long." });
    }

    if (!sellerPhone) {
      return res.status(400).json({ error: "Seller phone number is required." });
    }

    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    if (!location) {
      return res.status(400).json({ error: "Location is required." });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one image is required." });
    }

    if (!isDonation && (!price || price < 0)) {
      return res.status(400).json({ error: "Valid price is required unless marked as donation" });
    }

    const uploadedImages = images.filter(img => 
      img.startsWith("data:image") || img.startsWith("http")
    );

    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: "No valid images provided." });
    }

    const product = await Product.create({
      title: title.trim(),
      description: description.trim(),
      price: isDonation ? 0 : Number(price),
      sellerPhone,
      countryCode: countryCode || "+254",
      category,
      location,
      condition: condition || "good",
      images: uploadedImages,
      isDonation: isDonation || false,
      status: "active",
      userId: clerkUserId,
      views: 0
    });

    // Update user's listing count
    await User.findOneAndUpdate(
      { clerkId: clerkUserId },
      { $inc: { totalListings: 1 } }
    );

    console.log(`Product created: ${product.title} by user ${clerkUserId}`);

    return res.status(201).json({
      success: true,
      message: "Product listed successfully!",
      product
    });

  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to create product. Please try again." });
  }
};

/* -----------------------------------------------------
   MARK AS SOLD (with enhanced authorization)
----------------------------------------------------- */
export const markProductAsSold = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const isOwner = product.userId === clerkUserId;
    const isAdmin = await User.isAdmin(clerkUserId);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: "Not authorized to mark this product as sold." 
      });
    }

    product.status = "sold";
    product.soldAt = new Date();
    await product.save();

    console.log(`Product marked as sold: ${product.title}`);

    return res.json({ 
      success: true,
      message: "Product marked as sold successfully", 
      product 
    });

  } catch (err) {
    console.error("MARK SOLD ERROR:", err);
    return res.status(500).json({ error: "Failed to mark as sold." });
  }
};

/* -----------------------------------------------------
   DELETE PRODUCT (with enhanced authorization and user count update)
----------------------------------------------------- */
export const deleteProduct = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const isOwner = product.userId === clerkUserId;
    const isAdmin = await User.isAdmin(clerkUserId);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: "Not authorized to delete this product." 
      });
    }

    await Product.findByIdAndDelete(productId);

    // Update user's listing count if owner deleted it
    if (isOwner) {
      await User.findOneAndUpdate(
        { clerkId: clerkUserId },
        { $inc: { totalListings: -1 } }
      );
    }

    console.log(`Product deleted: ${product.title} by user ${clerkUserId}`);

    return res.json({ 
      success: true, 
      message: "Product deleted successfully" 
    });

  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to delete product." });
  }
};

/* -----------------------------------------------------
   GET SELLER ANALYTICS (enhanced with unique email counting)
----------------------------------------------------- */
export const getSellerAnalytics = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    const { userId } = req.params;

    // Verify the authenticated user is requesting their own analytics or is admin
    if (clerkUserId !== userId && !(await User.isAdmin(clerkUserId))) {
      return res.status(403).json({ error: "Not authorized to view these analytics." });
    }

    const products = await Product.find({ userId });
    
    const soldProducts = products.filter(p => p.status === "sold");
    const activeProducts = products.filter(p => p.status === "active");
    const totalRevenue = soldProducts.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalViews = products.reduce((sum, item) => sum + (item.views || 0), 0);

    // Get user data for unique email counting
    const user = await User.findOne({ clerkId: userId });
    const totalListingsByEmail = user ? user.totalListings : products.length;

    const analytics = {
      totalListings: totalListingsByEmail, // Use user's listing count
      soldItems: soldProducts.length,
      activeListings: activeProducts.length,
      totalRevenue,
      views: totalViews, // Only seller/admin can see this
      averagePrice: products.length > 0 
        ? Math.round(products.reduce((sum, item) => sum + (item.price || 0), 0) / products.length)
        : 0,
      donationCount: products.filter(p => p.isDonation).length
    };

    return res.json(analytics);

  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    return res.status(500).json({ error: "Failed to load analytics." });
  }
};

/* -----------------------------------------------------
   INCREMENT VIEW COUNT
----------------------------------------------------- */
export const incrementViewCount = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    product.views += 1;
    await product.save();

    return res.json({ 
      success: true, 
      views: product.views 
    });

  } catch (err) {
    console.error("VIEW COUNT ERROR:", err);
    return res.status(500).json({ error: "Failed to update view count." });
  }
};

/* -----------------------------------------------------
   UPDATE PRODUCT (Admin only)
----------------------------------------------------- */
export const updateProduct = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Only allow admins to edit products
    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Only administrators can edit products." });
    }

    const productId = req.params.id;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    console.log(`Product updated by admin: ${product.title}`);

    return res.json({ 
      success: true,
      message: "Product updated successfully", 
      product 
    });

  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to update product." });
  }
};

/* -----------------------------------------------------
   ADMIN: GET ALL PRODUCTS (with user info)
----------------------------------------------------- */
export const getAllProductsAdmin = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Check if user is admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const products = await Product.find({}).sort({ createdAt: -1 });

    res.json({
      success: true,
      products: products.map(product => ({
        ...product.toObject(),
        sellerInfo: {
          userId: product.userId,
        }
      }))
    });

  } catch (err) {
    console.error("GET ALL PRODUCTS ADMIN ERROR:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// Delete product (DELETE /api/products/:id)
// export const deleteProduct = async (req, res) => {
//   try {
//     const auth = req.auth?.();
//     const clerkUserId = auth?.userId;

//     const productId = req.params.id;
//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ error: "Product not found." });

//     if (product.userId && clerkUserId && product.userId !== clerkUserId) {
//       return res.status(403).json({ error: "Unauthorized" });
//     }

//     await Product.deleteOne({ _id: productId });

//     return res.json({ ok: true });
//   } catch (err) {
//     console.error("DELETE PRODUCT ERROR:", err);
//     return res.status(500).json({ error: "Failed to delete product." });
//   }
// };