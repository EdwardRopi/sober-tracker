const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

async function getUserId(telegramId) {
  const { rows } = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0]?.id;
}

// POST /api/journal — сохранить обещание на день или запись "мозгового слива"
router.post('/', async (req, res) => {
  try {
    const { entry_type, text } = req.body;

    if (!['promise', 'dump'].includes(entry_type) || !text) {
      return res.status(400).json({ error: 'entry_type (promise/dump) и text обязательны' });
    }

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows } = await pool.query(
      `INSERT INTO journal_entries (user_id, entry_type, text) VALUES ($1, $2, $3) RETURNING *`,
      [userId, entry_type, text]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/journal/promise-today — обещание, уже данное сегодня (если есть)
router.get('/promise-today', async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows } = await pool.query(
      `SELECT * FROM journal_entries
       WHERE user_id = $1 AND entry_type = 'promise' AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
