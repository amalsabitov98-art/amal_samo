-- Сгенерировано tools/build-seed.py. Не редактировать вручную.
DELETE FROM departure_prices;
DELETE FROM departures;
DELETE FROM agencies;

INSERT INTO agencies (login, password_hash, password_salt, name) VALUES ('umida', 'dd7081f47781b73f51bada5e930fb378e7c10da37fa897089e3fee3a316b413d', '71ca5c2c254df76932dd78ee1ea19284', 'UMIDA');
INSERT INTO agencies (login, password_hash, password_salt, name) VALUES ('easytourism', '728be3bdc04d6abc61951469ddd567b08b76234d4fc9f09e2922e9db6dd69b09', '0854155f79afea3a0cc13100f84051bf', 'EASY TOURISM');
INSERT INTO agencies (login, password_hash, password_salt, name) VALUES ('ofotour', '97bfa5c289b97b3096d3b073af981ed0cdab53569d7ded0af0277a72bd407594', '5904153e78ef573706bb8c18174dacb7', 'OFO TOUR');

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2205', '2026-05-22', 'BUS', 1, 65, 30);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 600.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 600.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2205';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2905', '2026-05-29', 'BUS', 0, 65, 32);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'BUS2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2905';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX2905', '2026-05-29', 'TZX', 0, 65, 31);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 790.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 830.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'TZX2905';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2905';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS0506', '2026-06-05', 'BUS', 0, 65, 50);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 630.0, 5, 11, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 510.0, 2, 5, 1 FROM departures WHERE code = 'BUS0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0506';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX0506', '2026-06-05', 'TZX', 0, 65, 56);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'TZX0506';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX0506';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1206', '2026-06-12', 'BUS', 0, 65, 52);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1206';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX1206', '2026-06-12', 'TZX', 0, 65, 54);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 600.0, 5, 11, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 480.0, 2, 5, 1 FROM departures WHERE code = 'TZX1206';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1206';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1906', '2026-06-19', 'BUS', 0, 65, 52);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1906';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX1906', '2026-06-19', 'TZX', 0, 65, 51);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1906';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1906';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2606', '2026-06-26', 'BUS', 0, 65, 50);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2606';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX2606', '2026-06-26', 'TZX', 0, 65, 50);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1095.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 875.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 650.0, 5, 11, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2606';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2606';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS0307', '2026-07-03', 'BUS', 0, 65, 59);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0307';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX0307', '2026-07-03', 'TZX', 0, 65, 60);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0307';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'TZX0307';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1007', '2026-07-10', 'BUS', 0, 65, 64);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1007';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX1007', '2026-07-10', 'TZX', 0, 65, 61);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_11', 'Chd 5-11', 'child', 700.0, 5, 11, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1007';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1007';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1707', '2026-07-17', 'BUS', 0, 65, 61);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1707';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX1707', '2026-07-17', 'TZX', 0, 65, 61);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1707';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1707';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2407', '2026-07-24', 'BUS', 0, 65, 61);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2407';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX2407', '2026-07-24', 'TZX', 0, 65, 62);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2407';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2407';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS3107', '2026-07-31', 'BUS', 0, 65, 64);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS3107';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX3107', '2026-07-31', 'TZX', 0, 65, 60);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX3107';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX3107';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS0708', '2026-08-07', 'BUS', 0, 65, 58);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0708';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX0708', '2026-08-07', 'TZX', 0, 65, 61);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX0708';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX0708';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1408', '2026-08-14', 'BUS', 0, 65, 21);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1408';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX1408', '2026-08-14', 'TZX', 0, 65, 47);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX1408';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX1408';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2108', '2026-08-21', 'BUS', 0, 65, 13);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2108';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX2108', '2026-08-21', 'TZX', 0, 65, 19);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2108';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2108';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2808', '2026-08-28', 'BUS', 0, 65, 12);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2808';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX2808', '2026-08-28', 'TZX', 0, 65, 17);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'SNG', 'Одноместный (SNG)', 'placement', 1145.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 930.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 970.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX2808';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX2808';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS0409', '2026-09-04', 'BUS', 0, 65, 6);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS0409';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('TZX0409', '2026-09-04', 'TZX', 0, 65, 5);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'TZX0409';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'TZX0409';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1109', '2026-09-11', 'BUS', 0, 65, 0);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1109';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1109';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS1809', '2026-09-18', 'BUS', 0, 65, 0);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS1809';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS1809';

INSERT INTO departures (code, date_start, transport, is_info_tour, capacity, seats_taken) VALUES ('BUS2509', '2026-09-25', 'BUS', 0, 65, 0);
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'DBL', 'Двухместный (DBL)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TRPL', 'Трёхместный (TRPL)', 'placement', 880.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'TWIN', 'Двухместный раздельный (TWIN)', 'placement', 925.0, NULL, NULL, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_5_10', 'Chd 5-10', 'child', 700.0, 5, 10, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'CHD_2_5', 'Chd 2-5', 'child', 550.0, 2, 5, 1 FROM departures WHERE code = 'BUS2509';
INSERT INTO departure_prices (departure_id, code, label, kind, price, age_from, age_to, occupies_seat) SELECT id, 'INF', 'inf 0-2', 'child', 100.0, 0, 2, 0 FROM departures WHERE code = 'BUS2509';

