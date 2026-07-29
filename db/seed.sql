-- Сгенерировано tools/build-seed.py. Не редактировать вручную.
DELETE FROM departure_prices;
DELETE FROM departures;
DELETE FROM tours;
DELETE FROM agencies;

INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('umida', 'cace0aa66113acc67a96d596b78402763ac17fec3b75c28c0237c1f318ac47c1', 'b2d7115f2765cc612479c3680bb60a46', 'UMIDA', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('easytourism', 'e12afcdbaacc1556d21cafdfbf5d3c3b1bf44b29afe6c2e958d92c579c8ae52d', '6a1fa718314f9c46a2326cfae7cc4321', 'EASY TOURISM', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('ofotour', '14f36386664af2218343d9a998e16ed1c2b477250c5ce9dbeb6c236f51454137', 'd618f04ed4930cbef958a8e39c555850', 'OFO TOUR', 'agency');
INSERT INTO agencies (login, password_hash, password_salt, name, role) VALUES ('operator', '1524c2a642a5d333ded329d5b77d29d94170f67e8279b2ea3fd2c0e1c77f6382', '563ffb78a9f4f523306ddf3e29ec0953', 'Turon Tour (оператор)', 'operator');

INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note) VALUES ('KARADENIZ', 'Карадениз — Трабзон и Ризе', 'Турция', 0, 0, 1, 'Еженедельные заезды, цены по типу размещения');
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note) VALUES ('JP_CONSTRUCTOR', 'Тур-конструктор «Легенды и огни Токио»', 'Япония', 100, 30, 0, 'Ожидаются даты заездов и цены');
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note) VALUES ('JP_TOKYO', 'Легенды и огни Токио', 'Япония', 150, 40, 0, 'Ожидаются даты заездов и цены');
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note) VALUES ('JP_GOLDEN_RING', 'Золотое кольцо Японии', 'Япония', 250, 50, 0, 'Ожидаются даты заездов и цены');
INSERT INTO tours (code, name, destination, agency_commission, operator_commission, is_bookable, note) VALUES ('JP_CAMP', 'Учебный лагерь Japan Camp', 'Япония', 250, 50, 0, 'Ожидаются даты заездов и цены');

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2205', '2026-05-22', 'BUS', 1, 65, 30 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 600.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 600.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2905', '2026-05-29', 'BUS', 0, 65, 32 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2905';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2905', '2026-05-29', 'TZX', 0, 65, 31 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2905';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0506', '2026-06-05', 'BUS', 0, 65, 50 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 630.0, 5, 11, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 510.0, 2, 5, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0506';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0506', '2026-06-05', 'TZX', 0, 65, 56 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX0506';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1206', '2026-06-12', 'BUS', 0, 65, 52 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1206';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1206', '2026-06-12', 'TZX', 0, 65, 54 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1206';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1906', '2026-06-19', 'BUS', 0, 65, 52 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1906';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1906', '2026-06-19', 'TZX', 0, 65, 51 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1906';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2606', '2026-06-26', 'BUS', 0, 65, 50 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2606';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2606', '2026-06-26', 'TZX', 0, 65, 50 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2606';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0307', '2026-07-03', 'BUS', 0, 65, 59 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0307';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0307', '2026-07-03', 'TZX', 0, 65, 60 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'TZX0307';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1007', '2026-07-10', 'BUS', 0, 65, 64 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1007';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1007', '2026-07-10', 'TZX', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1007';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1707', '2026-07-17', 'BUS', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1707';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1707', '2026-07-17', 'TZX', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1707';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2407', '2026-07-24', 'BUS', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2407';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2407', '2026-07-24', 'TZX', 0, 65, 62 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2407';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS3107', '2026-07-31', 'BUS', 0, 65, 64 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS3107';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX3107', '2026-07-31', 'TZX', 0, 65, 60 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX3107';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0708', '2026-08-07', 'BUS', 0, 65, 58 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0708';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0708', '2026-08-07', 'TZX', 0, 65, 61 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX0708';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1408', '2026-08-14', 'BUS', 0, 65, 21 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1408';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX1408', '2026-08-14', 'TZX', 0, 65, 47 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1408';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2108', '2026-08-21', 'BUS', 0, 65, 13 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2108';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2108', '2026-08-21', 'TZX', 0, 65, 19 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2108';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2808', '2026-08-28', 'BUS', 0, 65, 12 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX2808', '2026-08-28', 'TZX', 0, 65, 17 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2808';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS0409', '2026-09-04', 'BUS', 0, 65, 6 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0409';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'TZX0409', '2026-09-04', 'TZX', 0, 65, 5 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX0409';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1109', '2026-09-11', 'BUS', 0, 65, 0 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1109';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS1809', '2026-09-18', 'BUS', 0, 65, 0 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1809';

INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, capacity, seats_taken) SELECT id, 'BUS2509', '2026-09-25', 'BUS', 0, 65, 0 FROM tours WHERE code = 'KARADENIZ';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2509';

