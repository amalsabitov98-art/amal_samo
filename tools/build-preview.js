/*
 * Собирает preview.html — автономный HTML-снимок кабинета для быстрого
 * просмотра (без сервера и без развёрнутого бэкенда). Фотографии остаются
 * рядом в img/: так файл не разрастается за лимиты GitHub и открывается
 * одинаково из репозитория, ZIP и GitHub Pages.
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

function bundledScript(src) {
  const sourcePath = src.split("?")[0];
  const source = read(sourcePath);
  if (sourcePath !== "js/config.js") return source;

  // Превью всегда автономно: рабочий API в исходной конфигурации не должен
  // превращать demo-снимок в форму входа от production-окружения.
  return source.replace(/apiBaseUrl:\s*"[^"]*"/, 'apiBaseUrl: ""');
}

// Мета-теги берём из index.html: без viewport телефон отрисует превью
// как десктоп, и проверять мобильную вёрстку на нём будет бессмысленно.
const metaTags = [...html.matchAll(/<meta [^>]*>/g)].map((m) => m[0]).join("\n");

/*
 * Логотип оставляем внутри HTML как data-URI: это небольшой файл и он нужен
 * интерфейсу на каждом экране. Большие фотографии не встраиваем — они уже
 * лежат рядом в img/, а повторное base64-кодирование добавляет к превью
 * больше мегабайта и может обрезаться при публикации через GitHub API.
 */
const MIME = { webp: "image/webp", png: "image/png", jpg: "image/jpeg",
               jpeg: "image/jpeg", svg: "image/svg+xml", avif: "image/avif" };

function inlineImages(css) {
  return css.replace(/url\(\s*"(img\/[^"]+)"\s*\)/g, (whole, src) => {
    const file = path.join(ROOT, src);
    if (!fs.existsSync(file)) {
      throw new Error(`styles.css ссылается на ${src}, но файла нет`);
    }
    const ext = path.extname(src).slice(1).toLowerCase();
    const mime = MIME[ext];
    if (!mime) throw new Error(`неизвестный тип картинки: ${src}`);
    if (path.basename(src) !== "turon-logo.webp") return whole;
    return `url("data:${mime};base64,${fs.readFileSync(file).toString("base64")}")`;
  });
}

// Превью собирает свой <head>, поэтому загрузочный скрипт темы приходится
// повторять здесь. Без него preview.html открывался вообще без data-theme —
// и тесты гоняли не то оформление, что видит живой посетитель.
const themeBoot = `<script>
  (function () {
    try {
      var saved = localStorage.getItem("turon.theme");
      document.documentElement.setAttribute(
        "data-theme", saved === "light" ? "light" : "dark");
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    try {
      if (localStorage.getItem("turon.app-theme") === "dark") {
        document.documentElement.setAttribute("data-app-theme", "dark");
      }
    } catch (e) {}
  })();
</script>`;

const out = `${metaTags}
<title>Turon Tour — кабинет агентства (превью)</title>
${themeBoot}
<style>
${inlineImages(read("styles.css"))}

/* — только для превью: полоса-пояснение над реальным интерфейсом — */
.tt-preview-note {
  /* Страницы с закреплённым видеофоном (карточка тура, Умра) кладут его
     через position:fixed с z-index — любой позиционированный элемент
     красится поверх непозиционированного по спецификации CSS, независимо
     от места в разметке. Без своего position+z-index эта полоса, хоть и
     идёт первой в <body>, всё равно оказывалась бы под видео. */
  position: relative;
  z-index: 2;
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

${scripts.map((src) => `<script>\n${bundledScript(src)}\n</script>`).join("\n")}
`;

fs.writeFileSync(path.join(ROOT, "preview.html"), out);
console.log(
  `preview.html собран из ${scripts.length} скриптов, ` +
  `${Math.round(out.length / 1024)} КБ`
);
