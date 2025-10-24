// /server/middleware/auth.js

const jwt = require('jsonwebtoken');
const Client = require('../models/Client'); 
const Freelancer = require('../models/Freelancer'); 

// --- Protect middleware ---
const protect = async (req, res, next) => {
    let token;

    // Check Authorization header for Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ msg: 'Not authorized, no token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Select model based on role
        const userModel = decoded.role === 'freelancer' ? Freelancer : Client;
        const user = await userModel.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ msg: 'User not found or token invalid.' });
        }

        // Attach user and role properly
        req.user = user;
        req.user.role = decoded.role; // <--- Important: attach role inside user object
        req.role = decoded.role;      // optional, can still use req.role elsewhere

        next();
    } catch (error) {
        return res.status(401).json({ msg: 'Not authorized, token verification failed.' });
    }
};

// --- Role-based authorization middleware ---
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                msg: `User role ${req.user.role} is not authorized to access this route.`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };