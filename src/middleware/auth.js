const { validateInitData } = require('../utils/validateInitData');
const pool = require('../db/pool');

/**
 * Middleware — вешаем на все эндпоинты, куда должен приходить только
 * реальный юзер из Telegram Mini App, а не левый запрос через Postman.
 * Заодно подтягивает req.isPremium, чтобы роуты могли разграничивать free/premium.
 */
async function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];

  if (!initData) {
    return res.status(401).json({ error: 'Нет initData' });
  }

  const { valid, user, reason } = validateInitData(initData, process.env.BOT_TOKEN);

  if (!valid) {
    return res.status(401).json({ error: 'Невалидная подпись', reason });
  }

  req.telegramUser = user; // дальше в роутах доступен req.telegramUser.id и т.д.

  try {
    const { rows } = await pool.query('SELECT is_premium FROM users WHERE telegram_id = $1', [user.id]);
    req.isPremium = rows[0]?.is_premium || false;
  } catch (err) {
    req.isPremium = false;
  }

  next();
}

module.exports = { authMiddleware };
