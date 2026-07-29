/*
 * Собирает preview.html — автономный однофайловый снимок кабинета для
 * быстрого просмотра (без сервера и без развёрнутого бэкенда).
 *
 * Файл целиком генерируется из настоящих исходников (index.html,
 * styles.css, js/*.js), поэтому разъехаться с репозиторием не может.
 * После правок пересобрать:
 *
 *   node tools/build-preview.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const html = read("index.html");

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error("В index.html не найден <body>");

// Разметка без тегов <script src> — скрипты подставим содержимым.
const markup = bodyMatch[1].replace(/<script src="[^"]+"><\/script>\s*/g, "").trim();

// Порядок важен: config → seed → api → app, как в index.html.
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error("В index.html не найдено подключённых скриптов");

const out = `<meta charset="utf-8" />
<title>Turon Tour — кабинет агентства (превью)</title>
<style>
${read("styles.css")}

/* — только для превью: полоса-пояснение над реальным интерфейсом — */
.tt-preview-note {
  background: var(--tt-accent-soft);
  border-bottom: 1px solid var(--tt-border);
  color: var(--tt-text);
  padding: 10px 28px;
  font-size: 0.82rem;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: baseline;
}
.tt-preview-note strong { color: var(--tt-accent-dark); }
.tt-preview-note span { color: var(--tt-text-muted); }
/* экран входа занимает всю высоту — в превью вычитаем полосу */
.tt-login-screen { min-height: calc(100vh - 40px); }
</style>

<div class="tt-preview-note">
  <strong>Превью</strong>
  <span>Рабочая сборка на реальных заездах и ценах. Бэкенд не подключён:
        брони сохраняются только в этом браузере.</span>
</div>

${markup}

${scripts.map((src) => `<script>\n${read(src)}\n</script>`).join("\n")}
`;

fs.writeFileSync(path.join(ROOT, "preview.html"), out);
console.log(
  `preview.html собран из ${scripts.length} скриптов, ` +
  `${Math.round(out.length / 1024)} КБ`
);
