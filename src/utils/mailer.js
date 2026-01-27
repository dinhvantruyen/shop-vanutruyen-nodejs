const nodemailer = require("nodemailer");

const getBool = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return value === "true" || value === "1";
};

const isMailerConfigured = () => {
  return (
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS
  );
};

const createTransporter = () => {
  if (!isMailerConfigured()) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: getBool(process.env.SMTP_SECURE, false),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendPasswordResetEmail = async (to, resetCode) => {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("SMTP is not configured");
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = "Mã xác thực đặt lại mật khẩu";
  const text = [
    "Xin chào,",
    "",
    "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
    `Mã xác thực: ${resetCode}`,
    "",
    "Mã có hiệu lực trong 30 phút. Không chia sẻ mã này với bất kỳ ai.",
    "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.",
    "",
    "Trân trọng,",
    "SHOP VANUTRUYEN",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <p>Xin chào,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <div style="margin: 16px 0; padding: 12px 16px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
        <div style="font-size: 12px; color: #6b7280;">Mã xác thực</div>
        <div style="font-size: 20px; font-weight: 700; letter-spacing: 2px;">${resetCode}</div>
      </div>
      <p>Mã có hiệu lực trong 30 phút. Không chia sẻ mã này với bất kỳ ai.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <p>Trân trọng,<br />SHOP VANUTRUYEN</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  isMailerConfigured,
  sendPasswordResetEmail,
};
