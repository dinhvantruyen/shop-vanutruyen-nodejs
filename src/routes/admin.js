const path = require("path");
const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");
const {
  adminHome,
  listCategories,
  newCategoryForm,
  createCategory,
  editCategoryForm,
  updateCategory,
  deleteCategory,
  listProducts,
  listOrders,
  showRevenue,
  showOrderDetail,
  updateOrderStatus,
  listUsers,
  toggleUserStatus,
  deleteUser,
  listStaff,
  newStaffForm,
  createStaff,
  editStaffForm,
  updateStaff,
  deleteStaff,
  newProductForm,
  createProduct,
  editProductForm,
  updateProduct,
  deleteProduct,
} = require("../controllers/adminController");

const router = express.Router();
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

// Cấu hình Multer để xử lý upload file (lưu vào thư mục uploads)
const upload = hasCloudinaryConfig
  ? multer({
      storage: new CloudinaryStorage({
        cloudinary,
        params: {
          folder: process.env.CLOUDINARY_FOLDER || "vanutruyen",
          resource_type: "image",
        },
      }),
    })
  : multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${ext}`);
        },
      }),
    });

// Trang chủ Admin (Dashboard)
router.get("/", adminHome);

// Quản lý Danh mục (Categories)
router.get("/categories", listCategories);
router.get("/categories/new", newCategoryForm);
router.post("/categories", createCategory);
router.get("/categories/:id/edit", editCategoryForm);
router.post("/categories/:id", updateCategory);
router.post("/categories/:id/delete", deleteCategory);

// Quản lý Sản phẩm và Đơn hàng
router.get("/products", listProducts);
router.get("/orders", listOrders);
router.get("/revenue", showRevenue);
router.get("/orders/:id", showOrderDetail);
router.post("/orders/:id/status", updateOrderStatus);

// Các route thêm/sửa sản phẩm (bao gồm upload ảnh)
router.get("/products/new", newProductForm);
router.post(
  "/products",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 6 },
  ]),
  createProduct
);
router.get("/products/:id/edit", editProductForm);
router.post(
  "/products/:id",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 6 },
  ]),
  updateProduct
);
router.post("/products/:id/delete", deleteProduct);

// Quản lý Người dùng (Khách hàng)
router.get("/users", listUsers);
router.post("/users/:id/toggle", toggleUserStatus);
router.post("/users/:id/delete", deleteUser);

// Quản lý Nhân viên
router.get("/staff", listStaff);
router.get("/staff/new", newStaffForm);
router.post("/staff", createStaff);
router.get("/staff/:id/edit", editStaffForm);
router.post("/staff/:id", updateStaff);
router.post("/staff/:id/delete", deleteStaff);

module.exports = router;
