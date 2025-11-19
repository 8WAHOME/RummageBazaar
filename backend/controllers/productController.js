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
      category,
      location,
      condition,
      images,   // array of base64
      userId,
      isDonation
    } = req.body;

    if (!title || !description || (!price && !isDonation) || !sellerPhone || !category) {
      return res.status(400).json({ error: "Required fields missing." });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one image is required." });
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
      category,
      location,
      condition: condition || "good",
      images: uploadedImages,
      isDonation: isDonation || false,
      status: "available",
      userId: clerkUserId || userId,
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to create product." });
  }
};

/* -----------------------------------------------------
   GET ALL
----------------------------------------------------- */
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    return res.status(500).json({ error: "Failed to load products." });
  }
};

/* -----------------------------------------------------
   GET ONE
----------------------------------------------------- */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Not found." });

    return res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch product." });
  }
};

/* -----------------------------------------------------
   MARK AS SOLD
----------------------------------------------------- */
export const markProductAsSold = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.status = "sold";
    await product.save();

    return res.json({ message: "Product marked as sold", product });
  } catch (err) {
    console.error("MARK SOLD ERROR:", err);
    return res.status(500).json({ error: "Failed to mark as sold." });
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