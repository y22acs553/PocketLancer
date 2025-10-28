// /server/utils/emailUtils.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP email via Resend
 * @param {string} to - recipient email
 * @param {string} otp - one-time password
 */
async function sendOtpEmail(to, otp) {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>🔐 Your PocketLancer OTP Code</h2>
        <p style="font-size: 16px;">Use this code to complete your login:</p>
        <h1 style="color: #007bff; letter-spacing: 3px;">${otp}</h1>
        <p>This code expires in <b>2 minutes</b>.</p>
        <p style="font-size: 12px; color: gray;">If you didn’t request this, ignore this email.</p>
        <br/>
        <p>— The PocketLancer Team</p>
      </div>
    `;

    const data = await resend.emails.send({
      from: `PocketLancer <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: "Your PocketLancer OTP Code",
      html: htmlContent,
    });

    console.log("✅ OTP email sent via Resend:", data.id || data);
    return true;
  } catch (error) {
    console.error("❌ Resend email error:", error.message);
    throw new Error("Failed to send OTP email via Resend.");
  }
}

module.exports = { sendOtpEmail };