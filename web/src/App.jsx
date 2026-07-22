import { useEffect, useState } from 'react';
import { api } from './api';
import BottomNav from './BottomNav';
import Spinner from './Spinner';
import ProgressTab from './tabs/ProgressTab';
import TodayTab from './tabs/TodayTab';
import FriendsTab from './tabs/FriendsTab';
import MotivationTab from './tabs/MotivationTab';
import './App.css';

const VALID_TABS = ['progress', 'today', 'friends', 'motivation'];

function initialTab() {
  const requested = new URLSearchParams(window.location.search).get('tab');
  return VALID_TABS.includes(requested) ? requested : 'progress';
}

export default function App() {
  const [tab, setTab] = useState(initialTab);
  const [habit, setHabit] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();

    async function load() {
      try {
        const profile = await api.initAuth();
        setUser(profile);
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

  if (loading) {
    return (
      <div className="tab-screen">
        <Spinner label="Загрузка..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-screen">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="app-content">
        {tab === 'progress' && <ProgressTab habit={habit} setHabit={setHabit} user={user} />}
        {tab === 'today' && <TodayTab />}
        {tab === 'friends' && <FriendsTab user={user} setUser={setUser} />}
        {tab === 'motivation' && <MotivationTab />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
