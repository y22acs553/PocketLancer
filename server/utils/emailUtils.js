// /server/utils/emailUtils.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: `"PocketLancer" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your PocketLancer OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Your OTP Code: <strong>${otp}</strong></h2>
        <p>This code expires in <b>2 minutes</b>. Please do not share it.</p>
        <p style="font-size: 12px; color: gray;">Sent by PocketLancer</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent successfully:", info.response);
  } catch (err) {
    console.error("❌ Error sending OTP email:", err.message);
    throw new Error("Email delivery failed.");
  }
}

module.exports = { sendOtpEmail };