# Проверка бэкенда

Прогоняет воркер и базу по-настоящему — на локальной D1, а не на моках.
Запускать перед каждым деплоем.

```bash
npm install -g wrangler          # если ещё не стоит
cd worker

# развернуть локальную базу
wrangler d1 execute turon-tour-local --local --config wrangler.local.toml --file=../db/schema.sql
wrangler d1 execute turon-tour-local --local --config wrangler.local.toml --file=../db/seed.sql

# поднять воркер
wrangler dev --local --config wrangler.local.toml --port 8787

# в другом окне
node ../test/api-test.mjs
```

Проверяется: вход и роли, изоляция агентств друг от друга, расчёт цены по
возрасту, что младенец не занимает места, права оператора, списки
пассажиров, оплаты и возвраты, заведение агентств, отмена с возвратом мест.

Тест не идемпотентен: он создаёт брони и агентство. Перед повторным
прогоном базу удобнее пересоздать — удалить каталог `worker/.wrangler`
и применить схему с наполнением заново.
