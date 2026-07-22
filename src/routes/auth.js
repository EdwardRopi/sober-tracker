const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Вызывается один раз при открытии мини-аппа — сохраняем юзера, если его ещё нет.
// display_name не трогаем при повторном входе — юзер мог поменять его вручную.
router.post('/init', async (req, res) => {
  const { id, first_name, username } = req.telegramUser;

  try {
    const result = await pool.query(
      `INSERT INTO users (telegram_id, first_name, username, display_name, last_seen_at)
       VALUES ($1, $2, $3, $2, NOW())
       ON CONFLICT (telegram_id) DO UPDATE SET first_name = $2, username = $3, last_seen_at = NOW()
       RETURNING *`,
      [id, first_name, username]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/auth/profile — поменять отображаемое имя и/или приватность профиля.
// Оба поля необязательны по отдельности — можно прислать только одно.
router.patch('/profile', async (req, res) => {
  const { display_name, hidden_profile } = req.body;

  if (display_name !== undefined && !display_name.trim()) {
    return res.status(400).json({ error: 'display_name не может быть пустым' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           hidden_profile = COALESCE($2, hidden_profile)
       WHERE telegram_id = $3
       RETURNING *`,
      [display_name ? display_name.trim().slice(0, 60) : null, hidden_profile ?? null, req.telegramUser.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Юзер не найден' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
