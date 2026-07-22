export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const initData = window.Telegram?.WebApp?.initData || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Ошибка запроса: ${res.status}`);
  }
  return data;
}

export const api = {
  initAuth: () => request('/api/auth/init', { method: 'POST' }),
  getHabits: () => request('/api/habits'),
  createHabit: (habit) => request('/api/habits', { method: 'POST', body: JSON.stringify(habit) }),
  relapse: (habitId, note) =>
    request(`/api/habits/${habitId}/relapse`, { method: 'POST', body: JSON.stringify({ note }) }),
  updateHabit: (habitId, updates) =>
    request(`/api/habits/${habitId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  getTodayPromise: () => request('/api/journal/promise-today'),
  addJournalEntry: (entryType, text) =>
    request('/api/journal', { method: 'POST', body: JSON.stringify({ entry_type: entryType, text }) }),
  updateProfile: (displayName) =>
    request('/api/auth/profile', { method: 'PATCH', body: JSON.stringify({ display_name: displayName }) }),
  getFriends: () => request('/api/friends'),
  encourageFriend: (friendId) => request(`/api/friends/${friendId}/encourage`, { method: 'POST' }),
};
