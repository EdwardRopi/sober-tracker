require('dotenv').config();
const pool = require('./pool');

// Смотрит, сколько юзеров реально открывали мини-апп в разные окна времени.
// "Активный" здесь = last_seen_at (обновляется на каждый POST /api/auth/init,
// то есть на каждое открытие мини-аппа), а не просто "зарегистрировался когда-то".
async function main() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '1 day') AS active_24h,
      COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '7 days') AS active_7d,
      COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '30 days') AS active_30d,
      COUNT(*) FILTER (WHERE is_premium AND (premium_expires_at IS NULL OR premium_expires_at > NOW())) AS premium
    FROM users
  `);

  const { rows: habitRows } = await pool.query('SELECT COUNT(*) AS total FROM habits');
  const { rows: relapseRows } = await pool.query('SELECT COUNT(*) AS total FROM relapses');

  const s = rows[0];
  console.log('Всего зарегистрировано:      ', s.total);
  console.log('Активны за последние 24ч:    ', s.active_24h);
  console.log('Активны за последние 7 дней: ', s.active_7d);
  console.log('Активны за последние 30 дней:', s.active_30d);
  console.log('Из них premium:              ', s.premium);
  console.log('Всего привычек создано:      ', habitRows[0].total);
  console.log('Всего срывов/рестартов:      ', relapseRows[0].total);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
