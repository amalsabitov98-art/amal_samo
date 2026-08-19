-- Агентские комиссии (в долларах на туриста), подтверждены оператором:
--   Карадениз — $50;
--   Умра: Anjum, Jumeirah, Swissotel — $100; остальные программы — $50.
-- Уже созданные брони не меняются: комиссия фиксируется на момент брони
-- (bookings.agency_commission), из tours не перечитывается. Меняет только
-- новые брони. Идемпотентна — можно прогнать повторно.

UPDATE tours SET agency_commission = 50  WHERE code = 'KARADENIZ';

UPDATE tours SET agency_commission = 50  WHERE code = 'UMRA_TAJ13';
UPDATE tours SET agency_commission = 50  WHERE code = 'UMRA_TAJ13P';
UPDATE tours SET agency_commission = 50  WHERE code = 'UMRA_SHOHADA13';
UPDATE tours SET agency_commission = 50  WHERE code = 'UMRA_SAJA10';

UPDATE tours SET agency_commission = 100 WHERE code = 'UMRA_ANJUM13';
UPDATE tours SET agency_commission = 100 WHERE code = 'UMRA_ANJUM10';
UPDATE tours SET agency_commission = 100 WHERE code = 'UMRA_JUMEIRAH13';
UPDATE tours SET agency_commission = 100 WHERE code = 'UMRA_JUMEIRAH10';
UPDATE tours SET agency_commission = 100 WHERE code = 'UMRA_SWISS10';
