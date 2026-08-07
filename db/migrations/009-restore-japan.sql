-- 009: вернуть направление «Япония» после отмены решения об удалении.
--
-- 008 удаляла плитку Японии и четыре JP_* продукта из боевой базы.
-- Направление снова актуально, но даты заездов и цены пока не заданы,
-- поэтому все японские туры возвращаются с is_bookable = 0.
--
-- Миграция идемпотентна: её безопасно выполнить и на базе, где записи
-- уже были восстановлены вручную через D1 Console.
--
-- Применять:
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/009-restore-japan.sql

INSERT OR IGNORE INTO destinations (name, title, blurb, image, sort)
VALUES ('Япония', 'Япония', 'Готовятся к запуску — ждём даты заездов и цены', NULL, 2);

INSERT OR IGNORE INTO tours
(code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights)
VALUES
('JP_CONSTRUCTOR', 'Тур-конструктор «Легенды и огни Токио»', 'Япония', 100, 30, 0, 'Ожидаются даты заездов и цены', NULL, NULL),
('JP_TOKYO', 'Легенды и огни Токио', 'Япония', 150, 40, 0, 'Ожидаются даты заездов и цены', NULL, NULL),
('JP_GOLDEN_RING', 'Золотое кольцо Японии', 'Япония', 250, 50, 0, 'Ожидаются даты заездов и цены', NULL, NULL),
('JP_CAMP', 'Учебный лагерь Japan Camp', 'Япония', 250, 50, 0, 'Ожидаются даты заездов и цены', NULL, NULL);
