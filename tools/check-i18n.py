#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сверяет переводы наполнения (tools/seed-i18n.py) с самими данными
(tools/build-seed.py).

Ловит две вещи, каждая из которых иначе прошла бы молча:

  1. НЕПЕРЕВЕДЁННУЮ строку — она уйдёт в базу с i18n = NULL, и карточка на
     любом языке покажет её по-русски. Само по себе это рабочее состояние
     (у нового тура переводов нет вовсе), поэтому здесь это ПРЕДУПРЕЖДЕНИЕ,
     а не ошибка: иначе оператор не смог бы завести тур, не позвав нас.

  2. ОСИРОТЕВШИЙ перевод — ключ, которому в данных больше ничего не
     соответствует. Это уже ошибка: русский текст переписали, перевод по
     нему не находится, и строка молча перестала переводиться, хотя перевод
     вроде бы есть. Симптом «я же переводил, а на сайте русский» — почти
     всегда это.

Запускается из test/run.sh рядом с check-seed.py.
"""
import importlib.util as ilu
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load(name, path):
    spec = ilu.spec_from_file_location(name, str(path))
    mod = ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


I18N = load("seed_i18n", ROOT / "seed-i18n.py")
try:
    BS = load("build_seed", ROOT / "build-seed.py")
except SystemExit:
    print("check-i18n: build-seed.py не загрузился", file=sys.stderr)
    raise


def collect_source_strings():
    """Все строки наполнения, которые видит посетитель."""
    seen = set()

    for code, name, dest, agc, opc, bookable, note in BS.TOURS:
        # Название тура Умры («Умра · TAJ-13») собирается из шаблона
        # UMRA_NAME, а не лежит в словаре строкой: девять названий отличаются
        # только кодом программы, и девять почти одинаковых ключей разошлись
        # бы при первой же правке.
        if code not in BS.UMRA_BY_CODE:
            seen.add(name)
        if note:
            seen.add(note)
    for name, title, blurb, image, sort in BS.DESTINATIONS:
        # name показывается как заголовок страницы направления и в крошках,
        # поэтому переводится тоже — хотя в базе он остаётся КЛЮЧОМ и
        # переводу в самой колонке не подлежит (по нему идёт группировка).
        seen.update(x for x in (name, title, blurb) if x)

    for code, variants in BS.TOUR_VARIANTS.items():
        for vcode, vtitle, vsort in variants:
            seen.add(vtitle)

    for code, blocks in BS.TOUR_CONTENT.items():
        for kind in ("included", "excluded"):
            seen.update(blocks.get(kind, []))
        for text, url in blocks.get("info", []):
            seen.add(text)
        for vcode, days in blocks.get("day", {}).items():
            for title, text in days:
                seen.update((title, text))

    # Описание Карадениза переводится строкой; описания Умры собираются из
    # маршрута и отелей — они уже попали выше через TOUR_CONTENT.
    for code, det in BS.TOUR_DETAILS.items():
        if code in BS.UMRA_BY_CODE:
            continue
        if det.get("description"):
            seen.add(det["description"])

    for prog in BS.UMRA_PROGRAMS:
        seen.add(prog["route"])
    return seen


def main():
    source = collect_source_strings()
    known = set(I18N.ALL)

    missing = sorted(s for s in source
                     if s not in known and s not in I18N.NO_TRANSLATION)
    orphans = sorted(k for k in known if k not in source)

    # Неполный перевод — заполнены не все три языка. Тоже предупреждение:
    # localize откатит недостающий язык на русский, страница не сломается.
    partial = sorted(
        k for k, v in I18N.ALL.items()
        if k in source and not all(v.get(lang) for lang in I18N.LANGS)
    )

    for s in missing:
        print(f"  без перевода: {s[:90]}")
    for s in partial:
        langs = [l for l in I18N.LANGS if not I18N.ALL[s].get(l)]
        print(f"  переведено не полностью ({', '.join(langs)}): {s[:70]}")
    for s in orphans:
        print(f"  ОСИРОТЕЛ (в данных такой строки нет): {s[:90]}", file=sys.stderr)

    total = len(source) - len(source & I18N.NO_TRANSLATION)
    done = total - len(missing)
    print(f"check-i18n: переведено {done} из {total} строк наполнения; "
          f"осиротевших ключей: {len(orphans)}")

    if orphans:
        print("check-i18n: осиротевший перевод — русскую строку правили, а "
              "ключ нет. Строка молча перестала переводиться.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
