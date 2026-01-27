const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // Tên nhân viên
    email: { type: String, required: true, trim: true, lowercase: true, unique: true }, // Email liên hệ
    phone: { type: String, default: "", trim: true }, // Số điện thoại
    position: { type: String, default: "", trim: true }, // Chức vụ / Vị trí
    shift: { type: String, default: "", trim: true }, // Ca làm việc
    salary: { type: Number, default: 0, min: 0 }, // Mức lương cơ bản
    startDate: { type: Date }, // Ngày bắt đầu làm việc
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    }, // Trạng thái (active: đang làm, inactive: nghỉ việc)
  },
  { timestamps: true } // Tự động tạo createdAt và updatedAt
);

module.exports = mongoose.model("Staff", staffSchema);
