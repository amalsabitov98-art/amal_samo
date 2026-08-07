-- 010: превратить восстановленные JP_* из заглушек в реальные продукты 2026.
-- Источник: PDF-программы оператора; точные даты/цены также сохранены в seed/japan-2026.json.
-- Бронирование пока закрыто: в PDF нет подтверждённых квот/остатков мест.

UPDATE destinations SET
  title='Япония 2026',
  blurb='Токио, Киото, Нара и Хаконэ — групповые туры с визовой поддержкой, русскоговорящим сопровождением и заездами в течение сезона 2026.'
WHERE name='Япония';

UPDATE tours SET note='от 980 $ · май–декабрь 2026 · экскурсии по выбору',
  description='Гибкий Токио в собственном темпе: проживание, трансферы, визовая поддержка и страховка в базе; экскурсии в Токио, Камакуру, Disney и Хаконэ добавляются по желанию.',
  nights=7,is_bookable=0 WHERE code='JP_CONSTRUCTOR';
UPDATE tours SET note='от 1 250 $ · апрель–декабрь 2026 · 1 экскурсия включена',
  description='Классический групповой Токио с включённой обзорной экскурсией и свободными днями для шопинга, парков, Disney и поездки к Фудзи.',
  nights=7,is_bookable=0 WHERE code='JP_TOKYO';
UPDATE tours SET note='от 2 190 $ · апрель–декабрь 2026 · 4 экскурсии включены',
  description='Флагманский маршрут: Токио, Киото, Нара и Хаконэ. Шинкансэн, древние храмы, парк Нара и виды на Фудзи в одной программе.',
  nights=7,is_bookable=0 WHERE code='JP_GOLDEN_RING';
UPDATE tours SET note='Скоро в продаже · программа и даты уточняются',
  description='Специальная образовательная программа в Японии. Подробности появятся после подтверждения материалов.',
  nights=NULL,is_bookable=0 WHERE code='JP_CAMP';

DELETE FROM tour_content WHERE tour_id IN (SELECT id FROM tours WHERE code LIKE 'JP\_%' ESCAPE '\');
DELETE FROM tour_variants WHERE tour_id IN (SELECT id FROM tours WHERE code LIKE 'JP\_%' ESCAPE '\');

INSERT INTO tour_variants(tour_id,code,title,sort) SELECT id,'MAIN','Токио · свободная программа и экскурсии по выбору',1 FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_variants(tour_id,code,title,sort) SELECT id,'MAIN','Токио · обзорная экскурсия и свободные дни',1 FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_variants(tour_id,code,title,sort) SELECT id,'MAIN','Токио → Киото → Нара → Хаконэ → Токио',1 FROM tours WHERE code='JP_GOLDEN_RING';

-- Тур-конструктор.
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'included',1,'Проживание на базе завтраков; трансферы Нарита — отель — Нарита; визовая поддержка; медицинская страховка' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'excluded',1,'Международный перелёт (ориентир от 1 000 $); дополнительные экскурсии; обеды и ужины; личные расходы' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',1,'Заезды: 14.05, 11.06, 09.07, 13.08, 10.09, 15.10, 12.11, 10.12.2026' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',2,'Отели 3*: DBL/TWIN — 980 $, SNG — 1 300 $, TRPL/extra bed — 980 $ на человека' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',3,'Опционально: обзорный Токио +370 $, Эносима и Камакура +300 $, Disney +220 $, Хаконэ +290 $, Уэно +180 $, TeamLab +40 $, Makuhari Outlet +180 $' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',1,'Дни 1–2 · Ташкент → Токио','Вылет HY527 в 22:05. Прибытие в Нариту, встреча и групповой трансфер в отель.' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',2,'Дни 3–8 · Свободный Токио','Свободная программа. По желанию: обзорный Токио, Камакура и Эносима, Disney, Хаконэ и Фудзи, Уэно, TeamLab, Makuhari Outlet.' FROM tours WHERE code='JP_CONSTRUCTOR';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',3,'День 9 · Возвращение','Трансфер в Нариту. HY528 в 11:05, прилёт в Ташкент в 16:10.' FROM tours WHERE code='JP_CONSTRUCTOR';

-- Легенды и огни Токио.
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'included',1,'Проживание с завтраками; 1 групповая экскурсия по Токио с русскоговорящим гидом и входными билетами; заказной транспорт; трансферы; визовая поддержка; страховка' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'excluded',1,'Международный перелёт (ориентир от 1 000 $); дополнительные экскурсии; обеды и ужины; личные расходы' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',1,'Заезды: 20.04, 14.05, 11.06, 09.07, 13.08, 10.09, 15.10, 12.11, 10.12.2026' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',2,'Май–июль: 3* DBL/TWIN 1 250 $, SNG 1 570 $, TRPL 1 180 $; 4* 1 460/1 950/1 390 $; 5* 2 150/2 640/2 010 $' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',3,'Апрель, август, сентябрь, декабрь: 3* 1 350/1 670/1 280 $; 4* 1 560/2 050/1 490 $; 5* 2 250/2 740/2 110 $' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',4,'Октябрь–ноябрь: 3* 1 550/1 870/1 480 $; 4* 1 760/2 250/1 690 $; 5* 2 450/2 940/2 310 $. Порядок: DBL/TWIN / SNG / TRPL' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',1,'Дни 1–2 · Ташкент → Токио','Вылет HY527. Прибытие в Нариту, встреча и трансфер в отель.' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',2,'День 3 · Экскурсия по Токио','Асакуса, Сэнсодзи, Tokyo SkyTree, Императорский дворец, Шибуя и Хатико.' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',3,'Дни 4–8 · Свободное время','По желанию: Камакура и Эносима, Disney, Хаконэ и Фудзи, Уэно, TeamLab, Makuhari Outlet.' FROM tours WHERE code='JP_TOKYO';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',4,'День 9 · Возвращение','Трансфер в Нариту. HY528 в 11:05, прилёт в Ташкент в 16:10.' FROM tours WHERE code='JP_TOKYO';

-- Золотое кольцо Японии.
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'included',1,'Проживание с завтраками; 4 экскурсии с русскоговорящим гидом и входными билетами; заказной транспорт; шинкансэн Токио — Киото и Киото — Одавара; трансферы; визовая поддержка; страховка' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'excluded',1,'Международный перелёт (ориентир от 1 000 $); дополнительные экскурсии; обеды и ужины; личные расходы' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',1,'Заезды: 20.04, 14.05, 11.06, 09.07, 13.08, 10.09, 15.10, 12.11, 10.12.2026' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',2,'Май–июль: 3* DBL/TWIN 2 190 $, SNG 2 540 $, TRPL 2 120 $; 4* 2 390/2 880/2 250 $; 5* 2 990/3 690/2 780 $' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',3,'Апрель, август, сентябрь, декабрь: 3* 2 290/2 640/2 220 $; 4* 2 590/2 980/2 350 $; 5* 3 090/3 790/2 880 $' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',4,'Октябрь–ноябрь: 3* 2 390/2 740/2 320 $; 4* 2 690/3 080/2 450 $; 5* 3 190/3 890/2 980 $. Порядок: DBL/TWIN / SNG / TRPL' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',1,'Дни 1–2 · Ташкент → Токио','Вылет HY527. Прибытие в Нариту, встреча и трансфер в отель.' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',2,'День 3 · Токио → Киото','Обзорный Токио: Асакуса, Сэнсодзи, SkyTree, Императорский дворец, Шибуя. Затем шинкансэн в Киото.' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',3,'День 4 · Киото','Арашияма и бамбуковая роща, Кинкакудзи, Фусими Инари Тайся.' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',4,'День 5 · Нара','Храм Тодайдзи и парк Нара с ручными оленями.' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',5,'День 6 · Хаконэ → Токио','Шинкансэн к Хаконэ, Фудзи, озеро Аси, канатная дорога и Овакудани. Далее трансфер в Токио.' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',6,'Дни 7–8 · Свободный Токио','Свободное время; по желанию Уэно, TeamLab или Makuhari Outlet.' FROM tours WHERE code='JP_GOLDEN_RING';
INSERT INTO tour_content(tour_id,kind,variant,sort,title,text) SELECT id,'day','MAIN',7,'День 9 · Возвращение','Трансфер в Нариту. HY528 в 11:05, прилёт в Ташкент в 16:10.' FROM tours WHERE code='JP_GOLDEN_RING';

INSERT INTO tour_content(tour_id,kind,sort,text) SELECT id,'info',1,'Программа, даты и цены будут опубликованы после подтверждения материалов оператором.' FROM tours WHERE code='JP_CAMP';
