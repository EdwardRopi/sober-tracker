const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bot = require('../bot/bot');

const DAILY_ENCOURAGE_LIMIT = 3; // free-тариф — см. free-premium-split, безлимит будет с подпиской

async function getUserId(telegramId) {
  const { rows } = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0]?.id;
}

function soberDays(startedAt, lastRelapseAt) {
  const since = lastRelapseAt || startedAt;
  return Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
}

// GET /api/friends — лидерборд друзей по дням трезвости
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows } = await pool.query(
      `SELECT u.id, u.display_name, u.first_name, h.started_at,
              (SELECT relapsed_at FROM relapses WHERE habit_id = h.id ORDER BY relapsed_at DESC LIMIT 1) AS last_relapse_at
       FROM friendships f
       JOIN users u ON u.id = f.friend_id
       LEFT JOIN habits h ON h.user_id = u.id
       WHERE f.user_id = $1`,
      [userId]
    );

    const friends = rows
      .map((r) => ({
        id: r.id,
        name: r.display_name || r.first_name,
        sober_days: r.started_at ? soberDays(r.started_at, r.last_relapse_at) : null,
      }))
      .sort((a, b) => (b.sober_days ?? -1) - (a.sober_days ?? -1));

    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/friends/:friendId/encourage — подбодрить друга (free — лимит 3/день)
router.post('/:friendId/encourage', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.friendId)) return res.status(400).json({ error: 'Некорректный id' });

    const userId = await getUserId(req.telegramUser.id);
    if (!userId) return res.status(404).json({ error: 'Юзер не найден' });

    const { rows: friendRows } = await pool.query(
      `SELECT u.telegram_id FROM friendships f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1 AND f.friend_id = $2`,
      [userId, req.params.friendId]
    );
    if (!friendRows[0]) return res.status(404).json({ error: 'Это не твой друг' });

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM encouragements WHERE from_user_id = $1 AND created_at::date = CURRENT_DATE`,
      [userId]
    );
    const sentToday = Number(countRows[0].count);

    if (sentToday >= DAILY_ENCOURAGE_LIMIT) {
      return res.status(429).json({ error: 'Лимит подбадриваний на сегодня закончился', remaining_today: 0 });
    }

    await pool.query('INSERT INTO encouragements (from_user_id, to_user_id) VALUES ($1, $2)', [
      userId,
      req.params.friendId,
    ]);

    const { rows: meRows } = await pool.query('SELECT display_name, first_name FROM users WHERE id = $1', [userId]);
    const myName = meRows[0].display_name || meRows[0].first_name;

    bot
      .sendMessage(friendRows[0].telegram_id, `${myName} подбадривает тебя: держись, ты справляешься! 💪`)
      .catch((err) => console.error('Не удалось отправить подбадривание:', err.message));

    res.status(201).json({ remaining_today: DAILY_ENCOURAGE_LIMIT - sentToday - 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
