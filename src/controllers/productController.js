const mongoose = require("mongoose");
const Product = require("../models/product");

// Helper: Kiểm tra ID có hợp lệ không
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Lấy danh sách sản phẩm (có phân trang, tìm kiếm, lọc, sắp xếp)
const listProducts = async (req, res) => {
  const {
    page = "1",
    limit = "10",
    q,
    minPrice,
    maxPrice,
    category,
    inStock,
    sort = "-createdAt",
  } = req.query;

  // Xử lý phân trang: đảm bảo page và limit là số dương
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  // Xây dựng bộ lọc tìm kiếm
  const filter = {};
  if (q) {
    filter.name = { $regex: q, $options: "i" }; // Tìm theo tên (không phân biệt hoa thường)
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice !== undefined) {
      filter.price.$gte = Number(minPrice); // Giá tối thiểu
    }
    if (maxPrice !== undefined) {
      filter.price.$lte = Number(maxPrice); // Giá tối đa
    }
  }
  if (category) {
    filter.category = category; // Lọc theo danh mục
  }
  if (inStock === "true") {
    filter.stock = { $gt: 0 }; // Chỉ lấy sản phẩm còn hàng
  }
  if (inStock === "false") {
    filter.stock = 0; // Chỉ lấy sản phẩm hết hàng
  }

  // Thực hiện truy vấn song song: lấy dữ liệu và đếm tổng số
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate("category")
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({
    items,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
};

// Lấy chi tiết một sản phẩm theo ID
const getProduct = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  const product = await Product.findById(id).populate("category");
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
};

// Tạo mới một sản phẩm
const createProduct = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

// Cập nhật thông tin sản phẩm
const updateProduct = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  const product = await Product.findByIdAndUpdate(id, req.body, {
    new: true, // Trả về document sau khi update
    runValidators: true, // Chạy validation của schema
  });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
};

// Xóa một sản phẩm
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json({ message: "Product deleted" });
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
