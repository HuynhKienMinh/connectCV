// [Server] File khởi động Express server: bật CORS, parse JSON, mount toàn bộ routes, lắng nghe cổng PORT
const express = require('express');
const app = express();

const PORT = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running!' });
});

app.get('/', (req, res) => {
  res.send('AI Career is ready.');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
