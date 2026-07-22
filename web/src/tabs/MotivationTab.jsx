import { useState } from 'react';
import { quoteOfTheDay, randomQuote } from '../quotes';

// Атмосферные градиенты вместо фотографий — океан/побережье в стиле I Am Sober
const SCENES = [
  'linear-gradient(160deg, #3ac6d9 0%, #1a92a8 35%, #eaf3ef 72%, #f4ddbb 100%)',
  'linear-gradient(160deg, #0c2f33 0%, #145b64 38%, #6fa39f 72%, #d7e6df 100%)',
  'linear-gradient(160deg, #24405a 0%, #3e6478 38%, #7c8567 70%, #cf9f66 100%)',
];

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
    setSceneIdx((i) => i + 1);
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
