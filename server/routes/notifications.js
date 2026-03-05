import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ── GET /api/notifications ────────────────────────────────────────
// Returns latest 40 notifications for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error("NOTIFICATION FETCH ERROR:", err);
    res.status(500).json({ msg: "Failed to fetch notifications" });
  }
});

// ── PATCH /api/notifications/:id/read ────────────────────────────
// Mark a single notification as read (only owner can do this)
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    res.status(500).json({ msg: "Failed to update notification" });
  }
});

// ── PATCH /api/notifications/read-all ────────────────────────────
// Mark ALL unread notifications as read for the current user
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true },
    );

    res.json({ success: true });
  } catch (err) {
    console.error("MARK ALL READ ERROR:", err);
    res.status(500).json({ msg: "Failed to mark all as read" });
  }
});

export default router;
