const STORAGE_KEY = 'sober-tracker-theme';
const PREFERENCES = ['dark', 'light', 'auto'];
const DEFAULT_PREFERENCE = 'dark';

export function getStoredPreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return PREFERENCES.includes(stored) ? stored : DEFAULT_PREFERENCE;
}

// 'auto' = follow the Telegram client's own theme (not just the OS) — that's what
// actually changes when the user flips their Telegram theme, in or out of our app.
function resolveEffectiveTheme(pref) {
  if (pref === 'light' || pref === 'dark') return pref;

  const tgScheme = window.Telegram?.WebApp?.colorScheme;
  if (tgScheme === 'light' || tgScheme === 'dark') return tgScheme;

  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyEffectiveTheme(pref) {
  document.documentElement.dataset.theme = resolveEffectiveTheme(pref);
}

export function setThemePreference(pref) {
  if (!PREFERENCES.includes(pref)) return;
  localStorage.setItem(STORAGE_KEY, pref);
  applyEffectiveTheme(pref);
}

let liveUpdatesAttached = false;

// Call once at app boot. Re-applies the effective theme (cheap, idempotent — the
// inline script in index.html already set it before first paint) and, if the
// preference is 'auto', wires up live updates for both signals so switching
// Telegram's theme or the OS theme while the app is open takes effect immediately.
export function initTheme() {
  applyEffectiveTheme(getStoredPreference());
  if (liveUpdatesAttached) return;
  liveUpdatesAttached = true;

  function reapplyIfAuto() {
    if (getStoredPreference() === 'auto') applyEffectiveTheme('auto');
  }

  window.Telegram?.WebApp?.onEvent?.('themeChanged', reapplyIfAuto);
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener('change', reapplyIfAuto);
}
