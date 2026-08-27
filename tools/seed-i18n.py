# -*- coding: utf-8 -*-
"""
Переводы наполнения каталога: uz / en / tr.

Ключ — ТОЧНАЯ русская строка из build-seed.py. Так переводы лежат отдельно
от данных (в генераторе они утопили бы сами данные), но привязаны к ним
жёстко: изменил русскую строку — перевод по ней больше не находится и в
базу уходит NULL, то есть карточка на этом языке покажет русский. Это
громко: строка просто перестаёт переводиться, а не переводится неверно.

Проверку «все ли строки переведены» делает tools/check-i18n.py — он же
ловит осиротевшие ключи, оставшиеся от переписанного русского текста.

Русский здесь НЕ хранится: он лежит в обычных колонках базы и служит
откатом. Пустая строка в переводе тоже не хранится — cleanI18n на сервере
такой язык не сохранит, а localize откатится на русский.
"""

# ---------------------------------------------------------------- Карадениз

KARADENIZ = {
    "Батуми - Ризе - Трабзон": {
        "uz": "Batumi - Rize - Trabzon",
        "en": "Batumi – Rize – Trabzon",
        "tr": "Batum - Rize - Trabzon",
    },
    "Еженедельные заезды, цены по типу размещения": {
        "uz": "Har haftalik jo‘nashlar, narxlar joylashuv turiga qarab",
        "en": "Weekly departures, prices by room type",
        "tr": "Haftalık hareketler, fiyatlar oda tipine göre",
    },
    "Комбинированный групповой тур по Чёрному морю: Батуми, Ризе и "
    "Трабзон за 8 дней. Сопровождение узбекского гида, более 15 "
    "экскурсий, отели на первой береговой линии, трансферы на "
    "микроавтобусах Sprinter и ужин в грузинской семье.": {
        "uz": "Qora dengiz bo‘ylab kombinatsiyalangan guruh turi: 8 kunda "
              "Batumi, Rize va Trabzon. O‘zbek gid hamrohligi, 15 dan ortiq "
              "ekskursiya, birinchi qator sohil mehmonxonalari, Sprinter "
              "mikroavtobuslarida transferlar va gruzin oilasida kechki ovqat.",
        "en": "A combined group tour of the Black Sea: Batumi, Rize and "
              "Trabzon in 8 days. An Uzbek guide throughout, more than 15 "
              "excursions, seafront hotels, Sprinter minibus transfers and "
              "dinner with a Georgian family.",
        "tr": "Karadeniz boyunca kombine grup turu: 8 günde Batum, Rize ve "
              "Trabzon. Özbek rehber eşliğinde, 15’ten fazla gezi, sahil "
              "hattında oteller, Sprinter minibüslerle transferler ve bir "
              "Gürcü ailesinde akşam yemeği.",
    },
    # --------------------------------------------------- варианты маршрута
    "Батуми → Ризе · прилёт в Батуми, вылет из Трабзона": {
        "uz": "Batumi → Rize · Batumiga qo‘nish, Trabzondan uchish",
        "en": "Batumi → Rize · arrive in Batumi, depart from Trabzon",
        "tr": "Batum → Rize · Batum’a iniş, Trabzon’dan kalkış",
    },
    "Ризе → Батуми · прилёт в Трабзон, вылет из Батуми": {
        "uz": "Rize → Batumi · Trabzonga qo‘nish, Batumidan uchish",
        "en": "Rize → Batumi · arrive in Trabzon, depart from Batumi",
        "tr": "Rize → Batum · Trabzon’a iniş, Batum’dan kalkış",
    },
    # ------------------------------------------------------------ включено
    "Авиабилеты Ташкент — Трабзон / Батуми": {
        "uz": "Toshkent — Trabzon / Batumi aviabiletlari",
        "en": "Tashkent — Trabzon / Batumi flights",
        "tr": "Taşkent — Trabzon / Batum uçak biletleri",
    },
    "Проживание 7 ночей на базе завтраков в отелях на первой "
    "береговой линии: Batumi View Luxury (Батуми) и "
    "Rhisos Gold Otel Rize (Ризе)": {
        "uz": "Birinchi qator sohil mehmonxonalarida nonushta bilan 7 kecha: "
              "Batumi View Luxury (Batumi) va Rhisos Gold Otel Rize (Rize)",
        "en": "7 nights with breakfast in seafront hotels: Batumi View "
              "Luxury (Batumi) and Rhisos Gold Otel Rize (Rize)",
        "tr": "Sahil hattındaki otellerde kahvaltı dahil 7 gece: Batumi View "
              "Luxury (Batum) ve Rhisos Gold Otel Rize (Rize)",
    },
    "Медицинская страховка на весь период поездки": {
        "uz": "Butun safar davriga tibbiy sug‘urta",
        "en": "Medical insurance for the whole trip",
        "tr": "Tüm seyahat süresi için sağlık sigortası",
    },
    "Все трансферы между локациями на микроавтобусах Sprinter": {
        "uz": "Barcha transferlar Sprinter mikroavtobuslarida",
        "en": "All transfers between locations by Sprinter minibus",
        "tr": "Noktalar arası tüm transferler Sprinter minibüslerle",
    },
    "Один гастрономический ужин в грузинской семье под Батуми "
    "(Махунцети) — халяльное меню": {
        "uz": "Batumi yaqinidagi gruzin oilasida bitta gastronomik kechki "
              "ovqat (Mahuntseti) — halol menyu",
        "en": "One food-tasting dinner with a Georgian family near Batumi "
              "(Makhuntseti) — halal menu",
        "tr": "Batum yakınında bir Gürcü ailesinde gastronomi akşam yemeği "
              "(Mahuntseti) — helal menü",
    },
    "Сопровождение русскоговорящего узбекского гида": {
        "uz": "Rus tilida so‘zlashuvchi o‘zbek gid hamrohligi",
        "en": "A Russian-speaking Uzbek guide throughout",
        "tr": "Rusça konuşan Özbek rehber eşliği",
    },
    "Более 15 экскурсий по программе": {
        "uz": "Dastur bo‘yicha 15 dan ortiq ekskursiya",
        "en": "More than 15 excursions in the programme",
        "tr": "Programda 15’ten fazla gezi",
    },
    "Поддержка 24/7 на протяжении поездки": {
        "uz": "Safar davomida 24/7 qo‘llab-quvvatlash",
        "en": "24/7 support during the trip",
        "tr": "Seyahat boyunca 24/7 destek",
    },
    # -------------------------------------------------------- не включено
    "Обеды и ужины вне программы (кроме одного гастрономического "
    "ужина в Батуми)": {
        "uz": "Dastur tashqarisidagi tushlik va kechki ovqatlar (Batumidagi "
              "bitta gastronomik kechki ovqatdan tashqari)",
        "en": "Lunches and dinners outside the programme (except the one "
              "food-tasting dinner near Batumi)",
        "tr": "Program dışı öğle ve akşam yemekleri (Batum’daki tek "
              "gastronomi yemeği hariç)",
    },
    "Входные билеты в музеи и на платные объекты": {
        "uz": "Muzeylarga va pullik obyektlarga kirish chiptalari",
        "en": "Entrance tickets to museums and paid sites",
        "tr": "Müze ve ücretli mekân giriş biletleri",
    },
    "Дельфинарий в Батуми": {
        "uz": "Batumidagi delfinariy",
        "en": "The Batumi dolphinarium",
        "tr": "Batum yunus akvaryumu",
    },
    "Зиплайн в Махунцети": {
        "uz": "Mahuntsetidagi zipline",
        "en": "The zipline in Makhuntseti",
        "tr": "Mahuntseti’de zipline",
    },
    "Дополнительные экскурсии в Ризе: Duatepe, Ceceve Bahcesi": {
        "uz": "Rizedagi qo‘shimcha ekskursiyalar: Duatepe, Ceceve Bahcesi",
        "en": "Optional excursions in Rize: Duatepe, Ceceve Bahcesi",
        "tr": "Rize’de ek geziler: Duatepe, Ceceve Bahçesi",
    },
    "Личные расходы": {
        "uz": "Shaxsiy xarajatlar",
        "en": "Personal expenses",
        "tr": "Kişisel harcamalar",
    },
    # ------------------------------------------------------------ важно знать
    "Грузия безвизовая для граждан Узбекистана — до 1 года по "
    "загранпаспорту": {
        "uz": "Gruziya O‘zbekiston fuqarolari uchun vizasiz — xorijiy "
              "pasport bilan 1 yilgacha",
        "en": "Georgia is visa-free for Uzbek citizens — up to one year on "
              "an international passport",
        "tr": "Gürcistan, Özbekistan vatandaşları için vizesiz — pasaportla "
              "1 yıla kadar",
    },
    "На 5-й день — сухопутный переход границы Турция–Грузия, "
    "автобус около 3–4 часов": {
        "uz": "5-kuni Turkiya–Gruziya chegarasidan quruqlikda o‘tiladi, "
              "avtobusda taxminan 3–4 soat",
        "en": "On day 5 there is a land border crossing Türkiye–Georgia, "
              "about 3–4 hours by coach",
        "tr": "5. gün Türkiye–Gürcistan kara sınırı geçişi, otobüsle yaklaşık "
              "3–4 saat",
    },
    "Видео о маршруте: Трабзон и Чёрное море (Traveling Faze)": {
        "uz": "Marshrut haqida video: Trabzon va Qora dengiz (Traveling Faze)",
        "en": "Video about the route: Trabzon and the Black Sea (Traveling Faze)",
        "tr": "Güzergâh videosu: Trabzon ve Karadeniz (Traveling Faze)",
    },
}

# ------------------------------------------------- дни программы, вариант A

KARADENIZ_DAYS = {
    "День 1 · Батуми": {"uz": "1-kun · Batumi", "en": "Day 1 · Batumi",
                        "tr": "1. gün · Batum"},
    "Ташкент → Батуми, прилёт 23:20. Встреча, трансфер, отель "
    "Batumi View Luxury. Вечерняя прогулка и ужин грузинской "
    "кухни — по желанию.": {
        "uz": "Toshkent → Batumi, qo‘nish 23:20. Kutib olish, transfer, "
              "Batumi View Luxury mehmonxonasi. Kechki sayr va gruzin "
              "taomlari — ixtiyoriy.",
        "en": "Tashkent → Batumi, arrival 23:20. Meeting, transfer, Batumi "
              "View Luxury hotel. An evening walk and Georgian dinner are "
              "optional.",
        "tr": "Taşkent → Batum, iniş 23:20. Karşılama, transfer, Batumi View "
              "Luxury oteli. Akşam yürüyüşü ve Gürcü mutfağı — isteğe bağlı.",
    },
    "День 2 · Аджария": {"uz": "2-kun · Ajariya", "en": "Day 2 · Adjara",
                         "tr": "2. gün · Acara"},
    "Мост царицы Тамары, водопад Махунцети, крепость "
    "Гонио-Апсарос. Обед: грузинская кухня в центре Батуми или "
    "узбекская в «Caravan». По желанию зиплайн. Вечером — ужин "
    "в грузинской семье в Махунцети.": {
        "uz": "Malika Tamara ko‘prigi, Mahuntseti sharsharasi, Gonio-Apsaros "
              "qal’asi. Tushlik: Batumi markazida gruzin yoki «Caravan»da "
              "o‘zbek taomlari. Ixtiyoriy zipline. Kechqurun — Mahuntsetida "
              "gruzin oilasida kechki ovqat.",
        "en": "Queen Tamar’s bridge, the Makhuntseti waterfall, the "
              "Gonio-Apsaros fortress. Lunch: Georgian food in central "
              "Batumi or Uzbek at “Caravan”. Zipline optional. In the "
              "evening, dinner with a Georgian family in Makhuntseti.",
        "tr": "Kraliçe Tamara Köprüsü, Mahuntseti Şelalesi, Gonio-Apsaros "
              "Kalesi. Öğle yemeği: Batum merkezinde Gürcü ya da "
              "«Caravan»da Özbek mutfağı. Zipline isteğe bağlı. Akşam "
              "Mahuntseti’de bir Gürcü ailesinde yemek.",
    },
    "Дни 3–4 · Батуми": {"uz": "3–4-kunlar · Batumi", "en": "Days 3–4 · Batumi",
                         "tr": "3–4. günler · Batum"},
    "Свободные дни: набережная, дельфинарий (доплата), "
    "ботанический сад, шопинг, старый город, Башня Алфавита.": {
        "uz": "Bo‘sh kunlar: sohil bo‘yi, delfinariy (qo‘shimcha to‘lov), "
              "botanika bog‘i, xarid, eski shahar, Alifbo minorasi.",
        "en": "Free days: the promenade, the dolphinarium (extra charge), "
              "the botanical garden, shopping, the old town, the Alphabet "
              "Tower.",
        "tr": "Serbest günler: sahil bandı, yunus akvaryumu (ek ücret), "
              "botanik bahçe, alışveriş, eski şehir, Alfabe Kulesi.",
    },
    "День 5 · Батуми → Ризе": {"uz": "5-kun · Batumi → Rize",
                               "en": "Day 5 · Batumi → Rize",
                               "tr": "5. gün · Batum → Rize"},
    "Переезд на автобусе около 3–4 часов с прохождением "
    "границы. Отель, вечерняя прогулка, ужин турецкой кухни — "
    "по желанию.": {
        "uz": "Chegaradan o‘tib, avtobusda taxminan 3–4 soat yo‘l. "
              "Mehmonxona, kechki sayr, turk taomlari — ixtiyoriy.",
        "en": "About 3–4 hours by coach, including the border crossing. "
              "Hotel, an evening walk, Turkish dinner — optional.",
        "tr": "Sınır geçişiyle birlikte otobüsle yaklaşık 3–4 saat. Otel, "
              "akşam yürüyüşü, Türk mutfağı — isteğe bağlı.",
    },
    "День 6 · Узунгёль и Трабзон": {"uz": "6-kun · Uzungo‘l va Trabzon",
                                    "en": "Day 6 · Uzungöl and Trabzon",
                                    "tr": "6. gün · Uzungöl ve Trabzon"},
    "Озеро Узунгёль: чай и сувениры. Далее Трабзон с "
    "остановками — пещера Карача, смотровая Torul Cam Teras. "
    "Вечером шопинг Forum AVM или прогулка по городу.": {
        "uz": "Uzungo‘l ko‘li: choy va sovg‘alar. So‘ng to‘xtashlar bilan "
              "Trabzon — Karaca g‘ori, Torul Cam Teras manzaragohi. "
              "Kechqurun Forum AVMda xarid yoki shahar bo‘ylab sayr.",
        "en": "Lake Uzungöl: tea and souvenirs. Then on to Trabzon with "
              "stops — the Karaca cave and the Torul Cam Teras viewpoint. "
              "In the evening, shopping at Forum AVM or a walk in town.",
        "tr": "Uzungöl: çay ve hediyelik eşya. Ardından duraklarla Trabzon — "
              "Karaca Mağarası, Torul Cam Teras seyir terası. Akşam Forum "
              "AVM’de alışveriş ya da şehir turu.",
    },
    "День 7 · Айдер": {"uz": "7-kun · Ayder", "en": "Day 7 · Ayder",
                       "tr": "7. gün · Ayder"},
    "Айдер Яйласы через чайные плантации: крепость Zilkale, "
    "водопад Palovit, плато 1350 м. По желанию гора Хусер.": {
        "uz": "Choy plantatsiyalari orqali Ayder Yaylasi: Zilkale qal’asi, "
              "Palovit sharsharasi, 1350 m yassitog‘. Ixtiyoriy Huser tog‘i.",
        "en": "Ayder Yaylası through the tea plantations: Zilkale fortress, "
              "the Palovit waterfall, the plateau at 1350 m. Mount Huser "
              "optional.",
        "tr": "Çay bahçelerinden geçerek Ayder Yaylası: Zilkale, Palovit "
              "Şelalesi, 1350 m yayla. İsteğe bağlı Huser Dağı.",
    },
    "День 8 · Вылет": {"uz": "8-kun · Uchish", "en": "Day 8 · Departure",
                       "tr": "8. gün · Dönüş"},
    "Свободное утро, трансфер в аэропорт. Трабзон → Ташкент, "
    "вылет 18:45.": {
        "uz": "Bo‘sh ertalab, aeroportga transfer. Trabzon → Toshkent, "
              "uchish 18:45.",
        "en": "A free morning, transfer to the airport. Trabzon → Tashkent, "
              "departure 18:45.",
        "tr": "Serbest sabah, havalimanına transfer. Trabzon → Taşkent, "
              "kalkış 18:45.",
    },
    # ------------------------------------------------------------ вариант B
    "День 1 · Ризе": {"uz": "1-kun · Rize", "en": "Day 1 · Rize",
                      "tr": "1. gün · Rize"},
    "Ташкент → Трабзон, прилёт 17:45. Встреча, трансфер, отель "
    "Rhisos Gold Hotel Rize. Вечерняя прогулка и ужин турецкой "
    "кухни — по желанию.": {
        "uz": "Toshkent → Trabzon, qo‘nish 17:45. Kutib olish, transfer, "
              "Rhisos Gold Hotel Rize. Kechki sayr va turk taomlari — "
              "ixtiyoriy.",
        "en": "Tashkent → Trabzon, arrival 17:45. Meeting, transfer, Rhisos "
              "Gold Hotel Rize. An evening walk and Turkish dinner are "
              "optional.",
        "tr": "Taşkent → Trabzon, iniş 17:45. Karşılama, transfer, Rhisos "
              "Gold Hotel Rize. Akşam yürüyüşü ve Türk mutfağı — isteğe "
              "bağlı.",
    },
    "Озеро Узунгёль, далее Трабзон: пещера Карача, смотровая "
    "Torul Cam Teras. Вечером шопинг Forum AVM или прогулка "
    "по городу.": {
        "uz": "Uzungo‘l ko‘li, so‘ng Trabzon: Karaca g‘ori, Torul Cam Teras "
              "manzaragohi. Kechqurun Forum AVMda xarid yoki shahar bo‘ylab "
              "sayr.",
        "en": "Lake Uzungöl, then Trabzon: the Karaca cave and the Torul Cam "
              "Teras viewpoint. In the evening, shopping at Forum AVM or a "
              "walk in town.",
        "tr": "Uzungöl, ardından Trabzon: Karaca Mağarası, Torul Cam Teras. "
              "Akşam Forum AVM’de alışveriş ya da şehir turu.",
    },
    "День 2 · Узунгёль и Трабзон": {"uz": "2-kun · Uzungo‘l va Trabzon",
                                    "en": "Day 2 · Uzungöl and Trabzon",
                                    "tr": "2. gün · Uzungöl ve Trabzon"},
    "День 3 · Айдер": {"uz": "3-kun · Ayder", "en": "Day 3 · Ayder",
                       "tr": "3. gün · Ayder"},
    "Айдер Яйласы: крепость Zilkale, водопад Palovit, плато "
    "1350 м. По желанию гора Хусер.": {
        "uz": "Ayder Yaylasi: Zilkale qal’asi, Palovit sharsharasi, 1350 m "
              "yassitog‘. Ixtiyoriy Huser tog‘i.",
        "en": "Ayder Yaylası: Zilkale fortress, the Palovit waterfall, the "
              "plateau at 1350 m. Mount Huser optional.",
        "tr": "Ayder Yaylası: Zilkale, Palovit Şelalesi, 1350 m yayla. "
              "İsteğe bağlı Huser Dağı.",
    },
    "День 4 · Ризе": {"uz": "4-kun · Rize", "en": "Day 4 · Rize",
                      "tr": "4. gün · Rize"},
    "Свободный день: шопинг, набережная, кафе. Дополнительные "
    "экскурсии Duatepe и Ceceve Bahcesi — за доплату.": {
        "uz": "Bo‘sh kun: xarid, sohil bo‘yi, kafelar. Duatepe va Ceceve "
              "Bahcesi ekskursiyalari — qo‘shimcha to‘lov evaziga.",
        "en": "A free day: shopping, the promenade, cafés. The Duatepe and "
              "Ceceve Bahcesi excursions are available at extra cost.",
        "tr": "Serbest gün: alışveriş, sahil, kafeler. Duatepe ve Ceceve "
              "Bahçesi gezileri — ek ücretle.",
    },
    "День 5 · Ризе → Батуми": {"uz": "5-kun · Rize → Batumi",
                               "en": "Day 5 · Rize → Batumi",
                               "tr": "5. gün · Rize → Batum"},
    "Переезд на автобусе около 3–4 часов с прохождением "
    "границы. Отель Batumi View Luxury, вечерняя прогулка — "
    "по желанию.": {
        "uz": "Chegaradan o‘tib, avtobusda taxminan 3–4 soat yo‘l. Batumi "
              "View Luxury mehmonxonasi, kechki sayr — ixtiyoriy.",
        "en": "About 3–4 hours by coach, including the border crossing. "
              "Batumi View Luxury hotel, an evening walk — optional.",
        "tr": "Sınır geçişiyle birlikte otobüsle yaklaşık 3–4 saat. Batumi "
              "View Luxury oteli, akşam yürüyüşü — isteğe bağlı.",
    },
    "День 6 · Аджария": {"uz": "6-kun · Ajariya", "en": "Day 6 · Adjara",
                         "tr": "6. gün · Acara"},
    "Обед в Батуми или в «Caravan». Мост царицы Тамары, "
    "водопад Махунцети, крепость Гонио-Апсарос. По желанию "
    "зиплайн. Вечером — ужин в грузинской семье в Махунцети.": {
        "uz": "Batumida yoki «Caravan»da tushlik. Malika Tamara ko‘prigi, "
              "Mahuntseti sharsharasi, Gonio-Apsaros qal’asi. Ixtiyoriy "
              "zipline. Kechqurun — Mahuntsetida gruzin oilasida kechki "
              "ovqat.",
        "en": "Lunch in Batumi or at “Caravan”. Queen Tamar’s bridge, the "
              "Makhuntseti waterfall, the Gonio-Apsaros fortress. Zipline "
              "optional. In the evening, dinner with a Georgian family in "
              "Makhuntseti.",
        "tr": "Batum’da ya da «Caravan»da öğle yemeği. Kraliçe Tamara "
              "Köprüsü, Mahuntseti Şelalesi, Gonio-Apsaros Kalesi. Zipline "
              "isteğe bağlı. Akşam Mahuntseti’de bir Gürcü ailesinde yemek.",
    },
    "Дни 7–8 · Батуми": {"uz": "7–8-kunlar · Batumi",
                         "en": "Days 7–8 · Batumi",
                         "tr": "7–8. günler · Batum"},
    "Свободные дни: набережная, дельфинарий (доплата), "
    "ботанический сад, шопинг, старый город, Башня Алфавита. "
    "День 8 — вылет из Батуми.": {
        "uz": "Bo‘sh kunlar: sohil bo‘yi, delfinariy (qo‘shimcha to‘lov), "
              "botanika bog‘i, xarid, eski shahar, Alifbo minorasi. 8-kuni "
              "Batumidan uchish.",
        "en": "Free days: the promenade, the dolphinarium (extra charge), "
              "the botanical garden, shopping, the old town, the Alphabet "
              "Tower. Day 8 — departure from Batumi.",
        "tr": "Serbest günler: sahil bandı, yunus akvaryumu (ek ücret), "
              "botanik bahçe, alışveriş, eski şehir, Alfabe Kulesi. 8. gün "
              "Batum’dan dönüş.",
    },
}

# ---------------------------------------------------------------- направления

DESTINATIONS = {
    "Турция и Грузия": {"uz": "Turkiya va Gruziya", "en": "Türkiye and Georgia",
                        "tr": "Türkiye ve Gürcistan"},
    "Черноморское побережье: Трабзон, Ризе, Батуми": {
        "uz": "Qora dengiz sohili: Trabzon, Rize, Batumi",
        "en": "The Black Sea coast: Trabzon, Rize, Batumi",
        "tr": "Karadeniz kıyısı: Trabzon, Rize, Batum",
    },
    "Умра · Мекка и Медина": {"uz": "Umra · Makka va Madina",
                              "en": "Umrah · Mecca and Medina",
                              "tr": "Umre · Mekke ve Medine"},
    "Паломничество: Мекка, Медина, Джидда": {
        "uz": "Ziyorat: Makka, Madina, Jidda",
        "en": "Pilgrimage: Mecca, Medina, Jeddah",
        "tr": "Hac ziyareti: Mekke, Medine, Cidde",
    },
    "Турция": {"uz": "Turkiya", "en": "Türkiye", "tr": "Türkiye"},
    "Умра": {"uz": "Umra", "en": "Umrah", "tr": "Umre"},
}

# ---------------------------------------------------------------------- Умра

UMRA = {
    # -------------------------------------------------------------- отели
    "Джидда · Hawada Hotel Jeddah · 1 ночь": {
        "uz": "Jidda · Hawada Hotel Jeddah · 1 kecha",
        "en": "Jeddah · Hawada Hotel Jeddah · 1 night",
        "tr": "Cidde · Hawada Hotel Jeddah · 1 gece",
    },
    "Мекка · Taj Park · 990 м до Харама · 8 ночей": {
        "uz": "Makka · Taj Park · Haramgacha 990 m · 8 kecha",
        "en": "Mecca · Taj Park · 990 m to the Haram · 8 nights",
        "tr": "Mekke · Taj Park · Harem’e 990 m · 8 gece",
    },
    "Мекка · Taj Park · 990 м до Харама · 5 ночей": {
        "uz": "Makka · Taj Park · Haramgacha 990 m · 5 kecha",
        "en": "Mecca · Taj Park · 990 m to the Haram · 5 nights",
        "tr": "Mekke · Taj Park · Harem’e 990 m · 5 gece",
    },
    "Мекка · Anjum · 250 м до Харама · 8 ночей": {
        "uz": "Makka · Anjum · Haramgacha 250 m · 8 kecha",
        "en": "Mecca · Anjum · 250 m to the Haram · 8 nights",
        "tr": "Mekke · Anjum · Harem’e 250 m · 8 gece",
    },
    "Мекка · Anjum Makkah · 250 м до Харама · 5 ночей": {
        "uz": "Makka · Anjum Makkah · Haramgacha 250 m · 5 kecha",
        "en": "Mecca · Anjum Makkah · 250 m to the Haram · 5 nights",
        "tr": "Mekke · Anjum Makkah · Harem’e 250 m · 5 gece",
    },
    "Мекка · Al Shohada · 250 м до Харама · 8 ночей": {
        "uz": "Makka · Al Shohada · Haramgacha 250 m · 8 kecha",
        "en": "Mecca · Al Shohada · 250 m to the Haram · 8 nights",
        "tr": "Mekke · Al Shohada · Harem’e 250 m · 8 gece",
    },
    "Мекка · Jumeirah Hotel · 100 м до Харама · 8 ночей": {
        "uz": "Makka · Jumeirah Hotel · Haramgacha 100 m · 8 kecha",
        "en": "Mecca · Jumeirah Hotel · 100 m to the Haram · 8 nights",
        "tr": "Mekke · Jumeirah Hotel · Harem’e 100 m · 8 gece",
    },
    "Мекка · Jumeirah Jabal Omar · 100 м до Харама · 5 ночей": {
        "uz": "Makka · Jumeirah Jabal Omar · Haramgacha 100 m · 5 kecha",
        "en": "Mecca · Jumeirah Jabal Omar · 100 m to the Haram · 5 nights",
        "tr": "Mekke · Jumeirah Jabal Omar · Harem’e 100 m · 5 gece",
    },
    "Мекка · Swissotel Makkah · 50 м до Харама · 5 ночей": {
        "uz": "Makka · Swissotel Makkah · Haramgacha 50 m · 5 kecha",
        "en": "Mecca · Swissotel Makkah · 50 m to the Haram · 5 nights",
        "tr": "Mekke · Swissotel Makkah · Harem’e 50 m · 5 gece",
    },
    "Медина · Grand Al Shahba · 250 м до мечети Пророка · 3 ночи": {
        "uz": "Madina · Grand Al Shahba · Payg‘ambar masjidigacha 250 m · 3 kecha",
        "en": "Medina · Grand Al Shahba · 250 m to the Prophet’s Mosque · 3 nights",
        "tr": "Medine · Grand Al Shahba · Mescid-i Nebevi’ye 250 m · 3 gece",
    },
    "Медина · Mukhtara Plaza · 250 м до мечети Пророка · 3 ночи": {
        "uz": "Madina · Mukhtara Plaza · Payg‘ambar masjidigacha 250 m · 3 kecha",
        "en": "Medina · Mukhtara Plaza · 250 m to the Prophet’s Mosque · 3 nights",
        "tr": "Medine · Mukhtara Plaza · Mescid-i Nebevi’ye 250 m · 3 gece",
    },
    "Медина · Saja Al-Madinah · 250 м до мечети Пророка · 4 ночи": {
        "uz": "Madina · Saja Al-Madinah · Payg‘ambar masjidigacha 250 m · 4 kecha",
        "en": "Medina · Saja Al-Madinah · 250 m to the Prophet’s Mosque · 4 nights",
        "tr": "Medine · Saja Al-Madinah · Mescid-i Nebevi’ye 250 m · 4 gece",
    },
    "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи": {
        "uz": "Madina · Waqf Al Safi · Payg‘ambar masjidigacha 50 m · 3 kecha",
        "en": "Medina · Waqf Al Safi · 50 m to the Prophet’s Mosque · 3 nights",
        "tr": "Medine · Waqf Al Safi · Mescid-i Nebevi’ye 50 m · 3 gece",
    },
    "Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи": {
        "uz": "Madina · Waqf Al Safi · Payg‘ambar masjidigacha 50 m · 4 kecha",
        "en": "Medina · Waqf Al Safi · 50 m to the Prophet’s Mosque · 4 nights",
        "tr": "Medine · Waqf Al Safi · Mescid-i Nebevi’ye 50 m · 4 gece",
    },
    # ------------------------------------------------------------- услуги
    "Автобус Мекка—Медина": {"uz": "Makka—Madina avtobusi",
                             "en": "Mecca—Medina coach",
                             "tr": "Mekke—Medine otobüsü"},
    "Скоростной поезд Мекка—Медина": {
        "uz": "Makka—Madina tezyurar poyezdi",
        "en": "Mecca—Medina high-speed train",
        "tr": "Mekke—Medine hızlı treni",
    },
    "Скоростной поезд Медина—Мекка": {
        "uz": "Madina—Makka tezyurar poyezdi",
        "en": "Medina—Mecca high-speed train",
        "tr": "Medine—Mekke hızlı treni",
    },
    "Трёхразовое питание": {"uz": "Uch mahal ovqat",
                            "en": "Three meals a day",
                            "tr": "Üç öğün yemek"},
    "Трёхразовое питание в Мекке и Медине": {
        "uz": "Makka va Madinada uch mahal ovqat",
        "en": "Three meals a day in Mecca and Medina",
        "tr": "Mekke ve Medine’de üç öğün yemek",
    },
    "1 питание в Джидде": {"uz": "Jiddada 1 mahal ovqat",
                           "en": "One meal in Jeddah",
                           "tr": "Cidde’de bir öğün"},
    "Питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол)": {
        "uz": "Ovqat: Jidda 1 marta, Makka 1 marta, Madina 2 marta (ochiq bufet)",
        "en": "Meals: Jeddah once, Mecca once, Medina twice (buffet)",
        "tr": "Öğün: Cidde 1, Mekke 1, Medine 2 (açık büfe)",
    },
    "Питание: Джидда 1 раз, Мекка 3 раза, Медина 2 раза (шведский стол)": {
        "uz": "Ovqat: Jidda 1 marta, Makka 3 marta, Madina 2 marta (ochiq bufet)",
        "en": "Meals: Jeddah once, Mecca three times, Medina twice (buffet)",
        "tr": "Öğün: Cidde 1, Mekke 3, Medine 2 (açık büfe)",
    },
    "Питание: Джидда 1 раз, Мекка и Медина 2 раза (шведский стол)": {
        "uz": "Ovqat: Jidda 1 marta, Makka va Madina 2 martadan (ochiq bufet)",
        "en": "Meals: Jeddah once, Mecca and Medina twice each (buffet)",
        "tr": "Öğün: Cidde 1, Mekke ve Medine 2’şer (açık büfe)",
    },
    "Питание: Мекка 1 раз, Медина 2 раза (шведский стол)": {
        "uz": "Ovqat: Makka 1 marta, Madina 2 marta (ochiq bufet)",
        "en": "Meals: Mecca once, Medina twice (buffet)",
        "tr": "Öğün: Mekke 1, Medine 2 (açık büfe)",
    },
    "Питание в Мекке и Медине 2 раза (шведский стол)": {
        "uz": "Makka va Madinada 2 martadan ovqat (ochiq bufet)",
        "en": "Meals twice a day in Mecca and Medina (buffet)",
        "tr": "Mekke ve Medine’de günde 2 öğün (açık büfe)",
    },
    "Виза": {"uz": "Viza", "en": "Visa", "tr": "Vize"},
    "Руководители группы и врачи": {
        "uz": "Guruh rahbarlari va shifokorlar",
        "en": "Group leaders and doctors",
        "tr": "Grup liderleri ve doktorlar",
    },
    # --------------------------------------------------------- примечания
    "Август по указанным датам.": {
        "uz": "Avgust — ko‘rsatilgan sanalarda.",
        "en": "August, on the dates listed.",
        "tr": "Ağustos, belirtilen tarihlerde.",
    },
    "Июль—август по указанным датам.": {
        "uz": "Iyul—avgust — ko‘rsatilgan sanalarda.",
        "en": "July–August, on the dates listed.",
        "tr": "Temmuz–Ağustos, belirtilen tarihlerde.",
    },
    "Август—сентябрь еженедельно; осенние заезды (октябрь—декабрь) "
    "уточняются у оператора.": {
        "uz": "Avgust—sentabr har hafta; kuzgi jo‘nashlar (oktabr—dekabr) "
              "operator bilan aniqlanadi.",
        "en": "Weekly in August–September; autumn departures "
              "(October–December) to be confirmed with the operator.",
        "tr": "Ağustos–Eylül her hafta; sonbahar hareketleri (Ekim–Aralık) "
              "operatörle netleştirilir.",
    },
    "Июль—сентябрь еженедельно; осенние заезды (октябрь—декабрь) "
    "уточняются у оператора.": {
        "uz": "Iyul—sentabr har hafta; kuzgi jo‘nashlar (oktabr—dekabr) "
              "operator bilan aniqlanadi.",
        "en": "Weekly in July–September; autumn departures "
              "(October–December) to be confirmed with the operator.",
        "tr": "Temmuz–Eylül her hafta; sonbahar hareketleri (Ekim–Aralık) "
              "operatörle netleştirilir.",
    },
    "Еженедельно с 6 августа по 3 декабря — точные даты уточняются "
    "у оператора.": {
        "uz": "6 avgustdan 3 dekabrgacha har hafta — aniq sanalar operator "
              "bilan aniqlanadi.",
        "en": "Weekly from 6 August to 3 December — exact dates to be "
              "confirmed with the operator.",
        "tr": "6 Ağustos–3 Aralık arası her hafta — kesin tarihler "
              "operatörle netleştirilir.",
    },
    # ------------------------------------------------------------ маршруты
    "Ташкент → Джидда → Мекка → Медина → Ташкент": {
        "uz": "Toshkent → Jidda → Makka → Madina → Toshkent",
        "en": "Tashkent → Jeddah → Mecca → Medina → Tashkent",
        "tr": "Taşkent → Cidde → Mekke → Medine → Taşkent",
    },
    "Ташкент → Медина → Мекка → Джидда → Ташкент": {
        "uz": "Toshkent → Madina → Makka → Jidda → Toshkent",
        "en": "Tashkent → Medina → Mecca → Jeddah → Tashkent",
        "tr": "Taşkent → Medine → Mekke → Cidde → Taşkent",
    },
}

# Шаблон описания программы Умры. Русское описание собирается в build-seed.py
# из тех же частей; здесь только перевод обвязки, а маршрут и отели берутся
# из UMRA выше — иначе их пришлось бы переводить второй раз, уже внутри
# описания, и две копии рано или поздно разошлись бы.
UMRA_DESCRIPTION = {
    "uz": "{prog} dasturi bo‘yicha umra ({days} kun / {nights} kecha). "
          "{route}. {hotels}.",
    "en": "Umrah under the {prog} programme ({days} days / {nights} nights). "
          "{route}. {hotels}.",
    "tr": "{prog} programıyla umre ({days} gün / {nights} gece). "
          "{route}. {hotels}.",
}

# Название тура Умры: «Умра · TAJ-13». Переводится только слово «Умра».
UMRA_NAME = {"uz": "Umra · {prog}", "en": "Umrah · {prog}", "tr": "Umre · {prog}"}

# Строки, которые переводить НЕЧЕГО: код авиакомпании, коды аэропортов и
# время вылета одинаковы на всех языках. Перечислены явно, а не пропущены
# молча, — иначе проверка вечно показывала бы «переведено 90 из 92» и на этом
# фоне настоящий пропуск было бы не заметить.
NO_TRANSLATION = {
    "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
    "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
}

LANGS = ("uz", "en", "tr")

# Все словари в одну карту: генератору нужен один поиск по русской строке.
ALL = {}
for _d in (KARADENIZ, KARADENIZ_DAYS, DESTINATIONS, UMRA):
    for _k, _v in _d.items():
        ALL[_k] = _v
