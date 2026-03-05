import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Freelancer from "../models/Freelancer.js";
import { protect } from "../middleware/auth.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/emailUtils.js";
import { sendPasswordReset } from "../services/notificationService.js";
const router = express.Router();
console.log("✅ auth routes loaded");
/**
 * Utility: Generate JWT
 */
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};
/**
 * Utility: Send token as secure httpOnly cookie
 */
const sendAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};
// ======================================================
// 1️⃣ REGISTER
// ======================================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }
    const user = new User({
      name,
      email,
      password,
      role: role === "freelancer" ? "freelancer" : "client",
    });
    if (user.role === "freelancer") {
      const existing = await Freelancer.findOne({ user: user._id });
      if (!existing) {
        await Freelancer.create({
          user: user._id,
          name: user.name,
          email: user.email,
          profilePic: "",
          rating: 0,
          ratingCount: 0,
        });
      }
    }
    await user.save();
    return res.status(201).json({
      success: true,
      msg: "Registration successful",
    });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    return res.status(500).json({ msg: "Server error during registration" });
  }
});
// ======================================================
// 2️⃣ LOGIN
// ======================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }
    const token = generateToken(user);
    sendAuthCookie(res, token);
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({ msg: "Server error during login" });
  }
});
// ======================================================
// 3️⃣ CHECK SESSION (PRIMARY)
// ======================================================
router.get("/me", protect, async (req, res) => {
  return res.json({
    loggedIn: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});
// ======================================================
// 3️⃣ CHECK SESSION (ALIAS for frontend compatibility)
// ======================================================
router.get("/check-session", protect, async (req, res) => {
  return res.json({
    loggedIn: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});
// ======================================================
// 4️⃣ LOGOUT
// ======================================================
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ success: true, msg: "Logged out successfully" });
});
// ======================================================
// 5️⃣ SWITCH ROLE
// ======================================================
// ======================================================
// 5️⃣ SWITCH ROLE
// ======================================================
router.post("/switch-role", protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["client", "freelancer"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }
    // Update role in DB
    req.user.role = role;
    await req.user.save();
    // Issue NEW token with updated role
    const token = generateToken(req.user);
    sendAuthCookie(res, token);
    return res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (err) {
    console.error("❌ SWITCH ROLE ERROR:", err);
    res.status(500).json({ msg: "Failed to switch role" });
  }
});
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    // ✅ Always return same message
    if (!user) {
      return res.json({
        success: true,
        msg: "If email exists, reset link sent.",
      });
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetToken = hashed;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
    return res.json({
      success: true,
      msg: "If email exists, reset link sent.",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  try {
    if (!token || !password) {
      return res.status(400).json({ msg: "Token and password required." });
    }
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");
    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired token." });
    }
    user.password = password; // ✅ will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.log("Password reset success for:", user._id);
    await sendPasswordReset(user._id);
    console.log("Password reset notification sent");
    return res.json({ success: true, msg: "Password reset successful." });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});
export default router;
