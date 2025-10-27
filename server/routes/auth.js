// /server/routes/auth.js
const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword, generateToken } = require('../utils/authUtils');
const { sendOtpEmail } = require("../utils/emailUtils");
const Client = require('../models/Client');
const Freelancer = require('../models/Freelancer');

const otpStore = new Map();


function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const { name, email, password, location, city, skills } = req.body;

    console.log(`🟢 [REGISTER-${role.toUpperCase()}] Incoming data:`, req.body);

    try {
        // 1️⃣ Check for duplicate email
        let user = await userModel.findOne({ email });
        if (user) {
            console.warn(`⚠️ [REGISTER-${role}] Duplicate email: ${email}`);
            return res.status(400).json({ msg: `${role} already exists with this email.` });
        }

        // 2️⃣ Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Name, email, and password are required.' });
        }

        // 3️⃣ For freelancers: ensure valid skills + location
        let finalLocation = location;
        let finalSkills = skills;

        if (role === 'freelancer') {
            // Skills validation
            if (!skills || !Array.isArray(skills) || skills.length === 0) {
                return res.status(400).json({ msg: 'Freelancers must include at least one skill.' });
            }

            // Location validation
            if (!location || !location.coordinates || location.coordinates.length !== 2) {
                console.warn('⚠️ [REGISTER-FREELANCER] Missing or invalid coordinates. Using fallback Hyderabad coords.');
                finalLocation = { type: 'Point', coordinates: [78.47, 17.38] }; // fallback
            }

            finalSkills = skills.map((s) => s.trim());
        }

        // 4️⃣ Hash password
        const hashedPassword = await hashPassword(password);

        // 5️⃣ Create user
        user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            ...(role === 'freelancer'
                ? {
                      skills: finalSkills,
                      city: city || 'Hyderabad',
                      location: finalLocation,
                  }
                : {
                      location: location || { type: 'Point', coordinates: [0, 0] },
                  }),
        });

        console.log(`✅ [REGISTER-${role}] Success for: ${email}`);

        res.status(201).json({
            success: true,
            msg: `${role} registered successfully. Proceed to login.`,
            user: { id: user._id, email: user.email, role },
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

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ msg: "Missing login details" });

    const userModel = role === "freelancer" ? Freelancer : Client;
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ msg: "Invalid email or password" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Invalid email or password" });

    // Generate OTP
    const otp = generateOtp();
    otpStore.set(email, { otp, expires: Date.now() + 2 * 60 * 1000 });

    // Send to user
    await sendOtpEmail(email, otp);

    console.log(`✅ OTP generated for ${email}: ${otp}`);
    res.status(200).json({ success: true, msg: "OTP sent to registered email." });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ msg: "Server error during login." });
  }
});

// ===============================================================
// 2️⃣ VERIFY OTP – issue JWT if correct
// ===============================================================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, role, otp } = req.body;
    if (!email || !otp || !role)
      return res.status(400).json({ msg: "Missing fields for OTP verification" });

    const entry = otpStore.get(email);
    if (!entry) return res.status(400).json({ msg: "OTP expired or not found" });

    if (Date.now() > entry.expires)
      return res.status(400).json({ msg: "OTP expired" });

    if (entry.otp !== otp)
      return res.status(400).json({ msg: "Invalid OTP" });

    // OTP valid – clear from store
    otpStore.delete(email);

    const userModel = role === "freelancer" ? Freelancer : Client;
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const token = generateToken(user._id, role);

    // Send token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(200).json({ success: true, msg: "Login successful", token });
  } catch (err) {
    console.error("❌ OTP verify error:", err.message);
    res.status(500).json({ msg: "Server error verifying OTP." });
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