const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Order = require("../models/order");

// Hiển thị trang thông tin tài khoản (Profile)
const showProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    const loyalty = getLoyalty(user);
    res.render("profile/index", {
      title: "Tài khoản",
      user,
      loyalty,
      error: null,
      success: null,
    });
  } catch (err) {
    next(err);
  }
};

// Hiển thị danh sách đơn hàng của người dùng
const showOrders = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.render("profile/orders", {
      title: "Theo dõi đơn hàng",
      user,
      orders,
      successId: req.query.success || "",
    });
  } catch (err) {
    next(err);
  }
};

// Hiển thị chi tiết một đơn hàng cụ thể
const showOrderDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    const order = await Order.findOne({ _id: req.params.id, user: user._id }).lean();
    if (!order) {
      return res.status(404).send("Not found");
    }
    res.render("profile/order-detail", { title: "Chi tiết đơn hàng", user, order });
  } catch (err) {
    next(err);
  }
};

// Hiển thị form đổi mật khẩu
const showPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render("profile/password", { title: "Đổi mật khẩu", user, error: null, success: null });
  } catch (err) {
    next(err);
  }
};

// Hiển thị form cập nhật địa chỉ giao hàng
const showAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render("profile/address", { title: "Cập nhật địa chỉ", user, error: null, success: null });
  } catch (err) {
    next(err);
  }
};

// Xử lý cập nhật thông tin cá nhân (Tên, Email, SĐT)
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).send("Not found");
    }
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const phone = (req.body.phone || "").trim();

    // Validate dữ liệu đầu vào
    if (!name || !email) {
      return res.status(400).render("profile/index", {
        title: "Tài khoản",
        user,
        error: "Vui lòng nhập đầy đủ thông tin.",
        success: null,
      });
    }

    // Kiểm tra email đã tồn tại ở tài khoản khác chưa
    const exists = await User.findOne({ email, _id: { $ne: user._id } });
    if (exists) {
      return res.status(400).render("profile/index", {
        title: "Tài khoản",
        user,
        error: "Email đã được sử dụng.",
        success: null,
      });
    }

    // Cập nhật thông tin
    user.name = name;
    user.email = email;
    user.phone = phone;
    await user.save();

    // Cập nhật lại session
    req.session.user.name = user.name;
    req.session.user.email = user.email;

    const loyalty = getLoyalty(user);
    res.render("profile/index", {
      title: "Tài khoản",
      user,
      loyalty,
      error: null,
      success: "Cập nhật thông tin thành công.",
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý đổi mật khẩu
const changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).send("Not found");
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    // Validate dữ liệu đầu vào
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).render("profile/password", {
        title: "Tài khoản",
        user,
        error: "Vui lòng nhập đầy đủ thông tin.",
        success: null,
      });
    }
    // Kiểm tra mật khẩu mới trùng khớp
    if (newPassword !== confirmPassword) {
      return res.status(400).render("profile/password", {
        title: "Tài khoản",
        user,
        error: "Mật khẩu mới không trùng khớp.",
        success: null,
      });
    }
    // Kiểm tra mật khẩu hiện tại có đúng không
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).render("profile/password", {
        title: "Tài khoản",
        user,
        error: "Mật khẩu hiện tại không đúng.",
        success: null,
      });
    }

    // Mã hóa và lưu mật khẩu mới
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.render("profile/password", {
      title: "Đổi mật khẩu",
      user,
      error: null,
      success: "Đổi mật khẩu thành công.",
    });
  } catch (err) {
    next(err);
  }
};

// Xử lý cập nhật địa chỉ giao hàng
const updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).send("Not found");
    }
    const receiverName = (req.body.receiverName || req.body.receiver || "").trim();
    const phone = (req.body.phone || "").trim();
    const city = (req.body.city || "").trim();
    const ward = (req.body.ward || "").trim();
    const address = (req.body.address || "").trim();

    // Validate thông tin địa chỉ
    if (!receiverName || !phone || !city || !ward || !address) {
      return res.status(400).render("profile/address", {
        title: "Cập nhật địa chỉ",
        user,
        error: "Vui lòng nhập đầy đủ thông tin nhận hàng.",
        success: null,
      });
    }

    // Cập nhật địa chỉ vào database
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          receiverName,
          phone,
          city,
          ward,
          address,
        },
      }
    );

    res.redirect("/profile");
  } catch (err) {
    next(err);
  }
};

// Helper: Tính toán hạng thành viên và điểm tích lũy dựa trên tổng chi tiêu
const getLoyalty = (user) => {
  const total = user && typeof user.purchaseTotal === "number" ? user.purchaseTotal : 0;
  let level = "Đồng";
  if (total >= 20000000) {
    level = "Kim cương";
  } else if (total >= 10000000) {
    level = "Vàng";
  } else if (total >= 5000000) {
    level = "Bạc";
  }
  const points = user && typeof user.loyaltyPoints === "number"
    ? user.loyaltyPoints
    : Math.floor(total / 10000);
  return { level, points };
};

module.exports = {
  showProfile,
  showOrders,
  showOrderDetail,
  showPassword,
  showAddress,
  updateProfile,
  changePassword,
  updateAddress,
};
