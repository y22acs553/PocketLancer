const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Freelancer = require('../models/Freelancer');

const protect = async (req, res, next) => {
  let token;

  // ✅ Check cookies first
  if (req.cookies?.token) {
    token = req.cookies.token;
    console.log('🟢 [AUTH] Token found in cookies.');
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('🟢 [AUTH] Token found in Authorization header.');
  } else {
    console.warn('⚠️ [AUTH] No token provided.');
    return res.status(401).json({ msg: 'Not authorized, no token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🟢 [AUTH] Token decoded:', decoded);

    const userModel = decoded.role === 'freelancer' ? Freelancer : Client;
    const user = await userModel.findById(decoded.id || decoded.userId).select('-password');

    if (!user) {
      console.warn('⚠️ [AUTH] User not found for decoded token:', decoded);
      return res.status(401).json({ msg: 'User not found or token invalid.' });
    }

    req.user = user;
    req.user.role = decoded.role;
    req.role = decoded.role;

    next();
  } catch (error) {
    console.error('❌ [AUTH] Token verification failed:', error.message);
    return res.status(401).json({ msg: 'Not authorized, token verification failed.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ msg: `User role ${req.user.role} is not authorized.` });
  }
  next();
};

module.exports = { protect, authorize };