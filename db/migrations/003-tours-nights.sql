-- Миграция 003: длительность тура KARADENIZ — 7 ночей / 8 дней.
-- В старом seed.sql колонка nights не заполнялась, поэтому на боевой базе
-- заезд показывал «длительность уточняется» и не считал дату окончания.
-- Пароли и агентства не трогает. Применять один раз:
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/003-tours-nights.sql

UPDATE tours SET nights = 7 WHERE code = 'KARADENIZ';
