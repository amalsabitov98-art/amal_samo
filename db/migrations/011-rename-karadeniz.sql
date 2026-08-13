-- 011-rename-karadeniz.sql
-- Переименование тура KARADENIZ: «Карадениз — Трабзон и Ризе»
-- → «Батуми - Ризе - Трабзон» (просил оператор).
--
-- Идемпотентна: обновляет по коду, повторный прогон ничего не портит.
-- Заезды, цены, брони и агентства не трогает — только название тура.
-- Название хранится в tours.name; карточка, поиск, кабинет и ваучер читают
-- его отсюда. После прогона можно снять подмену TITLE_OVERRIDES в js/catalog.js.
--
-- Прогон (на стороне оператора, wrangler залогинен):
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/011-rename-karadeniz.sql

UPDATE tours SET name = 'Батуми - Ризе - Трабзон' WHERE code = 'KARADENIZ';
