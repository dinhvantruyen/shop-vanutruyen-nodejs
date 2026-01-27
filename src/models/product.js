const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    }, // Tên sản phẩm
    price: {
      type: Number,
      required: true,
      min: 0,
    }, // Giá gốc sản phẩm
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    }, // Phần trăm giảm giá (0-100)
    sizes: {
      type: [String],
      default: [],
    }, // Danh sách kích thước (S, M, L...)
    colors: {
      type: [String],
      default: [],
    }, // Danh sách màu sắc
    specs: {
      technology: { type: String, default: "" },
      sku: { type: String, default: "" },
      material: { type: String, default: "" },
      fit: { type: String, default: "" },
      suitableFor: { type: String, default: "" },
      features: { type: String, default: "" },
      care: { type: String, default: "" },
    }, // Thông số kỹ thuật chi tiết
    description: {
      type: String,
      default: "",
      trim: true,
    }, // Mô tả sản phẩm
    mainImage: {
      type: String,
      default: "",
    }, // Đường dẫn ảnh đại diện chính
    galleryImages: {
      type: [String],
      default: [],
    }, // Danh sách đường dẫn ảnh phụ
    stock: {
      type: Number,
      default: 0,
      min: 0,
    }, // Số lượng tồn kho
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    }, // Số lượng đã bán (để thống kê bán chạy)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    }, // Tham chiếu đến danh mục sản phẩm
    isActive: {
      type: Boolean,
      default: true,
    }, // Trạng thái hiển thị (true: hiện, false: ẩn)
  },
  { timestamps: true } // Tự động tạo createdAt và updatedAt
);

module.exports = mongoose.model("Product", productSchema);
