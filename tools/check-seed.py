#!/usr/bin/env python3
"""
Сверяет db/seed.sql с тем, что сейчас выдаёт build-seed.py.

Зачем: тесты пересобирают наполнение генератором и НЕ читают db/seed.sql,
а в боевую базу заливается именно db/seed.sql. Из-за этого файлы разошлись
и в проде не оказалось ни направлений, ни вариантов маршрута, ни программы
по дням — тесты при этом были зелёные.

Строки с агентствами пропускаем: пароли генерируются случайно на каждом
запуске, сравнивать их бессмысленно.

Запуск:  python3 tools/check-seed.py
Выход:   0 — совпадает, 1 — разошлось (что именно, печатает).
"""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def significant(text):
    """Строки SQL без агентств, комментариев и пустот."""
    out = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("--"):
            continue
        if s.startswith("INSERT INTO agencies"):
            continue
        out.append(s)
    return out


def table_of(line):
    m = re.match(r"(?:INSERT INTO|UPDATE|DELETE FROM)\s+([a-z_]+)", line)
    return m.group(1) if m else "прочее"


def main():
    committed = ROOT / "db" / "seed.sql"
    if not committed.exists():
        print("db/seed.sql не найден")
        return 1

    env = dict(os.environ, TURON_SEED_PASSWORD="check-only")
    generated = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build-seed.py")],
        capture_output=True, text=True, env=env, cwd=str(ROOT),
    ).stdout

    want = significant(generated)
    have = significant(committed.read_text(encoding="utf-8"))
    if want == have:
        print("db/seed.sql совпадает с генератором — ок")
        return 0

    missing = [l for l in want if l not in have]
    extra = [l for l in have if l not in want]

    print("db/seed.sql РАЗОШЁЛСЯ с tools/build-seed.py.")
    print("Это тот самый случай, из-за которого в боевой базе не оказалось")
    print("контента каталога. Пересоберите файл:")
    print("    python3 tools/build-seed.py > db/seed.sql")
    print("(пароли агентств при этом печатаются один раз — сохраните их)\n")

    def summarize(title, rows):
        if not rows:
            return
        by = {}
        for r in rows:
            by[table_of(r)] = by.get(table_of(r), 0) + 1
        print(title)
        for t, n in sorted(by.items(), key=lambda kv: -kv[1]):
            print(f"    {t}: {n} строк")

    summarize("  Есть у генератора, но НЕТ в db/seed.sql:", missing)
    summarize("  Есть в db/seed.sql, но НЕТ у генератора:", extra)
    return 1


if __name__ == "__main__":
    sys.exit(main())
