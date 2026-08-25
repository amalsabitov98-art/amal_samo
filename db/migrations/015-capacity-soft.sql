-- Снимаем жёсткий потолок мест: CHECK (seats_taken <= capacity).
--
-- Зачем. Бизнес-правило подтверждено оператором: места НЕ ограничивают
-- продажу, вместимостью управляет оператор вручную. Код это правило уже
-- соблюдает — потолок из WHERE у createBooking убран, — а вот в самой
-- таблице ограничение осталось. При 66-м туристе на заезде с capacity = 65
-- UPDATE отклонялся бы базой, ошибка уходила бы наверх без перехвата, и
-- агент получал бы невнятный сбой ровно в тот момент, когда рейс
-- заполняется. Мина срабатывала бы сама, без единой правки кода.
--
-- capacity ОСТАЁТСЯ — это плановая вместимость для сводок оператора
-- («занято 38 из 45»), а не запрет. CHECK (seats_taken >= 0) тоже
-- сохраняем: он ловит настоящую ошибку — уход счётчика в минус при
-- возврате мест.
--
-- ------------------------------------------------------------------
-- ВНИМАНИЕ, ГЛАВНАЯ ЛОВУШКА ЭТОЙ МИГРАЦИИ.
--
-- SQLite не умеет DROP CONSTRAINT, поэтому таблицу приходится пересобирать.
-- Первая версия делала это с `PRAGMA defer_foreign_keys = TRUE` — и на
-- тесте СТЁРЛА ВСЕ ЦЕНЫ: departure_prices ссылается на departures с
-- ON DELETE CASCADE, а DROP TABLE при включённых внешних ключах выполняет
-- неявный DELETE всех строк. defer откладывает ПРОВЕРКУ ограничений, но
-- не отменяет каскадные ДЕЙСТВИЯ — прайсы всех заездов удалились молча,
-- и COMMIT всё равно упал.
--
-- Поэтому здесь именно `PRAGMA foreign_keys = OFF`: при выключенных ключах
-- DROP TABLE не делает неявный DELETE, каскад не срабатывает, данные целы.
--
-- Порядок «новая таблица → перелив → удаление старой → переименование»
-- выбран не случайно. Обратный порядок (сначала переименовать старую) не
-- годится: SQLite при RENAME переписывает ссылки в чужих таблицах, и
-- bookings/departure_prices начинали указывать на departures_old —
-- проверено, схема оставалась битой. Здесь переименовывается таблица, на
-- которую никто не ссылается, поэтому чужие ссылки остаются нетронутыми и
-- после переименования снова находят departures.
--
-- ПЕРЕД ЗАПУСКОМ СДЕЛАТЬ РЕЗЕРВНУЮ КОПИЮ:
--   wrangler d1 export turon-tour --remote --output=backup.sql
--
-- ПОСЛЕ ЗАПУСКА ПРОВЕРИТЬ, что цены на месте и ограничение снято:
--   wrangler d1 execute turon-tour --remote --command="SELECT COUNT(*) AS prices FROM departure_prices"
--   wrangler d1 execute turon-tour --remote --command="SELECT sql FROM sqlite_master WHERE name='departures'"
-- Во втором запросе не должно остаться строки «seats_taken <= capacity».
--
-- НЕ ИДЕМПОТЕНТНА: повторный запуск упадёт на CREATE TABLE
-- departures_rebuild. Это намеренно — лучше явная ошибка, чем второй
-- проход по таблице.
-- ------------------------------------------------------------------

PRAGMA foreign_keys = OFF;

CREATE TABLE departures_rebuild (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id       INTEGER NOT NULL REFERENCES tours(id),
  code          TEXT    NOT NULL UNIQUE,   -- TZX2905
  date_start    TEXT    NOT NULL,          -- YYYY-MM-DD
  transport     TEXT    NOT NULL,          -- TZX (авиа) | BUS
  is_info_tour  INTEGER NOT NULL DEFAULT 0,
  capacity      INTEGER NOT NULL,          -- плановая вместимость, НЕ лимит
  -- денормализовано намеренно: место списывается одним UPDATE, счётчик
  -- ведётся для сводок и с реальностью не сверяется
  seats_taken   INTEGER NOT NULL DEFAULT 0,
  is_open       INTEGER NOT NULL DEFAULT 1,
  CHECK (seats_taken >= 0)
);

INSERT INTO departures_rebuild
  (id, tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken, is_open)
  SELECT id, tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken, is_open
    FROM departures;

DROP TABLE departures;

ALTER TABLE departures_rebuild RENAME TO departures;

CREATE INDEX IF NOT EXISTS idx_departures_date ON departures(date_start);

PRAGMA foreign_keys = ON;
