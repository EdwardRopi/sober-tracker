import { useEffect, useState } from 'react';
import { api } from '../api';
import { haptic } from '../haptic';
import Spinner from '../Spinner';

export default function TodayTab() {
  const [promise, setPromise] = useState(null);
  const [promiseDraft, setPromiseDraft] = useState('');
  const [dump, setDump] = useState('');
  const [dumpSaved, setDumpSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getTodayPromise()
      .then(setPromise)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handlePromiseSubmit(e) {
    e.preventDefault();
    if (!promiseDraft.trim()) return;
    setBusy(true);
    setError('');
    try {
      const entry = await api.addJournalEntry('promise', promiseDraft.trim());
      setPromise(entry);
      setPromiseDraft('');
      haptic('success');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDumpSubmit(e) {
    e.preventDefault();
    if (!dump.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.addJournalEntry('dump', dump.trim());
      setDump('');
      setDumpSaved(true);
      haptic('success');
      setTimeout(() => setDumpSaved(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="tab-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="tab-screen today-tab">
      <section className="card">
        <h2>Обещание на сегодня</h2>
        {promise ? (
          <>
            <p className="promise-text">«{promise.text}»</p>
            <p className="hint">Ты уже дал(а) себе обещание сегодня. Держись его.</p>
          </>
        ) : (
          <form onSubmit={handlePromiseSubmit}>
            <textarea
              placeholder="Например: сегодня я не буду искать оправданий и продержусь весь день"
              value={promiseDraft}
              onChange={(e) => setPromiseDraft(e.target.value)}
              rows={3}
            />
            <button type="submit" className="primary" disabled={busy || !promiseDraft.trim()}>
              Пообещать себе
            </button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Мозговой слив</h2>
        <p className="hint">Выпиши всё, что давит — тревогу, тягу, злость. Это остаётся только здесь.</p>
        <form onSubmit={handleDumpSubmit}>
          <textarea
            placeholder="Пиши как есть, без фильтров..."
            value={dump}
            onChange={(e) => setDump(e.target.value)}
            rows={5}
          />
          <button type="submit" className="primary" disabled={busy || !dump.trim()}>
            Слить напряжение
          </button>
        </form>
        {dumpSaved && <p className="success">Готово. Стало немного легче?</p>}
      </section>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
