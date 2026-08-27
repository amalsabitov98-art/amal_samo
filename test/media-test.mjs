/*
 * Хранилище фотографий: проверка ОБЕИХ веток — R2 и KV.
 *
 * Зачем отдельный файл, а не ui-тест: ui-тесты гоняют preview.html в
 * демо-режиме, который идёт мимо воркера целиком. Ветка KV живёт только в
 * воркере, и на превью её не видно вовсе — сломайся она, все 475 дымовых
 * тестов остались бы зелёными.
 *
 * Воркер импортируется как обычный ES-модуль, а хранилища подменяются
 * поддельными: у R2 и KV разные API (`get` против `getWithMetadata`, тип
 * файла в httpMetadata против metadata), и именно на этой разнице проще
 * всего ошибиться.
 *
 *     node test/media-test.mjs
 */
import worker from "../worker/index.js";

let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  → " + detail : "")); }
}

/** Поддельный R2: хранит объект и отдаёт его с httpMetadata. */
function fakeR2() {
  const box = new Map();
  return {
    box,
    async put(key, body, opts) { box.set(key, { body, opts }); },
    async get(key) {
      const got = box.get(key);
      if (!got) return null;
      return { body: got.body, httpMetadata: got.opts && got.opts.httpMetadata };
    },
  };
}

/** Поддельный KV: у него metadata отдельно от значения. */
function fakeKV() {
  const box = new Map();
  return {
    box,
    async put(key, body, opts) { box.set(key, { body, meta: opts && opts.metadata }); },
    async getWithMetadata(key) {
      const got = box.get(key);
      if (!got) return { value: null, metadata: null };
      return { value: got.body, metadata: got.meta };
    },
  };
}

const TOKEN = "test-token";

/* Загрузка идёт по /api/admin/media и требует ОПЕРАТОРА, поэтому воркеру
 * нужна живая сессия. Полноценную базу поднимать незачем — подменяем ровно
 * те запросы, которые делает authenticate. */
function fakeDB() {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (/FROM sessions/i.test(sql)) {
            return { id: 1, name: "Оператор", login: "operator", role: "operator", is_active: 1 };
          }
          return null;
        },
        async all() { return { results: [] }; },
        async run() { return { meta: {} }; },
      };
    },
    async batch() { return []; },
  };
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

async function upload(env, type = "image/jpeg", body = JPEG) {
  const req = new Request("https://x/api/admin/media?kind=tour", {
    method: "POST",
    headers: { "Content-Type": type, Authorization: "Bearer " + TOKEN },
    body,
  });
  const res = await worker.fetch(req, env, { waitUntil() {} });
  return { res, data: await res.json().catch(() => ({})) };
}

async function serve(env, url) {
  const req = new Request("https://x" + url, { method: "GET" });
  return await worker.fetch(req, env, { waitUntil() {} });
}

for (const [name, make] of [["R2", fakeR2], ["KV", fakeKV]]) {
  console.log("\nХранилище " + name);
  const store = make();
  const env = { DB: fakeDB(), ALLOWED_ORIGIN: "" };
  if (name === "R2") env.MEDIA = store; else env.MEDIA_KV = store;

  const { res, data } = await upload(env);
  check("загрузка принята", res.status === 200, String(res.status));
  check("вернулся адрес", /^\/api\/media\/tour\//.test(data.url || ""), data.url);
  check("файл лёг в хранилище", store.box.size === 1, String(store.box.size));

  const got = await serve(env, data.url);
  check("раздача отвечает", got.status === 200, String(got.status));
  // Самое важное отличие веток: у KV нет httpMetadata, тип файла надо
  // класть в metadata самим. Ошибись здесь — браузер получил бы
  // application/octet-stream и предложил СКАЧАТЬ картинку вместо показа.
  check("тип файла сохранён",
        got.headers.get("Content-Type") === "image/jpeg",
        got.headers.get("Content-Type"));
  check("кэш вечный",
        /immutable/.test(got.headers.get("Cache-Control") || ""),
        got.headers.get("Cache-Control"));
  const bytes = new Uint8Array(await got.arrayBuffer());
  check("байты те же", bytes.length === JPEG.length && bytes[0] === 0xff,
        bytes.length + " байт");

  // PNG обязателен: у serveMedia запасное значение типа — image/jpeg, и на
  // JPEG-файле пропажа метаданных прошла бы незамеченной. Именно на этом
  // тест сначала и не поймал намеренно сломанную KV-ветку.
  const png = await upload(env, "image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  const pngGot = await serve(env, png.data.url);
  check("PNG раздаётся как PNG, а не как JPEG",
        pngGot.headers.get("Content-Type") === "image/png",
        pngGot.headers.get("Content-Type"));
  check("расширение в ключе от типа файла", /\.png$/.test(png.data.url || ""),
        png.data.url);

  const missing = await serve(env, "/api/media/tour/нет-такого.jpg");
  check("несуществующий файл — 404", missing.status === 404, String(missing.status));

  const bad = await upload(env, "application/pdf", JPEG);
  check("чужой тип отклонён", bad.res.status === 400, String(bad.res.status));

  const big = await upload(env, "image/jpeg", new Uint8Array(4 * 1024 * 1024));
  check("файл больше 3 МБ отклонён", big.res.status === 400, String(big.res.status));
}

console.log("\nБез хранилища");
{
  const env = { DB: fakeDB(), ALLOWED_ORIGIN: "" };
  const { res, data } = await upload(env);
  // Кабинет не должен падать оттого, что хранилище ещё не завели: ошибка
  // понятная, а всё остальное работает как прежде.
  check("загрузка отвечает 503", res.status === 503, String(res.status));
  check("сказано, в чём дело", /хранилищ/i.test(data.error || ""), data.error);
}

console.log(`\nИтого: ${passed} пройдено, ${failed} провалено`);
process.exit(failed ? 1 : 0);
