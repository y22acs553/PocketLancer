// /server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword, generateToken } = require("../utils/authUtils");
const { sendOtpEmail } = require("../utils/emailUtils");
const Client = require("../models/Client");
const Freelancer = require("../models/Freelancer");

const JWT_SECRET = process.env.JWT_SECRET;
const otpStore = new Map(); // Temporary in-memory OTP store

// ============================================================
// Helper Functions
// ============================================================

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendTokenResponse = (user, role, statusCode, res) => {
  const token = generateToken(user._id, role);

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  console.log(`[TOKEN] Issued for ${role}: ${user.email}`);

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    role,
  });
};

// ============================================================
// A. REGISTRATION (Clients + Freelancers)
// ============================================================

const registerUser = async (req, res, userModel, role) => {
  const { name, email, password, location, city, skills } = req.body;
  console.log(`🟢 [REGISTER-${role.toUpperCase()}] Incoming data:`, req.body);

  try {
    // Check for duplicates
    let user = await userModel.findOne({ email });
    if (user) {
      console.warn(`⚠️ [REGISTER-${role}] Duplicate email: ${email}`);
      return res.status(400).json({ msg: `${role} already exists with this email.` });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Name, email, and password are required." });
    }

    // Freelancer-specific logic
    let finalLocation = location;
    let finalSkills = skills;

    if (role === "freelancer") {
      if (!skills || !Array.isArray(skills) || skills.length === 0) {
        return res.status(400).json({ msg: "Freelancers must include at least one skill." });
      }

      if (!location || !location.coordinates || location.coordinates.length !== 2) {
        console.warn("⚠️ [REGISTER-FREELANCER] Missing coordinates. Using fallback Hyderabad coords.");
        finalLocation = { type: "Point", coordinates: [78.47, 17.38] };
      }

      finalSkills = skills.map((s) => s.trim());
    }

    const hashedPassword = await hashPassword(password);

    user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      ...(role === "freelancer"
        ? {
            skills: finalSkills,
            city: city || "Hyderabad",
            location: finalLocation,
          }
        : {
            location: location || { type: "Point", coordinates: [0, 0] },
          }),
    });

    console.log(`✅ [REGISTER-${role}] Success for: ${email}`);
    res.status(201).json({
      success: true,
      msg: `${role} registered successfully. Proceed to login.`,
      user: { id: user._id, email: user.email, role },
    });
  } catch (err) {
    console.error(`❌ [REGISTER-${role}] Server error:`, err.message);
    res.status(500).send("Server Error during registration.");
  }
};

router.post("/register/client", (req, res) => registerUser(req, res, Client, "client"));
router.post("/register/freelancer", (req, res) => registerUser(req, res, Freelancer, "freelancer"));

// ============================================================
// B. LOGIN → Generate OTP
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ msg: "Missing login details" });

    const userModel = role === "freelancer" ? Freelancer : Client;
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ msg: "Invalid email or password" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Invalid email or password" });

    // Generate OTP
    const otp = generateOtp();
    otpStore.set(email, { otp, expires: Date.now() + 2 * 60 * 1000 }); // 2 min expiry

    // Send to user email
    await sendOtpEmail(email, otp);

    console.log(`✅ OTP generated for ${email}: ${otp}`);
    res.status(200).json({ success: true, msg: "OTP sent to registered email." });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ msg: "Server error during login." });
  }
});

// ============================================================
// C. VERIFY OTP → Issue JWT
// ============================================================

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, role, otp } = req.body;
    if (!email || !otp || !role)
      return res.status(400).json({ msg: "Missing fields for OTP verification" });

    const entry = otpStore.get(email);
    if (!entry) return res.status(400).json({ msg: "OTP expired or not found" });
    if (Date.now() > entry.expires) return res.status(400).json({ msg: "OTP expired" });
    if (entry.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });

    // OTP valid
    otpStore.delete(email);

    const userModel = role === "freelancer" ? Freelancer : Client;
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const token = generateToken(user._id, role);

    // Store token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(200).json({ success: true, msg: "Login successful", token });
  } catch (err) {
    console.error("❌ OTP verify error:", err.message);
    res.status(500).json({ msg: "Server error verifying OTP." });
  }
});

// ============================================================
// D. CHECK SESSION (JWT Validation)
// ============================================================

router.get("/check-session", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userModel = decoded.role === "freelancer" ? Freelancer : Client;
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) return res.json({ loggedIn: false });

    res.json({
      loggedIn: true,
      role: decoded.role,
      user,
    });
  } catch (err) {
    console.error("❌ Session check failed:", err.message);
    res.json({ loggedIn: false });
  }
});

// ============================================================
// E. LOGOUT
// ============================================================

router.get("/logout", (req, res) => {
  console.log("🔴 [LOGOUT] Clearing token cookie...");

  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    expires: new Date(0), // expires immediately
  });

  return res.status(200).json({
    success: true,
    msg: "User logged out successfully.",
  });
});

module.exports = router;