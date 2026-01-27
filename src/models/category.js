const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    }, // Tên danh mục (duy nhất)
    description: {
      type: String,
      default: "",
      trim: true,
    }, // Mô tả danh mục
    isActive: {
      type: Boolean,
      default: true,
    }, // Trạng thái hoạt động (true: hiện, false: ẩn)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    }, // Tham chiếu đến danh mục cha (cấu trúc phân cấp)
  },
  { timestamps: true } // Tự động tạo createdAt và updatedAt
);

module.exports = mongoose.model("Category", categorySchema);
