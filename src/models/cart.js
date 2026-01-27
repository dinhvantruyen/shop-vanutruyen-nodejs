const mongoose = require("mongoose");

// Schema cho từng sản phẩm trong giỏ hàng
const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Tham chiếu đến model Product
    quantity: { type: Number, default: 1, min: 1 }, // Số lượng mua, tối thiểu là 1
    size: { type: String, default: "" }, // Kích thước đã chọn
    color: { type: String, default: "" }, // Màu sắc đã chọn
  },
  { _id: false } // Không tạo _id riêng cho từng item trong mảng
);

// Schema chính cho Giỏ hàng
const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true }, // Mỗi user chỉ có 1 giỏ hàng
    items: { type: [cartItemSchema], default: [] }, // Danh sách các sản phẩm trong giỏ
  },
  { timestamps: true } // Tự động tạo createdAt và updatedAt
);

module.exports = mongoose.model("Cart", cartSchema);
