require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Fail fast on misconfiguration rather than signing unverifiable tokens or
// serving opaque 500s. JWT_SECRET is required; without it auth is insecure
// and jwt.verify() can throw on every request.
const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  throw new Error(
    `Missing required environment variable(s): ${missingEnv.join(', ')}. ` +
    `Set them in server/.env (or your deployment environment) before starting.`
  );
}

// Initialize database connection
connectDB().catch(err => console.error('Initial DB connection failed:', err));

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined 
  });
});

// Export for Vercel
module.exports = app;

// Local development server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
