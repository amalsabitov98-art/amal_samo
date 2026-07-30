-- Миграция 001: контент карточки тура и публичный каталог.
--
-- Нужна только тем базам, что были созданы ДО появления каталога.
-- Свежая база из db/schema.sql уже содержит всё это.
--
-- ВНИМАНИЕ: ALTER TABLE ADD COLUMN в SQLite не умеет IF NOT EXISTS —
-- миграцию применяют РОВНО ОДИН РАЗ. Повторный запуск упадёт с
-- «duplicate column name», это ожидаемо и ничего не портит.
--
-- Применить:
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/001-catalog-content.sql

ALTER TABLE tours ADD COLUMN description TEXT;
ALTER TABLE tours ADD COLUMN nights INTEGER;

CREATE TABLE IF NOT EXISTS destinations (
  name   TEXT PRIMARY KEY,
  title  TEXT NOT NULL,
  blurb  TEXT,
  image  TEXT,
  sort   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tour_variants (
  tour_id  INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  code     TEXT    NOT NULL,
  title    TEXT    NOT NULL,
  sort     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tour_id, code)
);

CREATE TABLE IF NOT EXISTS tour_content (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id  INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  kind     TEXT    NOT NULL
             CHECK (kind IN ('included','excluded','info','gallery','day')),
  variant  TEXT,
  sort     INTEGER NOT NULL DEFAULT 0,
  title    TEXT,
  text     TEXT    NOT NULL,
  url      TEXT
);
CREATE INDEX IF NOT EXISTS idx_tour_content ON tour_content(tour_id, kind, sort);
