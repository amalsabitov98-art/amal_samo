-- 008: убрать демо-направление «Япония» из боевой базы.
--
-- Туры JP_* и плитка «Япония» были демо-заглушками каталога (без заездов и
-- цен, «готовятся к запуску»). Оператор попросил убрать. Реальный продукт —
-- только Карадениз. Здесь чистим то, что мог налить прежний seed.sql.
--
-- Идемпотентна: повторный запуск ничего не ломает (нечего удалять).
-- Заезды, брони и агентства не трогает — у JP-туров их не было.
--
-- Применять:
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/008-remove-japan.sql

DELETE FROM tour_content WHERE tour_id IN (SELECT id FROM tours WHERE code LIKE 'JP\_%' ESCAPE '\');
DELETE FROM tour_variants WHERE tour_id IN (SELECT id FROM tours WHERE code LIKE 'JP\_%' ESCAPE '\');
DELETE FROM tours WHERE code LIKE 'JP\_%' ESCAPE '\';
DELETE FROM destinations WHERE name = 'Япония';
