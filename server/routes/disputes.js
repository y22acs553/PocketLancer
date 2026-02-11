import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Dispute from "../models/Dispute.js";
import Booking from "../models/Booking.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

/* ======================================================
   MULTER MEMORY STORAGE
====================================================== */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
});

/* ======================================================
   CREATE DISPUTE
====================================================== */
router.post("/", protect, async (req, res) => {
  const { bookingId, reason } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    // Only involved parties allowed
    const allowed =
      booking.clientId.toString() === req.user._id.toString() ||
      booking.freelancerId.toString() === req.user._id.toString();

    if (!allowed)
      return res.status(403).json({ msg: "Unauthorized dispute attempt" });

    // Only completed bookings disputable
    if (booking.status !== "completed")
      return res
        .status(400)
        .json({ msg: "Only completed bookings can be disputed" });

    // Prevent duplicates
    const existing = await Dispute.findOne({ bookingId });
    if (existing)
      return res.status(409).json({ msg: "Dispute already exists" });

    const dispute = await Dispute.create({
      bookingId,
      raisedBy: req.user._id,
      reason,
    });

    // 🔥 Lock booking
    booking.status = "disputed";
    booking.disputeLocked = true;
    await booking.save();

    res.status(201).json({ success: true, dispute });
  } catch (err) {
    console.error("CREATE DISPUTE ERROR:", err);
    res.status(500).json({ msg: "Failed to create dispute" });
  }
});

/* ======================================================
   UPLOAD EVIDENCE
====================================================== */
router.post(
  "/:id/evidence",
  protect,
  upload.single("file"),
  async (req, res) => {
    try {
      const dispute = await Dispute.findById(req.params.id);
      if (!dispute) return res.status(404).json({ msg: "Dispute not found" });

      if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64",
      )}`;

      const result = await cloudinary.uploader.upload(base64, {
        folder: "pocketlancer/disputes",
      });

      dispute.evidence.push({
        url: result.secure_url,
        type: req.file.mimetype.includes("pdf") ? "pdf" : "image",
        uploadedBy: req.user._id,
      });

      await dispute.save();

      res.json({ success: true, url: result.secure_url });
    } catch (err) {
      console.error("UPLOAD EVIDENCE ERROR:", err);
      res.status(500).json({ msg: "Upload failed" });
    }
  },
);

/* ======================================================
   ADMIN GET ALL
====================================================== */
router.get("/", protect, authorize("admin"), async (req, res) => {
  const disputes = await Dispute.find()
    .populate("bookingId")
    .populate("raisedBy", "name email")
    .sort({ createdAt: -1 });

  res.json(disputes);
});

/* ======================================================
   ADMIN RESOLVE
====================================================== */
router.patch("/:id/resolve", protect, authorize("admin"), async (req, res) => {
  const { resolution, adminNotes } = req.body;

  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ msg: "Not found" });

    dispute.status = "resolved";
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes;

    await dispute.save();

    const booking = await Booking.findById(dispute.bookingId);
    if (booking) booking.disputeLocked = false;

    await booking.save();

    res.json({ success: true });
  } catch {
    res.status(500).json({ msg: "Resolution failed" });
  }
});

export default router;
