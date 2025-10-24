// /server/routes/auth.js

const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword, generateToken, sendMfaCode } = require('../utils/authUtils');
const Client = require('../models/Client');
const Freelancer = require('../models/Freelancer');
// NOTE: We will need cookie-parser in index.js to handle setting the JWT cookie

// Helper function to set the JWT token in an HTTP-only cookie
const sendTokenResponse = (user, role, statusCode, res) => {
    const token = generateToken(user._id, role);

    const options = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        httpOnly: true, // Prevents client-side JS access, enhancing security
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict'
    };

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token: token,
        role: role
    });
};

// ====================================================================
// A. REGISTRATION ENDPOINT (Handles both roles, determined by the route used)
// ====================================================================

const registerUser = async (req, res, userModel, role) => {
    const { name, email, password, location } = req.body;
    try {
        // 1. Check if user already exists (using the model passed in)
        let user = await userModel.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: `${role} already exists with this email.` });
        }

        // 2. Hash the password
        const hashedPassword = await hashPassword(password);

        // 3. Create and save the new user document
        user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            location: location || { coordinates: [0, 0] } // Basic coordinates if none provided
        });

        // 4. Respond with a success message
        res.status(201).json({
            success: true,
            msg: `${role} registered successfully. Proceed to login.`,
            user: { id: user._id, email: user.email, role: role }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during registration.');
    }
};

// Route for Client Registration
router.post('/register/client', (req, res) => registerUser(req, res, Client, 'client'));

// Route for Freelancer Registration
router.post('/register/freelancer', (req, res) => registerUser(req, res, Freelancer, 'freelancer'));


// ====================================================================
// B. LOGIN ENDPOINT (Two-stage process: Login -> MFA -> JWT Issuance)
// ====================================================================

// 1. Initial Login: Verify password and initiate MFA
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ msg: 'Please enter email, password, and role.' });
    }

    const userModel = role === 'freelancer' ? Freelancer : Client;
    
    try {
        // Find user and select password explicitly
        const user = await userModel.findOne({ email }).select('+password'); 

        if (!user) {
            return res.status(401).json({ msg: 'Invalid Credentials (User not found).' });
        }

        // Compare password
        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ msg: 'Invalid Credentials (Password mismatch).' });
        }
        
        // --- INITIATE MFA STEP ---
        const mfaCode = await sendMfaCode(user.email);
        
        // For a real app, you would save mfaCode and user.id to a temporary cache (Redis/Session)
        // For now, we respond with the next step required from the client
        res.status(200).json({
            success: true,
            msg: 'MFA initiated. Please submit the code sent to your contact.',
            userId: user._id, // Send ID back so client knows which user to verify
            mfa_verification_code_simulated: mfaCode // DEBUG: Remove in production
        });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during login.');
    }
});


// 2. MFA Verification: Issues the final JWT token
router.post('/verify-mfa', async (req, res) => {
    const { userId, role, mfa_code } = req.body;
    
    // In a real app, check mfa_code against the value stored in cache/session for userId
    // For this conceptual example, we'll assume the code is always '123456'
    
    if (mfa_code !== '123456') {
        return res.status(401).json({ msg: 'Invalid MFA code.' });
    }
    
    // --- MFA SUCCESS ---
    const userModel = role === 'freelancer' ? Freelancer : Client;
    const user = await userModel.findById(userId);

    // Issue the final JWT token and set the cookie
    sendTokenResponse(user, role, 200, res);
});


// ====================================================================
// C. LOGOUT ENDPOINT
// ====================================================================

router.get('/logout', (req, res) => {
    // Clear the JWT cookie to end the session
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
        httpOnly: true
    });
    res.status(200).json({ success: true, msg: 'User logged out successfully.' });
});


module.exports = router;