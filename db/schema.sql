-- Turon Tour B2B — схема базы (Cloudflare D1 / SQLite)
--
-- Единица работы — заезд (дата + транспорт), а не «тур»: агентство сажает
-- пассажиров в конкретный рейс. Цена берётся из прайса заезда, детская —
-- по возрасту на дату выезда, чтобы менеджеру не приходилось выбирать
-- тариф руками (в исходной ведомости это делалось вручную и разъезжалось).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- агентства
CREATE TABLE IF NOT EXISTS agencies (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  login          TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,   -- PBKDF2-SHA256, hex
  password_salt  TEXT    NOT NULL,   -- hex
  name           TEXT    NOT NULL,
  channel        TEXT    NOT NULL DEFAULT 'B2B',
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  agency_id   INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_agency ON sessions(agency_id);


-- -------------------------------------------------------------------- туры
-- Продукт, к которому относятся заезды. Комиссия задаётся здесь, а не на
-- заезде: у оператора она фиксирована в долларах на человека и не зависит
-- от даты. agency_commission — заработок агентства, operator_commission —
-- доля оператора сверху агентской, агентству она не показывается.
CREATE TABLE IF NOT EXISTS tours (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  code                 TEXT    NOT NULL UNIQUE,
  name                 TEXT    NOT NULL,
  destination          TEXT    NOT NULL,
  agency_commission    REAL    NOT NULL DEFAULT 0,
  operator_commission  REAL    NOT NULL DEFAULT 0,
  -- продукт заведён, но заезды и цены ещё не проставлены
  is_bookable          INTEGER NOT NULL DEFAULT 1,
  note                 TEXT
);

-- ------------------------------------------------------------------ заезды
CREATE TABLE IF NOT EXISTS departures (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id       INTEGER NOT NULL REFERENCES tours(id),
  code          TEXT    NOT NULL UNIQUE,   -- TZX2905
  date_start    TEXT    NOT NULL,          -- YYYY-MM-DD
  transport     TEXT    NOT NULL,          -- TZX (авиа) | BUS
  is_info_tour  INTEGER NOT NULL DEFAULT 0,
  capacity      INTEGER NOT NULL,
  -- денормализовано намеренно: место списывается одним UPDATE с проверкой
  -- лимита, иначе два одновременных бронирования займут одно место дважды
  seats_taken   INTEGER NOT NULL DEFAULT 0,
  is_open       INTEGER NOT NULL DEFAULT 1,
  CHECK (seats_taken >= 0),
  CHECK (seats_taken <= capacity)
);
CREATE INDEX IF NOT EXISTS idx_departures_date ON departures(date_start);

-- Прайс заезда. kind='placement' — взрослые по типу размещения,
-- kind='child' — детские тарифы с возрастными границами.
CREATE TABLE IF NOT EXISTS departure_prices (
  departure_id   INTEGER NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  code           TEXT    NOT NULL,   -- DBL/TWIN/TRPL/SNG | CHD_A/CHD_B/INF
  label          TEXT    NOT NULL,
  kind           TEXT    NOT NULL CHECK (kind IN ('placement','child')),
  price          REAL    NOT NULL,
  age_from       INTEGER,            -- только для kind='child'
  age_to         INTEGER,
  -- младенцы летят на руках и места не занимают: в ведомости у них
  -- номер брони с суффиксом «+1», а не отдельный порядковый
  occupies_seat  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (departure_id, code)
);

-- ------------------------------------------------------------------- брони
CREATE TABLE IF NOT EXISTS bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL UNIQUE,   -- TZX2905-07
  agency_id     INTEGER NOT NULL REFERENCES agencies(id),
  departure_id  INTEGER NOT NULL REFERENCES departures(id),
  status        TEXT    NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('confirmed','cancelled')),
  total_price   REAL    NOT NULL DEFAULT 0,
  -- фиксируем на момент продажи: изменение тарифа не должно задним числом
  -- переписывать уже заработанное агентством
  agency_commission REAL NOT NULL DEFAULT 0,
  note          TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_agency ON bookings(agency_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_departure ON bookings(departure_id);

CREATE TABLE IF NOT EXISTS passengers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name        TEXT    NOT NULL,
  birth_date       TEXT    NOT NULL,
  passport_number  TEXT    NOT NULL,
  passport_expiry  TEXT,
  placement        TEXT    NOT NULL,   -- DBL/TWIN/TRPL/SNG
  price_code       TEXT    NOT NULL,   -- какой тариф применён
  price            REAL    NOT NULL,
  occupies_seat    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_passengers_booking ON passengers(booking_id);

-- Платежи: агентство видит «оплачено / остаток», как в ведомости
-- (колонки тўлов USD / қолдиқ USD). Вносит менеджер.
CREATE TABLE IF NOT EXISTS payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount      REAL    NOT NULL,
  note        TEXT,
  paid_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
