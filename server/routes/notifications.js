import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/notifications
 * fetch notifications of logged user
 */
router.get("/", protect, async (req, res) => {
  try {
    const list = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });

    res.json({ success: true, notifications: list, unreadCount });
  } catch (err) {
    console.error("❌ NOTIF FETCH ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 */
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true },
    );

    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error("❌ NOTIF READ ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * PATCH /api/notifications/read-all
 */
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } },
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ NOTIF READALL ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
