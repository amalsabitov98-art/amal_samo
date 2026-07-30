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
    departures = json.load(open(ROOT / "seed" / "departures.json", encoding="utf-8"))
    out = []
    out.append("-- Сгенерировано tools/build-seed.py. Не редактировать вручную.")
    out.append("DELETE FROM departure_prices;")
    out.append("DELETE FROM departures;")
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
    print(f"-- заездов: {len(departures)}", file=sys.stderr)
    print("\nВЫДАННЫЕ ПАРОЛИ (сохраните, второй раз показаны не будут):",
          file=sys.stderr)
    for login, name, password in issued:
        print(f"  {login:<14} {name:<26} {password}", file=sys.stderr)
    print("\nПароли есть только здесь — в db/seed.sql лежат лишь хеши.",
          file=sys.stderr)


if __name__ == "__main__":
    main()
