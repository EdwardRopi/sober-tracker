const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

async function getUserId(telegramId) {
  const { rows } = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0]?.id;
}

function withCounter(habit, soberSince) {
  const ms = Date.now() - new Date(soberSince).getTime();
  const soberDays = Math.floor(ms / 86400000);
  return {
    ...habit,
    sober_since: soberSince,
    sober_days: soberDays,
    sober_seconds: Math.floor(ms / 1000),
    money_saved: Number((soberDays * habit.daily_cost).toFixed(2)),
  };
}

// GET /api/habits — все привычки текущего юзера со счётчиком трезвости
// (счётчик считается от последнего срыва, а если срывов не было — от started_at)
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows: habits } = await pool.query(
      `SELECT h.*, r.relapsed_at AS last_relapse_at
       FROM habits h
       LEFT JOIN LATERAL (
         SELECT relapsed_at FROM relapses WHERE habit_id = h.id ORDER BY relapsed_at DESC LIMIT 1
       ) r ON true
       WHERE h.user_id = $1
       ORDER BY h.created_at`,
      [userId]
    );

    res.json(habits.map((h) => withCounter(h, h.last_relapse_at || h.started_at)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/habits — создать привычку
// Пока разрешена только одна привычка на юзера — несколько одновременно
// доступно по подписке (см. week 7 в роадмапе), но проверка подписки ещё не готова
router.post('/', async (req, res) => {
  try {
    const { habit_type, started_at, daily_cost, reason_text, reason_photo_url } = req.body;

    if (!habit_type || !started_at) {
      return res.status(400).json({ error: 'habit_type и started_at обязательны' });
    }

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows: existing } = await pool.query('SELECT id FROM habits WHERE user_id = $1', [userId]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Уже есть активная привычка' });
    }

    const { rows } = await pool.query(
      `INSERT INTO habits (user_id, habit_type, started_at, daily_cost, reason_text, reason_photo_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, habit_type, started_at, daily_cost || 0, reason_text || null, reason_photo_url || null]
    );

    res.status(201).json(withCounter(rows[0], rows[0].started_at));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/habits/:id — одна привычка со счётчиком и полной историей срывов
router.get('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Некорректный id' });
    }

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows: habitRows } = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    const habit = habitRows[0];
    if (!habit) return res.status(404).json({ error: 'Привычка не найдена' });

    const { rows: relapses } = await pool.query(
      'SELECT * FROM relapses WHERE habit_id = $1 ORDER BY relapsed_at DESC',
      [habit.id]
    );

    res.json({
      ...withCounter(habit, relapses[0]?.relapsed_at || habit.started_at),
      relapses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/habits/:id — обновить причину отказа и дневную стоимость привычки
router.patch('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Некорректный id' });
    }

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { daily_cost, reason_text, reason_photo_url } = req.body;

    const { rows } = await pool.query(
      `UPDATE habits
       SET daily_cost = COALESCE($1, daily_cost),
           reason_text = COALESCE($2, reason_text),
           reason_photo_url = COALESCE($3, reason_photo_url)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [daily_cost, reason_text, reason_photo_url, req.params.id, userId]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Привычка не найдена' });

    const { rows: relapses } = await pool.query(
      'SELECT relapsed_at FROM relapses WHERE habit_id = $1 ORDER BY relapsed_at DESC LIMIT 1',
      [rows[0].id]
    );

    res.json(withCounter(rows[0], relapses[0]?.relapsed_at || rows[0].started_at));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/habits/:id/relapse — кнопка «я сорвался»: фиксируем срыв,
// привычка не удаляется, счётчик трезвости начинается заново от этого момента
router.post('/:id/relapse', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Некорректный id' });
    }

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows: habitRows } = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    const habit = habitRows[0];
    if (!habit) return res.status(404).json({ error: 'Привычка не найдена' });

    const { note } = req.body;

    const { rows: relapseRows } = await pool.query(
      `INSERT INTO relapses (habit_id, note) VALUES ($1, $2) RETURNING *`,
      [habit.id, note || null]
    );
    const relapse = relapseRows[0];

    res.status(201).json({
      relapse,
      habit: withCounter(habit, relapse.relapsed_at),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
