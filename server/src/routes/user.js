const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/user/stats
router.get('/stats', async (req, res) => {
  const user = await User.findById(req.userId)
    .select('-password')
    .lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PUT /api/user/stats — patch any subset of stats fields
router.put('/stats', async (req, res) => {
  const allowed = [
    'xp', 'streak', 'freezes', 'totalStudySeconds',
    'quizzes', 'lastStudyDate', 'studyHistory', 'dailyQuests', 'theme',
  ];

  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: update },
    { new: true }
  ).select('-password');

  res.json(user);
});

module.exports = router;
