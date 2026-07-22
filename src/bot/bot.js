const TelegramBot = require('node-telegram-bot-api');
const pool = require('../db/pool');
const quotes = require('./quotes');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

const HABIT_LABELS = {
  alcohol: 'Алкоголь',
  drugs: 'Наркотики',
  nicotine: 'Никотин',
  games: 'Игры',
  reels: 'Рилзы',
  social_media: 'Соцсети',
};

function habitLabel(type) {
  return HABIT_LABELS[type] || type;
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
      const { rows: habits } = userId
        ? await pool.query('SELECT id, habit_type FROM habits WHERE user_id = $1', [userId])
        : { rows: [] };

      if (habits.length > 1) {
        // Premium-юзер с несколькими привычками — уточняем, какая именно, а не сбрасываем все разом
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, 'По какой из привычек?', {
          reply_markup: {
            inline_keyboard: habits.map((h) => [
              { text: habitLabel(h.habit_type), callback_data: `checkin_relapse_pick_${h.id}` },
            ]),
          },
        });
        return;
      }

      if (habits[0]) {
        await pool.query('INSERT INTO relapses (habit_id) VALUES ($1)', [habits[0].id]);
      }

      await bot.answerCallbackQuery(query.id, { text: 'Записано.' });
      await bot.sendMessage(chatId, `Не страшно, главное — начать заново.\n${randomQuote()}`);
      return;
    }

    if (query.data.startsWith('checkin_relapse_pick_')) {
      const habitId = query.data.slice('checkin_relapse_pick_'.length);

      const { rows: habitRows } = await pool.query(
        `SELECT h.id FROM habits h JOIN users u ON u.id = h.user_id WHERE h.id = $1 AND u.telegram_id = $2`,
        [habitId, telegramId]
      );

      if (habitRows[0]) {
        await pool.query('INSERT INTO relapses (habit_id) VALUES ($1)', [habitRows[0].id]);
      }

      await bot.answerCallbackQuery(query.id, { text: 'Записано.' });
      await bot.sendMessage(chatId, `Не страшно, главное — начать заново.\n${randomQuote()}`);
    }
  } catch (err) {
    console.error('Ошибка обработки callback_query:', err);
  }
});

module.exports = bot;
