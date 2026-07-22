const cron = require('node-cron');
const pool = require('../db/pool');
const bot = require('./bot');

// Ежедневный чек-ин в 20:00 всем юзерам с хотя бы одной привычкой
function scheduleCheckins() {
  cron.schedule('0 20 * * *', async () => {
    const { rows: users } = await pool.query(
      'SELECT DISTINCT u.telegram_id FROM users u JOIN habits h ON h.user_id = u.id'
    );

    for (const user of users) {
      bot
        .sendMessage(user.telegram_id, 'Как ты сегодня — держишься?', {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Держусь 💪', callback_data: 'checkin_ok' },
                { text: 'Начать по новой', callback_data: 'checkin_relapse' },
              ],
            ],
          },
        })
        .catch((err) => console.error(`Не удалось отправить чек-ин юзеру ${user.telegram_id}:`, err.message));
    }
  });
}

module.exports = { scheduleCheckins };
