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
      images,   // array of base64
      userId,
      isDonation
    } = req.body;

    // Enhanced validation
    if (!title || !description || !sellerPhone || !category || !location) {
      return res.status(400).json({ error: "All required fields must be filled including location." });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one image is required." });
    }

    // Validate price unless it's a donation
    if (!isDonation && (!price || price < 0)) {
      return res.status(400).json({ error: "Valid price is required unless marked as donation" });
    }

    const uploadedImages = [];

    for (const img of images) {
      if (!img.startsWith("data:image")) continue;

      const upload = await cloudinary.uploader.upload(img, {
        folder: "rummagebazaar_products",
      });

      uploadedImages.push(upload.secure_url);
    }

    const product = await Product.create({
      title,
      description,
      price: isDonation ? 0 : Number(price),
      sellerPhone,
      countryCode: countryCode || "+254",
      category,
      location,
      condition: condition || "good",
      images: uploadedImages,
      isDonation: isDonation || false,
      status: "active", // Changed from "available" to "active" for consistency
      userId: clerkUserId || userId,
      views: 0, // Initialize views counter
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to create product." });
  }
};

/* -----------------------------------------------------
   GET ALL PRODUCTS
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    const { userId, status } = req.query;
    
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.json(products);
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

    if (!product) return res.status(404).json({ error: "Product not found." });

    // Increment views when product is viewed
    product.views += 1;
    await product.save();

    return res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch product." });
  }
};

/* -----------------------------------------------------
   MARK AS SOLD (with authorization)
----------------------------------------------------- */
export const markProductAsSold = async (req, res) => {
  try {
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;
    
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) return res.status(404).json({ error: "Product not found." });

    // Check authorization - user must own the product or be admin
    if (product.userId !== clerkUserId && clerkUserId !== 'admin') {
      return res.status(403).json({ error: "Not authorized to mark this product as sold." });
    }

    product.status = "sold";
    product.soldAt = new Date();
    await product.save();

    return res.json({ 
      message: "Product marked as sold successfully", 
      product 
    });
  } catch (err) {
    console.error("MARK SOLD ERROR:", err);
    return res.status(500).json({ error: "Failed to mark as sold." });
  }
};

/* -----------------------------------------------------
   DELETE PRODUCT (with authorization)
----------------------------------------------------- */
export const deleteProduct = async (req, res) => {
  try {
    const auth = req.auth?.();
    const clerkUserId = auth?.userId;

    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) return res.status(404).json({ error: "Product not found." });

    // Check authorization - user must own the product or be admin
    if (product.userId !== clerkUserId && clerkUserId !== 'admin') {
      return res.status(403).json({ error: "Not authorized to delete this product." });
    }

    await Product.findByIdAndDelete(productId);

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
   GET SELLER ANALYTICS
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
    
    const analytics = {
      totalListings: products.length,
      soldItems: products.filter(p => p.status === "sold").length,
      activeListings: products.filter(p => p.status === "active").length,
      totalRevenue: products
        .filter(p => p.status === "sold")
        .reduce((sum, item) => sum + (item.price || 0), 0),
      views: products.reduce((sum, item) => sum + (item.views || 0), 0),
      // Additional metrics
      averagePrice: products.length > 0 
        ? Math.round(products.reduce((sum, item) => sum + (item.price || 0), 0) / products.length)
        : 0,
      donationCount: products.filter(p => p.isDonation).length,
    };

    return res.json(analytics);
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    return res.status(500).json({ error: "Failed to load analytics." });
  }
};

/* -----------------------------------------------------
   UPDATE PRODUCT (Admin only)
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

    const product = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found." });

    return res.json({ 
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