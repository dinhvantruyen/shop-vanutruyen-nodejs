const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  getCartCount,
  showCart,
  showCheckout,
  placeOrder,
  checkoutSelected,
  addToCart,
  updateCart,
  removeFromCart,
} = require("../controllers/cartController");

const router = express.Router();

// Lấy số lượng sản phẩm trong giỏ hàng (cho badge trên header)
router.get("/cart/count", getCartCount);

// Hiển thị trang giỏ hàng
router.get("/cart", requireAuth, showCart);

// Hiển thị trang thanh toán
router.get("/checkout", requireAuth, showCheckout);

// Xử lý đặt hàng (tạo đơn hàng mới)
router.post("/checkout", requireAuth, placeOrder);

// Xử lý thanh toán các sản phẩm được chọn từ giỏ hàng
router.post("/cart/checkout-selected", requireAuth, checkoutSelected);

// Thêm sản phẩm vào giỏ hàng
router.post("/cart/add", requireAuth, addToCart);

// Cập nhật thông tin giỏ hàng (số lượng, size, màu)
router.post("/cart/update", requireAuth, updateCart);

// Xóa sản phẩm khỏi giỏ hàng
router.post("/cart/remove", requireAuth, removeFromCart);

module.exports = router;
