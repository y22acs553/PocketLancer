import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";
import { SERVICE_DURATIONS } from "../constants/serviceDurations.js";
import {
  sendBookingCreated,
  sendBookingConfirmed,
  sendBookingCompleted,
  sendBookingCancelled,
} from "../services/notificationService.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────
// Razorpay client
// ─────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function getServiceDuration(serviceType) {
  if (!serviceType) return 60;
  const key = serviceType.trim().toLowerCase();
  return SERVICE_DURATIONS?.[key] ?? 60;
}

function computeAgreedAmount(
  freelancer,
  estimatedDurationMinutes,
  overrideHours,
) {
  // If caller passes explicit hours (hours-known flow), use those
  if (overrideHours && overrideHours > 0) {
    return parseFloat(
      (overrideHours * (freelancer.hourlyRate || 0)).toFixed(2),
    );
  }

  switch (freelancer.pricingType) {
    case "fixed":
      return freelancer.fixedPrice || 0;
    case "milestone":
      return (freelancer.milestones || []).reduce(
        (sum, m) => sum + m.amount,
        0,
      );
    case "hourly":
    default:
      return parseFloat(
        (
          (estimatedDurationMinutes / 60) *
          (freelancer.hourlyRate || 0)
        ).toFixed(2),
      );
  }
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === signature;
}

// ─────────────────────────────────────────────────────────
// GET /api/bookings/mybookings
// ─────────────────────────────────────────────────────────
router.get("/mybookings", protect, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "client") {
      query.clientId = req.user._id;
    } else if (req.user.role === "freelancer") {
      const freelancer = await Freelancer.findOne({ user: req.user._id });
      if (!freelancer) return res.json({ success: true, data: [] });
      query.freelancerId = freelancer._id;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate("clientId", "name email avatar")
      .populate(
        "freelancerId",
        "title hourlyRate fixedPrice pricingType user profilePic category",
      );

    return res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("FETCH BOOKINGS ERROR:", err);
    return res.status(500).json({ msg: "Failed to fetch bookings." });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/bookings/:id
// ─────────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("clientId", "name email avatar")
      .populate(
        "freelancerId",
        "title hourlyRate fixedPrice pricingType user profilePic name category",
      );

    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    const freelancer = await Freelancer.findById(booking.freelancerId);
    const isClient =
      booking.clientId._id.toString() === req.user._id.toString();
    const isFreelancer =
      freelancer?.user?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isFreelancer && !isAdmin)
      return res.status(403).json({ msg: "Access denied" });

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/bookings
//
// Digital booking modes:
//   1. advancePayment: true  → charge freelancer's advanceAmount upfront
//   2. estimatedHours: N     → charge N × hourlyRate upfront
//
// Field booking: date/time/address required, no upfront payment.
// ─────────────────────────────────────────────────────────
router.post("/", protect, authorize("client"), async (req, res) => {
  const {
    freelancer_id,
    serviceType,
    issueDescription,
    preferredDate,
    preferredTime,
    address,
    // Digital-only fields
    advancePayment, // boolean — pay advance (duration unknown)
    estimatedHours, // number  — pay for known hours
  } = req.body;

  try {
    if (!freelancer_id || !serviceType) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const freelancer = await Freelancer.findById(freelancer_id);
    if (!freelancer)
      return res.status(404).json({ msg: "Freelancer not found" });

    const isDigital = freelancer.category === "digital";

    // ── Validate field-only requirements ───────────────
    if (!isDigital) {
      if (!preferredDate || !preferredTime || !address) {
        return res.status(400).json({
          msg: "Date, time, and address are required for field service bookings",
        });
      }
      // ── Reject past dates ────────────────────────────
      const today = new Date().toISOString().split("T")[0];
      if (preferredDate < today) {
        return res.status(400).json({
          msg: "Cannot book a date in the past. Please select today or a future date.",
        });
      }
    }

    const estimatedDurationMinutes = getServiceDuration(serviceType);

    // ── Compute timing ─────────────────────────────────
    let startTime, endTime;
    const dateStr = isDigital
      ? new Date().toISOString().split("T")[0]
      : preferredDate;
    const timeStr = isDigital ? "00:00" : preferredTime;

    startTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(startTime.getTime())) startTime = new Date();
    endTime = new Date(startTime.getTime() + estimatedDurationMinutes * 60000);

    // ── Conflict check (field only) ────────────────────
    if (!isDigital) {
      const conflict = await Booking.findOne({
        freelancerId: freelancer._id,
        status: { $in: ["pending", "confirmed"] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      });
      if (conflict) {
        return res
          .status(409)
          .json({ msg: "Freelancer already booked at this time" });
      }
    }

    // ── Compute agreed amount ──────────────────────────
    let agreedAmount;
    let bookingMode = "standard"; // for metadata

    if (isDigital && freelancer.pricingType === "hourly") {
      if (advancePayment) {
        // Mode 1: Duration unknown — charge advance amount
        agreedAmount = freelancer.advanceAmount || 0;
        bookingMode = "advance";
        if (agreedAmount < 1) {
          return res.status(400).json({
            msg: "Freelancer has not set an advance amount. Please contact them first.",
          });
        }
      } else if (estimatedHours && estimatedHours > 0) {
        // Mode 2: Duration known — charge hours × rate
        agreedAmount = parseFloat(
          (estimatedHours * (freelancer.hourlyRate || 0)).toFixed(2),
        );
        bookingMode = "hours";
      } else {
        return res.status(400).json({
          msg: "Please specify either advance payment or estimated hours for hourly digital services.",
        });
      }
    } else {
      agreedAmount = computeAgreedAmount(freelancer, estimatedDurationMinutes);
    }

    const milestones =
      freelancer.pricingType === "milestone"
        ? freelancer.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: m.amount,
            order: m.order,
            status: "pending",
          }))
        : [];

    // ── Create booking ─────────────────────────────────
    const booking = await Booking.create({
      freelancerId: freelancer._id,
      clientId: req.user._id,
      serviceType,
      issueDescription: issueDescription || "",
      serviceCategory: isDigital ? "digital" : "field",
      preferredDate: dateStr,
      preferredTime: timeStr,
      address: isDigital
        ? "Digital Service — No physical address required"
        : address,
      startTime,
      endTime,
      estimatedDurationMinutes:
        bookingMode === "hours"
          ? estimatedHours * 60
          : estimatedDurationMinutes,
      pricingType: freelancer.pricingType,
      agreedAmount,
      milestones,
      bookingMode,
      paymentStatus: isDigital ? "unpaid" : "field_pending",
    });

    await sendBookingCreated(freelancer.user, booking._id, {
      serviceType,
      date: dateStr,
    });

    return res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/bookings/:id/payment/create-order
// ─────────────────────────────────────────────────────────
router.post(
  "/:id/payment/create-order",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      // ── Phone number required before payment ──────────
      const clientUser = await User.findById(req.user._id);
      if (!clientUser?.phone || !clientUser.phone.trim()) {
        return res.status(400).json({
          msg: "Please add your mobile number in your profile before making a payment.",
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ msg: "Unauthorized" });
      }
      if (booking.serviceCategory !== "digital") {
        return res
          .status(400)
          .json({ msg: "Payment not required for field bookings" });
      }
      if (booking.paymentStatus === "held") {
        return res.status(400).json({ msg: "Payment already completed" });
      }

      const amountInPaise = Math.round(booking.agreedAmount * 100);
      if (amountInPaise < 100) {
        return res.status(400).json({ msg: "Amount too small for payment" });
      }

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `booking_${booking._id}`,
        notes: {
          bookingId: booking._id.toString(),
          serviceType: booking.serviceType,
        },
      });

      booking.razorpayOrderId = order.id;
      booking.paymentStatus = "pending";
      await booking.save();

      return res.json({
        success: true,
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingId: booking._id,
      });
    } catch (err) {
      console.error("CREATE ORDER ERROR:", err);
      return res.status(500).json({ msg: "Failed to create payment order" });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /api/bookings/:id/payment/verify
// ─────────────────────────────────────────────────────────
router.post(
  "/:id/payment/verify",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res
          .status(400)
          .json({ msg: "Missing payment verification fields" });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ msg: "Unauthorized" });
      }

      const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      );

      if (!isValid) {
        return res
          .status(400)
          .json({ msg: "Payment verification failed. Invalid signature." });
      }

      booking.razorpayOrderId = razorpay_order_id;
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.paymentStatus = "held";
      booking.escrowAmount = booking.agreedAmount;
      booking.paidAt = new Date();
      booking.autoReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await booking.save();

      // Notify freelancer that payment has been received in escrow
      const freelancer = await Freelancer.findById(booking.freelancerId);
      if (freelancer?.user) {
        await notify({
          userId: freelancer.user,
          type: "payment_released",
          message: `Payment of ₹${booking.agreedAmount?.toLocaleString("en-IN")} received in escrow for "${booking.serviceType}". Start working!`,
          link: `/freelancer/bookings`,
        });
      }

      return res.json({
        success: true,
        booking,
        message: "Payment verified and held in escrow",
      });
    } catch (err) {
      console.error("VERIFY PAYMENT ERROR:", err);
      return res.status(500).json({ msg: "Payment verification failed" });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /api/bookings/:id/payment/release
// Client releases escrow payment to freelancer.
// ✅ FIX: Now correctly notifies the FREELANCER (not the client)
// ─────────────────────────────────────────────────────────
router.post(
  "/:id/payment/release",
  protect,
  authorize("client"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      if (booking.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ msg: "Unauthorized" });
      }
      if (booking.serviceCategory !== "digital") {
        return res
          .status(400)
          .json({ msg: "Only digital bookings use escrow" });
      }
      if (booking.paymentStatus !== "held") {
        return res.status(400).json({ msg: "Payment is not in escrow" });
      }
      if (booking.disputeLocked) {
        return res
          .status(400)
          .json({ msg: "Booking locked due to active dispute" });
      }

      booking.paymentStatus = "released";
      booking.releasedAmount = booking.escrowAmount;
      booking.releasedAt = new Date();
      booking.status = "completed";

      await booking.save();

      // ✅ FIX: Notify the FREELANCER that payment was released to them.
      // (Previously sendBookingCompleted was called for the CLIENT which was wrong.)
      const freelancer = await Freelancer.findById(booking.freelancerId);
      if (freelancer?.user) {
        await notify({
          userId: freelancer.user,
          type: "payment_released",
          message: `Great news! ₹${booking.releasedAmount?.toLocaleString("en-IN")} has been released to you for "${booking.serviceType}".`,
          link: `/freelancer/bookings`,
        });
      }

      // Also notify the client that their approval was processed
      await notify({
        userId: booking.clientId,
        type: "booking_completed",
        message: `You've approved "${booking.serviceType}" and released payment. Thank you!`,
        link: `/bookings`,
      });

      return res.json({
        success: true,
        booking,
        message: "Payment released to freelancer successfully",
      });
    } catch (err) {
      console.error("RELEASE PAYMENT ERROR:", err);
      return res.status(500).json({ msg: "Failed to release payment" });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /api/bookings/:id/payment/refund
// Admin-initiated refund.
// ─────────────────────────────────────────────────────────
router.post("/:id/payment/refund", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin only" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: "Booking not found" });
    if (booking.paymentStatus !== "held") {
      return res.status(400).json({ msg: "Payment is not in escrow" });
    }

    const amountInPaise = Math.round(booking.escrowAmount * 100);
    const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
      amount: amountInPaise,
    });

    booking.paymentStatus = "refunded";
    booking.refundedAmount = booking.escrowAmount;
    booking.razorpayRefundId = refund.id;
    booking.refundedAt = new Date();
    booking.status = "cancelled";

    await booking.save();

    // Notify the client about the refund
    await notify({
      userId: booking.clientId,
      type: "payment_released",
      message: `Your payment of ₹${booking.refundedAmount?.toLocaleString("en-IN")} for "${booking.serviceType}" has been refunded.`,
      link: `/bookings`,
    });

    return res.json({ success: true, booking, refundId: refund.id });
  } catch (err) {
    console.error("REFUND ERROR:", err);
    return res.status(500).json({ msg: "Failed to process refund" });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/status
// ─────────────────────────────────────────────────────────
router.patch(
  "/:id/status",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    const { status } = req.body;
    if (
      !["confirmed", "in_progress", "completed", "cancelled"].includes(status)
    ) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const freelancer = await Freelancer.findOne({ user: req.user._id });
      if (
        !freelancer ||
        booking.freelancerId.toString() !== freelancer._id.toString()
      ) {
        return res.status(403).json({ msg: "Unauthorized" });
      }
      if (booking.status === "cancelled") {
        return res
          .status(400)
          .json({ msg: "Cannot update a cancelled booking" });
      }
      if (booking.disputeLocked) {
        return res
          .status(400)
          .json({ msg: "Booking locked due to active dispute" });
      }

      // ── Prevent marking future work as completed ──────
      if (status === "completed" || status === "in_progress") {
        const bookingDate = booking.startTime || new Date(booking.preferredDate);
        if (bookingDate > new Date()) {
          return res.status(400).json({
            msg: "Cannot mark a future booking as completed or in-progress. The work date has not arrived yet.",
          });
        }
      }

      let newStatus = status;
      if (booking.serviceCategory === "digital" && status === "completed") {
        newStatus = "in_progress";
      }

      booking.status = newStatus;
      await booking.save();

      const meta = { serviceType: booking.serviceType };
      if (status === "confirmed")
        await sendBookingConfirmed(booking.clientId, booking._id, meta);
      else if (status === "completed")
        await sendBookingCompleted(booking.clientId, booking._id, meta);
      else if (status === "cancelled")
        await sendBookingCancelled(booking.clientId, booking._id, meta);

      return res.status(200).json({ success: true, booking });
    } catch (err) {
      return res.status(500).json({ msg: "Failed to update booking status" });
    }
  },
);

// ─────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/milestone/:milestoneId
// ─────────────────────────────────────────────────────────
router.patch(
  "/:id/milestone/:milestoneId",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    const { status } = req.body;
    if (!["in_progress", "submitted"].includes(status))
      return res.status(400).json({ msg: "Invalid milestone status" });

    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const freelancer = await Freelancer.findOne({ user: req.user._id });
      if (booking.freelancerId.toString() !== freelancer?._id.toString())
        return res.status(403).json({ msg: "Unauthorized" });

      const milestone = booking.milestones.id(req.params.milestoneId);
      if (!milestone)
        return res.status(404).json({ msg: "Milestone not found" });

      milestone.status = status;
      await booking.save();
      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ msg: "Server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/milestone/:milestoneId/approve
// ─────────────────────────────────────────────────────────
router.patch(
  "/:id/milestone/:milestoneId/approve",
  protect,
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });
      if (booking.clientId.toString() !== req.user._id.toString())
        return res.status(403).json({ msg: "Only client can approve" });

      const milestone = booking.milestones.id(req.params.milestoneId);
      if (!milestone || milestone.status !== "submitted")
        return res
          .status(400)
          .json({ msg: "Milestone must be submitted first" });

      milestone.status = "approved";
      booking.releasedAmount = (booking.releasedAmount || 0) + milestone.amount;

      const allDone = booking.milestones.every((m) =>
        ["approved", "released"].includes(m.status),
      );

      booking.paymentStatus = allDone ? "released" : "partially_released";
      if (allDone) {
        booking.status = "completed";
        booking.releasedAt = new Date();
      }

      await booking.save();

      // Notify freelancer about milestone approval
      const freelancer = await Freelancer.findById(booking.freelancerId);
      if (freelancer?.user) {
        await notify({
          userId: freelancer.user,
          type: "payment_released",
          message: `Milestone "${milestone.title}" approved! ₹${milestone.amount?.toLocaleString("en-IN")} released to you.`,
          link: `/freelancer/bookings`,
        });
      }

      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ msg: "Server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/field-paid
// ─────────────────────────────────────────────────────────
router.patch(
  "/:id/field-paid",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ msg: "Booking not found" });

      const freelancer = await Freelancer.findOne({ user: req.user._id });
      if (
        !freelancer ||
        booking.freelancerId.toString() !== freelancer._id.toString()
      ) {
        return res.status(403).json({ msg: "Unauthorized" });
      }
      if (booking.serviceCategory !== "field") {
        return res.status(400).json({ msg: "Only for field bookings" });
      }

      // ── Prevent marking future work as field-paid ─────
      const bookingDate = booking.startTime || new Date(booking.preferredDate);
      if (bookingDate > new Date()) {
        return res.status(400).json({
          msg: "Cannot mark a future booking as paid. The work date has not arrived yet.",
        });
      }

      booking.paymentStatus = "field_paid";
      booking.status = "completed";
      await booking.save();

      await sendBookingCompleted(booking.clientId, booking._id, {
        serviceType: booking.serviceType,
      });

      return res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ msg: "Server error" });
    }
  },
);

export default router;
