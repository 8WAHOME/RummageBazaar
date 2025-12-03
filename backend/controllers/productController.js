// backend/controllers/productController.js
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import rateLimit from 'express-rate-limit';

// Initialize cache with 5-minute TTL
const cache = new NodeCache({ stdTTL: 300 });

// Create rate limiters
export const viewCountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { 
    success: false, 
    error: 'Too many view count attempts. Please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createProductLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 product creations per hour
  message: { 
    success: false, 
    error: 'Too many products created. Please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to sanitize query parameters
const sanitizeQuery = (query) => {
  const sanitized = {};
  Object.keys(query).forEach(key => {
    if (typeof query[key] === 'string') {
      sanitized[key] = query[key].replace(/[${}<>]/g, '');
    } else {
      sanitized[key] = query[key];
    }
  });
  return sanitized;
};

// Logger utility
const logger = {
  info: (message, data) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },
  error: (message, error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`❌ ${message}`, error);
    }
  },
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🔍 ${message}`, data || '');
    }
  }
};

/* -----------------------------------------------------
   GET ALL PRODUCTS (with location-based filtering and pagination)
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    logger.info('GET /api/products called with query:', req.query);
    
    // Sanitize query parameters
    const sanitizedQuery = sanitizeQuery(req.query);
    const { 
      userId, 
      status, 
      category, 
      search,
      latitude,
      longitude,
      radius = 50,
      location,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1
    } = sanitizedQuery;
    
    // Check cache
    const cacheKey = `products_${JSON.stringify(sanitizedQuery)}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached products');
      return res.json(cachedData);
    }
    
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
      logger.info('Products collection does not exist yet');
      return res.json({
        success: true,
        products: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      });
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination metadata
    const total = await Product.countDocuments(filter);
    
    // Get products with pagination and sorting
    const products = await Product.find(filter)
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip(skip)
      .limit(parseInt(limit));
    
    logger.info(`Found ${products.length} products out of ${total}`);
    
    const response = {
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
    
    // Cache the response
    cache.set(cacheKey, response);
    
    return res.json(response);

  } catch (err) {
    logger.error("GET PRODUCTS ERROR:", err);
    
    if (err.message.includes('collection') && err.message.includes('not found')) {
      return res.json({
        success: true,
        products: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 20
        }
      });
    }
    
    return res.status(500).json({ 
      success: false,
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
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
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
      product.save().catch(err => logger.error("View count update failed:", err));
    }

    return res.json({
      success: true,
      product: productData
    });

  } catch (err) {
    logger.error("GET PRODUCT ERROR:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID." 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Failed to fetch product." 
    });
  }
};

/* -----------------------------------------------------
   CREATE PRODUCT (with location coordinates and user upgrade) - FIXED RESPONSE
----------------------------------------------------- */
export const createProduct = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Sanitize input
    const sanitizedBody = sanitizeQuery(req.body);
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
    } = sanitizedBody;

    // Input validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ 
        success: false,
        error: "Title must be at least 3 characters long." 
      });
    }

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ 
        success: false,
        error: "Description must be at least 10 characters long." 
      });
    }

    if (!sellerPhone) {
      return res.status(400).json({ 
        success: false,
        error: "Seller phone number is required." 
      });
    }

    if (!category) {
      return res.status(400).json({ 
        success: false,
        error: "Category is required." 
      });
    }

    if (!location) {
      return res.status(400).json({ 
        success: false,
        error: "Location is required." 
      });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "At least one image is required." 
      });
    }

    if (!isDonation && (!price || price < 0)) {
      return res.status(400).json({ 
        success: false,
        error: "Valid price is required unless marked as donation" 
      });
    }

    // Validate coordinates if provided
    if (coordinates && (!coordinates.latitude || !coordinates.longitude)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid coordinates provided." 
      });
    }

    const uploadedImages = images.filter(img => 
      img.startsWith("data:image") || img.startsWith("http")
    );

    if (uploadedImages.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "No valid images provided." 
      });
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
      coordinates: coordinates ? {
        type: "Point",
        coordinates: [parseFloat(coordinates.longitude), parseFloat(coordinates.latitude)]
      } : null,
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

    logger.info(`Product created: ${product.title} by user ${clerkUserId}`);
    if (userUpdate.role === 'seller') {
      logger.info(`User ${clerkUserId} upgraded to seller role`);
    }

    // Clear cache for products
    clearProductsCache();

    // Return product at root level AND in product property for compatibility
    return res.status(201).json({
      success: true,
      message: "Product listed successfully!",
      _id: product._id, // Root level for compatibility
      product: { // Also include in product property
        _id: product._id,
        title: product.title,
        price: product.price,
        category: product.category,
        location: product.location,
        images: product.images,
        isDonation: product.isDonation,
        status: product.status,
        userId: product.userId,
        views: product.views,
        createdAt: product.createdAt
      },
      userUpgraded: userUpdate.role === 'seller'
    });

  } catch (err) {
    logger.error("CREATE PRODUCT ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to create product. Please try again." 
    });
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
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

    const isOwner = product.userId === clerkUserId;
    const isAdmin = await User.isAdmin(clerkUserId);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Not authorized to mark this product as sold." 
      });
    }

    product.status = "sold";
    product.soldAt = new Date();
    await product.save();

    logger.info(`Product marked as sold: ${product.title}`);

    // Clear cache for products
    clearProductsCache();

    return res.json({ 
      success: true,
      message: "Product marked as sold successfully", 
      product 
    });

  } catch (err) {
    logger.error("MARK SOLD ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to mark as sold." 
    });
  }
};

/* -----------------------------------------------------
   DELETE PRODUCT (FIXED - with proper response structure)
----------------------------------------------------- */
export const deleteProduct = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

    const isOwner = product.userId === clerkUserId;
    const isAdmin = await User.isAdmin(clerkUserId);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false,
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

    logger.info(`Product deleted: ${product.title} by user ${clerkUserId}`);

    // Clear cache for products
    clearProductsCache();

    return res.json({ 
      success: true, 
      message: "Product deleted successfully",
      deletedProduct: {
        id: product._id,
        title: product.title
      }
    });

  } catch (err) {
    logger.error("DELETE PRODUCT ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to delete product. Please try again." 
    });
  }
};

/* -----------------------------------------------------
   GET SELLER ANALYTICS (optimized with aggregation)
----------------------------------------------------- */
export const getSellerAnalytics = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;
    const { userId } = req.params;

    // Verify the authenticated user is requesting their own analytics or is admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (clerkUserId !== userId && !isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Not authorized to view these analytics." 
      });
    }

    const analytics = await Product.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          soldItems: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] }
          },
          activeListings: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "sold"] },
                "$price",
                0
              ]
            }
          },
          totalViews: { $sum: "$views" },
          totalPrice: { $sum: "$price" },
          donationCount: {
            $sum: { $cond: ["$isDonation", 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalListings: 1,
          soldItems: 1,
          activeListings: 1,
          totalRevenue: 1,
          views: "$totalViews",
          averagePrice: {
            $cond: [
              { $gt: ["$totalListings", 0] },
              { $round: [{ $divide: ["$totalPrice", "$totalListings"] }, 0] },
              0
            ]
          },
          donationCount: 1
        }
      }
    ]);

    const result = analytics[0] || {
      totalListings: 0,
      soldItems: 0,
      activeListings: 0,
      totalRevenue: 0,
      views: 0,
      averagePrice: 0,
      donationCount: 0
    };

    return res.json({
      success: true,
      ...result
    });

  } catch (err) {
    logger.error("ANALYTICS ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to load analytics." 
    });
  }
};

/* -----------------------------------------------------
   INCREMENT VIEW COUNT
----------------------------------------------------- */
export const incrementViewCount = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

    product.views += 1;
    await product.save();

    return res.json({ 
      success: true, 
      views: product.views 
    });

  } catch (err) {
    logger.error("VIEW COUNT ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to update view count." 
    });
  }
};

/* -----------------------------------------------------
   ADMIN: GET PLATFORM ANALYTICS
----------------------------------------------------- */
export const getPlatformAnalytics = async (req, res) => {
  try {
    const auth = req.auth;
    const clerkUserId = auth?.userId;

    // Check cache for platform analytics
    const cacheKey = 'platform_analytics';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached platform analytics');
      return res.json(cachedData);
    }

    // Check if user is admin
    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }

    // Get all products
    const allProducts = await Product.find({});
    
    // Get all users
    const allUsers = await User.find({});
    
    // Calculate product statistics
    const activeListings = allProducts.filter(p => p.status === "active");
    const soldProducts = allProducts.filter(p => p.status === "sold");
    const totalRevenue = soldProducts.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalViews = allProducts.reduce((sum, item) => sum + (item.views || 0), 0);
    
    // Calculate user statistics
    const regularUsers = allUsers.filter(u => u.role === "user").length;
    const sellers = allUsers.filter(u => u.role === "seller").length;
    const admins = allUsers.filter(u => u.role === "admin").length;
    
    // Calculate category distribution
    const categoryDistribution = {};
    allProducts.forEach(product => {
      if (product.category) {
        categoryDistribution[product.category] = (categoryDistribution[product.category] || 0) + 1;
      }
    });
    
    // Calculate monthly growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthProducts = allProducts.filter(p => 
        p.createdAt >= monthStart && p.createdAt <= monthEnd
      );
      
      const monthSold = monthProducts.filter(p => p.status === "sold");
      const monthRevenue = monthSold.reduce((sum, item) => sum + (item.price || 0), 0);
      
      monthlyStats.push({
        month: month.toLocaleString('default', { month: 'short' }),
        year: month.getFullYear(),
        listings: monthProducts.length,
        sold: monthSold.length,
        revenue: monthRevenue
      });
    }

    // Calculate top performing categories
    const topCategories = Object.entries(categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Calculate average price by category
    const avgPriceByCategory = {};
    Object.keys(categoryDistribution).forEach(category => {
      const categoryProducts = allProducts.filter(p => p.category === category && p.price > 0);
      if (categoryProducts.length > 0) {
        avgPriceByCategory[category] = Math.round(
          categoryProducts.reduce((sum, item) => sum + item.price, 0) / categoryProducts.length
        );
      }
    });

    const analytics = {
      success: true,
      overview: {
        totalUsers: allUsers.length,
        totalListings: allProducts.length,
        activeListings: activeListings.length,
        soldItems: soldProducts.length,
        totalRevenue,
        totalViews,
        donationCount: allProducts.filter(p => p.isDonation).length,
        averagePrice: allProducts.length > 0 
          ? Math.round(allProducts.reduce((sum, item) => sum + (item.price || 0), 0) / allProducts.length)
          : 0,
      },
      userStats: {
        regularUsers,
        sellers,
        admins,
        newUsersLast30Days: allUsers.filter(u => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return u.createdAt >= thirtyDaysAgo;
        }).length,
        activeSellers: allUsers.filter(u => u.role === "seller" && u.totalListings > 0).length,
      },
      categoryStats: {
        totalCategories: Object.keys(categoryDistribution).length,
        topCategories,
        avgPriceByCategory,
      },
      monthlyGrowth: monthlyStats,
      performance: {
        conversionRate: allProducts.length > 0 
          ? Math.round((soldProducts.length / allProducts.length) * 100) 
          : 0,
        avgViewsPerListing: allProducts.length > 0 
          ? Math.round(totalViews / allProducts.length) 
          : 0,
        avgRevenuePerSale: soldProducts.length > 0 
          ? Math.round(totalRevenue / soldProducts.length) 
          : 0,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(`Platform analytics generated for admin ${clerkUserId}`);
    
    // Cache the analytics for 5 minutes
    cache.set(cacheKey, analytics);
    
    return res.json(analytics);

  } catch (err) {
    logger.error("GET PLATFORM ANALYTICS ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to load platform analytics" 
    });
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
      return res.status(403).json({ 
        success: false,
        error: "Only administrators can edit products." 
      });
    }

    const productId = req.params.id;
    const updates = sanitizeQuery(req.body);

    const product = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

    logger.info(`Product updated by admin: ${product.title}`);

    // Clear cache for products
    clearProductsCache();

    return res.json({ 
      success: true,
      message: "Product updated successfully", 
      product 
    });

  } catch (err) {
    logger.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to update product." 
    });
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
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }

    // Get pagination parameters
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments({})
    ]);

    res.json({
      success: true,
      products: products.map(product => ({
        ...product.toObject(),
        sellerInfo: {
          userId: product.userId,
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (err) {
    logger.error("GET ALL PRODUCTS ADMIN ERROR:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch products" 
    });
  }
};

/* -----------------------------------------------------
   GET PRODUCTS BY LOCATION (dedicated endpoint)
----------------------------------------------------- */
export const getProductsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, category } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        error: "Latitude and longitude are required" 
      });
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
      .hint({ coordinates: '2dsphere' }) // Use geospatial index
      .sort({ createdAt: -1 })
      .limit(100); // Limit results for performance

    logger.info(`Found ${products.length} products within ${radius}km of [${latitude}, ${longitude}]`);

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
    logger.error("GET PRODUCTS BY LOCATION ERROR:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to load products by location" 
    });
  }
};

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
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }

    const productId = req.params.id;
    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }

    // Clear cache for products
    clearProductsCache();

    res.json({
      success: true,
      message: "Product deleted by admin successfully",
      deletedProduct: {
        id: product._id,
        title: product.title
      }
    });

  } catch (err) {
    logger.error("DELETE PRODUCT ADMIN ERROR:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete product" 
    });
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

// Helper function to clear products cache
function clearProductsCache() {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.startsWith('products_')) {
      cache.del(key);
    }
  });
}
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