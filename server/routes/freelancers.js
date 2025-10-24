// /server/routes/freelancers.js

const express = require('express');
const router = express.Router();
const Freelancer = require('../models/Freelancer');

// Import the security middleware
const { protect, authorize } = require('../middleware/auth'); 

// ====================================================================
// PUBLIC ROUTE: LOCATION-BASED SEARCH
// @route   GET /api/freelancers/search
// @desc    Finds freelancers near a specific geographical coordinate
// @access  Public
// ====================================================================

router.get('/search', async (req, res) => {
    const { long, lat, maxDist, skills } = req.query; 

    if (!long || !lat || !maxDist) {
        return res.status(400).json({ 
            success: false, 
            msg: 'Please provide longitude, latitude, and max distance.' 
        });
    }

    // Convert maxDist from kilometers (KMs) to meters for MongoDB ($maxDistance is in meters)
    const maxDistanceMeters = parseFloat(maxDist) * 1000; 

    // Build the GeoJSON query using $nearSphere
    const geoQuery = {
        location: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(long), parseFloat(lat)],
                },
                $maxDistance: maxDistanceMeters, 
            },
        },
    };

    // Optional: Add Skill Filtering
    const filter = {};
    if (skills) {
        const skillArray = skills.split(',').map(s => s.trim());
        // $in finds documents where the 'skills' array contains any of the specified values
        filter.skills = { $in: skillArray };
    }
    
    try {
        // Execute the query
        const freelancers = await Freelancer.find({
            ...geoQuery, // Location filter
            ...filter,   // Skill filter
        }).select('-password'); // Always exclude the password hash

        res.status(200).json({
            success: true,
            count: freelancers.length,
            data: freelancers
        });

    } catch (error) {
        console.error('Location search failed:', error.message);
        res.status(500).json({ success: false, msg: 'Server Error during search.' });
    }
});


// ====================================================================
// PROTECTED ROUTE: FREELANCER PROFILE MANAGEMENT (Freelancer Role Only)
// ====================================================================

// @route   GET /api/freelancers/me
// @desc    Get the logged-in freelancer's OWN profile data
// @access  Private (Freelancer)
router.get('/me', protect, authorize('freelancer'), async (req, res) => {
    // req.user contains the full user object attached by the 'protect' middleware
    try {
        // Find freelancer by ID, populate reviews, and hide password
        const freelancer = await Freelancer.findById(req.user._id)
            .populate('reviews')
            .select('-password -__v'); // Select '-password' for security
        
        if (!freelancer) {
            return res.status(404).json({ success: false, msg: 'Freelancer profile not found.' });
        }

        res.status(200).json({
            success: true,
            data: freelancer
        });

    } catch (error) {
        console.error('Freelancer retrieval failed:', error.message);
        res.status(500).json({ success: false, msg: 'Server Error: Could not retrieve profile.' });
    }
});

// @route   PUT /api/freelancers/me
// @desc    Update the logged-in freelancer's profile details (skills, portfolio)
// @access  Private (Freelancer)
router.put('/me', protect, authorize('freelancer'), async (req, res) => {
    // Expected body: { skills: [...], portfolio: [...] }
    const updateFields = req.body;
    
    try {
        // Find by ID and update the document
        const freelancer = await Freelancer.findByIdAndUpdate(
            req.user._id,
            updateFields,
            { new: true, runValidators: true } // Return the updated document and run validators
        ).select('-password');

        if (!freelancer) {
            return res.status(404).json({ success: false, msg: 'Freelancer profile not found.' });
        }

        res.status(200).json({
            success: true,
            msg: 'Profile updated successfully.',
            data: freelancer
        });
        
    } catch (error) {
        console.error('Profile update failed:', error.message);
        res.status(500).json({ success: false, msg: 'Server Error: Could not update profile.' });
    }
});

module.exports = router;