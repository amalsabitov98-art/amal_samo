# CLAUDE.md — Turon Tour B2B Cabinet

## Что это
B2B-кабинет для агентств-партнёров туроператора Turon Tour. Агентства бронируют пассажиров на заезды (Трабзон/автобус), оператор видит все брони и управляет оплатами.

Две роли: `agency` (бронирует, видит свои брони) и `operator` (видит всё, управляет агентствами).

## Стек
- **Frontend**: чистый HTML/CSS/JS, без сборки, GitHub Pages
- **Backend**: Cloudflare Workers + D1 (SQLite)
- **Demo-режим**: если `js/config.js` пустой — данные в localStorage

## Файловая структура

```
index.html              — вход + кабинет (одна страница, переключение экранов)
styles.css              — светлая/тёмная темы, [hidden]{display:none!important}
js/config.js            — TURON_CONFIG.apiBaseUrl (пусто = демо)
js/seed-data.js         — заезды и цены (генерируется, не трогать руками)
js/api.js               — API-клиент + демо-fallback на localStorage
js/app.js               — экраны агентства
js/admin.js             — экраны оператора

worker/index.js         — весь бэкенд (маршруты, бизнес-логика)
worker/wrangler.toml    — конфиг деплоя, ALLOWED_ORIGIN сюда

db/schema.sql           — таблицы БД
db/seed.sql             — данные (генерируется build-seed.py)

tools/extract-departures.py  — парсит ведомость.xlsx → seed/departures.json
tools/build-seed.py          — departures.json → db/seed.sql + js/seed-data.js
tools/build-preview.js       — собирает preview.html (однофайловое превью)

seed/departures.json    — заезды и цены (источник для сборки)
test/api-test.mjs       — 79 интеграционных тестов
test/run.sh             — запуск тестов (wrangler dev + reset DB + тесты)
test/reset-db.sh        — сброс БД с паролем turon2026 (только для тестов)
```

## Таблицы БД (schema.sql)

```
agencies        — логин, хэш пароля, роль (agency/operator), активен
sessions        — токены сессий
login_attempts  — для rate limiting (8 попыток / 25 с IP за 15 мин)
tours           — каталог туров с комиссиями (агентской и операторской)
departures      — заезды (дата, транспорт TZX/BUS, capacity, seats_taken)
departure_prices — цены: взрослые по размещению (SGL/DBL/TPL/PROM) + детские
bookings        — брони (agency_id, departure_id, статус, сумма, оплачено)
passengers      — пассажиры брони (ФИО, ДР, паспорт, тип, occupies_seat)
payments        — оплаты и возвраты
booking_events  — журнал: created/edited/cancelled/payment (actor_name + actor_role)
```

## Ключевые правила бизнес-логики

**Места**: `UPDATE departures SET seats_taken = seats_taken + ? WHERE id = ? AND seats_taken + ? <= capacity AND is_open = 1` — атомарно, защита от двойной продажи.

**Цена пассажира**: по возрасту на дату ВЫЕЗДА (не брони). Если возраст в диапазоне детского тарифа — детская цена, иначе взрослая по типу размещения. Граница «от и до, не включая верхнюю»: тариф 5-10 → с 5 до 9 лет 11 мес.

**Младенцы** (до 2 лет): `occupies_seat = 0`, цена берётся, но место не тратится.

**Комиссия**: фиксируется на момент брони в долларах за туриста. Операторская — сверху агентской, агентству не видна.

**Прошедшие заезды**: агентству недоступны (`date_start >= date('now')`), оператору — с `?all=1`.

**Отмена**: возвращает места обратно (обратный UPDATE), статус `cancelled`.

**Правка брони**: сохраняет номер брони, пересчитывает дельту мест атомарно.

**Паспорт**: предупреждение если истекает до поездки или раньше чем через 6 мес после.

## API-маршруты (worker/index.js)

```
POST /api/login                         — вход (rate limiting)
GET  /api/me                            — текущая сессия
POST /api/logout                        — выход
GET  /api/departures[?all=1]            — заезды (all=1 только для оператора)
GET  /api/tours                         — каталог туров
GET  /api/bookings                      — брони агентства
POST /api/bookings                      — создать бронь
POST /api/bookings/:id/passengers       — изменить состав
POST /api/bookings/:id/cancel           — отменить

-- только operator:
GET  /api/admin/bookings                — все брони (фильтры: agency/departure/status/debt)
GET  /api/admin/manifest?departure_id=  — список пассажиров
GET  /api/admin/manifest?departure_id=&csv=1  — выгрузка CSV (BOM для Excel)
POST /api/admin/payments                — оплата/возврат
GET  /api/admin/agencies                — список агентств
POST /api/admin/agencies                — создать агентство
POST /api/admin/agencies/:id/(activate|deactivate)
POST /api/admin/agencies/:id/password
GET  /api/admin/bookings/:id/history    — журнал (возвращает actor_role)
```

## Деплой (пошагово)

```bash
# 1. Тест локально (нужен wrangler login заранее)
cd test && ./run.sh          # должно быть 79/79

# 2. Создать D1 базу
cd worker
wrangler d1 create turon-tour
# скопировать database_id в wrangler.toml

# 3. Сгенерировать seed (пароли печатаются один раз в консоль — сохранить!)
python3 tools/build-seed.py > db/seed.sql

# 4. Залить в D1
wrangler d1 execute turon-tour --remote --file=../db/schema.sql
wrangler d1 execute turon-tour --remote --file=../db/seed.sql

# 5. Задеплоить воркер
wrangler deploy

# 6. Вписать URL воркера
# js/config.js: window.TURON_CONFIG = { apiBaseUrl: "https://turon-tour-api.XXXX.workers.dev" }

# 7. Вписать URL кабинета в ALLOWED_ORIGIN
# worker/wrangler.toml: ALLOWED_ORIGIN = "https://amalsabitov98-art.github.io"

# 8. GitHub Pages: Settings → Pages → Deploy from branch → main / root
```

## Демо-логины (только браузерный демо, не БД)
`umida`, `easytourism`, `ofotour`, `operator` — пароль `turon2026`

## Что ещё не сделано (TODO.md)
- Бронирование от имени агентства (оператор берёт заявку по телефону)
- Переименование агентства
- Правка примечания к брони
- Ручная правка остатка мест (нет сверки с реальностью)
- Квартальные бонусы (не ясны правила — см. TODO.md)
- ALLOWED_ORIGIN пустой до деплоя — API открыт всем

## Известные нюансы / подводные камни
- `[hidden]{display:none!important}` в CSS — без этого `hidden` не работает, если элемент имеет `display` от другого правила
- История брони возвращает `actor_role` (JOIN с agencies) — чтобы тест не сравнивал кириллицу (падало на Windows Git Bash)
- `build-seed.py` использует `Path(__file__).resolve().parent.parent` для путей — запускать можно из любой папки
- CSV-выгрузка: разделитель `;`, BOM `﻿` в начале — для Excel с кириллицей
- Пароли генерируются случайно при каждом запуске `build-seed.py` и больше нигде не хранятся
- Вместимость заездов: 65 для всех (не указана в ведомости), уточнить у оператора
- Детский тариф `Chd 5-11` сменился на `Chd 5-10` с 17.07 — в данных оба варианта, верхняя граница не включается
