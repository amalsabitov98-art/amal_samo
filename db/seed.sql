-- Сгенерировано tools/build-seed.py. Не редактировать вручную.
--
-- ВНИМАНИЕ: это файл ПЕРВОГО наполнения ПУСТОЙ базы.
-- Он удаляет агентства, туры и заезды целиком, поэтому на
-- работающей базе его запускать НЕЛЬЗЯ — слетят пароли
-- агентств, а брони останутся без своих заездов.
-- Для правок работающей базы используйте db/migrations/.
DELETE FROM departure_prices;
DELETE FROM departures;
DELETE FROM tour_content;
DELETE FROM tour_variants;
DELETE FROM destinations;
DELETE FROM tours;
DELETE FROM agencies;

INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('umida', '1036176d05f7081a59225cc7f5e6a85f1921facd91d81c014f300aec7f50e0e3', '2f1c7a25282a1fbe5ec37b34a5f6915e', 'UMIDA', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('easytourism', '5153cac4d281f66d3b83750312457ae533b3bd27447a796bbc1e4137aa4b4b54', '3baae4e7a9a3c55207168613f185e37e', 'EASY TOURISM', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('ofotour', '9d370bd6c39d5ce7c5140f0ca48e99a7a2f71a985b0ee1f1e3b0645b7ec686bc', '3aaeb06746e77edb5e7e27dd82a6672c', 'OFO TOUR', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('operator', '618e1e71183584ce1ae04fc74b58a873aa217754807a3d1841e3ad43ff776f01', 'c4960e764bd9c3778a62cc04d53ef640', 'Etihad (оператор)', 'operator');

INSERT INTO destinations (name, title, blurb, image, sort) VALUES ('Турция', 'Турция и Грузия', 'Черноморское побережье: Трабзон, Ризе, Батуми', 'img/hero-rize-batumi.webp', 1);

INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights) VALUES ('KARADENIZ', 'Батуми - Ризе - Трабзон', 'Турция', 0, 0, 1, 'Еженедельные заезды, цены по типу размещения', 'Комбинированный групповой тур по Чёрному морю: Батуми, Ризе и Трабзон за 8 дней. Сопровождение узбекского гида, более 15 экскурсий, отели на первой береговой линии, трансферы на микроавтобусах Sprinter и ужин в грузинской семье.', 7);

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

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2205', '2026-05-22', 'BUS', 1, 65, 30 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 600, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 600, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 790, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2905', '2026-05-29', 'BUS', 0, 65, 32 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 830, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 830, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 790, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600, 5, 11, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480, 2, 5, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS2905';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2905', '2026-05-29', 'TZX', 0, 65, 31 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 830, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 830, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 790, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600, 5, 11, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480, 2, 5, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX2905';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0506', '2026-06-05', 'BUS', 0, 65, 50 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 630, 5, 11, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 510, 2, 5, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS0506';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0506', '2026-06-05', 'TZX', 0, 65, 56 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600, 5, 11, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480, 2, 5, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX0506';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1206', '2026-06-12', 'BUS', 0, 65, 52 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650, 5, 11, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS1206';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1206', '2026-06-12', 'TZX', 0, 65, 54 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600, 5, 11, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480, 2, 5, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX1206';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1906', '2026-06-19', 'BUS', 0, 65, 52 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650, 5, 11, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS1906';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1906', '2026-06-19', 'TZX', 0, 65, 51 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650, 5, 11, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX1906';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2606', '2026-06-26', 'BUS', 0, 65, 50 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650, 5, 11, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS2606';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2606', '2026-06-26', 'TZX', 0, 65, 50 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 875, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650, 5, 11, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX2606';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0307', '2026-07-03', 'BUS', 0, 65, 59 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700, 5, 11, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS0307';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0307', '2026-07-03', 'TZX', 0, 65, 60 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700, 5, 11, 1 FROM departures WHERE code = 'TZX0307';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1007', '2026-07-10', 'BUS', 0, 65, 64 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700, 5, 11, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS1007';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1007', '2026-07-10', 'TZX', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700, 5, 11, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX1007';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1707', '2026-07-17', 'BUS', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS1707';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1707', '2026-07-17', 'TZX', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX1707';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2407', '2026-07-24', 'BUS', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS2407';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2407', '2026-07-24', 'TZX', 0, 65, 62 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX2407';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS3107', '2026-07-31', 'BUS', 0, 65, 64 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS3107';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX3107', '2026-07-31', 'TZX', 0, 65, 60 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX3107';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0708', '2026-08-07', 'BUS', 0, 65, 58 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS0708';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0708', '2026-08-07', 'TZX', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX0708';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1408', '2026-08-14', 'BUS', 0, 65, 21 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS1408';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1408', '2026-08-14', 'TZX', 0, 65, 47 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX1408';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2108', '2026-08-21', 'BUS', 0, 65, 13 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS2108';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2108', '2026-08-21', 'TZX', 0, 65, 19 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX2108';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2808', '2026-08-28', 'BUS', 0, 65, 12 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS2808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2808', '2026-08-28', 'TZX', 0, 65, 17 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 930, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX2808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0409', '2026-09-04', 'BUS', 0, 65, 6 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 880, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS0409';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0409', '2026-09-04', 'TZX', 0, 65, 5 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 880, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'TZX0409';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1109', '2026-09-11', 'BUS', 0, 65, 0 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBLX', 'Доп. кровать (DBL+1)', 'placement', 880, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700, 5, 10, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550, 2, 5, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100, 0, 2, 0 FROM departures WHERE code = 'BUS1109';

