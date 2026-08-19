-- Добавляет tours.from_price — минимальную цену программы, известную даже
-- когда у тура ещё нет ни одного будущего заезда (например, SWISSOTEL-10/
-- ANJUM-10/JUMEIRAH-10 у Умры: в данных только одна прошедшая дата,
-- будущие ещё не подтверждены оператором). Раньше карточка в «Новом туре»
-- брала цену только из departure_prices будущих заездов и оставалась
-- пустой. Цены реальные — из UMRA_PROGRAMS в tools/build-seed.py, ничего
-- не выдумано.
--
-- ALTER TABLE ADD COLUMN не идемпотентен — применять один раз. Если нужно
-- повторить (например, обновить цены после правки build-seed.py), удалите
-- сначала блок UPDATE-ов и перезапустите только их — сам ALTER пропустите.

ALTER TABLE tours ADD COLUMN from_price INTEGER;

UPDATE tours SET from_price = 1200 WHERE code = 'UMRA_TAJ13';
UPDATE tours SET from_price = 1250 WHERE code = 'UMRA_TAJ13P';
UPDATE tours SET from_price = 1600 WHERE code = 'UMRA_ANJUM13';
UPDATE tours SET from_price = 1650 WHERE code = 'UMRA_SHOHADA13';
UPDATE tours SET from_price = 1900 WHERE code = 'UMRA_JUMEIRAH13';
UPDATE tours SET from_price = 1250 WHERE code = 'UMRA_SAJA10';
UPDATE tours SET from_price = 1650 WHERE code = 'UMRA_SWISS10';
UPDATE tours SET from_price = 1600 WHERE code = 'UMRA_ANJUM10';
UPDATE tours SET from_price = 1750 WHERE code = 'UMRA_JUMEIRAH10';
