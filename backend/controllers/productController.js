// backend/controllers/productController.js - OPTIMIZED (Part 1)
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import rateLimit from 'express-rate-limit';
import { getAuth, clerkClient } from '@clerk/express';

// CACHE CONFIGURATION - Optimized
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
  deleteOnExpire: true,
  maxKeys: 200
});

// RATE LIMITERS
export const viewCountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { 
    success: false, 
    error: 'Too many view count attempts. Please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

export const createProductLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { 
    success: false, 
    error: 'Too many products created. Please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// HELPER FUNCTIONS

// Sanitize query parameters
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
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  error: (message, error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[ERROR] ${message}`, error);
    }
  },
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
  warn: (message, data) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }
};

// Clear products cache
function clearProductsCache() {
  const keys = cache.keys();
  let cleared = 0;
  keys.forEach(key => {
    if (key.startsWith('products_') || key.startsWith('platform_analytics')) {
      cache.del(key);
      cleared++;
    }
  });
  if (cleared > 0) {
    logger.info(`Cleared ${cleared} cache entries`);
  }
}

// Make sure a Mongo user exists for this Clerk user (covers a fresh/empty database
// or a user who never hit /api/users/sync). Never throws: listing must not fail because of this.
async function ensureUserExists(clerkUserId) {
  try {
    const existing = await User.findOne({ clerkId: clerkUserId }).select('_id').lean();
    if (existing) return;

    const cu = await clerkClient.users.getUser(clerkUserId);
    const email = cu.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)?.emailAddress
      || cu.emailAddresses?.[0]?.emailAddress;
    const name = [cu.firstName, cu.lastName].filter(Boolean).join(' ') || 'User';

    await User.create({
      clerkId: clerkUserId,
      email,
      name,
      avatar: cu.imageUrl,
      role: 'user',
      lastLogin: new Date()
    });
    logger.info(`Lazily created missing user record for ${clerkUserId}`);
  } catch (error) {
    if (error?.code !== 11000) { // 11000 = duplicate key (created concurrently) - fine
      logger.warn('ensureUserExists failed (continuing):', error.message);
    }
  }
}

// Check if user should be upgraded to seller
async function shouldUpgradeToSeller(clerkUserId) {
  try {
    const user = await User.findOne({ clerkId: clerkUserId }).lean();
    if (!user) return false;
    
    if (user.role === 'admin') return false;
    
    return user.totalListings === 0;
  } catch (error) {
    logger.error('Error checking seller upgrade:', error);
    return false;
  }
}

// GET ALL PRODUCTS - OPTIMIZED
export const getProducts = async (req, res) => {
  try {
    const startTime = Date.now();
    logger.info('GET /api/products called with query:', req.query);
    
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
    
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(100, Math.max(1, parseInt(limit)));
    
    const cacheKey = `products_${JSON.stringify(sanitizedQuery)}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info(`Cache HIT - Returned in ${Date.now() - startTime}ms`);
      return res.json(cachedData);
    }
    
    logger.info('Cache MISS - Querying database');
    
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (category && category !== 'All') filter.category = category;
    
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = Math.max(1, parseInt(radius) || 50);

      if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, error: "Invalid latitude/longitude." });
      }

      // $geoWithin + $centerSphere instead of $near:
      // countDocuments() does not support $near/$nearSphere (it throws), which made the
      // whole request fail. $geoWithin works with find() AND countDocuments(), and needs no
      // special index. Earth radius = 6378.1 km, so the radius is passed in radians.
      filter.geo = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusKm / 6378.1]
        }
      };
    } else if (location && location.trim()) {
      filter.location = { $regex: location.trim(), $options: 'i' };
    }

    const skip = (validPage - 1) * validLimit;
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('title price images category location status isDonation userId views createdAt coordinates')
        .sort({ [sortBy]: parseInt(sortOrder) })
        .skip(skip)
        .limit(validLimit)
        .lean(),
      Product.countDocuments(filter)
    ]);
    
    const queryTime = Date.now() - startTime;
    logger.info(`Query completed in ${queryTime}ms - Found ${products.length}/${total} products`);
    
    const response = {
      success: true,
      products,
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(total / validLimit),
        totalItems: total,
        itemsPerPage: validLimit
      },
      _meta: {
        queryTime: `${queryTime}ms`,
        cached: false
      }
    };
    
    cache.set(cacheKey, response);
    
    return res.json(response);

  } catch (err) {
    logger.error("GET PRODUCTS ERROR:", err);
    
    if (err.name === 'MongoServerError' && err.code === 27) {
      logger.warn('Text index not found - falling back to regex search');
      return res.json({
        success: true,
        products: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(req.query.limit || 20)
        },
        warning: 'Search functionality temporarily unavailable'
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Failed to load products.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET SINGLE PRODUCT - OPTIMIZED
export const getProductById = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID format." 
      });
    }
    
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

    const isSeller = product.userId === clerkUserId;
    let isAdmin = false;
    
    if (clerkUserId) {
      isAdmin = await User.isAdmin(clerkUserId);
    }

    const productData = { ...product };
    
    if (!isSeller && !isAdmin) {
      delete productData.views;
    }

    if (!isSeller && clerkUserId) {
      Product.findByIdAndUpdate(
        req.params.id, 
        { $inc: { views: 1 } },
        { new: false }
      ).catch(err => logger.error("View count update failed:", err));
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

// CREATE PRODUCT - OPTIMIZED
export const createProduct = async (req, res) => {
  try {
    const startTime = Date.now();
    const { userId: clerkUserId } = getAuth(req);

    if (!clerkUserId) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required." 
      });
    }

    const sanitizedBody = sanitizeQuery(req.body);
    const {
      title,
      description,
      price,
      sellerPhone,
      countryCode,
      category,
      location,
      coordinates,
      condition,
      images,
      isDonation
    } = sanitizedBody;

    // VALIDATION
    
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

    if (coordinates) {
      const { latitude, longitude } = coordinates;
      if (!latitude || !longitude || 
          latitude < -90 || latitude > 90 ||
          longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid coordinates provided." 
        });
      }
    }

    const uploadedImages = images.filter(img => 
      typeof img === 'string' && (img.startsWith("data:image") || img.startsWith("http"))
    );

    if (uploadedImages.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "No valid images provided." 
      });
    }

    // CREATE PRODUCT
    
    const productData = {
      title: title.trim(),
      description: description.trim(),
      price: isDonation ? 0 : Number(price),
      sellerPhone: sellerPhone.trim(),
      countryCode: countryCode || "+254",
      category,
      location: location.trim(),
      condition: condition || "good",
      images: uploadedImages,
      isDonation: isDonation || false,
      status: "active",
      userId: clerkUserId,
      views: 0
    };

    if (coordinates && coordinates.latitude && coordinates.longitude) {
      const lat = parseFloat(coordinates.latitude);
      const lng = parseFloat(coordinates.longitude);
      productData.coordinates = { latitude: lat, longitude: lng };
      // GeoJSON copy for radius queries ([longitude, latitude] order)
      productData.geo = { type: "Point", coordinates: [lng, lat] };
    }

    const product = await Product.create(productData);

    // UPDATE USER
    
    await ensureUserExists(clerkUserId);

    const shouldUpgrade = await shouldUpgradeToSeller(clerkUserId);
    
    const userUpdate = await User.findOneAndUpdate(
      { clerkId: clerkUserId },
      { 
        $inc: { totalListings: 1 },
        ...(shouldUpgrade && { role: 'seller' })
      },
      { new: true, upsert: false }
    );

    const creationTime = Date.now() - startTime;
    logger.info(`Product created in ${creationTime}ms: "${product.title}" by ${clerkUserId}`);
    
    if (userUpdate?.role === 'seller') {
      logger.info(`User ${clerkUserId} upgraded to seller role`);
    }

    clearProductsCache();

    return res.status(201).json({
      success: true,
      message: "Product listed successfully!",
      _id: product._id,
      product: {
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
        createdAt: product.createdAt,
        coordinates: product.coordinates
      },
      userUpgraded: shouldUpgrade,
      _meta: {
        creationTime: `${creationTime}ms`
      }
    });

  } catch (err) {
    logger.error("CREATE PRODUCT ERROR:", err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: "Validation error",
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Failed to create product. Please try again.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// backend/controllers/productController.js - OPTIMIZED (Part 2)
// CONTINUE FROM PART 1 - Add these exports after createProduct

// MARK AS SOLD - OPTIMIZED
export const markProductAsSold = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID." 
      });
    }
    
    const product = await Product.findById(req.params.id);
    
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

    await product.markAsSold();

    logger.info(`Product marked as sold: "${product.title}"`);

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

// DELETE PRODUCT - OPTIMIZED
export const deleteProduct = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID." 
      });
    }

    const product = await Product.findById(req.params.id).lean();
    
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

    await Product.findByIdAndDelete(req.params.id);

    if (isOwner) {
      await User.findOneAndUpdate(
        { clerkId: clerkUserId },
        { $inc: { totalListings: -1 } }
      ).catch(err => logger.error('Failed to update user listing count:', err));
    }

    logger.info(`Product deleted: "${product.title}" by ${clerkUserId}`);

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

// GET SELLER ANALYTICS - OPTIMIZED
export const getSellerAnalytics = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);
    const { userId } = req.params;

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

// INCREMENT VIEW COUNT
export const incrementViewCount = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID." 
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, select: 'views' }
    ).lean();
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

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

// GET PLATFORM ANALYTICS (Admin) - OPTIMIZED
export const getPlatformAnalytics = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    const cacheKey = 'platform_analytics';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached platform analytics');
      return res.json(cachedData);
    }

    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }

    const [productStats, userStats, categoryStats] = await Promise.all([
      Product.aggregate([
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  totalListings: { $sum: 1 },
                  activeListings: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                  soldItems: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
                  totalRevenue: { 
                    $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] }
                  },
                  totalViews: { $sum: "$views" },
                  donationCount: { $sum: { $cond: ["$isDonation", 1, 0] } },
                  avgPrice: { $avg: "$price" }
                }
              }
            ],
            categoryDist: [
              { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
              { $sort: { count: -1 } },
              { $limit: 5 }
            ],
            monthlyGrowth: [
              {
                $group: {
                  _id: { 
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                  },
                  listings: { $sum: 1 },
                  sold: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
                  revenue: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] } }
                }
              },
              { $sort: { "_id.year": -1, "_id.month": -1 } },
              { $limit: 6 }
            ]
          }
        }
      ]),
      
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            regularUsers: { $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] } },
            sellers: { $sum: { $cond: [{ $eq: ["$role", "seller"] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
            activeSellers: { 
              $sum: { 
                $cond: [
                  { $and: [{ $eq: ["$role", "seller"] }, { $gt: ["$totalListings", 0] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      
      Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ])
    ]);

    const overview = productStats[0].overview[0] || {
      totalListings: 0,
      activeListings: 0,
      soldItems: 0,
      totalRevenue: 0,
      totalViews: 0,
      donationCount: 0,
      avgPrice: 0
    };

    const analytics = {
      success: true,
      overview: {
        ...overview,
        averagePrice: Math.round(overview.avgPrice || 0)
      },
      userStats: userStats[0] || {
        totalUsers: 0,
        regularUsers: 0,
        sellers: 0,
        admins: 0,
        activeSellers: 0
      },
      categoryStats: {
        totalCategories: categoryStats.length,
        topCategories: productStats[0].categoryDist.map(c => ({
          category: c._id,
          count: c.count,
          avgPrice: Math.round(c.avgPrice || 0)
        }))
      },
      monthlyGrowth: productStats[0].monthlyGrowth.reverse().map(m => ({
        month: new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'short' }),
        year: m._id.year,
        listings: m.listings,
        sold: m.sold,
        revenue: m.revenue
      })),
      performance: {
        conversionRate: overview.totalListings > 0 
          ? Math.round((overview.soldItems / overview.totalListings) * 100) 
          : 0,
        avgViewsPerListing: overview.totalListings > 0 
          ? Math.round(overview.totalViews / overview.totalListings) 
          : 0,
        avgRevenuePerSale: overview.soldItems > 0 
          ? Math.round(overview.totalRevenue / overview.soldItems) 
          : 0
      },
      timestamp: new Date().toISOString()
    };

    logger.info(`Platform analytics generated for admin ${clerkUserId}`);
    
    cache.set(cacheKey, analytics);
    
    return res.json(analytics);

  } catch (err) {
    logger.error("GET PLATFORM ANALYTICS ERROR:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to load platform analytics",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// UPDATE PRODUCT (Admin) - OPTIMIZED
export const updateProduct = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Only administrators can edit products." 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID." 
      });
    }

    const updates = sanitizeQuery(req.body);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found." 
      });
    }

    logger.info(`Product updated by admin: "${product.title}"`);

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

// GET ALL PRODUCTS (Admin) - OPTIMIZED
export const getAllProductsAdmin = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }

    const { page = 1, limit = 50 } = req.query;
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (validPage - 1) * validLimit;

    const [products, total] = await Promise.all([
      Product.find({})
        .select('title price category status userId createdAt views isDonation location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validLimit)
        .lean(),
      Product.countDocuments({})
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(total / validLimit),
        totalItems: total,
        itemsPerPage: validLimit
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

// GET PRODUCTS BY LOCATION - OPTIMIZED
export const getProductsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, category } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        error: "Latitude and longitude are required" 
      });
    }

    const options = {
      category: category && category !== 'All' ? category : undefined,
      limit: 100
    };

    const products = await Product.findNearby(longitude, latitude, parseInt(radius), options);

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
      error: "Failed to load products by location",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// DELETE PRODUCT (Admin) - OPTIMIZED
export const deleteProductAdmin = async (req, res) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    const isAdmin = await User.isAdmin(clerkUserId);
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid product ID." 
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: "Product not found" 
      });
    }

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