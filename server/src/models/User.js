const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // Gamification / global stats
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    freezes: { type: Number, default: 0 },
    totalStudySeconds: { type: Number, default: 0 },
    quizzes: { type: Number, default: 0 },
    lastStudyDate: { type: String, default: null }, // "YYYY-MM-DD"
    studyHistory: {
      type: Map,
      of: Number, // date string -> minutes studied
      default: {},
    },
    dailyQuests: { type: mongoose.Schema.Types.Mixed, default: null },
    theme: { type: String, default: 'dark' },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
