// /server/routes/auth.js
const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword, generateToken, sendMfaCode } = require('../utils/authUtils');
const Client = require('../models/Client');
const Freelancer = require('../models/Freelancer');

// Helper function to send JWT in an HTTP-only cookie
const sendTokenResponse = (user, role, statusCode, res) => {
    const token = generateToken(user._id, role);

    const options = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    };

    console.log(`[TOKEN] Issued for ${role}: ${user.email}`);

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        role
    });
};

// ====================================================================
// A. REGISTRATION ENDPOINT (Handles both roles)
// ====================================================================

const registerUser = async (req, res, userModel, role) => {
    const { name, email, password, location } = req.body;

    console.log(`🟢 [REGISTER-${role.toUpperCase()}] Incoming data:`, req.body);

    try {
        let user = await userModel.findOne({ email });
        if (user) {
            console.warn(`⚠️ [REGISTER-${role}] Duplicate email: ${email}`);
            return res.status(400).json({ msg: `${role} already exists with this email.` });
        }

        const hashedPassword = await hashPassword(password);

        user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            location: location || { coordinates: [0, 0] }
        });

        console.log(`✅ [REGISTER-${role}] Success for: ${email}`);

        res.status(201).json({
            success: true,
            msg: `${role} registered successfully. Proceed to login.`,
            user: { id: user._id, email: user.email, role }
        });

    } catch (err) {
        console.error(`❌ [REGISTER-${role}] Server error:`, err.message);
        res.status(500).send('Server Error during registration.');
    }
};

// Routes
router.post('/register/client', (req, res) => registerUser(req, res, Client, 'client'));
router.post('/register/freelancer', (req, res) => registerUser(req, res, Freelancer, 'freelancer'));

// ====================================================================
// B. LOGIN ENDPOINT (Stage 1: Login → MFA)
// ====================================================================

router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    console.log('🟢 [LOGIN] Request body:', req.body);

    if (!email || !password || !role) {
        console.warn('⚠️ [LOGIN] Missing fields:', req.body);
        return res.status(400).json({ msg: 'Please enter email, password, and role.' });
    }

    const userModel = role === 'freelancer' ? Freelancer : Client;

    try {
        const user = await userModel.findOne({ email }).select('+password');
        if (!user) {
            console.warn(`❌ [LOGIN-${role}] User not found: ${email}`);
            return res.status(401).json({ msg: 'Invalid Credentials (User not found).' });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            console.warn(`❌ [LOGIN-${role}] Password mismatch for ${email}`);
            return res.status(401).json({ msg: 'Invalid Credentials (Password mismatch).' });
        }

        console.log(`✅ [LOGIN-${role}] Password verified for ${email}`);
        const mfaCode = await sendMfaCode(user.email);

        console.log(`📨 [MFA] Code sent to ${email}: ${mfaCode} (simulated)`);

        res.status(200).json({
            success: true,
            msg: 'MFA initiated. Please submit the code sent to your contact.',
            userId: user._id,
            mfa_verification_code_simulated: mfaCode // for testing
        });

    } catch (err) {
        console.error(`❌ [LOGIN-${role}] Server error:`, err.message);
        res.status(500).send('Server Error during login.');
    }
});

// ====================================================================
// C. MFA Verification (Stage 2: Issue Token)
// ====================================================================

router.post('/verify-mfa', async (req, res) => {
    console.log('🟢 [MFA-VERIFY] Incoming:', req.body);

    try {
        const { userId, role, mfa_code } = req.body;

        if (!userId || !role || !mfa_code) {
            console.warn('⚠️ [MFA-VERIFY] Missing fields:', req.body);
            return res.status(400).json({ msg: 'Missing required fields for MFA verification.' });
        }

        if (mfa_code !== '123456') {
            console.warn(`❌ [MFA-VERIFY] Invalid MFA code for ${userId}`);
            return res.status(401).json({ msg: 'Invalid MFA code.' });
        }

        const userModel = role === 'freelancer' ? Freelancer : Client;
        const user = await userModel.findById(userId);

        if (!user) {
            console.warn(`❌ [MFA-VERIFY] User not found: ${userId}`);
            return res.status(404).json({ msg: 'User not found.' });
        }

        console.log(`✅ [MFA-VERIFY] Success for ${user.email}`);
        sendTokenResponse(user, role, 200, res);

    } catch (err) {
        console.error('❌ [MFA-VERIFY] Server error:', err.message);
        res.status(500).json({ msg: 'Server error during MFA verification.' });
    }
});

// ====================================================================
// D. LOGOUT ENDPOINT
// ====================================================================

router.get('/logout', (req, res) => {
    console.log('🔴 [LOGOUT] Clearing token cookie...');
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ success: true, msg: 'User logged out successfully.' });
});

module.exports = router;