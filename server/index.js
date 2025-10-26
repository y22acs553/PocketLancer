// /server/index.js

const express = require('express');
const dotenv = require('dotenv');
dotenv.config();// Load environment variables from .env file (must be first)
console.log('Loaded MONGO_URI:', process.env.MONGO_URI);
const cookieParser = require('cookie-parser'); // <-- NEW: Import cookie-parser
const connectDB = require('./config/db');
const cors = require('cors');
 // allows all origins; for production, restrict origin

// --- 1. CONFIGURATION ---



// Connect to the database
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// --- 2. MIDDLEWARE ---

// Body parser: Allows the app to handle JSON data from request bodies
app.use(express.json()); 
app.use(cors({
  origin: 'https://pocketlancer.org',
  credentials: true
}));
// Cookie Parser: Allows the app to read and set cookies (essential for JWT security)
app.use(cookieParser()); // <-- NEW: Use cookie-parser middleware

// --- 3. ROUTES ---

// Import Authentication Routes
const authRoutes = require('./routes/auth');
const freelancerRoutes = require('./routes/freelancers');
const bookingRoutes = require('./routes/bookings');
const clientRoutes = require('./routes/client');
const { protect } = require('./middleware/auth'); 

// Base Route
app.get('/', (req, res) => {
    res.send('PocketLancer API Running...');
});

// Authentication Router (Public routes for registration/login/logout)
app.use('/api/auth', authRoutes);
app.use('/api/freelancers', freelancerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/client', clientRoutes);

// Example of a Protected Route (Testing the middleware)
app.get('/api/me', protect, (req, res) => {
    // This route will only execute if the JWT is valid and user is found (via 'protect')
    res.status(200).json({
        success: true,
        data: req.user, // The full user object (excluding password) from the database
        role: req.role
    });
});

// --- 4. START SERVER ---

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});