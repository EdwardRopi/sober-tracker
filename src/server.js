require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const habitsRoutes = require('./routes/habits');
const journalRoutes = require('./routes/journal');
require('./bot/bot');
const { scheduleCheckins } = require('./bot/checkin');

const app = express();
app.use(cors());
app.use(express.json());

// Публичный health-check — чтобы проверить, что сервер вообще жив
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Всё дальше требует валидной initData от Telegram
app.use('/api', authMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/journal', journalRoutes);

scheduleCheckins();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
