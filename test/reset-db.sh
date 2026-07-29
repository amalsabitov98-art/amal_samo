#!/usr/bin/env bash
# Приводит локальную базу в исходное состояние перед прогоном тестов:
# чистит данные и заново заливает наполнение с предсказуемым паролем.
#
# Каталог .wrangler намеренно НЕ удаляем — его держит открытым запущенный
# `wrangler dev`, и удаление подвешивает и сброс, и сам воркер.
set -euo pipefail
cd "$(dirname "$0")/../worker"

WRANGLER="${WRANGLER:-wrangler}"
CFG=wrangler.local.toml
DB=turon-tour-local

run() { CI=1 "$WRANGLER" d1 execute "$DB" --local --config "$CFG" "$@" >/dev/null 2>&1; }

run --file=../db/schema.sql
run --command "DELETE FROM payments; DELETE FROM passengers; DELETE FROM bookings;
               DELETE FROM sessions; DELETE FROM login_attempts;"
TURON_SEED_PASSWORD=turon2026 python3 ../tools/build-seed.py > /tmp/turon-seed-test.sql 2>/dev/null
run --file=/tmp/turon-seed-test.sql
echo "База сброшена. Пароль всех учёток: turon2026"
