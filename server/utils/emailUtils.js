const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or use custom SMTP
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: "Your PocketLancer Login OTP",
    html: `
      <div style="font-family:sans-serif">
        <h2>🔐 PocketLancer Login Verification</h2>
        <p>Your OTP for login is: <b>${otp}</b></p>
        <p>This code will expire in <b>2 minutes</b>.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📨 OTP sent to ${to}`);
}

module.exports = { sendOtpEmail };