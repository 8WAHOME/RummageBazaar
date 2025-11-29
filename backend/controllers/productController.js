// backend/controllers/productController.js
import Product from "../models/productModel.js";
import cloudinary from "../utils/cloudinary.js";

/* -----------------------------------------------------
   CREATE PRODUCT
----------------------------------------------------- */
export const createProduct = async (req, res) => {
  try {
    const auth = req.auth?.();
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
      userId,
      isDonation,
      originalPrice // Added for discount display
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

    // Validate image count
    if (images.length > 8) {
      return res.status(400).json({ error: "Maximum 8 images allowed per listing." });
    }

    const uploadedImages = [];

    // Upload images to Cloudinary with better error handling
    for (const img of images) {
      if (!img.startsWith("data:image")) {
        console.warn("Skipping invalid image data");
        continue;
      }

      try {
        const upload = await cloudinary.uploader.upload(img, {
          folder: "rummagebazaar_products",
          quality: "auto",
          fetch_format: "auto"
        });

        uploadedImages.push(upload.secure_url);
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(500).json({ error: "Failed to upload product images." });
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({ error: "No valid images were uploaded." });
    }

    const product = await Product.create({
      title: title.trim(),
      description: description.trim(),
      price: isDonation ? 0 : Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      sellerPhone,
      countryCode: countryCode || "+254",
      category,
      location,
      condition: condition || "good",
      images: uploadedImages,
      isDonation: isDonation || false,
      status: "active",
      userId: clerkUserId || userId,
      views: 0,
      featured: false, // For future featured listings
      tags: generateTags(title, category) // Auto-generate tags for search
    });

    console.log(` Product created: ${product.title} by user ${clerkUserId}`);

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
   GET ALL PRODUCTS (with advanced filtering)
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    const { 
      userId, 
      status, 
      category, 
      condition, 
      minPrice, 
      maxPrice, 
      location,
      search,
      sortBy = 'newest',
      page = 1,
      limit = 20
    } = req.query;
    
    const filter = {};
    
    // Build filter object
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    // Price filtering
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    
    // Search across title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sort options
    let sort = { createdAt: -1 }; // Default: newest first
    switch (sortBy) {
      case 'price-low':
        sort = { price: 1 };
        break;
      case 'price-high':
        sort = { price: -1 };
        break;
      case 'views':
        sort = { views: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
    }

    const skip = (page - 1) * limit;

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'), // Exclude version key
      Product.countDocuments(filter)
    ]);

    return res.json({
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / limit),
        totalProducts: totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    return res.status(500).json({ error: "Failed to load products." });
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
   MARK AS SOLD (with enhanced authorization)
----------------------------------------------------- */
export const markProductAsSold = async (req, res) => {
  try {
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;
    
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Enhanced authorization check
    const isAdmin = user?.publicMetadata?.role === 'admin';
    const isOwner = product.userId === clerkUserId;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: "Not authorized to mark this product as sold." 
      });
    }

    product.status = "sold";
    product.soldAt = new Date();
    await product.save();

    console.log(`✅ Product marked as sold: ${product.title}`);

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
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;

    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Enhanced authorization check
    const isAdmin = user?.publicMetadata?.role === 'admin';
    const isOwner = product.userId === clerkUserId;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: "Not authorized to delete this product." 
      });
    }

    await Product.findByIdAndDelete(productId);

    console.log(`🗑️ Product deleted: ${product.title} by user ${clerkUserId}`);

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
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;
    const { userId } = req.params;

    // Verify the authenticated user is requesting their own analytics or is admin
    if (clerkUserId !== userId && clerkUserId !== 'admin') {
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
      donationCount: products.filter(p => p.isDonation).length,
      // Additional metrics
      conversionRate: products.length > 0 ? (soldProducts.length / products.length * 100).toFixed(1) : 0,
      averageViews: products.length > 0 ? Math.round(totalViews / products.length) : 0,
      performanceScore: calculatePerformanceScore(products)
    };

    return res.json(analytics);

  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    return res.status(500).json({ error: "Failed to load analytics." });
  }
};

/* -----------------------------------------------------
   UPDATE PRODUCT (Admin only - enhanced)
----------------------------------------------------- */
export const updateProduct = async (req, res) => {
  try {
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;

    // Only allow admins to edit products
    if (clerkUserId !== 'admin') {
      return res.status(403).json({ error: "Only administrators can edit products." });
    }

    const productId = req.params.id;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    const allowedUpdates = [
      'title', 'description', 'price', 'originalPrice', 'category', 
      'location', 'condition', 'status', 'isDonation', 'featured'
    ];
    
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const product = await Product.findByIdAndUpdate(
      productId,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    console.log(`✏️ Product updated by admin: ${product.title}`);

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
   HELPER FUNCTIONS
----------------------------------------------------- */
function generateTags(title, category) {
  const words = title.toLowerCase().split(' ');
  const tags = new Set([
    ...words.filter(word => word.length > 2),
    category.toLowerCase(),
    ...category.split(' ').map(word => word.toLowerCase())
  ]);
  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

function calculatePerformanceScore(products) {
  if (products.length === 0) return 0;
  
  const soldCount = products.filter(p => p.status === 'sold').length;
  const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
  const avgViews = totalViews / products.length;
  
  let score = (soldCount / products.length) * 50; // Sales rate: 50%
  score += Math.min(avgViews / 10, 30); // Views: 30% max
  score += Math.min(products.length * 2, 20); // Activity: 20% max
  
  return Math.min(Math.round(score), 100);
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