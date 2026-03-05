import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import Dispute from "../models/Dispute.js";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import { protect, authorize } from "../middleware/auth.js";
import {
  sendDisputeCreated,
  sendDisputeResolved,
} from "../services/notificationService.js";
import User from "../models/User.js";
import Razorpay from "razorpay";

const router = express.Router();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET /api/disputes (admin)
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const q = req.query.status ? { status: req.query.status } : {};
    const disputes = await Dispute.find(q)
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar role")
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/disputes/my
router.get("/my", protect, async (req, res) => {
  try {
    const clientBookings = await Booking.find({
      clientId: req.user._id,
    }).select("_id");
    let flBookingIds = [];
    if (req.user.role === "freelancer") {
      const fl = await Freelancer.findOne({ user: req.user._id });
      if (fl) {
        const flB = await Booking.find({ freelancerId: fl._id }).select("_id");
        flBookingIds = flB.map((b) => b._id);
      }
    }
    const allIds = [...clientBookings.map((b) => b._id), ...flBookingIds];
    const disputes = await Dispute.find({
      $or: [{ raisedBy: req.user._id }, { bookingId: { $in: allIds } }],
    })
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, disputes });
  } catch (err) {
    console.error("MY DISPUTES:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/disputes/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate({
        path: "bookingId",
        populate: [
          { path: "clientId", select: "name email avatar" },
          { path: "freelancerId", select: "title user profilePic name" },
        ],
      })
      .populate("raisedBy", "name email avatar role");
    if (!dispute) return res.status(404).json({ msg: "Dispute not found" });
    const booking = dispute.bookingId;
    const isClient =
      booking?.clientId?._id?.toString() === req.user._id.toString();
    const isRaiser =
      dispute.raisedBy?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isClient && !isRaiser && !isAdmin) {
      const fl = await Freelancer.findOne({ user: req.user._id });
      const isFreelancer =
        fl && booking?.freelancerId?._id?.toString() === fl._id.toString();
      if (!isFreelancer) return res.status(403).json({ msg: "Access denied" });
    }
    res.json({ success: true, dispute });
  } catch (err) {
    console.error("GET DISPUTE:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/disputes
router.post("/", protect, async (req, res) => {
  const { bookingId, reason } = req.body;
  try {
    const booking = await Booking.findById(bookingId)
      .populate("clientId")
      .populate("freelancerId");
    if (!booking) return res.status(404).json({ msg: "Booking not found" });
    const allowed =
      booking.clientId._id.toString() === req.user._id.toString() ||
      booking.freelancerId._id.toString() === req.user._id.toString();
    if (!allowed) return res.status(403).json({ msg: "Unauthorized" });
    if (!["completed", "confirmed"].includes(booking.status))
      return res
        .status(400)
        .json({ msg: "Can only dispute confirmed or completed bookings" });
    const existing = await Dispute.findOne({ bookingId });
    if (existing)
      return res.status(409).json({ msg: "Dispute already exists" });
    const dispute = await Dispute.create({
      bookingId,
      raisedBy: req.user._id,
      reason,
    });
    await sendDisputeCreated(booking.clientId._id, dispute._id);
    await sendDisputeCreated(booking.freelancerId.user, dispute._id);
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    await Promise.all(
      admins.map((a) => sendDisputeCreated(a._id, dispute._id)),
    );
    booking.status = "disputed";
    booking.disputeLocked = true;
    await booking.save();
    res.status(201).json({ success: true, dispute });
  } catch (err) {
    console.error("CREATE DISPUTE:", err);
    res.status(500).json({ msg: "Failed to create dispute" });
  }
});

// POST /api/disputes/:id/evidence
router.post(
  "/:id/evidence",
  protect,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ msg: "Evidence file size exceeds 10MB limit." });
      } else if (err) {
        return res.status(400).json({ msg: "Upload error: " + err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const dispute = await Dispute.findById(req.params.id);
      if (!dispute) return res.status(404).json({ msg: "Dispute not found" });
      if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
      const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(b64, {
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
      res.status(500).json({ msg: "Upload failed" });
    }
  },
);

// PATCH /api/disputes/:id/status (admin: open → under_review)
router.patch("/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "under_review"].includes(status))
      return res.status(400).json({ msg: "Invalid status" });
    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!dispute) return res.status(404).json({ msg: "Not found" });
    res.json({ success: true, dispute });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// PATCH /api/disputes/:id/resolve (admin)
router.patch("/:id/resolve", protect, authorize("admin"), async (req, res) => {
  const { resolution, adminNotes } = req.body;
  if (
    !["release_to_freelancer", "refund_to_client", "split"].includes(resolution)
  ) {
    return res.status(400).json({ msg: "Invalid resolution" });
  }
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ msg: "Not found" });
    if (dispute.status === "resolved")
      return res.status(400).json({ msg: "Already resolved" });
    dispute.status = "resolved";
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes || "";
    await dispute.save();
    const booking = await Booking.findById(dispute.bookingId)
      .populate("clientId")
      .populate({
        path: "freelancerId",
        populate: { path: "user", select: "_id" },
      });
    if (booking) {
      booking.disputeLocked = false;
      if (booking.paymentStatus === "held" && booking.razorpayPaymentId) {
        try {
          if (resolution === "refund_to_client") {
            const refund = await razorpay.payments.refund(
              booking.razorpayPaymentId,
              { amount: booking.escrowAmount * 100 },
            );
            booking.paymentStatus = "refunded";
            booking.refundedAmount = booking.escrowAmount;
            booking.refundedAt = new Date();
            booking.razorpayRefundId = refund.id;
          } else if (resolution === "release_to_freelancer") {
            booking.paymentStatus = "released";
            booking.releasedAmount = booking.escrowAmount;
            booking.releasedAt = new Date();
          } else if (resolution === "split") {
            const half = Math.round(booking.escrowAmount / 2);
            const refund = await razorpay.payments.refund(
              booking.razorpayPaymentId,
              { amount: half * 100 },
            );
            booking.paymentStatus = "partial_refund";
            booking.refundedAmount = half;
            booking.releasedAmount = booking.escrowAmount - half;
            booking.refundedAt = new Date();
            booking.razorpayRefundId = refund.id;
          }
        } catch (payErr) {
          console.error("Payment on resolve failed:", payErr.message);
        }
      }
      await booking.save();
      await sendDisputeResolved(booking.clientId._id, resolution);
      const flUserId =
        booking.freelancerId?.user?._id || booking.freelancerId?.user;
      if (flUserId) await sendDisputeResolved(flUserId, resolution);
    }
    res.json({ success: true, dispute });
  } catch (err) {
    console.error("RESOLVE:", err);
    res.status(500).json({ msg: "Resolution failed" });
  }
});

export default router;
