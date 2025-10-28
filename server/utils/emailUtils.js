const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // use STARTTLS (false for port 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // ✅ required for Render TLS proxy
  },
});

async function sendOtpEmail(to, otp) {
  try {
    const info = await transporter.sendMail({
      from: `"PocketLancer" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your PocketLancer OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Your OTP Code: <strong>${otp}</strong></h2>
          <p>This code expires in <b>2 minutes</b>. Do not share it with anyone.</p>
        </div>
      `,
    });

    console.log("✅ OTP email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Invalid credentials or server error.");
  }
}

module.exports = { sendOtpEmail };