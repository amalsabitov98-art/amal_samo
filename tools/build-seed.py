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
}

DEMO_AGENCIES = [
    ("umida", "UMIDA", "agency"),
    ("easytourism", "EASY TOURISM", "agency"),
    ("ofotour", "OFO TOUR", "agency"),
    ("operator", "Turon Tour (оператор)", "operator"),
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
    ("KARADENIZ", "Карадениз — Трабзон и Ризе", "Турция", 0, 0, 1,
     "Еженедельные заезды, цены по типу размещения"),
    ("JP_CONSTRUCTOR", "Тур-конструктор «Легенды и огни Токио»", "Япония", 100, 30, 0,
     "Ожидаются даты заездов и цены"),
    ("JP_TOKYO", "Легенды и огни Токио", "Япония", 150, 40, 0,
     "Ожидаются даты заездов и цены"),
    ("JP_GOLDEN_RING", "Золотое кольцо Японии", "Япония", 250, 50, 0,
     "Ожидаются даты заездов и цены"),
    ("JP_CAMP", "Учебный лагерь Japan Camp", "Япония", 250, 50, 0,
     "Ожидаются даты заездов и цены"),
]
KARADENIZ = "KARADENIZ"

# Плитки направлений в публичном каталоге. name должен совпадать с
# tours.destination. image пока пустой: фотографий в репозитории нет,
# плитка рисуется без картинки — подставить, когда оператор их даст.
# (name, title, blurb, image, sort)
DESTINATIONS = [
    ("Турция", "Турция и Грузия",
     "Черноморское побережье: Трабзон, Ризе, Батуми", None, 1),
    ("Япония", "Япония",
     "Готовятся к запуску — ждём даты заездов и цены", None, 2),
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
            "Проживание 7 ночей: Batumi View Luxury (Батуми) и "
            "Rhisos Gold Otel Rize (Ризе), первая береговая линия",
            "Все трансферы на микроавтобусах Sprinter",
            "Сопровождение русскоговорящего узбекского гида",
            "Завтраки и часть ужинов по программе",
            "Более 15 экскурсий по программе",
            "Ужин в грузинской семье в Махунцети — халяльное меню, музыка, танцы",
            "Поддержка 24/7 на протяжении поездки",
        ],
        "excluded": [
            "Медицинская страховка",
            "Обеды и ужины вне программы",
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
            ("Ориентир из чернового прайса — «от $690» за человека. "
             "Точная цена берётся из выбранного заезда", None),
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
            "agency_commission": tour_field(KARADENIZ, 3),
            "prices": [
                {"code": c, "label": lb, "kind": k, "price": pr,
                 "age_from": lo, "age_to": hi, "occupies_seat": seat}
                for c, lb, k, pr, lo, hi, seat in rows
            ],
        })

    write_demo_seed(demo_departures)
    print("\n".join(out))
    print(f"-- заездов: {len(departures)}", file=sys.stderr)
    print("\nВЫДАННЫЕ ПАРОЛИ (сохраните, второй раз показаны не будут):",
          file=sys.stderr)
    for login, name, password in issued:
        print(f"  {login:<14} {name:<26} {password}", file=sys.stderr)
    print("\nПароли есть только здесь — в db/seed.sql лежат лишь хеши.",
          file=sys.stderr)


if __name__ == "__main__":
    main()
