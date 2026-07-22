// Обёртка над Telegram.WebApp.HapticFeedback — тихо ничего не делает,
// если мини-апп открыт вне Telegram (там этого API просто нет)
export function haptic(type = 'light') {
  const h = window.Telegram?.WebApp?.HapticFeedback;
  if (!h) return;

  if (type === 'success' || type === 'error' || type === 'warning') {
    h.notificationOccurred(type);
  } else if (type === 'selection') {
    h.selectionChanged();
  } else {
    h.impactOccurred(type);
  }
}
