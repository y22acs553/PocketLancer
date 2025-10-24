// /server/routes/bookings.js

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Freelancer = require('../models/Freelancer');
const { protect, authorize } = require('../middleware/auth'); 

// ====================================================================
// 1. FREELANCER AVAILABILITY MANAGEMENT (Protected: Freelancer Role Only)
// ====================================================================

// @route   PUT /api/bookings/availability
// @desc    Freelancer updates their available time slots
// @access  Private (Freelancer)
router.put('/availability', protect, authorize('freelancer'), async (req, res) => {
    // Expected body: { availability: { '2025-11-01': ['9:00', '10:00'], '2025-11-02': ['14:00'] } }
    const { availability } = req.body;
    
    try {
        // Find the freelancer by the ID attached during JWT verification (req.user._id)
        const freelancer = await Freelancer.findById(req.user._id);

        if (!freelancer) {
            return res.status(404).json({ success: false, msg: 'Freelancer profile not found.' });
        }

        // Update the availability field
        freelancer.availability = availability; 
        await freelancer.save();

        res.status(200).json({ 
            success: true, 
            msg: 'Availability updated successfully.', 
            data: freelancer.availability 
        });

    } catch (error) {
        console.error('Availability update failed:', error.message);
        res.status(500).json({ success: false, msg: 'Server Error: Could not update availability.' });
    }
});


// ====================================================================
// 2. CLIENT BOOKING (Protected: Client Role Only)
// ====================================================================

// @route   POST /api/bookings
// @desc    Client creates a new booking
// @access  Private (Client)
router.post('/', protect, authorize('client'), async (req, res) => {
    // Expected body: { freelancer_id, date_time, service_details }
    const { freelancer_id, date_time, service_details } = req.body;
    
    // NOTE: This logic assumes the frontend sends a precise Date object for date_time.

    try {
        // 1. Availability Check (CRITICAL STEP): 
        // In a real app, this ensures the slot is still open in the freelancer's schedule.
        // For now, we assume the frontend has checked availability.

        // 2. Create the new booking document
        const booking = await Booking.create({
            freelancer_id: freelancer_id,
            client_id: req.user._id, // Client ID comes from the JWT payload
            date_time: new Date(date_time),
            service_details: service_details,
            status: 'Pending', // Status is Pending until payment/confirmation
            payment_status: 'Pending',
        });

        // 3. Respond for Payment (This is where payment processing would normally start)
        res.status(201).json({
            success: true,
            msg: 'Booking created successfully. Proceed to payment.',
            bookingId: booking._id,
        });

    } catch (error) {
        console.error('Booking creation failed:', error.message);
        res.status(500).json({ success: false, msg: 'Server Error: Could not create booking.' });
    }
});


// @route   GET /api/bookings/mybookings
// @desc    Get all bookings for the logged-in user (Client or Freelancer)
// @access  Private (Both Roles)
router.get('/mybookings', protect, async (req, res) => {
    try {
        const query = req.role === 'freelancer' 
            ? { freelancer_id: req.user._id } 
            : { client_id: req.user._id };

        const bookings = await Booking.find(query)
            .populate('freelancer_id', 'name email location')
            .populate('client_id', 'name email');

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Server Error: Could not retrieve bookings.' });
    }
});

module.exports = router;