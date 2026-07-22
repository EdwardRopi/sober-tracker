import { useState } from 'react';
import { api, API_URL } from '../api';

function ProfileCard({ user, setUser }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.display_name || user.first_name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateProfile(name.trim());
      setUser(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card profile-card">
      <div className="profile-row">
        {!avatarFailed ? (
          <img
            className="avatar"
            src={`${API_URL}/avatar/${user.id}`}
            alt=""
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="avatar avatar-placeholder">{(user.display_name || '?')[0]?.toUpperCase()}</div>
        )}

        {editing ? (
          <form className="profile-edit-form" onSubmit={handleSave}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
            <div className="profile-edit-buttons">
              <button type="submit" className="primary" disabled={busy || !name.trim()}>
                Сохранить
              </button>
              <button type="button" onClick={() => setEditing(false)} disabled={busy}>
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <p className="profile-name">{user.display_name || user.first_name}</p>
            <button type="button" className="link-button" onClick={() => setEditing(true)}>
              Изменить имя
            </button>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      <p className="hint">Аватарка берётся из твоего профиля в Telegram — поменяй её там, и она обновится и здесь.</p>
    </div>
  );
}

export default function FriendsTab({ user, setUser }) {
  return (
    <div className="tab-screen friends-tab">
      {user && <ProfileCard user={user} setUser={setUser} />}

      <div className="stub">
        <p className="stub-icon">👥</p>
        <h2>Скоро здесь</h2>
        <p className="hint">
          Можно будет добавлять друзей из Telegram, видеть их прогресс и поддерживать друг друга. Пока в разработке.
        </p>
      </div>
    </div>
  );
}
