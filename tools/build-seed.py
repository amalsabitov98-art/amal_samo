"""
Превращает seed/departures.json в SQL для наполнения базы.

Запуск:  python3 tools/build-seed.py > db/seed.sql

Пассажиры из исходной ведомости НЕ переносятся — это персональные данные.
Уже проданные места учитываются обезличенно, через seats_taken заезда:
свободных мест остаётся ровно столько, сколько на самом деле.
"""
import json, re, sys, hashlib, secrets

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
    ("umida", "UMIDA"),
    ("easytourism", "EASY TOURISM"),
    ("ofotour", "OFO TOUR"),
]
DEMO_PASSWORD = "turon2026"

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
    departures = json.load(open("seed/departures.json", encoding="utf-8"))
    out = []
    out.append("-- Сгенерировано tools/build-seed.py. Не редактировать вручную.")
    out.append("DELETE FROM departure_prices;")
    out.append("DELETE FROM departures;")
    out.append("DELETE FROM tours;")
    out.append("DELETE FROM agencies;")
    out.append("")

    for login, name in DEMO_AGENCIES:
        h, s = hash_password(DEMO_PASSWORD)
        out.append(
            f"INSERT INTO agencies (login, password_hash, password_salt, name) "
            f"VALUES ({q(login)}, {q(h)}, {q(s)}, {q(name)});"
        )
    out.append("")

    for code, name, dest, agc, opc, bookable, note in TOURS:
        out.append(
            "INSERT INTO tours (code, name, destination, agency_commission, "
            "operator_commission, is_bookable, note) VALUES ("
            f"{q(code)}, {q(name)}, {q(dest)}, {agc}, {opc}, {bookable}, {q(note)});"
        )
    out.append("")

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

    print("\n".join(out))
    print(f"-- заездов: {len(departures)}; демо-агентств: {len(DEMO_AGENCIES)} "
          f"(пароль у всех: {DEMO_PASSWORD})", file=sys.stderr)


if __name__ == "__main__":
    main()
