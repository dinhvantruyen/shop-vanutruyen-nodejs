const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    }, // Tên người dùng
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    }, // Email đăng nhập (duy nhất)
    passwordHash: {
      type: String,
      required: true,
    }, // Mật khẩu đã mã hóa
    resetPasswordToken: {
      type: String,
      default: null,
    }, // Token hash for password reset
    resetPasswordExpires: {
      type: Date,
      default: null,
    }, // Expiration time for password reset token
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    }, // Vai trò (user: khách hàng, admin: quản trị viên)
    isActive: {
      type: Boolean,
      default: true,
    }, // Trạng thái tài khoản (true: hoạt động, false: bị khóa)
    phone: {
      type: String,
      default: "",
      trim: true,
    }, // Số điện thoại
    address: {
      type: String,
      default: "",
      trim: true,
    }, // Địa chỉ giao hàng mặc định
    receiverName: {
      type: String,
      default: "",
      trim: true,
    }, // Tên người nhận hàng mặc định
    city: {
      type: String,
      default: "",
      trim: true,
    }, // Tỉnh/Thành phố
    ward: {
      type: String,
      default: "",
      trim: true,
    }, // Phường/Xã
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    }, // Số lần mua hàng
    purchaseTotal: {
      type: Number,
      default: 0,
      min: 0,
    }, // Tổng tiền đã mua
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    }, // Điểm tích lũy
    loyaltyLevel: {
      type: String,
      default: "Đồng",
      enum: ["Đồng", "Bạc", "Vàng", "Kim cương"],
    }, // Hạng thành viên
  },
  { timestamps: true } // Tự động tạo createdAt và updatedAt
);

module.exports = mongoose.model("User", userSchema);
