const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

console.log("DB Config:", {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? '******' : 'UNDEFINED',
  port: process.env.DB_PORT
});

// Middleware
app.use(cors());
app.use(express.json());

// Ngrok Bypass Middleware
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to PostgreSQL database');
  release();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/blockchain', require('./routes/blockchain').router);

app.get('/', (req, res) => {
  res.send('CIVIC EYE - AI Complaint Tracking System API');
});

// Public Health & Stats Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const complaintsCount = await pool.query('SELECT COUNT(*) FROM complaints');
    const resolvedCount = await pool.query("SELECT COUNT(*) FROM complaints WHERE status = 'resolved'");

    res.json({
      status: 'online',
      uptime: process.uptime(),
      timestamp: new Date(),
      stats: {
        total_complaints: parseInt(complaintsCount.rows[0].count),
        solved_complaints: parseInt(resolvedCount.rows[0].count),
        active_modules: 5 // KSEB, PWD, Water, Corp, Admin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = { pool };
