import { useEffect, useState } from 'react';
import { api } from '../api';

const HABIT_TYPES = [
  { value: 'alcohol', label: 'Алкоголь' },
  { value: 'smoking', label: 'Курение' },
  { value: 'social_media', label: 'Соцсети' },
];

function breakdownSince(soberSince) {
  const start = new Date(soberSince);
  const now = new Date();

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  return { years, months, days, hours, minutes, seconds };
}

function HabitForm({ onCreated }) {
  const [habitType, setHabitType] = useState(HABIT_TYPES[0].value);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [dailyCost, setDailyCost] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const habit = await api.createHabit({
        habit_type: habitType,
        started_at: new Date(startedAt).toISOString(),
        daily_cost: dailyCost ? Number(dailyCost) : 0,
        reason_text: reasonText || null,
      });
      onCreated(habit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="habit-form" onSubmit={handleSubmit}>
      <h2>Начать отслеживать привычку</h2>

      <label>
        Привычка
        <select value={habitType} onChange={(e) => setHabitType(e.target.value)}>
          {HABIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Отсчёт трезвости с
        <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required />
      </label>

      <label>
        Сколько тратил в день (₽, необязательно)
        <input type="number" min="0" step="0.01" value={dailyCost} onChange={(e) => setDailyCost(e.target.value)} />
      </label>

      <label>
        Почему я бросаю (необязательно)
        <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3} />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={submitting}>
        {submitting ? 'Сохраняю...' : 'Начать'}
      </button>
    </form>
  );
}

const UNITS = [
  ['years', 'лет'],
  ['months', 'мес'],
  ['days', 'дней'],
  ['hours', 'ч'],
  ['minutes', 'мин'],
  ['seconds', 'сек'],
];

function Counter({ habit, onRelapse }) {
  const [breakdown, setBreakdown] = useState(() => breakdownSince(habit.sober_since));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setBreakdown(breakdownSince(habit.sober_since)), 1000);
    return () => clearInterval(id);
  }, [habit.sober_since]);

  async function handleRelapse() {
    setBusy(true);
    try {
      const { habit: updated } = await api.relapse(habit.id);
      onRelapse(updated);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="counter">
      <p className="counter-label">Я чист(а) уже</p>

      <div className="counter-grid">
        {UNITS.map(([key, label]) => (
          <div className="counter-cell" key={key}>
            <span className="counter-value">{breakdown[key]}</span>
            <span className="counter-unit">{label}</span>
          </div>
        ))}
      </div>

      {habit.daily_cost > 0 && <p className="counter-sub">Сэкономлено: {habit.money_saved} ₽</p>}

      {confirming ? (
        <div className="confirm">
          <p>Точно записать срыв?</p>
          <div className="confirm-buttons">
            <button className="danger" onClick={handleRelapse} disabled={busy}>
              {busy ? 'Записываю...' : 'Да, сорвался'}
            </button>
            <button onClick={() => setConfirming(false)} disabled={busy}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button className="danger" onClick={() => setConfirming(true)}>
          Я сорвался
        </button>
      )}
    </div>
  );
}

export default function ProgressTab({ habit, setHabit }) {
  return <div className="tab-screen">{habit ? <Counter habit={habit} onRelapse={setHabit} /> : <HabitForm onCreated={setHabit} />}</div>;
}
