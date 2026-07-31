-- Миграция 004: блок «Информация» у KARADENIZ.
-- Убирает ориентир «от $690» (цена берётся из заезда) и добавляет ссылку
-- на видео о маршруте. Пароли и агентства не трогает. Применять один раз:
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/004-karadeniz-info.sql

DELETE FROM tour_content WHERE kind = 'info'
  AND tour_id = (SELECT id FROM tours WHERE code = 'KARADENIZ');

INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Грузия безвизовая для граждан Узбекистана — до 1 года по загранпаспорту', NULL FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 2, 'На 5-й день — сухопутный переход границы Турция–Грузия, автобус около 3–4 часов', NULL FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 3, 'Видео о маршруте: Трабзон и Чёрное море (Traveling Faze)', 'https://www.youtube.com/watch?v=hGk2LxB4d60&t=105s' FROM tours WHERE code = 'KARADENIZ';
