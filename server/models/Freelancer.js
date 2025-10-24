const mongoose = require('mongoose');

const FreelancerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Will be hashed (bcrypt)

    // Essential for location-based matching and geo-querying
    location: {
        type: {
            type: String,
            enum: ['Point'], 
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            index: '2dsphere', // Geospatial index
        },
    },
    
    skills: [String],
    portfolio: [String], // URLs/paths for portfolio items (images/videos)
    
    // Relationship to Reviews
    reviews: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Review' 
    }], 
    
    // For real-time booking and calendar management
    availability: { type: Object, default: {} }, 
    
}, { timestamps: true });

module.exports = mongoose.model('Freelancer', FreelancerSchema);