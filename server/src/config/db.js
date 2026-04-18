const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) return cachedConnection;

  try {
    cachedConnection = await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    return cachedConnection;
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    throw err;
  }
};

module.exports = connectDB;
