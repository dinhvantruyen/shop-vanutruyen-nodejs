const Cart = require("../models/cart");
const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");

// Helper: Lấy giỏ hàng của user, nếu chưa có thì tạo mới
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// Hiển thị trang giỏ hàng
const showCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.session.user.id);
    await cart.populate("items.product");

    // Lọc và map dữ liệu sản phẩm để hiển thị (tính giá sau giảm)
    const items = cart.items
      .filter((item) => item.product)
      .map((item) => {
        const product = item.product;
        const price =
          product.discountPercent > 0
            ? Math.round(product.price * (100 - product.discountPercent) / 100)
            : product.price;
        return {
          id: product._id,
          name: product.name,
          mainImage: product.mainImage,
          price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          stock: product.stock,
        };
      });

    // Tính tổng tiền tạm tính
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.render("pages/cart", { title: "Giỏ hàng", items, subtotal });
  } catch (err) {
    next(err);
  }
};

// API lấy số lượng sản phẩm trong giỏ (dùng cho badge trên header)
const getCartCount = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.json({ count: 0 });
    }
    const cart = await Cart.findOne({ user: req.session.user.id });
    if (!cart) {
      return res.json({ count: 0 });
    }
    await cart.populate("items.product");
    const count = cart.items
      .filter((item) => item.product)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
    return res.json({ count });
  } catch (err) {
    next(err);
  }
};

// Hiển thị trang thanh toán (Checkout)
const showCheckout = async (req, res, next) => {
  try {
    let items = [];
    // Trường hợp 1: Thanh toán các sản phẩm được chọn từ giỏ hàng
    if (req.session.buyNowItems && req.session.buyNowItems.length > 0) {
      const selected = req.session.buyNowItems;
      const products = await Product.find({ _id: { $in: selected.map((i) => i.productId) } });
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));
      items = selected
        .map((entry) => {
          const product = productMap.get(entry.productId);
          if (!product) return null;
          const price =
            product.discountPercent > 0
              ? Math.round(product.price * (100 - product.discountPercent) / 100)
              : product.price;
          return {
            id: product._id,
            name: product.name,
            mainImage: product.mainImage,
            price,
            quantity: entry.quantity,
            size: entry.size,
            color: entry.color,
          };
        })
        .filter(Boolean);
    } 
    // Trường hợp 2: Mua ngay 1 sản phẩm (không qua giỏ hàng)
    else if (req.session.buyNow && req.session.buyNow.productId) {
      const product = await Product.findById(req.session.buyNow.productId);
      if (product) {
        const price =
          product.discountPercent > 0
            ? Math.round(product.price * (100 - product.discountPercent) / 100)
            : product.price;
        items = [
          {
            id: product._id,
            name: product.name,
            mainImage: product.mainImage,
            price,
            quantity: req.session.buyNow.quantity,
            size: req.session.buyNow.size,
            color: req.session.buyNow.color,
          },
        ];
      }
    } 
    // Trường hợp 3: Thanh toán toàn bộ giỏ hàng (mặc định)
    else {
      const cart = await getOrCreateCart(req.session.user.id);
      await cart.populate("items.product");
      items = cart.items
        .filter((item) => item.product)
        .map((item) => {
          const product = item.product;
          const price =
            product.discountPercent > 0
              ? Math.round(product.price * (100 - product.discountPercent) / 100)
              : product.price;
          return {
            id: product._id,
            name: product.name,
            mainImage: product.mainImage,
            price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          };
        });
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 0; // Phí ship mặc định
    const total = subtotal + shipping;

    const user = await User.findById(req.session.user.id).lean();
    res.render("pages/checkout", {
      title: "Thanh toán",
      items,
      subtotal,
      shipping,
      total,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý đặt hàng
const placeOrder = async (req, res, next) => {
  try {
    let orderItems = [];
    const cart = await getOrCreateCart(req.session.user.id);
    await cart.populate("items.product");

    // Xác định danh sách sản phẩm cần mua (tương tự logic showCheckout)
    if (req.session.buyNowItems && req.session.buyNowItems.length > 0) {
      const selected = req.session.buyNowItems;
      const products = await Product.find({ _id: { $in: selected.map((i) => i.productId) } });
      const productMap = new Map(products.map((p) => [p._id.toString(), p]));
      orderItems = selected
        .map((entry) => {
          const product = productMap.get(entry.productId);
          if (!product) return null;
          const price =
            product.discountPercent > 0
              ? Math.round(product.price * (100 - product.discountPercent) / 100)
              : product.price;
          return {
            product: product._id,
            name: product.name,
            price,
            quantity: entry.quantity,
            size: entry.size,
            color: entry.color,
          };
        })
        .filter(Boolean);
      if (orderItems.length === 0) {
        return res.redirect("/cart");
      }
    } else if (req.session.buyNow && req.session.buyNow.productId) {
      const product = await Product.findById(req.session.buyNow.productId);
      if (!product) {
        return res.redirect("/cart");
      }
      const price =
        product.discountPercent > 0
          ? Math.round(product.price * (100 - product.discountPercent) / 100)
          : product.price;
      orderItems = [
        {
          product: product._id,
          name: product.name,
          price,
          quantity: req.session.buyNow.quantity,
          size: req.session.buyNow.size,
          color: req.session.buyNow.color,
        },
      ];
    } else {
      const items = cart.items.filter((item) => item.product);
      if (items.length === 0) {
        return res.redirect("/cart");
      }
      orderItems = items.map((item) => {
        const product = item.product;
        const price =
          product.discountPercent > 0
            ? Math.round(product.price * (100 - product.discountPercent) / 100)
            : product.price;
        return {
          product: product._id,
          name: product.name,
          price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        };
      });
    }

    // Tính toán tổng tiền
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 0;
    const total = subtotal + shipping;

    // Kiểm tra thông tin người dùng
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).send("Not found");
    }

    // Yêu cầu cập nhật địa chỉ nếu thiếu
    if (!user.receiverName || !user.phone || !user.city || !user.ward || !user.address) {
      return res.redirect("/profile/address");
    }

    // Tạo đơn hàng mới
    const order = await Order.create({
      user: user._id,
      items: orderItems,
      subtotal,
      shipping,
      total,
      shippingInfo: {
        receiverName: user.receiverName || user.name,
        phone: user.phone || "",
        city: user.city || "",
        ward: user.ward || "",
        address: user.address || "",
      },
    });

    // Cập nhật số lượng đã bán của sản phẩm
    await Promise.all(
      orderItems.map((item) =>
        Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.quantity, stock: -item.quantity } })
      )
    );

    // Cập nhật thống kê mua hàng và điểm tích lũy của user
    user.purchaseCount = (user.purchaseCount || 0) + 1;
    user.purchaseTotal = (user.purchaseTotal || 0) + total;
    user.loyaltyPoints = Math.floor((user.purchaseTotal || 0) / 10000);
    // Cập nhật hạng thành viên
    if (user.purchaseTotal >= 20000000) {
      user.loyaltyLevel = "Kim cương";
    } else if (user.purchaseTotal >= 10000000) {
      user.loyaltyLevel = "Vàng";
    } else if (user.purchaseTotal >= 5000000) {
      user.loyaltyLevel = "Bạc";
    } else {
      user.loyaltyLevel = "Đồng";
    }
    await user.save();

    // Xóa các sản phẩm đã mua khỏi giỏ hàng (hoặc session)
    if (req.session.buyNowItems && req.session.buyNowItems.length > 0) {
      const selectedKey = new Set(
        req.session.buyNowItems.map(
          (entry) => `${entry.productId}|${entry.size}|${entry.color}`
        )
      );
      cart.items = cart.items.filter((entry) => {
        if (!entry.product) return false;
        const key = `${entry.product._id.toString()}|${entry.size || ""}|${entry.color || ""}`;
        return !selectedKey.has(key);
      });
      req.session.buyNowItems = null;
    } else if (req.session.buyNow && req.session.buyNow.productId) {
      cart.items = cart.items.filter(
        (entry) =>
          !(
            entry.product &&
            entry.product._id.toString() === req.session.buyNow.productId &&
            entry.size === (req.session.buyNow.size || "") &&
            entry.color === (req.session.buyNow.color || "")
          )
      );
      req.session.buyNow = null;
    } else {
      cart.items = [];
    }
    await cart.save();

    res.redirect(`/profile/orders?success=${order._id}`);
  } catch (err) {
    next(err);
  }
};

// Thêm sản phẩm vào giỏ hàng
const addToCart = async (req, res, next) => {
  try {
    const { productId, size, color, quantity = "1", redirect } = req.body;
    const qty = Math.max(parseInt(quantity, 10) || 1, 1);

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Not found");
    }

    const cart = await getOrCreateCart(req.session.user.id);
    const newItem = {
      product: product._id,
      quantity: qty,
      size: size || "",
      color: color || "",
    };

    // Kiểm tra sản phẩm đã có trong giỏ chưa (cùng ID, size, màu)
    const existing = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.size === (size || "") &&
        item.color === (color || "")
    );
    if (existing) {
      const nextQty = existing.quantity + qty;
      existing.quantity = Math.min(nextQty, product.stock || nextQty);
    } else {
      cart.items.push(newItem);
    }
    await cart.save();

    // Xử lý chuyển hướng sau khi thêm
    if (redirect === "cart") {
      return res.redirect("/cart");
    }
    if (redirect === "checkout") {
      // Nếu mua ngay -> lưu session và chuyển đến checkout
      req.session.buyNow = {
        productId,
        size: size || "",
        color: color || "",
        quantity: qty,
      };
      return res.redirect("/checkout");
    }
    res.redirect(req.get("referer") || "/cart");
  } catch (err) {
    next(err);
  }
};

// Cập nhật số lượng sản phẩm trong giỏ
const updateCart = async (req, res, next) => {
  try {
    const { productId, size, color, quantity } = req.body;
    const qty = Math.max(parseInt(quantity, 10) || 1, 1);
    const cart = await getOrCreateCart(req.session.user.id);

    const item = cart.items.find(
      (entry) =>
        entry.product.toString() === productId &&
        entry.size === (size || "") &&
        entry.color === (color || "")
    );
    if (item) {
      const product = await Product.findById(productId);
      const maxQty = product ? product.stock || qty : qty;
      item.quantity = Math.min(qty, maxQty);
      await cart.save();
    }
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

// Xóa sản phẩm khỏi giỏ
const removeFromCart = async (req, res, next) => {
  try {
    const { productId, size, color } = req.body;
    const cart = await getOrCreateCart(req.session.user.id);
    cart.items = cart.items.filter(
      (entry) =>
        !(
          entry.product.toString() === productId &&
          entry.size === (size || "") &&
          entry.color === (color || "")
        )
    );
    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

// Xử lý chọn sản phẩm để thanh toán (từ trang giỏ hàng)
const checkoutSelected = async (req, res, next) => {
  try {
    const selected = req.body.selected || [];
    const list = Array.isArray(selected) ? selected : [selected];
    const items = list
      .map((value) => {
        const [productId, size, color, quantity] = value.split("|");
        const qty = Math.max(parseInt(quantity, 10) || 1, 1);
        return { productId, size: size || "", color: color || "", quantity: qty };
      })
      .filter((entry) => entry.productId);

    if (items.length === 0) {
      return res.redirect("/cart");
    }
    req.session.buyNowItems = items;
    return res.redirect("/checkout");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCartCount,
  showCart,
  showCheckout,
  placeOrder,
  checkoutSelected,
  addToCart,
  updateCart,
  removeFromCart,
};
