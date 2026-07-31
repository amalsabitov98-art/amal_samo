-- Миграция 002: обновлённый состав «включено / не включено» у KARADENIZ.
-- Пароли и агентства не трогает. Применять один раз:
--   cd worker
--   wrangler d1 execute turon-tour --remote --file=../db/migrations/002-karadeniz-included.sql

DELETE FROM tour_content WHERE kind IN ('included','excluded')
  AND tour_id = (SELECT id FROM tours WHERE code = 'KARADENIZ');

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
