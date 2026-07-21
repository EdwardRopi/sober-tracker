const TelegramBot = require('node-telegram-bot-api');
const pool = require('../db/pool');
const quotes = require('./quotes');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Привет! Я помогу трекать трезвость и не сорваться. Открой мини-апп, чтобы начать:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Открыть трекер', web_app: { url: process.env.WEBAPP_URL || 'https://example.com' } }],
        ],
      },
    }
  );
});

// Обработка нажатий на inline-кнопки ежедневного чек-ина (см. src/bot/checkin.js)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id;

  try {
    if (query.data === 'checkin_ok') {
      await bot.answerCallbackQuery(query.id, { text: 'Так держать!' });
      await bot.sendMessage(chatId, randomQuote());
      return;
    }

    if (query.data === 'checkin_relapse') {
      const { rows: userRows } = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
      const userId = userRows[0]?.id;

      if (userId) {
        const { rows: habits } = await pool.query('SELECT id FROM habits WHERE user_id = $1', [userId]);
        for (const habit of habits) {
          await pool.query('INSERT INTO relapses (habit_id) VALUES ($1)', [habit.id]);
        }
      }

      await bot.answerCallbackQuery(query.id, { text: 'Срыв записан.' });
      await bot.sendMessage(chatId, `Не страшно, главное — не бросать попытки.\n${randomQuote()}`);
    }
  } catch (err) {
    console.error('Ошибка обработки callback_query:', err);
  }
});

module.exports = bot;
