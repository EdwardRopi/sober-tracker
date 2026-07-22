import { useState } from 'react';
import { quoteOfTheDay, randomQuote } from '../quotes';

export default function MotivationTab() {
  const [quote, setQuote] = useState(quoteOfTheDay);
  const [isDaily, setIsDaily] = useState(true);

  function handleAnother() {
    setQuote(randomQuote());
    setIsDaily(false);
  }

  return (
    <div className="tab-screen">
      <div className="motivation">
        <p className="motivation-label">{isDaily ? 'Цитата дня' : 'Ещё одна мысль'}</p>
        <p className="motivation-quote">«{quote}»</p>
        <button className="primary" onClick={handleAnother}>
          Ещё одна мысль
        </button>
      </div>
    </div>
  );
}
