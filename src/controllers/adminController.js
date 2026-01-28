const fs = require("fs/promises");
const path = require("path");
const Category = require("../models/category");
const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");
const Staff = require("../models/staff");

const ALLOWED_PARENTS = ["Nam", "Nu", "Tre em"];

// Helper: Load danh sách danh mục cha (cấp 1)
const loadParentOptions = async () =>
  Category.find({ parent: null, name: { $in: ALLOWED_PARENTS } })
    .sort({ name: 1 })
    .lean();

// Helper: Chuẩn bị dữ liệu danh mục từ request body
const buildCategoryPayload = (body, id) => {
  const parent = body.parent && body.parent !== id ? body.parent : null;
  return {
    name: body.name,
    description: body.description || "",
    isActive: body.isActive === "true",
    parent,
  };
};

// Helper: Validate logic danh mục cha
const validateCategoryParent = async (body) => {
  const name = (body.name || "").trim();
  const parentId = body.parent;

  if (!parentId) {
    if (!ALLOWED_PARENTS.includes(name)) {
      return "Danh mục cha chỉ được là Nam, Nu, Tre em.";
    }
    return null;
  }

  const parent = await Category.findById(parentId).lean();
  if (!parent || parent.parent) {
    return "Danh mục cha không hợp lệ.";
  }
  if (!ALLOWED_PARENTS.includes(parent.name)) {
    return "Danh mục cha chỉ có Nam, Nu, Tre em.";
  }
  return null;
};

// Helper: Chuẩn bị dữ liệu sản phẩm từ request body và file upload
const buildProductPayload = (body, files = {}) => {
  const mainUpload =
    files.mainImage && files.mainImage[0]
      ? files.mainImage[0].path || `/uploads/${files.mainImage[0].filename}`
      : "";
  const existingMain = body.existingMainImage || "";
  const mainImage = mainUpload || existingMain;

  const galleryUploads = (files.galleryImages || []).map(
    (file) => file.path || `/uploads/${file.filename}`
  );
  const existingGallery = body.existingGalleryImages
    ? body.existingGalleryImages
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const galleryImages =
    galleryUploads.length > 0 ? [...existingGallery, ...galleryUploads] : existingGallery;

  return {
    name: body.name,
    price: Number(body.price),
    discountPercent: Number(body.discountPercent || 0),
    description: body.description || "",
    mainImage,
    galleryImages,
    stock: Number(body.stock || 0),
    category: body.category || undefined,
    sizes: body.sizes
      ? Array.isArray(body.sizes)
        ? body.sizes
        : [body.sizes]
      : [],
    colors: body.colors
      ? Array.isArray(body.colors)
        ? body.colors
        : [body.colors]
      : [],
    specs: {
      technology: body.technology || "",
      sku: body.sku || "",
      material: body.material || "",
      fit: body.fit || "",
      suitableFor: body.suitableFor || "",
      features: body.features || "",
      care: body.care || "",
    },
    isActive: body.isActive === "true",
  };
};

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

// Helper: Chuyển đường dẫn web thành đường dẫn file hệ thống
const toUploadFilePath = (imagePath = "") => {
  if (!imagePath.startsWith("/uploads/")) return null;
  return path.join(uploadsDir, path.basename(imagePath));
};

const deleteUploadFile = async (imagePath) => {
  const filePath = toUploadFilePath(imagePath);
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // ignore missing files
    if (err.code !== "ENOENT") throw err;
  }
};

const deleteRemovedImages = async (previous = [], next = []) => {
  const removed = previous.filter((item) => !next.includes(item));
  await Promise.all(removed.map(deleteUploadFile));
};

// Helper: Load cây danh mục để hiển thị trong form sản phẩm
const loadProductCategoryTree = async () => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  const childrenMap = new Map();
  categories.forEach((category) => {
    childrenMap.set(category._id.toString(), []);
  });
  categories.forEach((category) => {
    if (category.parent) {
      const key = category.parent.toString();
      const bucket = childrenMap.get(key);
      if (bucket) {
        bucket.push(category);
      }
    }
  });
  return categories
    .filter((category) => !category.parent)
    .map((category) => ({
      category,
      children: childrenMap.get(category._id.toString()) || [],
    }));
};

// Trang chủ Admin (Dashboard): Thống kê tổng quan
const adminHome = async (req, res, next) => {
  try {
    const [categoryCount, productCount, orderCount, customerCount, revenueAgg] = await Promise.all([
      Category.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments({ status: "Cho xac nhan" }),
      User.countDocuments({ role: { $ne: "admin" } }),
      Order.aggregate([
        { $match: { status: "Hoan thanh" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);
    const totalRevenue = revenueAgg.length ? revenueAgg[0].total : 0;
    res.render("admin/index", {
      title: "Admin",
      categoryCount,
      productCount,
      orderCount,
      customerCount,
      totalRevenue,
    });
  } catch (err) {
    next(err);
  }
};

// Quản lý danh mục: Hiển thị danh sách
const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const childrenMap = new Map();
    categories.forEach((category) => {
      childrenMap.set(category._id.toString(), []);
    });
    categories.forEach((category) => {
      if (category.parent) {
        const key = category.parent.toString();
        const bucket = childrenMap.get(key);
        if (bucket) {
          bucket.push(category);
        }
      }
    });
    const tree = categories
      .filter((category) => !category.parent)
      .map((category) => ({
        category,
        children: childrenMap.get(category._id.toString()) || [],
      }));
    res.render("admin/categories", { title: "Quản lý danh mục", tree });
  } catch (err) {
    next(err);
  }
};

// Form thêm danh mục mới
const newCategoryForm = async (req, res, next) => {
  try {
    const categories = await loadParentOptions();
    res.render("admin/category-form", {
      title: "Thêm danh mục",
      category: null,
      categories,
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý tạo danh mục
const createCategory = async (req, res, next) => {
  try {
    const error = await validateCategoryParent(req.body);
    if (error) {
      const categories = await loadParentOptions();
      return res.status(400).render("admin/category-form", {
        title: "Thêm danh mục",
        category: null,
        categories,
        error,
      });
    }
    await Category.create(buildCategoryPayload(req.body));
    res.redirect("/admin/categories");
  } catch (err) {
    next(err);
  }
};

// Form sửa danh mục
const editCategoryForm = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send("Not found");
    }
    const categories = await loadParentOptions();
    res.render("admin/category-form", {
      title: "Sửa danh mục",
      category,
      categories,
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý cập nhật danh mục
const updateCategory = async (req, res, next) => {
  try {
    const error = await validateCategoryParent(req.body);
    if (error) {
      const category = await Category.findById(req.params.id);
      const categories = await loadParentOptions();
      return res.status(400).render("admin/category-form", {
        title: "Sửa danh mục",
        category,
        categories,
        error,
      });
    }
    await Category.findByIdAndUpdate(
      req.params.id,
      buildCategoryPayload(req.body, req.params.id),
      {
        runValidators: true,
      }
    );
    res.redirect("/admin/categories");
  } catch (err) {
    next(err);
  }
};

// Xóa danh mục
const deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect("/admin/categories");
  } catch (err) {
    next(err);
  }
};

// Quản lý sản phẩm: Hiển thị danh sách
const listProducts = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate("category")
      .sort({ createdAt: -1 });
    res.render("admin/products", { title: "Quản lý sản phẩm", products });
  } catch (err) {
    next(err);
  }
};

// Quản lý người dùng: Hiển thị danh sách khách hàng
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).sort({
      createdAt: -1,
    });
    res.render("admin/users", { title: "Quản lý tài khoản", users });
  } catch (err) {
    next(err);
  }
};

// Quản lý đơn hàng: Hiển thị danh sách
const listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.render("admin/orders", { title: "Quản lý đơn hàng", orders });
  } catch (err) {
    next(err);
  }
};

// Báo cáo doanh thu theo tháng
const showRevenue = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: "Hoan thanh" }).lean();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `T${d.getMonth() + 1}`,
        total: 0,
      });
    }
    const monthMap = new Map(months.map((m) => [m.key, m]));
    orders.forEach((order) => {
      if (!order.createdAt) return;
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.total += order.total || 0;
      }
    });
    const chartData = months.map((m) => ({
      label: m.label,
      total: m.total,
    }));
    res.render("admin/revenue", {
      title: "Báo cáo doanh thu",
      totalRevenue,
      orderCount: orders.length,
      chartData,
    });
  } catch (err) {
    next(err);
  }
};

// Chi tiết đơn hàng
const showOrderDetail = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .lean();
    if (!order) {
      return res.status(404).send("Not found");
    }
    res.render("admin/order-detail", { title: "Chi tiết đơn hàng", order });
  } catch (err) {
    next(err);
  }
};

// Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res, next) => {
  try {
    const status = req.body.status;
    await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { runValidators: true }
    );
    res.redirect(`/admin/orders/${req.params.id}`);
  } catch (err) {
    next(err);
  }
};

// Khóa/Mở khóa tài khoản người dùng
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send("Not found");
    }
    user.isActive = !user.isActive;
    await user.save();
    res.redirect("/admin/users");
  } catch (err) {
    next(err);
  }
};

// Xóa tài khoản người dùng
const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/admin/users");
  } catch (err) {
    next(err);
  }
};

// Quản lý nhân viên: Hiển thị danh sách
const listStaff = async (req, res, next) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 });
    res.render("admin/staff", { title: "Quản lý nhân viên", staff });
  } catch (err) {
    next(err);
  }
};

// Form thêm nhân viên mới
const newStaffForm = (req, res) => {
  res.render("admin/staff-form", {
    title: "Thêm nhân viên",
    staffMember: null,
  });
};

// Xử lý tạo nhân viên
const createStaff = async (req, res, next) => {
  try {
    await Staff.create(req.body);
    res.redirect("/admin/staff");
  } catch (err) {
    next(err);
  }
};

// Form sửa nhân viên
const editStaffForm = async (req, res, next) => {
  try {
    const staffMember = await Staff.findById(req.params.id);
    if (!staffMember) {
      return res.status(404).send("Not found");
    }
    res.render("admin/staff-form", {
      title: "Sửa nhân viên",
      staffMember,
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý cập nhật nhân viên
const updateStaff = async (req, res, next) => {
  try {
    await Staff.findByIdAndUpdate(req.params.id, req.body, {
      runValidators: true,
    });
    res.redirect("/admin/staff");
  } catch (err) {
    next(err);
  }
};

// Xóa nhân viên
const deleteStaff = async (req, res, next) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.redirect("/admin/staff");
  } catch (err) {
    next(err);
  }
};

// Form thêm sản phẩm mới
const newProductForm = async (req, res, next) => {
  try {
    const categoryTree = await loadProductCategoryTree();
    res.render("admin/product-form", {
      title: "Thêm sản phẩm",
      product: null,
      categoryTree,
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý tạo sản phẩm
const createProduct = async (req, res, next) => {
  try {
    await Product.create(buildProductPayload(req.body, req.files));
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

// Form sửa sản phẩm
const editProductForm = async (req, res, next) => {
  try {
    const [product, categoryTree] = await Promise.all([
      Product.findById(req.params.id),
      loadProductCategoryTree(),
    ]);
    if (!product) {
      return res.status(404).send("Not found");
    }
    res.render("admin/product-form", {
      title: "Sửa sản phẩm",
      product,
      categoryTree,
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý cập nhật sản phẩm
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Not found");
    }
    const previousMain = product.mainImage || "";
    const previousGallery = product.galleryImages || [];
    const payload = buildProductPayload(req.body, req.files);
    await Product.findByIdAndUpdate(req.params.id, payload, { runValidators: true });
    const nextMain = payload.mainImage || "";
    const nextGallery = payload.galleryImages || [];
    if (previousMain && previousMain !== nextMain) {
      await deleteUploadFile(previousMain);
    }
    await deleteRemovedImages(previousGallery, nextGallery);
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

// Xóa sản phẩm
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Not found");
    }
    const images = [product.mainImage, ...(product.galleryImages || [])].filter(Boolean);
    await Product.findByIdAndDelete(req.params.id);
    await Promise.all(images.map(deleteUploadFile));
    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  adminHome,
  listCategories,
  newCategoryForm,
  createCategory,
  editCategoryForm,
  updateCategory,
  deleteCategory,
  listProducts,
  listOrders,
  showRevenue,
  showOrderDetail,
  updateOrderStatus,
  listUsers,
  toggleUserStatus,
  deleteUser,
  listStaff,
  newStaffForm,
  createStaff,
  editStaffForm,
  updateStaff,
  deleteStaff,
  newProductForm,
  createProduct,
  editProductForm,
  updateProduct,
  deleteProduct,
};
