const pool = require('./db/pool');
const bot = require('./bot/bot');

const MILESTONES = [
  { key: 'day1', days: 1, label: 'Первые сутки', icon: '🌱' },
  { key: 'day3', days: 3, label: '3 дня', icon: '🔥' },
  { key: 'week1', days: 7, label: 'Неделя', icon: '💪' },
  { key: 'week2', days: 14, label: '2 недели', icon: '⚡' },
  { key: 'month1', days: 30, label: 'Месяц', icon: '🏆' },
  { key: 'month3', days: 90, label: '3 месяца', icon: '🌟' },
  { key: 'month6', days: 180, label: 'Полгода', icon: '👑' },
  { key: 'year1', days: 365, label: 'Год', icon: '💎' },
  { key: 'year2', days: 730, label: '2 года', icon: '🏔️' },
  { key: 'year3', days: 1095, label: '3 года', icon: '🦋' },
  { key: 'year5', days: 1825, label: '5 лет', icon: '🌈' },
  { key: 'year10', days: 3650, label: '10 лет', icon: '♾️' },
];

// Уведомляет друзей юзера, что он получил новый бейдж (соц-фича недели 5)
async function notifyFriendsOfBadge(userId, milestone, ownerTelegramId) {
  const { rows: ownerRows } = await pool.query('SELECT display_name, first_name FROM users WHERE id = $1', [userId]);
  const ownerName = ownerRows[0]?.display_name || ownerRows[0]?.first_name || 'Друг';

  const { rows: friends } = await pool.query(
    'SELECT u.telegram_id FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1',
    [userId]
  );

  for (const friend of friends) {
    if (friend.telegram_id === ownerTelegramId) continue;
    bot
      .sendMessage(friend.telegram_id, `🎉 ${ownerName} только что получил(а) бейдж «${milestone.label}» ${milestone.icon}! Загляни поддержать.`)
      .catch((err) => console.error('Не удалось уведомить друга о бейдже:', err.message));
  }
}

// Фиксирует новые бейджи разово (не пропадают при срыве), поздравляет через бота
// и уведомляет друзей юзера
async function awardEarnedBadges(habitId, soberDays, userId, telegramId) {
  const eligible = MILESTONES.filter((m) => soberDays >= m.days);

  for (const m of eligible) {
    const { rowCount } = await pool.query(
      'INSERT INTO badges_earned (habit_id, milestone_key) VALUES ($1, $2) ON CONFLICT (habit_id, milestone_key) DO NOTHING',
      [habitId, m.key]
    );

    if (rowCount > 0) {
      bot
        .sendMessage(telegramId, `${m.icon} Новый бейдж: «${m.label}»! Так держать.`)
        .catch((err) => console.error('Не удалось отправить поздравление с бейджем:', err.message));

      notifyFriendsOfBadge(userId, m, telegramId).catch((err) =>
        console.error('Не удалось уведомить друзей о бейдже:', err.message)
      );
    }
  }
}

async function getBadgesWithStatus(habitId) {
  const { rows } = await pool.query('SELECT milestone_key, earned_at FROM badges_earned WHERE habit_id = $1', [
    habitId,
  ]);
  const earnedMap = Object.fromEntries(rows.map((r) => [r.milestone_key, r.earned_at]));

  return MILESTONES.map((m) => ({
    key: m.key,
    label: m.label,
    icon: m.icon,
    days: m.days,
    earned: Boolean(earnedMap[m.key]),
    earned_at: earnedMap[m.key] || null,
  }));
}

// Проверяет/фиксирует новые бейджи и возвращает привычку с полным списком бейджей
async function attachBadges(habit, userId, telegramId) {
  await awardEarnedBadges(habit.id, habit.sober_days, userId, telegramId);
  const badges = await getBadgesWithStatus(habit.id);
  return { ...habit, badges };
}

module.exports = { MILESTONES, attachBadges };
