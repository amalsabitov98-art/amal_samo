-- Миграция 005: наполнение каталога, которого нет в боевой базе.
--
-- ПРИЧИНА: залитый db/seed.sql отстал от генератора и не содержал ни
-- направлений, ни вариантов маршрута, ни программы по дням, ни описания
-- и длительности туров. Из-за этого заезд показывал «длительность
-- уточняется», а карточка тура — пустую программу.
--
-- Заезды, места и агентства НЕ трогает: только справочный контент.
-- Идемпотентна — можно применять повторно. Заменяет собой 002/003/004.
--
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/005-catalog-refresh.sql

DELETE FROM tour_content;
DELETE FROM tour_variants;
DELETE FROM destinations;

UPDATE tours SET description = 'Комбинированный групповой тур по Чёрному морю: Батуми, Ризе и Трабзон за 8 дней. Сопровождение узбекского гида, более 15 экскурсий, отели на первой береговой линии, трансферы на микроавтобусах Sprinter и ужин в грузинской семье.', nights = 7 WHERE code = 'KARADENIZ';
UPDATE tours SET description = NULL, nights = NULL WHERE code = 'JP_CONSTRUCTOR';
UPDATE tours SET description = NULL, nights = NULL WHERE code = 'JP_TOKYO';
UPDATE tours SET description = NULL, nights = NULL WHERE code = 'JP_GOLDEN_RING';
UPDATE tours SET description = NULL, nights = NULL WHERE code = 'JP_CAMP';

INSERT INTO destinations (name, title, blurb, image, sort) VALUES ('Турция', 'Турция и Грузия', 'Черноморское побережье: Трабзон, Ризе, Батуми', NULL, 1);
INSERT INTO destinations (name, title, blurb, image, sort) VALUES ('Япония', 'Япония', 'Готовятся к запуску — ждём даты заездов и цены', NULL, 2);
INSERT INTO tour_variants (tour_id, code, title, sort) SELECT id, 'A', 'Батуми → Ризе · прилёт в Батуми, вылет из Трабзона', 1 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_variants (tour_id, code, title, sort) SELECT id, 'B', 'Ризе → Батуми · прилёт в Трабзон, вылет из Батуми', 2 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Авиабилеты Ташкент — Трабзон / Батуми' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Проживание 7 ночей на базе завтраков в отелях на первой береговой линии: Batumi View Luxury (Батуми) и Rhisos Gold Otel Rize (Ризе)' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Медицинская страховка на весь период поездки' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Все трансферы между локациями на микроавтобусах Sprinter' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Один гастрономический ужин в грузинской семье под Батуми (Махунцети) — халяльное меню' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Сопровождение русскоговорящего узбекского гида' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Более 15 экскурсий по программе' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 8, 'Поддержка 24/7 на протяжении поездки' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'excluded', 1, 'Обеды и ужины вне программы (кроме одного гастрономического ужина в Батуми)' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'excluded', 2, 'Входные билеты в музеи и на платные объекты' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'excluded', 3, 'Дельфинарий в Батуми' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'excluded', 4, 'Зиплайн в Махунцети' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'excluded', 5, 'Дополнительные экскурсии в Ризе: Duatepe, Ceceve Bahcesi' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'excluded', 6, 'Личные расходы' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Грузия безвизовая для граждан Узбекистана — до 1 года по загранпаспорту', NULL FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 2, 'На 5-й день — сухопутный переход границы Турция–Грузия, автобус около 3–4 часов', NULL FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 3, 'Видео о маршруте: Трабзон и Чёрное море (Traveling Faze)', 'https://www.youtube.com/watch?v=hGk2LxB4d60&t=105s' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 1, 'День 1 · Батуми', 'Ташкент → Батуми, прилёт 23:20. Встреча, трансфер, отель Batumi View Luxury. Вечерняя прогулка и ужин грузинской кухни — по желанию.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 2, 'День 2 · Аджария', 'Мост царицы Тамары, водопад Махунцети, крепость Гонио-Апсарос. Обед: грузинская кухня в центре Батуми или узбекская в «Caravan». По желанию зиплайн. Вечером — ужин в грузинской семье в Махунцети.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 3, 'Дни 3–4 · Батуми', 'Свободные дни: набережная, дельфинарий (доплата), ботанический сад, шопинг, старый город, Башня Алфавита.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 4, 'День 5 · Батуми → Ризе', 'Переезд на автобусе около 3–4 часов с прохождением границы. Отель, вечерняя прогулка, ужин турецкой кухни — по желанию.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 5, 'День 6 · Узунгёль и Трабзон', 'Озеро Узунгёль: чай и сувениры. Далее Трабзон с остановками — пещера Карача, смотровая Torul Cam Teras. Вечером шопинг Forum AVM или прогулка по городу.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 6, 'День 7 · Айдер', 'Айдер Яйласы через чайные плантации: крепость Zilkale, водопад Palovit, плато 1350 м. По желанию гора Хусер.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'A', 7, 'День 8 · Вылет', 'Свободное утро, трансфер в аэропорт. Трабзон → Ташкент, вылет 18:45.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 1, 'День 1 · Ризе', 'Ташкент → Трабзон, прилёт 17:45. Встреча, трансфер, отель Rhisos Gold Hotel Rize. Вечерняя прогулка и ужин турецкой кухни — по желанию.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 2, 'День 2 · Узунгёль и Трабзон', 'Озеро Узунгёль, далее Трабзон: пещера Карача, смотровая Torul Cam Teras. Вечером шопинг Forum AVM или прогулка по городу.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 3, 'День 3 · Айдер', 'Айдер Яйласы: крепость Zilkale, водопад Palovit, плато 1350 м. По желанию гора Хусер.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 4, 'День 4 · Ризе', 'Свободный день: шопинг, набережная, кафе. Дополнительные экскурсии Duatepe и Ceceve Bahcesi — за доплату.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 5, 'День 5 · Ризе → Батуми', 'Переезд на автобусе около 3–4 часов с прохождением границы. Отель Batumi View Luxury, вечерняя прогулка — по желанию.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 6, 'День 6 · Аджария', 'Обед в Батуми или в «Caravan». Мост царицы Тамары, водопад Махунцети, крепость Гонио-Апсарос. По желанию зиплайн. Вечером — ужин в грузинской семье в Махунцети.' FROM tours WHERE code = 'KARADENIZ';
INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) SELECT id, 'day', 'B', 7, 'Дни 7–8 · Батуми', 'Свободные дни: набережная, дельфинарий (доплата), ботанический сад, шопинг, старый город, Башня Алфавита. День 8 — вылет из Батуми.' FROM tours WHERE code = 'KARADENIZ';
