import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

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
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
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
      id: req.user._id,
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
      id: req.user._id,
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

export default router;
