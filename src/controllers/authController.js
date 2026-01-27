const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user");
const { isMailerConfigured, sendPasswordResetEmail } = require("../utils/mailer");

// Hiển thị trang đăng nhập
const showLogin = (req, res) => {
  res.render("auth/login", { title: "Đăng nhập", error: null });
};

// Hiển thị trang đăng ký
const showRegister = (req, res) => {
  res.render("auth/register", { title: "Đăng ký", error: null });
};

// Xử lý đăng ký tài khoản
const register = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  // Kiểm tra thông tin đầu vào
  if (!name || !email || !password) {
    return res
      .status(400)
      .render("auth/register", { title: "Đăng ký", error: "Thiếu thông tin." });
  }
  if (password !== confirmPassword) {
    return res.status(400).render("auth/register", {
      title: "Đăng ký",
      error: "Mật khẩu không trùng khớp.",
    });
  }

  // Kiểm tra email đã tồn tại chưa
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(400).render("auth/register", {
      title: "Đăng ký",
      error: "Email đã tồn tại.",
    });
  }

  // Mã hóa mật khẩu và tạo user mới
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
  });

  // Tự động đăng nhập sau khi đăng ký thành công (lưu session)
  req.session.user = {
    id: user._id.toString(),
    name: user.name,
    email,
    role: user.role,
  };
  res.redirect("/");
};

// Xử lý đăng nhập
const login = async (req, res) => {
  const { email, password } = req.body;
  // Kiểm tra thông tin đầu vào
  if (!email || !password) {
    return res.status(400).render("auth/login", {
      title: "Đăng nhập",
      error: "Thiếu thông tin.",
    });
  }

  // Tìm user theo email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(400).render("auth/login", {
      title: "Đăng nhập",
      error: "Email hoặc mật khẩu sai.",
    });
  }
  // Kiểm tra tài khoản có bị khóa không
  if (user.isActive === false) {
    return res.status(403).render("auth/login", {
      title: "Đăng nhập",
      error: "Tài khoản đang bị khóa.",
    });
  }

  // So sánh mật khẩu nhập vào với mật khẩu đã mã hóa
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(400).render("auth/login", {
      title: "Đăng nhập",
      error: "Email hoặc mật khẩu sai.",
    });
  }

  // Lưu thông tin user vào session
  req.session.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
  res.redirect("/");
};

// Xử lý đăng xuất: Hủy session
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

const showForgotPassword = (req, res) => {
  res.render("auth/forgot-password", {
    title: "Quên mật khẩu",
    error: null,
    success: null,
  });
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).render("auth/forgot-password", {
        title: "Quên mật khẩu",
        error: "Thiếu thông tin.",
        success: null,
      });
    }
    if (!isMailerConfigured()) {
      return res.status(500).render("auth/forgot-password", {
        title: "Quên mật khẩu",
        error: "Dịch vụ email chưa được cấu hình.",
        success: null,
      });
    }
    const user = await User.findOne({ email });
    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      user.resetPasswordToken = codeHash;
      user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
      await user.save();

      try {
        await sendPasswordResetEmail(user.email, code);
      } catch (err) {
        console.error("Failed to send password reset email:", err.message);
      }
    }
    return res.redirect("/reset-password");
  } catch (err) {
    return next(err);
  }
};

const showResetPassword = (req, res) => {
  res.render("auth/reset-password", {
    title: "Đặt lại mật khẩu",
    error: null,
  });
};

const resetPassword = async (req, res, next) => {
  try {
    const { code, password, confirmPassword } = req.body;
    if (!code || !password || !confirmPassword) {
      return res.status(400).render("auth/reset-password", {
        title: "Đặt lại mật khẩu",
        error: "Thiếu thông tin.",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).render("auth/reset-password", {
        title: "Đặt lại mật khẩu",
        error: "Mật khẩu không trùng khớp.",
      });
    }
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: codeHash,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).render("auth/reset-password", {
        title: "Đặt lại mật khẩu",
        error: "Mã xác thực không hợp lệ hoặc đã hết hạn.",
      });
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    return res.redirect("/login");
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  showLogin,
  showRegister,
  register,
  login,
  logout,
  showForgotPassword,
  forgotPassword,
  showResetPassword,
  resetPassword,
};
