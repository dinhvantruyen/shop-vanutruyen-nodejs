const express = require("express");
const {
  showProfile,
  showOrders,
  showOrderDetail,
  showPassword,
  showAddress,
  updateProfile,
  changePassword,
  updateAddress,
} = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Hiển thị thông tin hồ sơ cá nhân
router.get("/profile", requireAuth, showProfile);

// Quản lý đơn hàng của người dùng (Danh sách và Chi tiết)
router.get("/profile/orders", requireAuth, showOrders);
router.get("/profile/orders/:id", requireAuth, showOrderDetail);

// Hiển thị form đổi mật khẩu
router.get("/profile/password", requireAuth, showPassword);

// Hiển thị form cập nhật địa chỉ giao hàng
router.get("/profile/address", requireAuth, showAddress);

// Xử lý cập nhật thông tin cá nhân (Tên, Email...)
router.post("/profile", requireAuth, updateProfile);

// Xử lý cập nhật địa chỉ
router.post("/profile/address", requireAuth, updateAddress);

// Xử lý đổi mật khẩu
router.post("/profile/password", requireAuth, changePassword);

module.exports = router;
