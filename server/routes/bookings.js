// /server/routes/bookings.js

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Freelancer = require('../models/Freelancer');
const { protect, authorize } = require('../middleware/auth');

// ====================================================================
// 1️⃣ FREELANCER AVAILABILITY MANAGEMENT
// --------------------------------------------------------------------
// Allows freelancers to update their available time slots.
// Example Request: PUT /api/bookings/availability
// Body: { availability: { "2025-11-01": ["9:00", "10:00"], "2025-11-02": ["14:00"] } }
// ====================================================================

router.put('/availability', protect, authorize('freelancer'), async (req, res) => {
  const { availability } = req.body;

  try {
    const freelancer = await Freelancer.findById(req.user._id);
    if (!freelancer) {
      return res.status(404).json({ success: false, msg: 'Freelancer profile not found.' });
    }

    freelancer.availability = availability || {};
    await freelancer.save();

    res.status(200).json({
      success: true,
      msg: 'Availability updated successfully.',
      data: freelancer.availability,
    });
  } catch (error) {
    console.error('Availability update failed:', error.message);
    res.status(500).json({ success: false, msg: 'Server Error: Could not update availability.' });
  }
});


// ====================================================================
// 2️⃣ CLIENT BOOKING CREATION
// --------------------------------------------------------------------
// Clients can book freelancers by submitting service details.
// Example Request: POST /api/bookings
// Body: {
//   freelancer_id: "68f9ed3aa2bb4db2f6466d2",
//   serviceType: "Plumbing",
//   issueDescription: "Leaking kitchen pipe",
//   preferredDate: "2025-10-30",
//   preferredTime: "Afternoon (12pm–4pm)",
//   address: "Flat No 204, MG Road, Hyderabad"
// }
// ====================================================================

router.post('/', protect, authorize('client'), async (req, res) => {
  const {
    freelancer_id,
    serviceType,
    issueDescription,
    preferredDate,
    preferredTime,
    address,
  } = req.body;

  // ✅ Basic validation
  if (!freelancer_id || !serviceType || !preferredDate || !preferredTime || !address) {
    return res.status(400).json({ success: false, msg: 'Missing required booking details.' });
  }

  try {
    // ✅ Step 1: Verify freelancer exists
    const freelancer = await Freelancer.findById(freelancer_id);
    if (!freelancer) {
      return res.status(404).json({ success: false, msg: 'Freelancer not found.' });
    }

    // ✅ Step 2: Create booking document
    const booking = await Booking.create({
      freelancerId: freelancer_id,
      clientId: req.user._id, // comes from JWT middleware
      serviceType,
      issueDescription,
      preferredDate: new Date(preferredDate),
      preferredTime,
      address,
      status: 'pending',
      payment_status: 'pending',
    });

    // ✅ Step 3: Respond with booking confirmation
    res.status(201).json({
      success: true,
      msg: 'Booking created successfully! Awaiting confirmation from freelancer.',
      booking,
    });
  } catch (error) {
    console.error('Booking creation failed:', error.message);
    res.status(500).json({ success: false, msg: 'Server Error: Could not create booking.' });
  }
});


// ====================================================================
// 3️⃣ FETCH BOOKINGS FOR LOGGED-IN USER
// --------------------------------------------------------------------
// Returns all bookings for the logged-in client or freelancer.
// Example Request: GET /api/bookings/mybookings
// ====================================================================

router.get('/mybookings', protect, async (req, res) => {
  try {
    // Determine which field to query by role
    const query =
      req.user.role === 'freelancer'
        ? { freelancerId: req.user._id }
        : { clientId: req.user._id };

    const bookings = await Booking.find(query)
      .populate('freelancerId', 'name email skills city')
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Booking retrieval failed:', error.message);
    res.status(500).json({ success: false, msg: 'Server Error: Could not retrieve bookings.' });
  }
});


// ====================================================================
// 4️⃣ FREELANCER ACTIONS (ACCEPT / DECLINE BOOKINGS)
// --------------------------------------------------------------------
// Example Request: PUT /api/bookings/:id/status
// Body: { status: "confirmed" } or { status: "cancelled" }
// ====================================================================

router.put('/:id/status', protect, authorize('freelancer'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, msg: 'Invalid booking status.' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, msg: 'Booking not found.' });
    }

    // Only the assigned freelancer can update this booking
    if (booking.freelancerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Not authorized to update this booking.' });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      msg: `Booking status updated to ${status}.`,
      booking,
    });
  } catch (error) {
    console.error('Booking status update failed:', error.message);
    res.status(500).json({ success: false, msg: 'Server Error: Could not update booking status.' });
  }
});


// ====================================================================
// ✅ EXPORT ROUTER
// ====================================================================
module.exports = router;