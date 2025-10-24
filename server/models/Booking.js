const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    freelancer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Freelancer',
        required: true,
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },
    service_details: { type: String, required: true },
    
    // Critical for real-time scheduling
    date_time: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending',
    },
    payment_status: {
        type: String,
        enum: ['Pending', 'Paid', 'Refunded'],
        default: 'Pending', // Used for Stripe integration
    },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);