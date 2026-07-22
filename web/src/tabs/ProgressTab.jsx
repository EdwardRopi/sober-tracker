import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { haptic } from '../haptic';

const HABIT_TYPES = [
  { value: 'alcohol', label: 'Алкоголь' },
  { value: 'drugs', label: 'Наркотики' },
  { value: 'nicotine', label: 'Никотин' },
  { value: 'games', label: 'Игры' },
  { value: 'reels', label: 'Рилзы' },
  { value: 'social_media', label: 'Соцсети' },
];

function habitTypeLabel(value) {
  return HABIT_TYPES.find((t) => t.value === value)?.label || value;
}

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
    <div className="onboarding">
      <div className="onboarding-icon">🌱</div>
      <h2>Начни свой путь</h2>
      <p className="hint onboarding-subtitle">
        Выбери, от чего отказываешься, и дату, с которой начинаешь отсчёт — дальше мы всё посчитаем сами.
      </p>

      <form className="habit-form" onSubmit={handleSubmit}>
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
          <input
            type="number"
            min="0"
            step="0.01"
            value={dailyCost}
            onChange={(e) => setDailyCost(e.target.value)}
          />
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
    </div>
  );
}

const UNIT_ORDER = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
const UNIT_LABELS = {
  years: 'лет',
  months: 'месяцев',
  days: 'дней',
  hours: 'часов',
  minutes: 'минут',
  seconds: 'секунд',
};
const CHIP_LABELS = { years: 'лет', months: 'мес', days: 'дней', hours: 'ч', minutes: 'мин', seconds: 'сек' };

function BadgeStrip({ badges }) {
  if (!badges?.length) return null;

  return (
    <div className="badges-strip">
      {badges.map((b) => (
        <div key={b.key} className={`badge ${b.earned ? 'badge-earned' : 'badge-locked'}`} title={b.label}>
          <span className="badge-icon">{b.icon}</span>
          <span className="badge-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function BadgeCelebration({ badge, onDismiss }) {
  useEffect(() => {
    if (!badge) return;
    haptic('success');
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  if (!badge) return null;

  return (
    <div className="badge-celebrate-overlay" onClick={onDismiss}>
      <div className="badge-celebrate-card">
        <div className="badge-celebrate-icon">{badge.icon}</div>
        <p className="badge-celebrate-title">Новый бейдж!</p>
        <p className="badge-celebrate-label">{badge.label}</p>
        <button type="button" className="primary" onClick={onDismiss}>
          Класс!
        </button>
      </div>
    </div>
  );
}

// Следит за habit.badges и ловит момент, когда какой-то бейдж переходит в earned:true
function useNewlyEarnedBadge(badges) {
  const prevRef = useRef(null);
  const [celebrate, setCelebrate] = useState(null);

  useEffect(() => {
    if (!badges) return;
    const prev = prevRef.current;

    if (prev) {
      const newlyEarned = badges.find((b) => b.earned && !prev.find((p) => p.key === b.key)?.earned);
      if (newlyEarned) setCelebrate(newlyEarned);
    }

    prevRef.current = badges;
  }, [badges]);

  return [celebrate, () => setCelebrate(null)];
}

function Counter({ habit, onRelapse, onUpdateHabit }) {
  const [breakdown, setBreakdown] = useState(() => breakdownSince(habit.sober_since));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState(() => new Date(habit.started_at).toISOString().slice(0, 16));
  const [savingDate, setSavingDate] = useState(false);
  const [editingType, setEditingType] = useState(false);
  const [typeDraft, setTypeDraft] = useState(habit.habit_type);
  const [savingType, setSavingType] = useState(false);
  const [celebrateBadge, dismissCelebration] = useNewlyEarnedBadge(habit.badges);

  useEffect(() => {
    const id = setInterval(() => setBreakdown(breakdownSince(habit.sober_since)), 1000);
    return () => clearInterval(id);
  }, [habit.sober_since]);

  async function handleRelapse() {
    setBusy(true);
    haptic('warning');
    try {
      const { habit: updated } = await api.relapse(habit.id);
      onRelapse(updated);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function handleDateSave(e) {
    e.preventDefault();
    setSavingDate(true);
    haptic('light');
    try {
      const updated = await api.updateHabit(habit.id, { started_at: new Date(dateDraft).toISOString() });
      onUpdateHabit(updated);
      setEditingDate(false);
    } finally {
      setSavingDate(false);
    }
  }

  async function handleTypeSave(e) {
    e.preventDefault();
    setSavingType(true);
    haptic('light');
    try {
      const updated = await api.updateHabit(habit.id, { habit_type: typeDraft });
      onUpdateHabit(updated);
      setEditingType(false);
    } finally {
      setSavingType(false);
    }
  }

  let primaryIdx = UNIT_ORDER.findIndex((u) => breakdown[u] > 0);
  if (primaryIdx === -1) primaryIdx = UNIT_ORDER.length - 1;
  const primaryUnit = UNIT_ORDER[primaryIdx];
  const secondaryUnit = primaryIdx < UNIT_ORDER.length - 1 ? UNIT_ORDER[primaryIdx + 1] : null;
  const restUnits = UNIT_ORDER.filter((u) => u !== primaryUnit && u !== secondaryUnit);

  return (
    <div className="counter">
      <div className="counter-header">
        <p className="habit-type-label">{habitTypeLabel(habit.habit_type)}</p>
        <button
          type="button"
          className="icon-button"
          onClick={() => setEditingType((v) => !v)}
          title="Изменить вид зависимости"
        >
          🔀
        </button>
      </div>

      {editingType && (
        <form className="date-edit-form" onSubmit={handleTypeSave}>
          <select value={typeDraft} onChange={(e) => setTypeDraft(e.target.value)}>
            {HABIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="confirm-buttons">
            <button type="submit" className="primary" disabled={savingType}>
              {savingType ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setEditingType(false)} disabled={savingType}>
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="counter-header">
        <p className="counter-label">Я чист(а) уже</p>
        <button
          type="button"
          className="icon-button"
          onClick={() => setEditingDate((v) => !v)}
          title="Изменить дату начала"
        >
          ✏️
        </button>
      </div>

      {editingDate && (
        <form className="date-edit-form" onSubmit={handleDateSave}>
          <p className="hint">Это сбросит счётчик заново от новой даты и очистит историю прошлых срывов.</p>
          <input type="datetime-local" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} />
          <div className="confirm-buttons">
            <button type="submit" className="primary" disabled={savingDate}>
              {savingDate ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setEditingDate(false)} disabled={savingDate}>
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="bubbles">
        <div className="bubble bubble-primary">
          <span className="bubble-value">{breakdown[primaryUnit]}</span>
          <span className="bubble-unit">{UNIT_LABELS[primaryUnit]}</span>
        </div>
        {secondaryUnit && (
          <div className="bubble bubble-secondary">
            <span className="bubble-value">{breakdown[secondaryUnit]}</span>
            <span className="bubble-unit">{UNIT_LABELS[secondaryUnit]}</span>
          </div>
        )}
      </div>

      <div className="counter-grid">
        {restUnits.map((unit) => (
          <div className="counter-cell" key={unit}>
            <span className="counter-value">{breakdown[unit]}</span>
            <span className="counter-unit">{CHIP_LABELS[unit]}</span>
          </div>
        ))}
      </div>

      {habit.daily_cost > 0 && <p className="counter-sub">Сэкономлено: {habit.money_saved} ₽</p>}

      <BadgeStrip badges={habit.badges} />

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

      <BadgeCelebration badge={celebrateBadge} onDismiss={dismissCelebration} />
    </div>
  );
}

export default function ProgressTab({ habit, setHabit }) {
  return (
    <div className="tab-screen">
      {habit ? (
        <Counter habit={habit} onRelapse={setHabit} onUpdateHabit={setHabit} />
      ) : (
        <HabitForm onCreated={setHabit} />
      )}
    </div>
  );
}
