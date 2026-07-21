# Sober Tracker — Telegram Mini App

## Первый запуск

1. Установи зависимости:
```
npm install
```

2. Скопируй `.env.example` в `.env` и заполни своими значениями:
```
cp .env.example .env
```
Впиши туда свой реальный `BOT_TOKEN` (тот, что получил после Revoke в BotFather) и `DATABASE_URL`.

3. Подними PostgreSQL локально или через Railway/Render, затем накати схему:
```
psql $DATABASE_URL -f src/db/schema.sql
```

4. Запусти сервер в dev-режиме:
```
npm run dev
```

5. Проверь, что сервер жив:
```
curl http://localhost:3000/health
```

## Структура проекта

- `src/server.js` — точка входа
- `src/middleware/auth.js` — проверка initData от Telegram на каждый запрос
- `src/utils/validateInitData.js` — сама логика проверки подписи
- `src/routes/` — эндпоинты API (пока только auth, дальше добавим habits, relapses и т.д.)
- `src/db/schema.sql` — структура таблиц в БД

## Важно про безопасность

- `.env` никогда не коммитить — он уже в `.gitignore`
- `BOT_TOKEN` — секретный ключ, храни только локально
