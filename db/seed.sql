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

INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('umida', 'fd3876cdc44cc2378ee747453f86234f9ce544e953c1228968056744558052ff', '04c5885b8f99511d22986d2d56e498c9', 'UMIDA', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('easytourism', 'aac1fd660f0bb4bfdbc77e261b59a2eb85a0b2b631634e4962e498a29dc4a3b2', 'ff422fc7eaf3e1521f1b69a82303f3ab', 'EASY TOURISM', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('ofotour', '55117630fc381bd0dcc2cff0f272245df614713b1b6d105e60e9f74ef153f4be', 'db9d72c3d8b59254099789bdb6d1c5e0', 'OFO TOUR', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('operator', 'e690fc3c5a789f768c48f27a5ef4378fd4865a037cff9f2b1f4d01006a777c80', '980dc6adceea810dda50d45b9146908d', 'Etihad (оператор)', 'operator');

INSERT INTO destinations (name, title, blurb, image, sort) VALUES ('Турция', 'Турция и Грузия', 'Черноморское побережье: Трабзон, Ризе, Батуми', 'img/hero-rize-batumi.webp', 1);
INSERT INTO destinations (name, title, blurb, image, sort) VALUES ('Умра', 'Умра · Мекка и Медина', 'Паломничество: Мекка, Медина, Джидда', '', 2);

INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('KARADENIZ', 'Батуми - Ризе - Трабзон', 'Турция', 50, 0, 1, 'Еженедельные заезды, цены по типу размещения', 'Комбинированный групповой тур по Чёрному морю: Батуми, Ризе и Трабзон за 8 дней. Сопровождение узбекского гида, более 15 экскурсий, отели на первой береговой линии, трансферы на микроавтобусах Sprinter и ужин в грузинской семье.', 7, NULL);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_TAJ13', 'Умра · TAJ-13', 'Умра', 50, 0, 1, 'Август—сентябрь еженедельно; осенние заезды (октябрь—декабрь) уточняются у оператора.', 'Умра по программе TAJ-13 (13 дней / 12 ночей). Ташкент → Джидда → Мекка → Медина → Ташкент. Джидда · Hawada Hotel Jeddah · 1 ночь; Мекка · Taj Park · 990 м до Харама · 8 ночей; Медина · Grand Al Shahba · 250 м до мечети Пророка · 3 ночи.', 12, 1200);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_TAJ13P', 'Умра · TAJ-13+', 'Умра', 50, 0, 1, 'Июль—август по указанным датам.', 'Умра по программе TAJ-13+ (13 дней / 12 ночей). Ташкент → Джидда → Мекка → Медина → Ташкент. Джидда · Hawada Hotel Jeddah · 1 ночь; Мекка · Taj Park · 990 м до Харама · 8 ночей; Медина · Mukhtara Plaza · 250 м до мечети Пророка · 3 ночи.', 12, 1250);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_ANJUM13', 'Умра · ANJUM-13', 'Умра', 100, 0, 1, 'Август по указанным датам.', 'Умра по программе ANJUM-13 (13 дней / 12 ночей). Ташкент → Джидда → Мекка → Медина → Ташкент. Джидда · Hawada Hotel Jeddah · 1 ночь; Мекка · Anjum · 250 м до Харама · 8 ночей; Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи.', 12, 1600);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_SHOHADA13', 'Умра · SHOHADA-13', 'Умра', 50, 0, 1, 'Август по указанным датам.', 'Умра по программе SHOHADA-13 (13 дней / 12 ночей). Ташкент → Джидда → Мекка → Медина → Ташкент. Джидда · Hawada Hotel Jeddah · 1 ночь; Мекка · Al Shohada · 250 м до Харама · 8 ночей; Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи.', 12, 1650);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_JUMEIRAH13', 'Умра · JUMEIRAH-13', 'Умра', 100, 0, 1, 'Август по указанным датам.', 'Умра по программе JUMEIRAH-13 (13 дней / 12 ночей). Ташкент → Джидда → Мекка → Медина → Ташкент. Джидда · Hawada Hotel Jeddah · 1 ночь; Мекка · Jumeirah Hotel · 100 м до Харама · 8 ночей; Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи.', 12, 1900);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_SAJA10', 'Умра · SAJA-10', 'Умра', 50, 0, 1, 'Июль—сентябрь еженедельно; осенние заезды (октябрь—декабрь) уточняются у оператора.', 'Умра по программе SAJA-10 (10 дней / 9 ночей). Ташкент → Медина → Мекка → Джидда → Ташкент. Медина · Saja Al-Madinah · 250 м до мечети Пророка · 4 ночи; Мекка · Taj Park · 990 м до Харама · 5 ночей.', 9, 1250);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_SWISS10', 'Умра · SWISSOTEL-10', 'Умра', 100, 0, 1, 'Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.', 'Умра по программе SWISSOTEL-10 (10 дней / 9 ночей). Ташкент → Медина → Мекка → Джидда → Ташкент. Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи; Мекка · Swissotel Makkah · 50 м до Харама · 5 ночей.', 9, 1650);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_ANJUM10', 'Умра · ANJUM-10', 'Умра', 100, 0, 1, 'Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.', 'Умра по программе ANJUM-10 (10 дней / 9 ночей). Ташкент → Медина → Мекка → Джидда → Ташкент. Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи; Мекка · Anjum Makkah · 250 м до Харама · 5 ночей.', 9, 1600);
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note, description, nights, from_price) VALUES ('UMRA_JUMEIRAH10', 'Умра · JUMEIRAH-10', 'Умра', 100, 0, 1, 'Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.', 'Умра по программе JUMEIRAH-10 (10 дней / 9 ночей). Ташкент → Медина → Мекка → Джидда → Ташкент. Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи; Мекка · Jumeirah Jabal Omar · 100 м до Харама · 5 ночей.', 9, 1750);

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
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Джидда · Hawada Hotel Jeddah · 1 ночь' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Taj Park · 990 м до Харама · 8 ночей' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Медина · Grand Al Shahba · 250 м до мечети Пророка · 3 ночи' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Автобус Мекка—Медина' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Трёхразовое питание в Мекке и Медине' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, '1 питание в Джидде' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 8, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Август—сентябрь еженедельно; осенние заезды (октябрь—декабрь) уточняются у оператора.', NULL FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Джидда · Hawada Hotel Jeddah · 1 ночь' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Taj Park · 990 м до Харама · 8 ночей' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Медина · Mukhtara Plaza · 250 м до мечети Пророка · 3 ночи' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Скоростной поезд Мекка—Медина' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Питание: Джидда 1 раз, Мекка 3 раза, Медина 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Виза' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 8, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Июль—август по указанным датам.', NULL FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Джидда · Hawada Hotel Jeddah · 1 ночь' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Anjum · 250 м до Харама · 8 ночей' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Скоростной поезд Мекка—Медина' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Виза' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 8, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Август по указанным датам.', NULL FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Джидда · Hawada Hotel Jeddah · 1 ночь' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Al Shohada · 250 м до Харама · 8 ночей' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Скоростной поезд Мекка—Медина' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Питание: Джидда 1 раз, Мекка и Медина 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Виза' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 8, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Август по указанным датам.', NULL FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Джидда · Hawada Hotel Jeddah · 1 ночь' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Jumeirah Hotel · 100 м до Харама · 8 ночей' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Скоростной поезд Мекка—Медина' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Виза' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 8, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Август по указанным датам.', NULL FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Медина · Saja Al-Madinah · 250 м до мечети Пророка · 4 ночи' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Taj Park · 990 м до Харама · 5 ночей' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Скоростной поезд Медина—Мекка' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Трёхразовое питание' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Виза' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Июль—сентябрь еженедельно; осенние заезды (октябрь—декабрь) уточняются у оператора.', NULL FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Swissotel Makkah · 50 м до Харама · 5 ночей' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Скоростной поезд Медина—Мекка' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Питание: Мекка 1 раз, Медина 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Виза' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.', NULL FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Anjum Makkah · 250 м до Харама · 5 ночей' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Скоростной поезд Медина—Мекка' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Питание: Мекка 1 раз, Медина 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Виза' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.', NULL FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 1, 'Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 2, 'Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 3, 'Мекка · Jumeirah Jabal Omar · 100 м до Харама · 5 ночей' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 4, 'Скоростной поезд Медина—Мекка' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 5, 'Питание в Мекке и Медине 2 раза (шведский стол)' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 6, 'Виза' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, 'included', 7, 'Руководители группы и врачи' FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, 'info', 1, 'Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.', NULL FROM tours WHERE code = 'UMRA_JUMEIRAH10';

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

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0801', '2026-08-01', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0801';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0808', '2026-08-08', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0815', '2026-08-15', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0815';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0822', '2026-08-22', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0822';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0829', '2026-08-29', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0829';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0829';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0829';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0905', '2026-09-05', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0905';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0912', '2026-09-12', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0912';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0912';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0912';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0919', '2026-09-19', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0919';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0919';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0919';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13-0926', '2026-09-26', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0926';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0926';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13-0926';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13P-0718', '2026-07-18', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0718';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1300, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0718';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1400, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0718';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13P-0725', '2026-07-25', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0725';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1300, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0725';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1400, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0725';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13P-0801', '2026-08-01', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1300, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1400, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0801';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13P-0808', '2026-08-08', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1300, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1400, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13P-0815', '2026-08-15', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1300, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1400, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0815';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_TAJ13P-0822', '2026-08-22', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_TAJ13P';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1300, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1400, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_TAJ13P-0822';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_ANJUM13-0801', '2026-08-01', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1600, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1700, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1800, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0801';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_ANJUM13-0808', '2026-08-08', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1600, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1700, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1800, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_ANJUM13-0815', '2026-08-15', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1600, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1700, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1800, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0815';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_ANJUM13-0822', '2026-08-22', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_ANJUM13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1600, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1700, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1800, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM13-0822';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SHOHADA13-0801', '2026-08-01', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1650, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1750, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1850, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0801';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SHOHADA13-0808', '2026-08-08', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1650, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1750, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1850, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SHOHADA13-0815', '2026-08-15', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1650, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1750, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1850, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0815';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SHOHADA13-0822', '2026-08-22', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SHOHADA13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1650, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1750, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1850, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SHOHADA13-0822';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_JUMEIRAH13-0801', '2026-08-01', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1900, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 2000, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0801';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 2200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0801';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_JUMEIRAH13-0808', '2026-08-08', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1900, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 2000, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 2200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_JUMEIRAH13-0815', '2026-08-15', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1900, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 2000, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0815';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 2200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0815';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_JUMEIRAH13-0822', '2026-08-22', 'JED', 0, 45, 0 FROM tours WHERE code = 'UMRA_JUMEIRAH13';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1900, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 2000, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0822';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 2200, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH13-0822';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0730', '2026-07-30', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0730';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0806', '2026-08-06', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0806';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0806';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0806';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0813', '2026-08-13', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0813';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0813';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0813';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0820', '2026-08-20', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0820';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0820';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0820';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0827', '2026-08-27', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0827';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0827';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0827';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0903', '2026-09-03', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0903';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0903';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0903';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0910', '2026-09-10', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0910';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0910';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0910';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0917', '2026-09-17', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0917';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0917';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0917';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SAJA10-0924', '2026-09-24', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SAJA10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1250, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0924';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1350, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0924';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1450, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SAJA10-0924';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_SWISS10-0730', '2026-07-30', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_SWISS10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1650, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SWISS10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1750, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SWISS10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1900, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_SWISS10-0730';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_ANJUM10-0730', '2026-07-30', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_ANJUM10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1600, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1700, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_ANJUM10-0730';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'UMRA_JUMEIRAH10-0730', '2026-07-30', 'MED', 0, 45, 0 FROM tours WHERE code = 'UMRA_JUMEIRAH10';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'QUAD', 'Четырёхместный (QUAD)', 'placement', 1750, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 1890, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH10-0730';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 1990, NULL, NULL, 1 FROM departures WHERE code = 'UMRA_JUMEIRAH10-0730';

