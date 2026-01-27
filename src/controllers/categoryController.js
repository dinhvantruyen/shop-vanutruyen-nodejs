const mongoose = require("mongoose");
const Category = require("../models/category");

// Helper: Kiểm tra ID có hợp lệ không
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Lấy danh sách danh mục (có phân trang, tìm kiếm, sắp xếp)
const listCategories = async (req, res) => {
  const { page = "1", limit = "10", q, sort = "-createdAt" } = req.query;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const filter = {};
  if (q) {
    filter.name = { $regex: q, $options: "i" }; // Tìm kiếm theo tên (không phân biệt hoa thường)
  }

  const [items, total] = await Promise.all([
    Category.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Category.countDocuments(filter),
  ]);

  res.json({
    items,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
};

// Lấy chi tiết một danh mục theo ID
const getCategory = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }
  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json(category);
};

// Tạo mới một danh mục
const createCategory = async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
};

// Cập nhật thông tin danh mục
const updateCategory = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }
  const category = await Category.findByIdAndUpdate(id, req.body, {
    new: true, // Trả về document sau khi update
    runValidators: true, // Chạy validation của schema
  });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json(category);
};

// Xóa một danh mục
const deleteCategory = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid category id" });
  }
  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  res.json({ message: "Category deleted" });
};

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
