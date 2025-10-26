const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Booking = require('../models/Booking'); // your bookings collection/model

// GET /client/dashboard
router.get('/dashboard', protect, authorize('client'), async (req, res) => {
  try {
    const clientId = req.user._id;

    // Count bookings by status
    const open = await Booking.countDocuments({ client: clientId, status: 'open' });
    const completed = await Booking.countDocuments({ client: clientId, status: 'completed' });
    const pending = await Booking.countDocuments({ client: clientId, status: 'pending' });

    res.json({ open, completed, pending });
  } catch (err) {
    console.error('❌ [CLIENT DASHBOARD ERROR]', err);
    res.status(500).json({ msg: 'Failed to fetch dashboard stats.' });
  }
});

module.exports = router;