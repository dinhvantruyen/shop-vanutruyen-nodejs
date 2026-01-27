const express = require("express");
const {
  showLogin,
  showRegister,
  register,
  login,
  logout,
  showForgotPassword,
  forgotPassword,
  showResetPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

// Hiển thị trang đăng nhập
router.get("/login", showLogin);

// Hiển thị trang đăng ký
router.get("/register", showRegister);

// Xử lý đăng ký tài khoản mới
router.post("/register", register);

// Xử lý đăng nhập
router.post("/login", login);

// Xử lý đăng xuất
// Forgot password
router.get("/forgot-password", showForgotPassword);
router.post("/forgot-password", forgotPassword);

// Reset password
router.get("/reset-password", showResetPassword);
router.post("/reset-password", resetPassword);

router.post("/logout", logout);

module.exports = router;
