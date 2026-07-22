import { useEffect, useState } from 'react';
import { api, API_URL } from '../api';
import { haptic } from '../haptic';
import Spinner from '../Spinner';

const BOT_USERNAME = 'i_am_sbr_bot';

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
            <p className="profile-name">
              {user.display_name || user.first_name}
              {user.is_premium && <span className="premium-badge">⭐ Premium</span>}
            </p>
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

function InviteButton({ userId }) {
  function handleInvite() {
    const deepLink = `https://t.me/${BOT_USERNAME}?start=inv${userId}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(
      'Присоединяйся, будем поддерживать друг друга в трезвости 💪'
    )}`;

    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }

  return (
    <button type="button" className="primary" onClick={handleInvite}>
      Пригласить друга
    </button>
  );
}

function FriendRow({ friend, rank, onEncourage, encouraged, limitReached }) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <li className="friend-row">
      <span className="friend-rank">{rank}</span>
      {!avatarFailed ? (
        <img
          className="avatar avatar-sm"
          src={`${API_URL}/avatar/${friend.id}`}
          alt=""
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <div className="avatar avatar-sm avatar-placeholder">{(friend.name || '?')[0]?.toUpperCase()}</div>
      )}
      <div className="friend-info">
        <p className="friend-name">{friend.name}</p>
        <p className="hint">{friend.sober_days != null ? `${friend.sober_days} дн. трезвости` : 'нет трекера'}</p>
      </div>
      <button
        type="button"
        className="link-button"
        disabled={encouraged || limitReached}
        onClick={() => onEncourage(friend.id)}
      >
        {encouraged ? 'Подбодрили ✓' : 'Подбодрить'}
      </button>
    </li>
  );
}

function Leaderboard() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [encouragedIds, setEncouragedIds] = useState({});
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getFriends()
      .then(setFriends)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleEncourage(friendId) {
    setError('');
    try {
      await api.encourageFriend(friendId);
      setEncouragedIds((prev) => ({ ...prev, [friendId]: true }));
      haptic('success');
    } catch (err) {
      if (err.message.includes('Лимит')) setLimitReached(true);
      haptic('error');
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Друзья</h2>

      {loading ? (
        <Spinner />
      ) : friends.length === 0 ? (
        <p className="hint">Пока никого нет — пригласи первого друга.</p>
      ) : (
        <ul className="friends-list">
          {friends.map((friend, i) => (
            <FriendRow
              key={friend.id}
              friend={friend}
              rank={i + 1}
              encouraged={!!encouragedIds[friend.id]}
              limitReached={limitReached}
              onEncourage={handleEncourage}
            />
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function FriendsTab({ user, setUser }) {
  return (
    <div className="tab-screen friends-tab">
      {user && <ProfileCard user={user} setUser={setUser} />}
      {user && <InviteButton userId={user.id} />}
      {user && <Leaderboard />}
    </div>
  );
}
