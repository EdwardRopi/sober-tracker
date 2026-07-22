const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bot = require('../bot/bot');

async function getUserId(telegramId) {
  const { rows } = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0]?.id;
}

// POST /api/donate — создать ссылку на инвойс Telegram Stars (валюта XTR, без provider_token)
router.post('/', async (req, res) => {
  try {
    const amount = parseInt(req.body.amount, 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const link = await bot.createInvoiceLink(
      'Поддержать Sober Tracker',
      'Разовый донат на развитие проекта — спасибо! 💜',
      `donate_${userId}_${Date.now()}`,
      '',
      'XTR',
      [{ label: 'Донат', amount }]
    );

    res.json({ link });
  } catch (err) {
    console.error('Ошибка создания инвойса:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
