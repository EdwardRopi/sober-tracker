const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Вызывается один раз при открытии мини-аппа — сохраняем юзера, если его ещё нет
router.post('/init', async (req, res) => {
  const { id, first_name, username } = req.telegramUser;

  try {
    const result = await pool.query(
      `INSERT INTO users (telegram_id, first_name, username)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id) DO UPDATE SET first_name = $2, username = $3
       RETURNING *`,
      [id, first_name, username]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
