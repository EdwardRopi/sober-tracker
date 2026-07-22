import { useEffect, useState } from 'react';
import { api, API_URL } from '../api';
import { haptic } from '../haptic';
import Spinner from '../Spinner';
import { BOT_USERNAME } from '../constants';

const DONATE_AMOUNTS = [50, 100, 250, 500];

function DonateFlow({ onClose, onDonated }) {
  const [step, setStep] = useState('info');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDonate(amount) {
    setBusy(true);
    setError('');
    try {
      const { link } = await api.createDonation(amount);

      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(link, (status) => {
          setBusy(false);
          if (status === 'paid') {
            haptic('success');
            onDonated();
          }
          onClose();
        });
      } else {
        window.open(link, '_blank');
        setBusy(false);
        onClose();
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose()}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {step === 'info' ? (
          <>
            <p className="modal-title">Поддержать проект</p>
            <p className="modal-text">Разработчик предпочитает оставаться анонимным.</p>
            <p className="modal-text">
              Приложением можно пользоваться абсолютно бесплатно — так было и будет для основных функций.
              Разработчик сам в сообществе АН и оплачивает хостинг и домен из своего кармана.
            </p>
            <p className="modal-text">
              Если хочешь помочь — можно задонатить звёзды Telegram. Разовый донат раз в месяц даёт Premium-доступ
              и звёздочку на аватарке.
            </p>
            <button type="button" className="primary" onClick={() => setStep('amount')}>
              ОК
            </button>
            <button type="button" className="link-button" onClick={() => onClose()}>
              Не сейчас
            </button>
          </>
        ) : (
          <>
            <p className="modal-title">Сколько задонатить?</p>
            <div className="donate-amounts">
              {DONATE_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="secondary"
                  onClick={() => handleDonate(amount)}
                  disabled={busy}
                >
                  {amount} ⭐
                </button>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            <button type="button" className="link-button" onClick={() => onClose()} disabled={busy}>
              Отмена
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileCard({ user, setUser }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.display_name || user.first_name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.updateProfile({ display_name: name.trim() });
      setUser(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePrivacy() {
    const next = !user.hidden_profile;
    setSavingPrivacy(true);
    setError('');
    try {
      const updated = await api.updateProfile({ hidden_profile: next });
      setUser(updated);
      haptic('light');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPrivacy(false);
    }
  }

  function handleDonated() {
    api.initAuth().then(setUser).catch(() => {});
  }

  return (
    <div className="card profile-card">
      <div className="profile-row">
        <div className="avatar-wrap">
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
          {user.is_premium && <span className="avatar-star">⭐</span>}
        </div>

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
            <div className="profile-name-row">
              <p className="profile-name">
                {user.display_name || user.first_name}
                {user.is_premium && <span className="premium-badge">⭐ Premium</span>}
              </p>
              <button type="button" className="link-button" onClick={() => setDonateOpen(true)}>
                Поддержать
              </button>
            </div>
            <button type="button" className="link-button" onClick={() => setEditing(true)}>
              Изменить имя
            </button>
          </div>
        )}
      </div>

      <label className="switch-row">
        <span>Скрытый профиль</span>
        <span className="switch">
          <input
            type="checkbox"
            checked={!!user.hidden_profile}
            onChange={handleTogglePrivacy}
            disabled={savingPrivacy}
          />
          <span className="switch-slider" />
        </span>
      </label>
      <p className="hint">
        Друзья будут видеть только твоё имя и фото — без вида зависимости и счётчика дней.
      </p>

      {error && <p className="error">{error}</p>}
      <p className="hint">Аватарка берётся из твоего профиля в Telegram — поменяй её там, и она обновится и здесь.</p>

      {donateOpen && <DonateFlow onClose={() => setDonateOpen(false)} onDonated={handleDonated} />}
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
      <div className="avatar-wrap">
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
        {friend.is_premium && <span className="avatar-star avatar-star-sm">⭐</span>}
      </div>
      <div className="friend-info">
        <p className="friend-name">{friend.name}</p>
        <p className="hint">
          {friend.hidden
            ? 'Профиль скрыт'
            : friend.sober_days != null
              ? `${friend.sober_days} дн. трезвости`
              : 'нет трекера'}
        </p>
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
