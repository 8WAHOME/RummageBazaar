// backend/controllers/productController.js
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import mongoose from 'mongoose';

/* -----------------------------------------------------
   GET ALL PRODUCTS (with location-based filtering)
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    console.log('GET /api/products called with query:', req.query);
    
    const { 
      userId, 
      status, 
      category, 
      search,
      latitude,
      longitude,
      radius = 50, // Default 50km radius
      location // For text-based location search
    } = req.query;
    
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Location-based filtering
    if (latitude && longitude) {
      const maxDistance = parseInt(radius) * 1000; // Convert km to meters
      
      filter.coordinates = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance
        }
      };
    } else if (location) {
      // Text-based location search
      filter.location = { $regex: location, $options: 'i' };
    }

    // Check if Product collection exists and has documents
    const collectionExists = mongoose.connection.db.collection('products');
    if (!collectionExists) {
      console.log('Products collection does not exist yet');
      return res.json([]);
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    console.log(`Found ${products.length} products`);
    
    return res.json(products);

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    
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

    // Check if viewer is the seller or admin
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
   CREATE PRODUCT (with location coordinates and user upgrade)
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
      coordinates, // { latitude, longitude }
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

    // Create the product with location data
    const product = await Product.create({
      title: title.trim(),
      description: description.trim(),
      price: isDonation ? 0 : Number(price),
      sellerPhone,
      countryCode: countryCode || "+254",
      category,
      location,
      coordinates: coordinates || null, // Store coordinates if provided
      condition: condition || "good",
      images: uploadedImages,
      isDonation: isDonation || false,
      status: "active",
      userId: clerkUserId,
      views: 0
    });

    // Update user's listing count and upgrade to seller if first listing
    const userUpdate = await User.findOneAndUpdate(
      { clerkId: clerkUserId },
      { 
        $inc: { totalListings: 1 },
        ...(await shouldUpgradeToSeller(clerkUserId) && { role: 'seller' })
      },
      { new: true }
    );

    console.log(`Product created: ${product.title} by user ${clerkUserId}`);
    if (userUpdate.role === 'seller') {
      console.log(`User ${clerkUserId} upgraded to seller role`);
    }

    return res.status(201).json({
      success: true,
      message: "Product listed successfully!",
      product,
      userUpgraded: userUpdate.role === 'seller'
    });

  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to create product. Please try again." });
  }
};

/* -----------------------------------------------------
   MARK AS SOLD (with enhanced authorization - FIXED ADMIN ACCESS)
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
   DELETE PRODUCT (with enhanced authorization - FIXED ADMIN ACCESS)
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
    const isAdmin = await User.isAdmin(clerkUserId);
    if (clerkUserId !== userId && !isAdmin) {
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
   UPDATE PRODUCT (Admin only - FIXED)
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

/* -----------------------------------------------------
   GET PRODUCTS BY LOCATION (dedicated endpoint)
----------------------------------------------------- */
export const getProductsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, category } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const maxDistance = parseInt(radius) * 1000; // Convert km to meters
    
    const filter = {
      coordinates: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance
        }
      },
      status: "active"
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(100); // Limit results for performance

    console.log(`Found ${products.length} products within ${radius}km of [${latitude}, ${longitude}]`);

    res.json({
      success: true,
      products,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius)
      },
      count: products.length
    });

  } catch (err) {
    console.error("GET PRODUCTS BY LOCATION ERROR:", err);
    res.status(500).json({ error: "Failed to load products by location" });
  }
};

// Helper function to check if user should be upgraded to seller
async function shouldUpgradeToSeller(clerkUserId) {
  const user = await User.findOne({ clerkId: clerkUserId });
  if (!user) return false;
  
  // Don't upgrade admins
  if (user.role === 'admin') return false;
  
  // Upgrade if this is their first listing (totalListings will be 0 before increment)
  return user.totalListings === 0;
}
/* -----------------------------------------------------
   ADMIN: DELETE ANY PRODUCT
----------------------------------------------------- */
export const deleteProductAdmin = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Check if user is admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const productId = req.params.id;
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product deleted by admin successfully"
    });

  } catch (err) {
    console.error("DELETE PRODUCT ADMIN ERROR:", err);
    res.status(500).json({ error: "Failed to delete product" });
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