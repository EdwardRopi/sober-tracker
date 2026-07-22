require('dotenv').config();
const pool = require('./pool');

// Временный инструмент для ручной выдачи premium до готовности оплаты (week 6).
// Использование: npm run grant-premium -- <telegram_id> [on|off]
async function main() {
  const telegramId = process.argv[2];
  const mode = process.argv[3] || 'on';

  if (!telegramId) {
    console.error('Использование: npm run grant-premium -- <telegram_id> [on|off]');
    process.exit(1);
  }

  const { rows } = await pool.query(
    'UPDATE users SET is_premium = $1 WHERE telegram_id = $2 RETURNING id, display_name, is_premium',
    [mode !== 'off', telegramId]
  );

  if (!rows[0]) {
    console.log('Юзер с таким telegram_id не найден');
  } else {
    console.log(`Premium ${rows[0].is_premium ? 'включён' : 'выключен'} для ${rows[0].display_name} (id ${rows[0].id})`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
