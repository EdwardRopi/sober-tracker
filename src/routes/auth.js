const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Вызывается один раз при открытии мини-аппа — сохраняем юзера, если его ещё нет.
// display_name не трогаем при повторном входе — юзер мог поменять его вручную.
router.post('/init', async (req, res) => {
  const { id, first_name, username } = req.telegramUser;

  try {
    const result = await pool.query(
      `INSERT INTO users (telegram_id, first_name, username, display_name)
       VALUES ($1, $2, $3, $2)
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

// PATCH /api/auth/profile — поменять отображаемое имя
router.patch('/profile', async (req, res) => {
  const { display_name } = req.body;

  if (!display_name || !display_name.trim()) {
    return res.status(400).json({ error: 'display_name обязателен' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET display_name = $1 WHERE telegram_id = $2 RETURNING *`,
      [display_name.trim().slice(0, 60), req.telegramUser.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Юзер не найден' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
