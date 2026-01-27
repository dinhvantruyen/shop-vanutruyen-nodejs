// Middleware kiểm tra đăng nhập: Nếu chưa đăng nhập thì chuyển hướng về trang login
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  return next();
};

// Middleware kiểm tra quyền Admin: Nếu không phải admin thì chặn truy cập (403)
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }
  return next();
};

module.exports = { requireAuth, requireAdmin };
