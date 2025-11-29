// backend/controllers/productController.js
import Product from "../models/productModel.js";
import mongoose from 'mongoose';

/* -----------------------------------------------------
   GET ALL PRODUCTS (Simplified - fix 500 error)
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    const { userId, status, category, search } = req.query;
    
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Simple search implementation
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json(products);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    return res.status(500).json({ 
      error: "Failed to load products.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/* -----------------------------------------------------
   GET SINGLE PRODUCT (with view tracking)
----------------------------------------------------- */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Increment views when product is viewed (async - don't wait)
    product.views += 1;
    product.save().catch(err => console.error("View count update failed:", err));

    return res.json(product);

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID." });
    }
    
    return res.status(500).json({ error: "Failed to fetch product." });
  }
};

/* -----------------------------------------------------
   CREATE PRODUCT
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

    // Enhanced validation with better error messages
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

    // Validate price unless it's a donation
    if (!isDonation && (!price || price < 0)) {
      return res.status(400).json({ error: "Valid price is required unless marked as donation" });
    }

    // For now, accept images as base64 strings without Cloudinary
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

    // Enhanced authorization check - fixed undefined 'user' variable
    const isOwner = product.userId === clerkUserId;
    
    if (!isOwner) {
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
   DELETE PRODUCT (with enhanced authorization)
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

    // Enhanced authorization check - fixed undefined 'user' variable
    const isOwner = product.userId === clerkUserId;
    
    if (!isOwner) {
      return res.status(403).json({ 
        error: "Not authorized to delete this product." 
      });
    }

    await Product.findByIdAndDelete(productId);

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
   GET SELLER ANALYTICS (enhanced)
----------------------------------------------------- */
export const getSellerAnalytics = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    const { userId } = req.params;

    // Verify the authenticated user is requesting their own analytics or is admin
    if (clerkUserId !== userId) {
      return res.status(403).json({ error: "Not authorized to view these analytics." });
    }

    const products = await Product.find({ userId });
    
    const soldProducts = products.filter(p => p.status === "sold");
    const activeProducts = products.filter(p => p.status === "active");
    const totalRevenue = soldProducts.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalViews = products.reduce((sum, item) => sum + (item.views || 0), 0);

    const analytics = {
      totalListings: products.length,
      soldItems: soldProducts.length,
      activeListings: activeProducts.length,
      totalRevenue,
      views: totalViews,
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
   UPDATE PRODUCT (Admin only - enhanced)
----------------------------------------------------- */
export const updateProduct = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Only allow admins to edit products
    if (clerkUserId !== 'admin') {
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