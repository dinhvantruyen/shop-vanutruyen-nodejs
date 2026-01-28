const path = require("path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const morgan = require("morgan");
const cors = require("cors");

const routes = require("./routes");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const cartRoutes = require("./routes/cart");
const adminRoutes = require("./routes/admin");
const { requireAdmin } = require("./middleware/auth");
const Category = require("./models/category");
const Product = require("./models/product");
const Cart = require("./models/cart");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(async (req, res, next) => {
  if (!req.session.user) {
    res.locals.cartCount = 0;
    return next();
  }
  try {
    const cart = await Cart.findOne({ user: req.session.user.id })
      .populate("items.product")
      .lean();
    const count = cart
      ? cart.items.reduce((sum, item) => {
          if (!item.product) return sum;
          return sum + (item.quantity || 0);
        }, 0)
      : 0;
    res.locals.cartCount = count;
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/gioi-thieu", (req, res) => {
  res.render("pages/gioi-thieu", { title: "Giới thiệu" });
});

app.get("/hop-tac", (req, res) => {
  res.render("pages/hop-tac", { title: "Hợp tác" });
});

app.get("/tin-tuc", (req, res) => {
  res.render("pages/tin-tuc", { title: "Tin tức" });
});

app.get("/ho-tro", (req, res) => {
  res.render("pages/ho-tro", { title: "Hỗ trợ" });
});

app.get("/thanh-vien", async (req, res, next) => {
  try {
    const users = await require("./models/user")
      .find({ role: "user" })
      .sort({ purchaseCount: -1, createdAt: 1 })
      .limit(50)
      .lean();
    res.render("pages/thanh-vien", { title: "Thành viên", users });
  } catch (err) {
    next(err);
  }
});

app.get("/", async (req, res, next) => {
  try {
    const parentNam = await Category.findOne({ name: "Nam", parent: null });
    const parentNu = await Category.findOne({ name: "Nu", parent: null });
    let quanAuProducts = [];
    let aoPoloNuProducts = [];
    let doBoTreEmProducts = [];
    if (parentNam) {
      const quanAuCategory = await Category.findOne({
        parent: parentNam._id,
        $or: [{ name: /^Quan au$/i }, { name: /^Quần âu$/i }],
      });
      if (quanAuCategory) {
        quanAuProducts = await Product.find({ category: quanAuCategory._id })
          .sort({ createdAt: -1 })
          .limit(4);
      }
    }
    if (parentNu) {
      const aoPoloCategory = await Category.findOne({
        parent: parentNu._id,
        $or: [
          { name: /^Ao polo nu$/i },
          { name: /^Áo polo nữ$/i },
          { name: /^Ao polo$/i },
          { name: /^Áo polo$/i },
        ],
      });
      if (aoPoloCategory) {
        aoPoloNuProducts = await Product.find({ category: aoPoloCategory._id })
          .sort({ createdAt: -1 })
          .limit(4);
      }
    }
    const parentKid = await Category.findOne({ name: "Tre em", parent: null });
    if (parentKid) {
      const doBoCategory = await Category.findOne({
        parent: parentKid._id,
        $or: [{ name: /^Do bo$/i }, { name: /^Đồ bộ$/i }],
      });
      if (doBoCategory) {
        doBoTreEmProducts = await Product.find({ category: doBoCategory._id })
          .sort({ createdAt: -1 })
          .limit(4);
      }
    }
    res.render("pages/index", {
      title: "Clothing Store",
      quanAuProducts,
      aoPoloNuProducts,
      doBoTreEmProducts,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/search-suggest", async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.json({ items: [] });
    }
    const items = await Product.find({ name: { $regex: query, $options: "i" } })
      .select("_id name price mainImage galleryImages")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

app.get("/products/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate({
      path: "category",
      populate: { path: "parent" },
    });
    if (!product) {
      return res.status(404).send("Not found");
    }
    const related = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
    })
      .sort({ createdAt: -1 })
      .limit(4);
    res.render("pages/product-detail", {
      title: product.name,
      product,
      related,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/new", async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find().sort({ createdAt: -1 }).limit(28),
      Category.find().sort({ name: 1 }),
    ]);
    res.render("pages/new", { title: "Sản phẩm mới", products, categories });
  } catch (err) {
    next(err);
  }
});

app.get("/ban-chay", async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find().sort({ soldCount: -1, createdAt: -1 }).limit(30),
      Category.find().sort({ name: 1 }),
    ]);
    res.render("pages/ban-chay", { title: "Sản phẩm bán chạy", products, categories });
  } catch (err) {
    next(err);
  }
});

app.get("/sale", async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ discountPercent: { $gt: 0 } })
        .sort({ createdAt: -1 })
        .limit(30),
      Category.find().sort({ name: 1 }),
    ]);
    res.render("pages/sale", { title: "Sản phẩm khuyến mãi", products, categories });
  } catch (err) {
    next(err);
  }
});

app.get("/nam", async (req, res, next) => {
  try {
    const parent = await Category.findOne({ name: "Nam", parent: null });
    const childCategories = parent
      ? await Category.find({ parent: parent._id }).sort({ name: 1 })
      : [];
    const childIdStrings = childCategories.map((category) => category._id.toString());
    const childIds = childCategories.map((category) => category._id);
    const selected =
      req.query.category && childIdStrings.includes(req.query.category)
        ? req.query.category
        : "";
    const products = await Product.find({ category: { $in: childIds } })
      .sort({ createdAt: -1 })
      .limit(24);
    const [femaleProducts, kidProducts] = await Promise.all([
      (async () => {
        const parentNu = await Category.findOne({ name: "Nu", parent: null });
        if (!parentNu) return [];
        const nuChildren = await Category.find({ parent: parentNu._id }).select("_id");
        const nuIds = nuChildren.map((item) => item._id);
        if (nuIds.length === 0) return [];
        return Product.find({ category: { $in: nuIds } })
          .sort({ createdAt: -1 })
          .limit(5);
      })(),
      (async () => {
        const parentKid = await Category.findOne({ name: "Tre em", parent: null });
        if (!parentKid) return [];
        const kidChildren = await Category.find({ parent: parentKid._id }).select("_id");
        const kidIds = kidChildren.map((item) => item._id);
        if (kidIds.length === 0) return [];
        return Product.find({ category: { $in: kidIds } })
          .sort({ createdAt: -1 })
          .limit(5);
      })(),
    ]);
    res.render("pages/nam", {
      title: "Sản phẩm nam",
      products,
      categories: childCategories,
      selected,
      femaleProducts,
      kidProducts,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/nu", async (req, res, next) => {
  try {
    const parent = await Category.findOne({ name: "Nu", parent: null });
    const childCategories = parent
      ? await Category.find({ parent: parent._id }).sort({ name: 1 })
      : [];
    const childIdStrings = childCategories.map((category) => category._id.toString());
    const childIds = childCategories.map((category) => category._id);
    const selected =
      req.query.category && childIdStrings.includes(req.query.category)
        ? req.query.category
        : "";
    const products = await Product.find({ category: { $in: childIds } })
      .sort({ createdAt: -1 })
      .limit(24);
    const [maleProducts, kidProducts] = await Promise.all([
      (async () => {
        const parentNam = await Category.findOne({ name: "Nam", parent: null });
        if (!parentNam) return [];
        const namChildren = await Category.find({ parent: parentNam._id }).select("_id");
        const namIds = namChildren.map((item) => item._id);
        if (namIds.length === 0) return [];
        return Product.find({ category: { $in: namIds } })
          .sort({ createdAt: -1 })
          .limit(5);
      })(),
      (async () => {
        const parentKid = await Category.findOne({ name: "Tre em", parent: null });
        if (!parentKid) return [];
        const kidChildren = await Category.find({ parent: parentKid._id }).select("_id");
        const kidIds = kidChildren.map((item) => item._id);
        if (kidIds.length === 0) return [];
        return Product.find({ category: { $in: kidIds } })
          .sort({ createdAt: -1 })
          .limit(5);
      })(),
    ]);
    res.render("pages/nu", {
      title: "Sản phẩm nữ",
      products,
      categories: childCategories,
      selected,
      maleProducts,
      kidProducts,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/tre-em", async (req, res, next) => {
  try {
    const parent = await Category.findOne({ name: "Tre em", parent: null });
    const childCategories = parent
      ? await Category.find({ parent: parent._id }).sort({ name: 1 })
      : [];
    const childIdStrings = childCategories.map((category) => category._id.toString());
    const childIds = childCategories.map((category) => category._id);
    const selected =
      req.query.category && childIdStrings.includes(req.query.category)
        ? req.query.category
        : "";
    const products = await Product.find({ category: { $in: childIds } })
      .sort({ createdAt: -1 })
      .limit(24);
    const [maleProducts, femaleProducts] = await Promise.all([
      (async () => {
        const parentNam = await Category.findOne({ name: "Nam", parent: null });
        if (!parentNam) return [];
        const namChildren = await Category.find({ parent: parentNam._id }).select("_id");
        const namIds = namChildren.map((item) => item._id);
        if (namIds.length === 0) return [];
        return Product.find({ category: { $in: namIds } })
          .sort({ createdAt: -1 })
          .limit(5);
      })(),
      (async () => {
        const parentNu = await Category.findOne({ name: "Nu", parent: null });
        if (!parentNu) return [];
        const nuChildren = await Category.find({ parent: parentNu._id }).select("_id");
        const nuIds = nuChildren.map((item) => item._id);
        if (nuIds.length === 0) return [];
        return Product.find({ category: { $in: nuIds } })
          .sort({ createdAt: -1 })
          .limit(5);
      })(),
    ]);
    res.render("pages/tre-em", {
      title: "Sản phẩm trẻ em",
      products,
      categories: childCategories,
      selected,
      maleProducts,
      femaleProducts,
    });
  } catch (err) {
    next(err);
  }
});

app.use(authRoutes);
app.use(profileRoutes);
app.use(cartRoutes);
app.use("/admin", requireAdmin, adminRoutes);
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ message });
});

module.exports = app;
