const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const bot = require('../bot/bot');

// GET /avatar/:userId — публичный проксирующий эндпоинт (без initData, т.к. <img src>
// не может слать заголовки). Ходит в Telegram Bot API за фото профиля и отдаёт байты
// сам, чтобы BOT_TOKEN (он есть в прямой ссылке от Telegram) никогда не улетал на клиент.
router.get('/:userId', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.userId)) return res.status(404).end();

    const { rows } = await pool.query('SELECT telegram_id FROM users WHERE id = $1', [req.params.userId]);
    const telegramId = rows[0]?.telegram_id;
    if (!telegramId) return res.status(404).end();

    const photos = await bot.getUserProfilePhotos(telegramId, { limit: 1 });
    if (!photos.total_count) return res.status(404).end();

    const sizes = photos.photos[0];
    const fileId = sizes[sizes.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);

    const imgRes = await fetch(fileLink);
    if (!imgRes.ok) return res.status(404).end();

    res.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(await imgRes.arrayBuffer()));
  } catch (err) {
    console.error('Ошибка получения аватарки:', err.message);
    res.status(404).end();
  }
});

module.exports = router;
