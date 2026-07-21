const crypto = require('crypto');

/**
 * Проверяет, что initData реально пришла от Telegram, а не подделана.
 * Без этой проверки любой человек может прислать запрос от имени чужого юзера.
 *
 * Как работает: Telegram подписывает данные секретным ключом на основе токена бота.
 * Мы пересчитываем эту подпись у себя и сравниваем — если совпадает, данные подлинные.
 */
function validateInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  // Собираем строку для проверки — все параметры кроме hash, отсортированные по алфавиту
  const dataCheckArr = [];
  for (const [key, value] of urlParams.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  // Секретный ключ — это HMAC от токена бота со строкой "WebAppData"
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    return { valid: false, user: null };
  }

  // Проверяем, что данные не старше 24 часов (защита от replay-атак)
  const authDate = parseInt(urlParams.get('auth_date'), 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return { valid: false, user: null, reason: 'expired' };
  }

  const userJson = urlParams.get('user');
  const user = userJson ? JSON.parse(userJson) : null;

  return { valid: true, user };
}

module.exports = { validateInitData };
