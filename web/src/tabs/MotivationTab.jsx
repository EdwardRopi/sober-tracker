import { useState } from 'react';
import { quoteOfTheDay, randomQuote } from '../quotes';
import SCENES from '../scenes';

function dayOfYear() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  return Math.floor((Date.now() - start.getTime()) / 86400000);
}

function sceneForIndex(i) {
  return SCENES[((i % SCENES.length) + SCENES.length) % SCENES.length];
}

export default function MotivationTab() {
  const [quote, setQuote] = useState(quoteOfTheDay);
  const [sceneIdx, setSceneIdx] = useState(dayOfYear);
  const [isDaily, setIsDaily] = useState(true);

  function handleAnother() {
    setQuote(randomQuote());
    setSceneIdx((i) => i + 1 + Math.floor(Math.random() * 7));
    setIsDaily(false);
  }

  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return (
    <div className="tab-screen">
      <div className="motivation">
        <div className="motivation-photo" style={{ background: sceneForIndex(sceneIdx) }}>
          <div className="motivation-photo-scrim" />
          <p className="motivation-date">{isDaily ? `Сегодня, ${today}` : 'Ещё одна мысль'}</p>
          <p className="motivation-quote">«{quote}»</p>
        </div>
        <button className="primary" onClick={handleAnother}>
          Ещё одна мысль
        </button>
      </div>
    </div>
  );
}
