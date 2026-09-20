// [Server] File khởi động Express server: bật CORS, parse JSON, mount toàn bộ routes, lắng nghe cổng PORT
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running smoothly with AI modules!' });
});

app.get('/', (req, res) => {
  res.send('🚀 ConnectCV AI Career Backend is ready.');
});

// MOUNT CÁC ROUTES CỦA MINH (AI CORE)
app.use('/api/cv', require('./src/routes/cv'));
app.use('/api/interview', require('./src/routes/interview'));

// Khởi động server
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 ConnectCV Server listening on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 CV AI API:    http://localhost:${PORT}/api/cv/generate`);
  console.log(`📍 Interview API:http://localhost:${PORT}/api/interview/start`);
  console.log(`=============================================`);
});
