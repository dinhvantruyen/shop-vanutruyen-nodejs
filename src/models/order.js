const mongoose = require("mongoose");

// Schema cho từng sản phẩm trong đơn hàng (lưu snapshot thông tin tại thời điểm mua)
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Tham chiếu ID sản phẩm gốc
    name: { type: String, required: true }, // Tên sản phẩm (lưu cứng để không đổi khi sản phẩm gốc đổi tên)
    price: { type: Number, required: true, min: 0 }, // Giá tại thời điểm mua
    quantity: { type: Number, required: true, min: 1 }, // Số lượng
    size: { type: String, default: "" }, // Kích thước
    color: { type: String, default: "" }, // Màu sắc
  },
  { _id: false } // Không tạo _id riêng cho item con
);

// Schema chính cho Đơn hàng
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Người đặt hàng
    items: { type: [orderItemSchema], default: [] }, // Danh sách sản phẩm
    subtotal: { type: Number, default: 0, min: 0 }, // Tổng tiền hàng
    shipping: { type: Number, default: 0, min: 0 }, // Phí vận chuyển
    total: { type: Number, default: 0, min: 0 }, // Tổng thanh toán (subtotal + shipping)
    status: {
      type: String,
      default: "Cho xac nhan",
      enum: ["Cho xac nhan", "Dang giao", "Hoan thanh", "Da huy"], // Các trạng thái đơn hàng
    },
    shippingInfo: {
      receiverName: { type: String, default: "" }, // Tên người nhận
      phone: { type: String, default: "" }, // Số điện thoại người nhận
      city: { type: String, default: "" }, // Tỉnh/Thành phố
      ward: { type: String, default: "" }, // Phường/Xã
      address: { type: String, default: "" }, // Địa chỉ cụ thể
    },
  },
  { timestamps: true } // Tự động tạo createdAt (ngày đặt) và updatedAt
);

module.exports = mongoose.model("Order", orderSchema);
