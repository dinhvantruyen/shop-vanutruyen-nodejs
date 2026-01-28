const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { connectDB } = require("../src/config/db");
const Product = require("../src/models/product");
const { cloudinary, hasCloudinaryConfig } = require("../src/config/cloudinary");

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");
const folder = process.env.CLOUDINARY_FOLDER || "vanutruyen";

const startsWithUploads = (value) =>
  typeof value === "string" && value.startsWith("/uploads/");

const toLocalPath = (uploadPath) => path.join(uploadsDir, path.basename(uploadPath));

const uploadCache = new Map();

const uploadFile = async (localPath) => {
  if (uploadCache.has(localPath)) return uploadCache.get(localPath);
  const result = await cloudinary.uploader.upload(localPath, {
    folder,
    resource_type: "image",
  });
  const url = result.secure_url || result.url || "";
  uploadCache.set(localPath, url);
  return url;
};

const migrateProduct = async (product) => {
  const updates = {};
  const missing = [];

  if (startsWithUploads(product.mainImage)) {
    const localPath = toLocalPath(product.mainImage);
    if (fs.existsSync(localPath)) {
      const url = await uploadFile(localPath);
      if (url) updates.mainImage = url;
    } else {
      missing.push(product.mainImage);
    }
  }

  if (Array.isArray(product.galleryImages) && product.galleryImages.length) {
    const nextGallery = [];
    for (const img of product.galleryImages) {
      if (startsWithUploads(img)) {
        const localPath = toLocalPath(img);
        if (fs.existsSync(localPath)) {
          const url = await uploadFile(localPath);
          nextGallery.push(url || img);
        } else {
          nextGallery.push(img);
          missing.push(img);
        }
      } else {
        nextGallery.push(img);
      }
    }
    updates.galleryImages = nextGallery;
  }

  const hasUpdates = Object.keys(updates).length > 0;
  if (hasUpdates) {
    await Product.updateOne({ _id: product._id }, updates);
  }

  return { updated: hasUpdates, missing };
};

const run = async () => {
  if (!hasCloudinaryConfig) {
    throw new Error("Cloudinary config is missing. Check CLOUDINARY_* env vars.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set.");
  }

  await connectDB();

  const products = await Product.find({
    $or: [
      { mainImage: { $regex: "^/uploads/" } },
      { galleryImages: { $elemMatch: { $regex: "^/uploads/" } } },
    ],
  }).lean();

  let updatedCount = 0;
  const missingFiles = [];

  for (const product of products) {
    const result = await migrateProduct(product);
    if (result.updated) updatedCount += 1;
    if (result.missing.length) missingFiles.push(...result.missing);
  }

  console.log(`Migrated products: ${updatedCount}/${products.length}`);
  if (missingFiles.length) {
    console.log("Missing files:");
    missingFiles.forEach((p) => console.log(`- ${p}`));
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
