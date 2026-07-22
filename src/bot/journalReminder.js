const cron = require('node-cron');
const pool = require('../db/pool');
const bot = require('./bot');
const journalPrompts = require('./journalPrompts');

function promptOfTheDay() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000);
  return journalPrompts[dayOfYear % journalPrompts.length];
}

// Ежедневное напоминание в 12:00 — заглянуть в "Сегодня" и сделать мозговой слив.
// Отдельно от вечернего чек-ина (src/bot/checkin.js), фраза каждый день своя.
function scheduleJournalReminders() {
  cron.schedule('0 12 * * *', async () => {
    const { rows: users } = await pool.query(
      'SELECT DISTINCT u.telegram_id FROM users u JOIN habits h ON h.user_id = u.id'
    );

    const text = promptOfTheDay();
    const webAppUrl = `${process.env.WEBAPP_URL || 'https://example.com'}?tab=today`;

    for (const user of users) {
      bot
        .sendMessage(user.telegram_id, text, {
          reply_markup: {
            inline_keyboard: [[{ text: 'Открыть трекер', web_app: { url: webAppUrl } }]],
          },
        })
        .catch((err) => console.error(`Не удалось отправить напоминание юзеру ${user.telegram_id}:`, err.message));
    }
  });
}

module.exports = { scheduleJournalReminders };
