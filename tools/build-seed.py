"""
Превращает seed/departures.json в SQL для наполнения базы.

Запуск:  python3 tools/build-seed.py > db/seed.sql

Пассажиры из исходной ведомости НЕ переносятся — это персональные данные.
Уже проданные места учитываются обезличенно, через seats_taken заезда:
свободных мест остаётся ровно столько, сколько на самом деле.
"""
import json, os, re, sys, hashlib, secrets
from pathlib import Path

# На Windows перенаправление `> db/seed.sql` пишет в системной кодировке
# консоли (обычно cp1251), а не в UTF-8 — кириллица в SQL получается
# битой. Фиксируем кодировку явно, независимо от платформы.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Пути считаем от расположения скрипта, а не от текущего каталога:
# генератор запускают и из корня репозитория, и из worker/.
ROOT = Path(__file__).resolve().parent.parent

# Вместимость в ведомости нигде не указана. Максимум фактической загрузки —
# 64 человека, поэтому берём 65 как рабочее значение; его нужно подтвердить
# у оператора и поправить здесь (борт и автобус вполне могут отличаться).
DEFAULT_CAPACITY = {"TZX": 65, "BUS": 65}

PLACEMENT_LABELS = {
    "DBL": "Двухместный (DBL)",
    "TWIN": "Двухместный раздельный (TWIN)",
    "TRPL": "Трёхместный (TRPL)",
    "SNG": "Одноместный (SNG)",
    "DBLX": "Доп. кровать (DBL+1)",
    "QUAD": "Четырёхместный (QUAD)",   # Умра: 4 паломника в номере
}

# ------------------------------------------------------------------ extra bed
# Доп. кровать в двухместном номере (DBL+1): двое взрослых + доп. кровать
# для РЕБЁНКА. Ребёнок на ней считается по обычному детскому тарифу по
# возрасту (см. priceFor) — своей цены у DBLX для основного сценария нет.
# Цена в прайсе = TRPL нужна как запасной тариф на случай ВЗРОСЛОГО на доп.
# кровати (крайний случай): «третий в номере» — ближайший реальный тариф.
#
# Если оператор всё же задаст отдельную цену для взрослого на доп. кровати:
#   * одинаковая на все заезды  -> EXTRA_BED_PRICE = 850
#   * скидка от двухместного     -> EXTRA_BED_FROM = "DBL", EXTRA_BED_DELTA = -75
#   * свой тариф на заезд         -> EXTRA_BED_OVERRIDES = {"TZX0506": 830, ...}
# После правки ОБЯЗАТЕЛЬНО пересобрать: python3 tools/build-seed.py > db/seed.sql
EXTRA_BED_CODE = "DBLX"
EXTRA_BED_FROM = "TRPL"      # из какого тарифа считаем взрослый фолбэк
EXTRA_BED_DELTA = 0          # прибавка к нему в долларах
EXTRA_BED_PRICE = None       # если задано — перебивает расчёт для всех заездов
EXTRA_BED_OVERRIDES = {}     # {код заезда: цена} — перебивает всё остальное


def extra_bed_price(departure):
    """Взрослый фолбэк-тариф доп. кровати. None — если посчитать не из чего."""
    if departure["code"] in EXTRA_BED_OVERRIDES:
        return EXTRA_BED_OVERRIDES[departure["code"]]
    if EXTRA_BED_PRICE is not None:
        return EXTRA_BED_PRICE
    base = departure["prices"].get(EXTRA_BED_FROM)
    # Заезда без базового тарифа быть не должно, но если он появится —
    # молча пропускаем: пустая строка в прайсе лучше, чем цена с потолка.
    return None if base is None else base + EXTRA_BED_DELTA

DEMO_AGENCIES = [
    ("umida", "UMIDA", "agency"),
    ("easytourism", "EASY TOURISM", "agency"),
    ("ofotour", "OFO TOUR", "agency"),
    ("operator", "Etihad (оператор)", "operator"),
]
# Пароли не зашиваем в репозиторий: генерируем при сборке и печатаем
# один раз в консоль. Иначе вход открыт всем, кто видел исходники.
def make_password():
    # TURON_SEED_PASSWORD задаёт один известный пароль всем учёткам —
    # нужно только для автотестов, на бою переменную не выставлять.
    forced = os.environ.get("TURON_SEED_PASSWORD")
    if forced:
        return forced
    alphabet = "abcdefghijkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(12))

# Комиссии — в долларах на человека, операторская идёт СВЕРХУ агентской
# (агентству она не показывается).
# (код, название, направление, агентская, операторская, бронируемый, примечание)
TOURS = [
    ("KARADENIZ", "Батуми - Ризе - Трабзон", "Турция", 0, 0, 1,
     "Еженедельные заезды, цены по типу размещения"),
]
KARADENIZ = "KARADENIZ"

# Плитки направлений в публичном каталоге. name должен совпадать с
# tours.destination. image пока пустой: фотографий в репозитории нет,
# плитка рисуется без картинки — подставить, когда оператор их даст.
# (name, title, blurb, image, sort)
DESTINATIONS = [
    # Фотография настоящая: чайные террасы Ризе, переходящие в набережную
    # Батуми, — ровно то, что описывает направление. Лежит в img/, а не
    # ссылкой наружу: внешние картинки отваливаются вместе с чужим хостингом.
    ("Турция", "Турция и Грузия",
     "Черноморское побережье: Трабзон, Ризе, Батуми",
     "img/hero-rize-batumi.webp", 1),
]

# Длительность и описание для карточки тура.
TOUR_DETAILS = {
    "KARADENIZ": {
        "nights": 7,
        "description": (
            "Комбинированный групповой тур по Чёрному морю: Батуми, Ризе и "
            "Трабзон за 8 дней. Сопровождение узбекского гида, более 15 "
            "экскурсий, отели на первой береговой линии, трансферы на "
            "микроавтобусах Sprinter и ужин в грузинской семье."
        ),
    },
}

# Варианты маршрута: (код, название, порядок). Два зеркальных маршрута
# Карадениза физически несовместимы — разное направление перелёта, —
# поэтому дни программы хранятся отдельно по каждому варианту.
TOUR_VARIANTS = {
    "KARADENIZ": [
        ("A", "Батуми → Ризе · прилёт в Батуми, вылет из Трабзона", 1),
        ("B", "Ризе → Батуми · прилёт в Трабзон, вылет из Батуми", 2),
    ],
}

# Контент карточки тура. Источник — karadeniz-tour-info.md.
# Авиабилет подтверждён оператором как часть цены заезда (расхождение из
# TODO.md снято) — стоит в «включено», а не в «не включено».
TOUR_CONTENT = {
    "KARADENIZ": {
        "included": [
            "Авиабилеты Ташкент — Трабзон / Батуми",
            "Проживание 7 ночей на базе завтраков в отелях на первой "
            "береговой линии: Batumi View Luxury (Батуми) и "
            "Rhisos Gold Otel Rize (Ризе)",
            "Медицинская страховка на весь период поездки",
            "Все трансферы между локациями на микроавтобусах Sprinter",
            "Один гастрономический ужин в грузинской семье под Батуми "
            "(Махунцети) — халяльное меню",
            "Сопровождение русскоговорящего узбекского гида",
            "Более 15 экскурсий по программе",
            "Поддержка 24/7 на протяжении поездки",
        ],
        "excluded": [
            "Обеды и ужины вне программы (кроме одного гастрономического "
            "ужина в Батуми)",
            "Входные билеты в музеи и на платные объекты",
            "Дельфинарий в Батуми",
            "Зиплайн в Махунцети",
            "Дополнительные экскурсии в Ризе: Duatepe, Ceceve Bahcesi",
            "Личные расходы",
        ],
        "info": [
            ("Грузия безвизовая для граждан Узбекистана — до 1 года по "
             "загранпаспорту", None),
            ("На 5-й день — сухопутный переход границы Турция–Грузия, "
             "автобус около 3–4 часов", None),
            ("Видео о маршруте: Трабзон и Чёрное море (Traveling Faze)",
             "https://www.youtube.com/watch?v=hGk2LxB4d60&t=105s"),
        ],
        "day": {
            "A": [
                ("День 1 · Батуми",
                 "Ташкент → Батуми, прилёт 23:20. Встреча, трансфер, отель "
                 "Batumi View Luxury. Вечерняя прогулка и ужин грузинской "
                 "кухни — по желанию."),
                ("День 2 · Аджария",
                 "Мост царицы Тамары, водопад Махунцети, крепость "
                 "Гонио-Апсарос. Обед: грузинская кухня в центре Батуми или "
                 "узбекская в «Caravan». По желанию зиплайн. Вечером — ужин "
                 "в грузинской семье в Махунцети."),
                ("Дни 3–4 · Батуми",
                 "Свободные дни: набережная, дельфинарий (доплата), "
                 "ботанический сад, шопинг, старый город, Башня Алфавита."),
                ("День 5 · Батуми → Ризе",
                 "Переезд на автобусе около 3–4 часов с прохождением "
                 "границы. Отель, вечерняя прогулка, ужин турецкой кухни — "
                 "по желанию."),
                ("День 6 · Узунгёль и Трабзон",
                 "Озеро Узунгёль: чай и сувениры. Далее Трабзон с "
                 "остановками — пещера Карача, смотровая Torul Cam Teras. "
                 "Вечером шопинг Forum AVM или прогулка по городу."),
                ("День 7 · Айдер",
                 "Айдер Яйласы через чайные плантации: крепость Zilkale, "
                 "водопад Palovit, плато 1350 м. По желанию гора Хусер."),
                ("День 8 · Вылет",
                 "Свободное утро, трансфер в аэропорт. Трабзон → Ташкент, "
                 "вылет 18:45."),
            ],
            "B": [
                ("День 1 · Ризе",
                 "Ташкент → Трабзон, прилёт 17:45. Встреча, трансфер, отель "
                 "Rhisos Gold Hotel Rize. Вечерняя прогулка и ужин турецкой "
                 "кухни — по желанию."),
                ("День 2 · Узунгёль и Трабзон",
                 "Озеро Узунгёль, далее Трабзон: пещера Карача, смотровая "
                 "Torul Cam Teras. Вечером шопинг Forum AVM или прогулка "
                 "по городу."),
                ("День 3 · Айдер",
                 "Айдер Яйласы: крепость Zilkale, водопад Palovit, плато "
                 "1350 м. По желанию гора Хусер."),
                ("День 4 · Ризе",
                 "Свободный день: шопинг, набережная, кафе. Дополнительные "
                 "экскурсии Duatepe и Ceceve Bahcesi — за доплату."),
                ("День 5 · Ризе → Батуми",
                 "Переезд на автобусе около 3–4 часов с прохождением "
                 "границы. Отель Batumi View Luxury, вечерняя прогулка — "
                 "по желанию."),
                ("День 6 · Аджария",
                 "Обед в Батуми или в «Caravan». Мост царицы Тамары, "
                 "водопад Махунцети, крепость Гонио-Апсарос. По желанию "
                 "зиплайн. Вечером — ужин в грузинской семье в Махунцети."),
                ("Дни 7–8 · Батуми",
                 "Свободные дни: набережная, дельфинарий (доплата), "
                 "ботанический сад, шопинг, старый город, Башня Алфавита. "
                 "День 8 — вылет из Батуми."),
            ],
        },
    },
}

# ---------------------------------------------------------------------- Умра
# Умра = 9 программ, каждая становится ОТДЕЛЬНЫМ бронируемым туром под
# направлением «Умра». Данные реальные, из курируемого списка оператора (тот
# же, что рисует публичную страницу Умры в js/catalog.js, UMRAH_PROGRAMS).
#
# Отличия от Карадениза (заложены в модель специально):
#   * цена — за человека по типу НОМЕРА (QUAD/TRPL/DBL), а не по возрасту;
#     детских тарифов у Умры нет;
#   * агент выбирает тип номера явно (не выводится из числа человек), потому
#     что это разные бюджеты паломника, а не следствие размера группы;
#   * перелёт/отели/питание — свои у каждой программы, идут в контент карточки.
#
# Даты — ТОЛЬКО явно перечисленные оператором. «Еженедельно с … по …» без
# дня недели не разворачиваем (это было бы выдумывание дат): осенние заезды
# добавим точным списком, когда оператор пришлёт числа. Поэтому у части
# программ сейчас только летние даты, а у трёх 10-дневных — по одной (30.07),
# и на будущих датах они временно без заездов. Это честно: лучше пусто, чем
# выдуманная дата вылета паломника.
#
# Вместимость группы в источнике не указана — берём рабочие 45, как и 65 у
# Карадениза, и помечаем на уточнение. seats_taken = 0: продаж ещё нет.
UMRA_YEAR = 2026
UMRA_CAPACITY = 45

UMRA_PROGRAMS = [
    {
        "code": "UMRA_TAJ13", "prog": "TAJ-13", "nights": 12, "transport": "JED",
        "route": "Ташкент → Джидда → Мекка → Медина → Ташкент",
        "flight": "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        "hotels": ["Джидда · Hawada Hotel Jeddah · 1 ночь",
                   "Мекка · Taj Park · 990 м до Харама · 8 ночей",
                   "Медина · Grand Al Shahba · 250 м до мечети Пророка · 3 ночи"],
        "service": ["Автобус Мекка—Медина", "Трёхразовое питание в Мекке и Медине",
                    "1 питание в Джидде", "Руководители группы и врачи"],
        "dates": [(8, 1), (8, 8), (8, 15), (8, 22), (8, 29), (9, 5), (9, 12), (9, 19), (9, 26)],
        "prices": {"QUAD": 1200, "TRPL": 1250, "DBL": 1350},
        "dates_note": "Август—сентябрь еженедельно; осенние заезды (октябрь—декабрь) уточняются у оператора.",
    },
    {
        "code": "UMRA_TAJ13P", "prog": "TAJ-13+", "nights": 12, "transport": "JED",
        "route": "Ташкент → Джидда → Мекка → Медина → Ташкент",
        "flight": "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        "hotels": ["Джидда · Hawada Hotel Jeddah · 1 ночь",
                   "Мекка · Taj Park · 990 м до Харама · 8 ночей",
                   "Медина · Mukhtara Plaza · 250 м до мечети Пророка · 3 ночи"],
        "service": ["Скоростной поезд Мекка—Медина",
                    "Питание: Джидда 1 раз, Мекка 3 раза, Медина 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(7, 18), (7, 25), (8, 1), (8, 8), (8, 15), (8, 22)],
        "prices": {"QUAD": 1250, "TRPL": 1300, "DBL": 1400},
        "dates_note": "Июль—август по указанным датам.",
    },
    {
        "code": "UMRA_ANJUM13", "prog": "ANJUM-13", "nights": 12, "transport": "JED",
        "route": "Ташкент → Джидда → Мекка → Медина → Ташкент",
        "flight": "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        "hotels": ["Джидда · Hawada Hotel Jeddah · 1 ночь",
                   "Мекка · Anjum · 250 м до Харама · 8 ночей",
                   "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи"],
        "service": ["Скоростной поезд Мекка—Медина",
                    "Питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(8, 1), (8, 8), (8, 15), (8, 22)],
        "prices": {"QUAD": 1600, "TRPL": 1700, "DBL": 1800},
        "dates_note": "Август по указанным датам.",
    },
    {
        "code": "UMRA_SHOHADA13", "prog": "SHOHADA-13", "nights": 12, "transport": "JED",
        "route": "Ташкент → Джидда → Мекка → Медина → Ташкент",
        "flight": "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        "hotels": ["Джидда · Hawada Hotel Jeddah · 1 ночь",
                   "Мекка · Al Shohada · 250 м до Харама · 8 ночей",
                   "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи"],
        "service": ["Скоростной поезд Мекка—Медина",
                    "Питание: Джидда 1 раз, Мекка и Медина 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(8, 1), (8, 8), (8, 15), (8, 22)],
        "prices": {"QUAD": 1650, "TRPL": 1750, "DBL": 1850},
        "dates_note": "Август по указанным датам.",
    },
    {
        "code": "UMRA_JUMEIRAH13", "prog": "JUMEIRAH-13", "nights": 12, "transport": "JED",
        "route": "Ташкент → Джидда → Мекка → Медина → Ташкент",
        "flight": "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        "hotels": ["Джидда · Hawada Hotel Jeddah · 1 ночь",
                   "Мекка · Jumeirah Hotel · 100 м до Харама · 8 ночей",
                   "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи"],
        "service": ["Скоростной поезд Мекка—Медина",
                    "Питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(8, 1), (8, 8), (8, 15), (8, 22)],
        "prices": {"QUAD": 1900, "TRPL": 2000, "DBL": 2200},
        "dates_note": "Август по указанным датам.",
    },
    {
        "code": "UMRA_SAJA10", "prog": "SAJA-10", "nights": 9, "transport": "MED",
        "route": "Ташкент → Медина → Мекка → Джидда → Ташкент",
        "flight": "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        "hotels": ["Медина · Saja Al-Madinah · 250 м до мечети Пророка · 4 ночи",
                   "Мекка · Taj Park · 990 м до Харама · 5 ночей"],
        "service": ["Скоростной поезд Медина—Мекка", "Трёхразовое питание",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(7, 30), (8, 6), (8, 13), (8, 20), (8, 27), (9, 3), (9, 10), (9, 17), (9, 24)],
        "prices": {"QUAD": 1250, "TRPL": 1350, "DBL": 1450},
        "dates_note": "Июль—сентябрь еженедельно; осенние заезды (октябрь—декабрь) уточняются у оператора.",
    },
    {
        "code": "UMRA_SWISS10", "prog": "SWISSOTEL-10", "nights": 9, "transport": "MED",
        "route": "Ташкент → Медина → Мекка → Джидда → Ташкент",
        "flight": "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        "hotels": ["Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи",
                   "Мекка · Swissotel Makkah · 50 м до Харама · 5 ночей"],
        "service": ["Скоростной поезд Медина—Мекка",
                    "Питание: Мекка 1 раз, Медина 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(7, 30)],
        "prices": {"QUAD": 1650, "TRPL": 1750, "DBL": 1900},
        "dates_note": "Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.",
    },
    {
        "code": "UMRA_ANJUM10", "prog": "ANJUM-10", "nights": 9, "transport": "MED",
        "route": "Ташкент → Медина → Мекка → Джидда → Ташкент",
        "flight": "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        "hotels": ["Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи",
                   "Мекка · Anjum Makkah · 250 м до Харама · 5 ночей"],
        "service": ["Скоростной поезд Медина—Мекка",
                    "Питание: Мекка 1 раз, Медина 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(7, 30)],
        "prices": {"TRPL": 1600, "DBL": 1700},   # у этой программы QUAD нет
        "dates_note": "Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.",
    },
    {
        "code": "UMRA_JUMEIRAH10", "prog": "JUMEIRAH-10", "nights": 9, "transport": "MED",
        "route": "Ташкент → Медина → Мекка → Джидда → Ташкент",
        "flight": "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        "hotels": ["Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи",
                   "Мекка · Jumeirah Jabal Omar · 100 м до Харама · 5 ночей"],
        "service": ["Скоростной поезд Медина—Мекка",
                    "Питание в Мекке и Медине 2 раза (шведский стол)",
                    "Виза", "Руководители группы и врачи"],
        "dates": [(7, 30)],
        "prices": {"QUAD": 1750, "TRPL": 1890, "DBL": 1990},
        "dates_note": "Еженедельно с 6 августа по 3 декабря — точные даты уточняются у оператора.",
    },
]

# Разворачиваем программы Умры в те же структуры, что и Карадениз: туры,
# детали, контент карточки и направление. Заезды генерирует main() отдельно
# (у них своя ценовая модель по типу номера).
DESTINATIONS.append(("Умра", "Умра · Мекка и Медина",
                     "Паломничество: Мекка, Медина, Джидда", "", 2))

for _u in UMRA_PROGRAMS:
    TOURS.append((_u["code"], "Умра · " + _u["prog"], "Умра", 0, 0, 1, _u["dates_note"]))
    TOUR_DETAILS[_u["code"]] = {
        "nights": _u["nights"],
        "description": (
            "Умра по программе " + _u["prog"] + " ("
            + str(_u["nights"] + 1) + " дней / " + str(_u["nights"]) + " ночей). "
            + _u["route"] + ". " + "; ".join(_u["hotels"]) + "."
        ),
    }
    TOUR_CONTENT[_u["code"]] = {
        "included": [_u["flight"]] + _u["hotels"] + _u["service"],
        "excluded": [],
        "info": [(_u["dates_note"], None)],
        "day": {},
    }


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def hash_password(password):
    """PBKDF2-SHA256, те же параметры, что проверяет воркер."""
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000, dklen=32)
    return dk.hex(), salt.hex()


def tour_field(code, index):
    """Поле тура из TOURS по индексу: 1 — название, 3 — агентская комиссия."""
    for row in TOURS:
        if row[0] == code:
            return row[index]
    raise KeyError(code)


def write_demo_seed(demo_departures):
    """
    Пишет js/seed-data.js — данные для демо-режима (когда бэкенд не
    подключён). Тот же набор, что уходит в SQL: заезды с ценами, туры с
    контентом карточки и направления каталога. Персональных данных нет.
    """
    tours = []
    for code, name, dest, agc, opc, bookable, note in TOURS:
        det = TOUR_DETAILS.get(code, {})
        blocks = TOUR_CONTENT.get(code, {})
        tours.append({
            "code": code,
            "name": name,
            "destination": dest,
            # operator_commission в демо не отдаём — его не видит и агентство
            "agency_commission": agc,
            "is_bookable": bookable,
            "note": note,
            "description": det.get("description"),
            "nights": det.get("nights"),
            "included": list(blocks.get("included", [])),
            "excluded": list(blocks.get("excluded", [])),
            "info": [{"text": t, "url": u} for t, u in blocks.get("info", [])],
            "gallery": [],
            "variants": [
                {
                    "code": vcode,
                    "title": vtitle,
                    "days": [
                        {"title": dt, "text": dx}
                        for dt, dx in blocks.get("day", {}).get(vcode, [])
                    ],
                }
                for vcode, vtitle, _ in TOUR_VARIANTS.get(code, [])
            ],
        })

    destinations = [
        {"name": n, "title": t, "blurb": b, "image": img, "sort": s}
        for n, t, b, img, s in DESTINATIONS
    ]

    def dump(value):
        return json.dumps(value, ensure_ascii=False, indent=1)

    path = ROOT / "js" / "seed-data.js"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(
            "// Сгенерировано tools/build-seed.py из реальной ведомости заездов.\n"
            "// Персональных данных нет: от прошлых продаж взято только число "
            "занятых мест.\n"
            "// Используется демо-режимом (js/api.js), когда бэкенд не подключён.\n"
        )
        f.write(f"window.TURON_SEED = {dump(demo_departures)};\n")
        f.write(f"window.TURON_TOURS = {dump(tours)};\n")
        f.write(f"window.TURON_DESTINATIONS = {dump(destinations)};\n")
    print(f"-- записан {path.relative_to(ROOT)}", file=sys.stderr)


def parse_child_label(label):
    """'Chd 5-11' -> ('CHD_5_11', 5, 11, 1);  'inf 0-2' -> ('INF', 0, 2, 0)."""
    m = re.search(r"(\d+)\s*-\s*(\d+)", label)
    if not m:
        return None
    lo, hi = int(m.group(1)), int(m.group(2))
    is_infant = label.strip().lower().startswith("inf")
    code = "INF" if is_infant else f"CHD_{lo}_{hi}"
    return code, lo, hi, 0 if is_infant else 1


def main():
    departures = json.load(open(ROOT / "seed" / "departures.json", encoding="utf-8"))
    out = []
    out.append("-- Сгенерировано tools/build-seed.py. Не редактировать вручную.")
    out.append("--")
    out.append("-- ВНИМАНИЕ: это файл ПЕРВОГО наполнения ПУСТОЙ базы.")
    out.append("-- Он удаляет агентства, туры и заезды целиком, поэтому на")
    out.append("-- работающей базе его запускать НЕЛЬЗЯ — слетят пароли")
    out.append("-- агентств, а брони останутся без своих заездов.")
    out.append("-- Для правок работающей базы используйте db/migrations/.")
    # Порядок важен: сначала то, что ссылается на tours. На ON DELETE CASCADE
    # не полагаемся — в D1 внешние ключи включены не всегда.
    out.append("DELETE FROM departure_prices;")
    out.append("DELETE FROM departures;")
    out.append("DELETE FROM tour_content;")
    out.append("DELETE FROM tour_variants;")
    out.append("DELETE FROM destinations;")
    out.append("DELETE FROM tours;")
    out.append("DELETE FROM agencies;")
    out.append("")

    issued = []
    for login, name, role in DEMO_AGENCIES:
        password = make_password()
        h, s = hash_password(password)
        issued.append((login, name, password))
        out.append(
            f"INSERT INTO agencies (login, password_hash, password_salt, name, role) "
            f"VALUES ({q(login)}, {q(h)}, {q(s)}, {q(name)}, {q(role)});"
        )
    out.append("")

    for name, title, blurb, image, sort in DESTINATIONS:
        out.append(
            "INSERT INTO destinations (name, title, blurb, image, sort) VALUES ("
            f"{q(name)}, {q(title)}, {q(blurb)}, {q(image)}, {sort});"
        )
    out.append("")

    for code, name, dest, agc, opc, bookable, note in TOURS:
        det = TOUR_DETAILS.get(code, {})
        out.append(
            "INSERT INTO tours (code, name, destination, agency_commission, "
            "operator_commission, is_bookable, note, description, nights) VALUES ("
            f"{q(code)}, {q(name)}, {q(dest)}, {agc}, {opc}, {bookable}, {q(note)}, "
            f"{q(det.get('description'))}, {q(det.get('nights'))});"
        )
    out.append("")

    for code, variants in TOUR_VARIANTS.items():
        for vcode, vtitle, vsort in variants:
            out.append(
                "INSERT INTO tour_variants (tour_id, code, title, sort) SELECT id, "
                f"{q(vcode)}, {q(vtitle)}, {vsort} FROM tours WHERE code = {q(code)};"
            )
    out.append("")

    for code, blocks in TOUR_CONTENT.items():
        for kind in ("included", "excluded"):
            for i, text in enumerate(blocks.get(kind, []), start=1):
                out.append(
                    "INSERT INTO tour_content (tour_id, kind, sort, text) SELECT id, "
                    f"{q(kind)}, {i}, {q(text)} FROM tours WHERE code = {q(code)};"
                )
        for i, (text, url) in enumerate(blocks.get("info", []), start=1):
            out.append(
                "INSERT INTO tour_content (tour_id, kind, sort, text, url) SELECT id, "
                f"'info', {i}, {q(text)}, {q(url)} FROM tours WHERE code = {q(code)};"
            )
        for vcode, days in blocks.get("day", {}).items():
            for i, (title, text) in enumerate(days, start=1):
                out.append(
                    "INSERT INTO tour_content (tour_id, kind, variant, sort, title, text) "
                    f"SELECT id, 'day', {q(vcode)}, {i}, {q(title)}, {q(text)} "
                    f"FROM tours WHERE code = {q(code)};"
                )
    out.append("")

    demo_departures = []
    for d in departures:
        cap = max(d["booked_seats"], DEFAULT_CAPACITY.get(d["transport"], 65))
        out.append(
            "INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, "
            "capacity, seats_taken) SELECT id, "
            f"{q(d['code'])}, {q(d['date_start'])}, {q(d['transport'])}, "
            f"{1 if d['is_info_tour'] else 0}, {cap}, {d['booked_seats']} "
            f"FROM tours WHERE code = {q(KARADENIZ)};"
        )
        rows = []
        for code, price in sorted(d["prices"].items()):
            rows.append((code, PLACEMENT_LABELS.get(code, code), "placement", price, None, None, 1))
        # Доп. кровать идёт следом за тарифами из ведомости: в самой
        # ведомости её нет, цена считается по правилу выше.
        extra = extra_bed_price(d)
        if extra is not None and EXTRA_BED_CODE not in d["prices"]:
            rows.append((EXTRA_BED_CODE, PLACEMENT_LABELS[EXTRA_BED_CODE],
                         "placement", extra, None, None, 1))
        for label, price in d["child_prices"].items():
            parsed = parse_child_label(label)
            if not parsed:
                print(f"-- не разобран детский тариф: {label}", file=sys.stderr)
                continue
            code, lo, hi, seat = parsed
            rows.append((code, label.strip(), "child", price, lo, hi, seat))
        for code, label, kind, price, lo, hi, seat in rows:
            out.append(
                "INSERT INTO departure_prices "
                "(departure_id, code, label, kind, price, age_from, age_to, occupies_seat) "
                f"SELECT id, {q(code)}, {q(label)}, {q(kind)}, {price}, {q(lo)}, {q(hi)}, {seat} "
                f"FROM departures WHERE code = {q(d['code'])};"
            )
        out.append("")

        demo_departures.append({
            "code": d["code"],
            "date_start": d["date_start"],
            "transport": d["transport"],
            "is_info_tour": 1 if d["is_info_tour"] else 0,
            "capacity": cap,
            "seats_taken": d["booked_seats"],
            "tour_code": KARADENIZ,
            "tour_name": tour_field(KARADENIZ, 1),
            # длительность живёт на туре, но экраны читают её у заезда —
            # так же, как отдаёт боевой /api/departures. Без этого в
            # демо-режиме пропадала дата возврата.
            "nights": TOUR_DETAILS.get(KARADENIZ, {}).get("nights"),
            "agency_commission": tour_field(KARADENIZ, 3),
            "prices": [
                {"code": c, "label": lb, "kind": k, "price": pr,
                 "age_from": lo, "age_to": hi, "occupies_seat": seat}
                for c, lb, k, pr, lo, hi, seat in rows
            ],
        })

    # --------------------------------------------------------------- Умра
    # Заезды программ Умры: по одному на каждую явную дату. Цена — за человека
    # по типу номера (QUAD/TRPL/DBL), детских тарифов нет. Модель размещения
    # отличается от Карадениза (там по возрасту/одноместному), поэтому интерфейс
    # выбирает тип номера явно — см. hasSingle-ветку в js/catalog.js.
    umra_count = 0
    for u in UMRA_PROGRAMS:
        for mo, day in u["dates"]:
            date = f"{UMRA_YEAR}-{mo:02d}-{day:02d}"
            dep_code = f"{u['code']}-{mo:02d}{day:02d}"
            out.append(
                "INSERT INTO departures (tour_id, code, date_start, transport, is_info_tour, "
                "capacity, seats_taken) SELECT id, "
                f"{q(dep_code)}, {q(date)}, {q(u['transport'])}, 0, {UMRA_CAPACITY}, 0 "
                f"FROM tours WHERE code = {q(u['code'])};"
            )
            rows = []
            for pc in ("QUAD", "TRPL", "DBL"):
                if pc in u["prices"]:
                    rows.append((pc, PLACEMENT_LABELS[pc], "placement", u["prices"][pc], None, None, 1))
            for c, lb, k, pr, lo, hi, seat in rows:
                out.append(
                    "INSERT INTO departure_prices "
                    "(departure_id, code, label, kind, price, age_from, age_to, occupies_seat) "
                    f"SELECT id, {q(c)}, {q(lb)}, {q(k)}, {pr}, {q(lo)}, {q(hi)}, {seat} "
                    f"FROM departures WHERE code = {q(dep_code)};"
                )
            out.append("")
            demo_departures.append({
                "code": dep_code, "date_start": date, "transport": u["transport"],
                "is_info_tour": 0, "capacity": UMRA_CAPACITY, "seats_taken": 0,
                "tour_code": u["code"], "tour_name": "Умра · " + u["prog"],
                "nights": u["nights"], "agency_commission": 0,
                "prices": [
                    {"code": c, "label": lb, "kind": k, "price": pr,
                     "age_from": lo, "age_to": hi, "occupies_seat": seat}
                    for c, lb, k, pr, lo, hi, seat in rows
                ],
            })
            umra_count += 1

    write_demo_seed(demo_departures)
    print("\n".join(out))
    print(f"-- заездов: {len(departures)} Карадениз + {umra_count} Умра", file=sys.stderr)
    print("\nВЫДАННЫЕ ПАРОЛИ (сохраните, второй раз показаны не будут):",
          file=sys.stderr)
    for login, name, password in issued:
        print(f"  {login:<14} {name:<26} {password}", file=sys.stderr)
    print("\nПароли есть только здесь — в db/seed.sql лежат лишь хеши.",
          file=sys.stderr)


if __name__ == "__main__":
    main()
