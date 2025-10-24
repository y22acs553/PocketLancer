// /server/utils/authUtils.js (Simplified for core logic)

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 1. Hash password before saving to the database
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// 2. Compare submitted password with the stored hash during login
const comparePassword = (inputPassword, storedHash) => {
    return bcrypt.compare(inputPassword, storedHash);
};

// 3. Generate the final JWT upon successful MFA verification
const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// 4. Conceptual MFA Code Generator/Sender (MFA is a two-step process)
const sendMfaCode = async (email) => {
    // In a production app, this would use the Twilio package to send a real SMS or email.
    const code = Math.floor(100000 + Math.random() * 900000).toString(); 
    console.log(`[MFA] Code for ${email}: ${code}`);
    
    // For now, we return the code to simulate a check and save it to the session/cache later.
    return code; 
};

module.exports = { hashPassword, comparePassword, generateToken, sendMfaCode };