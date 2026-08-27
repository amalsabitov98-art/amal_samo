#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Собирает миграцию, проставляющую переводы наполнения в УЖЕ РАБОТАЮЩУЮ базу.

Зачем отдельно от build-seed.py: `db/seed.sql` — файл первого наполнения
пустой базы, он делает DELETE FROM agencies/departures/tours. На боевой его
запускать нельзя, там слетели бы пароли агентств, а брони остались бы без
заездов. Поэтому переводы для живой базы приезжают только UPDATE-ами.

Строки ищутся ПО РУССКОМУ ТЕКСТУ, а не по id: id в боевой базе свои,
сгенерированные AUTOINCREMENT при её наполнении, и совпасть с локальными им
неоткуда. Текст — то единственное, что в обеих базах одинаково.

Отсюда же следует ограничение: если оператор УЖЕ переписал русский текст
строки через редактор карточки, перевод по ней не найдётся и UPDATE её
не тронет. Это правильное поведение — подставить перевод к другому тексту
хуже, чем оставить русский.

Идемпотентна: перезаписывает i18n тем же значением, ничего не удаляет и не
создаёт. Прогонять можно повторно.

Использование:
    python3 tools/build-i18n-migration.py > db/migrations/017-i18n-content.sql
"""
import importlib.util as ilu
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load(name, path):
    spec = ilu.spec_from_file_location(name, str(path))
    mod = ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


I18N = load("seed_i18n", ROOT / "seed-i18n.py")
BS = load("build_seed", ROOT / "build-seed.py")


def q(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def box_of(**by_field):
    """{'uz': {...}} из поле → русская строка; пусто → None."""
    box = {}
    for field, text in by_field.items():
        tr = I18N.ALL.get(text) if text else None
        if not tr:
            continue
        for lang in I18N.LANGS:
            if tr.get(lang):
                box.setdefault(lang, {})[field] = tr[lang]
    return box or None


def dump(box):
    return q(json.dumps(box, ensure_ascii=False))


HEADER = [
    "-- 017 — переводы наполнения (uz/en/tr) для УЖЕ РАБОТАЮЩЕЙ базы.",
    "--",
    "-- Сгенерировано tools/build-i18n-migration.py. Руками не править:",
    "-- правьте tools/seed-i18n.py и пересоберите.",
    "--",
    "-- Требует миграции 016 (колонки i18n). Идемпотентна: только UPDATE,",
    "-- ничего не удаляет и не создаёт. Заезды, цены, брони и агентства",
    "-- не затрагивает вообще.",
    "--",
    "-- Строки ищутся ПО РУССКОМУ ТЕКСТУ: id в боевой базе свои. Если",
    "-- оператор уже переписал текст строки через редактор, перевод по ней",
    "-- не найдётся и строка останется русской — это лучше, чем подставить",
    "-- перевод к другому тексту.",
    "",
]


def main():
    out = list(HEADER)
    stats = {"tours": 0, "destinations": 0, "tour_variants": 0, "tour_content": 0}

    # ------------------------------------------------------------- туры
    for code, name, dest, agc, opc, bookable, note in BS.TOURS:
        det = BS.TOUR_DETAILS.get(code, {})
        prog = BS.UMRA_BY_CODE.get(code)
        if prog:
            box = {}
            for lang in I18N.LANGS:
                hotels = [I18N.ALL.get(h, {}).get(lang) for h in prog["hotels"]]
                route = I18N.ALL.get(prog["route"], {}).get(lang)
                if not route or not all(hotels):
                    continue
                box[lang] = {
                    "name": I18N.UMRA_NAME[lang].format(prog=prog["prog"]),
                    "description": I18N.UMRA_DESCRIPTION[lang].format(
                        prog=prog["prog"], days=prog["nights"] + 1,
                        nights=prog["nights"], route=route,
                        hotels="; ".join(hotels)),
                }
            note_box = box_of(note=note)
            for lang, fields in (note_box or {}).items():
                box.setdefault(lang, {}).update(fields)
            box = box or None
        else:
            box = box_of(name=name, note=note,
                         description=det.get("description"))
        if not box:
            continue
        out.append(f"UPDATE tours SET i18n = {dump(box)} WHERE code = {q(code)};")
        stats["tours"] += 1

    # ------------------------------------------------------- направления
    out.append("")
    for name, title, blurb, image, sort in BS.DESTINATIONS:
        box = box_of(title=title, blurb=blurb)
        if not box:
            continue
        out.append(
            f"UPDATE destinations SET i18n = {dump(box)} WHERE name = {q(name)};")
        stats["destinations"] += 1

    # --------------------------------------------------------- варианты
    out.append("")
    for code, variants in BS.TOUR_VARIANTS.items():
        for vcode, vtitle, vsort in variants:
            box = box_of(title=vtitle)
            if not box:
                continue
            out.append(
                f"UPDATE tour_variants SET i18n = {dump(box)} "
                f"WHERE code = {q(vcode)} AND tour_id = "
                f"(SELECT id FROM tours WHERE code = {q(code)});")
            stats["tour_variants"] += 1

    # ---------------------------------------------------------- контент
    out.append("")
    for code, blocks in BS.TOUR_CONTENT.items():
        tour_ref = f"(SELECT id FROM tours WHERE code = {q(code)})"
        for kind in ("included", "excluded"):
            for text in blocks.get(kind, []):
                box = box_of(text=text)
                if not box:
                    continue
                out.append(
                    f"UPDATE tour_content SET i18n = {dump(box)} "
                    f"WHERE tour_id = {tour_ref} AND kind = {q(kind)} "
                    f"AND text = {q(text)};")
                stats["tour_content"] += 1
        for text, url in blocks.get("info", []):
            box = box_of(text=text)
            if not box:
                continue
            out.append(
                f"UPDATE tour_content SET i18n = {dump(box)} "
                f"WHERE tour_id = {tour_ref} AND kind = 'info' "
                f"AND text = {q(text)};")
            stats["tour_content"] += 1
        for vcode, days in blocks.get("day", {}).items():
            for title, text in days:
                box = box_of(title=title, text=text)
                if not box:
                    continue
                out.append(
                    f"UPDATE tour_content SET i18n = {dump(box)} "
                    f"WHERE tour_id = {tour_ref} AND kind = 'day' "
                    f"AND variant = {q(vcode)} AND text = {q(text)};")
                stats["tour_content"] += 1

    # Сводка идёт В ШАПКУ, а не в конец файла: комментарий после последнего
    # `;` wrangler считает недоразобранным хвостом и печатает «leftover
    # buffer from sql.ingest». Ничего не ломает, но выглядит как ошибка
    # импорта, и в следующий раз на это потратят время.
    parts = ", ".join(f"{k}: {v}" for k, v in stats.items())
    out.insert(len(HEADER) - 1, f"-- Обновляется строк — {parts}.")
    out.append("")
    print("\n".join(out))
    print(f"-- всего UPDATE: {sum(stats.values())}", file=sys.stderr)


if __name__ == "__main__":
    main()
