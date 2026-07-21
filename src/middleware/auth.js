const { validateInitData } = require('../utils/validateInitData');

/**
 * Middleware — вешаем на все эндпоинты, куда должен приходить только
 * реальный юзер из Telegram Mini App, а не левый запрос через Postman.
 */
function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];

  if (!initData) {
    return res.status(401).json({ error: 'Нет initData' });
  }

  const { valid, user, reason } = validateInitData(initData, process.env.BOT_TOKEN);

  if (!valid) {
    return res.status(401).json({ error: 'Невалидная подпись', reason });
  }

  req.telegramUser = user; // дальше в роутах доступен req.telegramUser.id и т.д.
  next();
}

module.exports = { authMiddleware };
