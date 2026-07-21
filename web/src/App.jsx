import { useEffect, useState } from 'react';
import { api } from './api';
import './App.css';

const HABIT_TYPES = [
  { value: 'alcohol', label: 'Алкоголь' },
  { value: 'smoking', label: 'Курение' },
  { value: 'social_media', label: 'Соцсети' },
];

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

      <button type="submit" disabled={submitting}>
        {submitting ? 'Сохраняю...' : 'Начать'}
      </button>
    </form>
  );
}

function Counter({ habit, onRelapse }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

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
      <p className="counter-label">Без срывов</p>
      <p className="counter-days">{habit.sober_days}</p>
      <p className="counter-sub">
        {habit.sober_days === 1 ? 'день' : 'дней'}
        {habit.daily_cost > 0 && ` · сэкономлено ${habit.money_saved} ₽`}
      </p>

      {confirming ? (
        <div className="confirm">
          <p>Точно записать срыв?</p>
          <button className="danger" onClick={handleRelapse} disabled={busy}>
            {busy ? 'Записываю...' : 'Да, сорвался'}
          </button>
          <button onClick={() => setConfirming(false)} disabled={busy}>
            Отмена
          </button>
        </div>
      ) : (
        <button className="danger" onClick={() => setConfirming(true)}>
          Я сорвался
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [habit, setHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();

    async function load() {
      try {
        await api.initAuth();
        const habits = await api.getHabits();
        setHabit(habits[0] || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div className="screen">Загрузка...</div>;

  if (error) {
    return (
      <div className="screen">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      {habit ? <Counter habit={habit} onRelapse={setHabit} /> : <HabitForm onCreated={setHabit} />}
    </div>
  );
}
