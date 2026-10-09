const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const router = express.Router();

// Throttle auth endpoints to blunt credential stuffing / brute force. Note: the
// default in-memory store is per-instance, so behind multiple serverless
// instances a shared store (e.g. Redis) is needed for a hard global limit.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Reject non-string credentials so query-operator objects (e.g. {"$gt":""})
// can never reach the data layer.
const validCreds = (email, password) =>
  typeof email === 'string' && typeof password === 'string' && email && password;

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!validCreds(email, password)) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: 'Email already in use' });
  }

  const user = await User.create({ email, password });
  const token = signToken(user._id);

  res.status(201).json({
    token,
    user: { id: user._id, email: user.email },
  });
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!validCreds(email, password)) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signToken(user._id);

  res.json({
    token,
    user: { id: user._id, email: user.email },
  });
});

module.exports = router;
