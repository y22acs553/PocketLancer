import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

/* ======================================================
   Multer Setup
====================================================== */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
});

/* ======================================================
   GET PROFILE
====================================================== */
router.get("/", protect, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.json(user);
});

/* ======================================================
   UPDATE PROFILE INFO
====================================================== */
router.patch("/", protect, async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (email) user.email = email;

  await user.save();

  res.json({ success: true });
});

/* ======================================================
   CHANGE PASSWORD
====================================================== */
router.patch("/password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const match = await user.matchPassword(currentPassword);

  if (!match)
    return res.status(400).json({ msg: "Incorrect current password" });

  user.password = newPassword;
  await user.save();

  res.json({ success: true });
});

/* ======================================================
   UPLOAD AVATAR
====================================================== */
router.post("/avatar", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No image uploaded" });

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: "pocketlancer/user-avatars",
      transformation: [
        { width: 300, height: 300, crop: "fill", gravity: "face" },
      ],
    });

    const user = await User.findById(req.user._id);
    user.avatar = result.secure_url;
    await user.save();

    res.json({
      success: true,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("AVATAR UPLOAD ERROR:", err);
    res.status(500).json({ msg: "Upload failed" });
  }
});

export default router;
