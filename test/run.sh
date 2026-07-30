#!/usr/bin/env bash
# Полная проверка бэкенда одной командой: поднимает воркер с локальной
# базой, прогоняет тесты, гасит воркер за собой.
#
#   ./test/run.sh
#
# Ничего не разворачивает и боевую базу не трогает — всё локально.
set -uo pipefail
cd "$(dirname "$0")/.."

WRANGLER="${WRANGLER:-wrangler}"
PORT="${PORT:-8787}"

if ! command -v "$WRANGLER" >/dev/null 2>&1; then
  echo "Не найден wrangler. Установите: npm install -g wrangler"
  exit 1
fi

if lsof -i ":$PORT" >/dev/null 2>&1 || ss -ltn 2>/dev/null | grep -q ":$PORT "; then
  echo "Порт $PORT занят. Закройте другой запущенный воркер или задайте PORT=8788 ./test/run.sh"
  exit 1
fi

echo "Поднимаю воркер на порту $PORT…"
( cd worker && CI=1 "$WRANGLER" dev --local --config wrangler.local.toml \
    --port "$PORT" --ip 127.0.0.1 ) > /tmp/turon-wrangler.log 2>&1 &
WRANGLER_PID=$!

# гасим воркер при любом выходе, включая Ctrl+C
cleanup() {
  kill "$WRANGLER_PID" 2>/dev/null
  wait "$WRANGLER_PID" 2>/dev/null
}
trap cleanup EXIT

for i in $(seq 1 45); do
  sleep 2
  if curl -s -o /dev/null -m 2 "http://127.0.0.1:$PORT/api/me" 2>/dev/null; then
    ready=1; break
  fi
done

if [ "${ready:-0}" != "1" ]; then
  echo "Воркер не поднялся. Что пишет в логе:"
  tail -20 /tmp/turon-wrangler.log
  exit 1
fi

echo "Готовлю базу…"
if ! WRANGLER="$WRANGLER" bash test/reset-db.sh; then
  echo "Не удалось подготовить базу. Лог воркера:"
  tail -20 /tmp/turon-wrangler.log
  exit 1
fi

echo
BASE_URL="http://127.0.0.1:$PORT" node test/api-test.mjs
RESULT=$?

echo
if [ $RESULT -eq 0 ]; then
  echo "Всё в порядке — можно разворачивать (см. DEPLOY.md)."
else
  echo "Есть провалившиеся проверки. Разворачивать не нужно, пришлите вывод выше."
fi
exit $RESULT
