import express from "express";
import Booking from "../models/Booking.js";
import Freelancer from "../models/Freelancer.js";
import { protect, authorize } from "../middleware/auth.js";
import { SERVICE_DURATIONS } from "../constants/serviceDurations.js";

const router = express.Router();

/* ======================================================
   1️⃣ CREATE BOOKING (CLIENT)
   ====================================================== */
router.post("/", protect, authorize("client"), async (req, res) => {
  const {
    freelancer_id,
    serviceType,
    issueDescription,
    preferredDate,
    preferredTime,
    address,
  } = req.body;

  try {
    const freelancer = await Freelancer.findById(freelancer_id);
    if (!freelancer) {
      return res.status(404).json({ msg: "Freelancer not found" });
    }

    // ✅ 1. Calculate duration
    const estimatedDurationMinutes = getServiceDuration(serviceType);

    // ✅ 2. Build start & end time
    const startTime = new Date(`${preferredDate}T${preferredTime}`);
    const endTime = new Date(
      startTime.getTime() + estimatedDurationMinutes * 60000,
    );

    // ✅ 3. Block overlapping bookings
    const conflict = await Booking.findOne({
      freelancerId: freelancer._id,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        },
      ],
    });

    if (conflict) {
      return res.status(409).json({
        msg: "Freelancer already booked during this time",
      });
    }

    // ✅ 4. Create booking
    const booking = await Booking.create({
      freelancerId: freelancer._id,
      clientId: req.user._id,
      serviceType,
      issueDescription,
      preferredDate,
      preferredTime,
      startTime,
      endTime,
      estimatedDurationMinutes,
      address,
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ======================================================
   2️⃣ GET MY BOOKINGS (CLIENT + FREELANCER)
   ====================================================== */
router.get("/mybookings", protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "client") {
      query.clientId = req.user._id;
    }

    if (req.user.role === "freelancer") {
      const freelancer = await Freelancer.findOne({ user: req.user._id });

      if (!freelancer) {
        return res.json({ success: true, data: [] });
      }

      query.freelancerId = freelancer._id;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate("clientId", "name email");

    res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("❌ FETCH BOOKINGS ERROR:", err);
    res.status(500).json({ msg: "Failed to fetch bookings." });
  }
});

/* ======================================================
   3️⃣ UPDATE BOOKING STATUS (FREELANCER ONLY)
   ====================================================== */
router.patch(
  "/:id/status",
  protect,
  authorize("freelancer"),
  async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!["confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status value." });
    }

    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        return res.status(404).json({ msg: "Booking not found." });
      }

      // Ensure freelancer owns this booking
      const freelancer = await Freelancer.findOne({ user: req.user._id });

      if (
        !freelancer ||
        booking.freelancerId.toString() !== freelancer._id.toString()
      ) {
        return res.status(403).json({ msg: "Unauthorized action." });
      }

      // Prevent illegal transitions
      if (booking.status === "cancelled") {
        return res
          .status(400)
          .json({ msg: "Cancelled bookings cannot be updated." });
      }

      booking.status = status;
      await booking.save();

      res.status(200).json({ success: true, booking });
    } catch (err) {
      console.error("❌ UPDATE STATUS ERROR:", err);
      res.status(500).json({ msg: "Failed to update booking status." });
    }
  },
);

export default router;
