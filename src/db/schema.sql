-- Юзеры, которые зашли в мини-апп
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  username TEXT,
  display_name TEXT,  -- имя, которое юзер видит у друзей — можно поменять, иначе = first_name
  avatar_url TEXT,     -- фото профиля из Telegram (photo_url из initData)
  created_at TIMESTAMP DEFAULT NOW()
);

-- На случай если таблица уже существовала до добавления этих колонок
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Привычки, которые трекает юзер (алкоголь, курение и т.д.)
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  habit_type TEXT NOT NULL,       -- 'alcohol', 'smoking', 'social_media' и т.д.
  started_at TIMESTAMP NOT NULL,  -- с какого момента считаем дни трезвости
  daily_cost NUMERIC DEFAULT 0,   -- сколько юзер тратил в день на привычку
  reason_text TEXT,               -- "почему я бросаю"
  reason_photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- История срывов — не удаляем привычку, а фиксируем срыв и продолжаем трекать
CREATE TABLE IF NOT EXISTS relapses (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
  relapsed_at TIMESTAMP DEFAULT NOW(),
  note TEXT
);

-- Вкладка "Сегодня": обещания самому себе и "мозговой слив" (снятие напряжения)
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,  -- 'promise' или 'dump'
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
