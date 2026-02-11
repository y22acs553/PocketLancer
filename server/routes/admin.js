import express from "express";
import { protect, authorize } from "../middleware/auth.js";

import User from "../models/User.js";
import Freelancer from "../models/Freelancer.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* =========================================
   ADMIN STATS
========================================= */
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const now = new Date();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    /*
    ===============================
    COUNTS
    ===============================
    */
    const [
      users,
      freelancers,
      bookings,
      bookingsToday,
      bookingsWeek,
      bookingsMonth,
    ] = await Promise.all([
      User.countDocuments(),
      Freelancer.countDocuments(),
      Booking.countDocuments(),

      Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
      Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    /*
    ===============================
    CHART DATA (Last 7 days)
    ===============================
    */
    const last7 = new Date();
    last7.setDate(last7.getDate() - 6);

    const chartRaw = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: last7 },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const chart = days.map((d, i) => {
      const found = chartRaw.find((x) => x._id === i + 1);
      return {
        name: d,
        count: found ? found.count : 0,
      };
    });

    /*
    ===============================
    RESPONSE — MATCH FRONTEND
    ===============================
    */
    res.json({
      users,
      freelancers,
      bookings,
      bookingsToday,
      bookingsWeek,
      bookingsMonth,
      chart,
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ msg: "Failed to fetch admin stats" });
  }
});

export default router;
