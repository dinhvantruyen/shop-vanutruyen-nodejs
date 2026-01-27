const express = require("express");

const router = express.Router();

// Route trang chủ: Trả về JSON chào mừng (hiện tại đang dùng làm API)
router.get("/", (req, res) => {
  res.json({ message: "Clothing API" });
});

module.exports = router;
