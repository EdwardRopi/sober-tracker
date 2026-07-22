const TelegramBot = require('node-telegram-bot-api');
const pool = require('../db/pool');
const quotes = require('./quotes');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// Deep-link приглашение друга — Telegram шлёт "/start inv<id>", если перешли по ссылке
// вида t.me/<bot>?start=inv123. Заводим юзера (если он новый) и делаем дружбу симметричной.
async function handleInvitePayload(payload, fromUser) {
  if (!payload || !payload.startsWith('inv')) return;

  const inviterId = parseInt(payload.slice(3), 10);
  if (Number.isNaN(inviterId)) return;

  const { rows: userRows } = await pool.query(
    `INSERT INTO users (telegram_id, first_name, username, display_name)
     VALUES ($1, $2, $3, $2)
     ON CONFLICT (telegram_id) DO UPDATE SET first_name = $2, username = $3
     RETURNING *`,
    [fromUser.id, fromUser.first_name, fromUser.username]
  );
  const newUserId = userRows[0].id;

  if (newUserId === inviterId) return;

  const { rows: inviterRows } = await pool.query('SELECT id FROM users WHERE id = $1', [inviterId]);
  if (!inviterRows[0]) return;

  await pool.query(
    `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)
     ON CONFLICT (user_id, friend_id) DO NOTHING`,
    [inviterId, newUserId]
  );

  return true;
}

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  try {
    const becameFriends = await handleInvitePayload(match[1], msg.from);
    if (becameFriends) {
      await bot.sendMessage(chatId, 'Вы теперь друзья в Sober Tracker — поддерживайте друг друга! 💪');
    }
  } catch (err) {
    console.error('Ошибка обработки приглашения:', err);
  }

  bot.sendMessage(
    chatId,
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

// Донаты через Telegram Stars (см. src/routes/donate.js) — обязательно ответить
// на pre_checkout_query в течение 10 секунд, иначе платёж Telegram отменит сам
bot.on('pre_checkout_query', async (query) => {
  try {
    await bot.answerPreCheckoutQuery(query.id, true);
  } catch (err) {
    console.error('Ошибка ответа на pre_checkout_query:', err);
  }
});

bot.on('successful_payment', async (msg) => {
  try {
    const payment = msg.successful_payment;
    const telegramId = msg.from.id;

    const { rows: userRows } = await pool.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
    const userId = userRows[0]?.id;

    if (userId) {
      await pool.query('INSERT INTO donations (user_id, telegram_id, amount) VALUES ($1, $2, $3)', [
        userId,
        telegramId,
        payment.total_amount,
      ]);

      // Донат даёт premium на ~месяц — звёздочка на аватарке и снятие free-лимитов
      await pool.query(
        `UPDATE users SET is_premium = true, premium_expires_at = NOW() + INTERVAL '31 days' WHERE id = $1`,
        [userId]
      );
    }

    await bot.sendMessage(
      msg.chat.id,
      `Спасибо огромное за поддержку — ${payment.total_amount} ⭐! Premium на месяц уже активен. 💜`
    );
  } catch (err) {
    console.error('Ошибка обработки successful_payment:', err);
  }
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
