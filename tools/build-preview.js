/*
 * Собирает preview.html — одностраничный автономный снимок сайта для
 * быстрого просмотра (без сервера, без GitHub Pages).
 *
 * Важно: файл целиком генерируется из настоящих исходников (styles.css,
 * js/*.js, разметка index.html и tour.html), поэтому превью не может
 * разъехаться с репозиторием — после правок просто перезапустите:
 *
 *   node tools/build-preview.js
 *
 * Отличие от боевого сайта ровно одно: две страницы склеены в одну, и
 * переход "Подробнее" переключает вид вместо загрузки tour.html.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// Возвращает элемент целиком, вместе с открывающим тегом: классы
// вроде .tt-header и .tt-container несут всю вёрстку, без них страница
// растекается на всю ширину.
function extract(html, tag, file) {
  const m = html.match(new RegExp("<" + tag + "[^>]*>[\\s\\S]*?</" + tag + ">"));
  if (!m) throw new Error(`Не найден <${tag}> в ${file}`);
  return m[0].trim();
}

const styles = read("styles.css");
const configJs = read("js/config.js");
const dataJs = read("js/data.js");
const pricingJs = read("js/pricing.js");
const searchJs = read("js/search.js");
let tourJs = read("js/tour.js");

// Единственная правка исходника: tour.js берёт slug из адресной строки,
// а в склеенной странице его подставляет шим. Если строка не найдётся —
// падаем громко, чтобы не выпустить молча сломанное превью.
const NEEDLE = "var params = new URLSearchParams(window.location.search);";
if (!tourJs.includes(NEEDLE)) {
  throw new Error("tour.js изменился: не найдено чтение location.search, шим превью нужно поправить");
}
tourJs = tourJs.replace(
  NEEDLE,
  "var params = new URLSearchParams(window.__PREVIEW_QS || window.location.search);"
);

const indexHtml = read("index.html");
const tourHtml = read("tour.html");
const header = extract(indexHtml, "header", "index.html");
const searchMain = extract(indexHtml, "main", "index.html");
const tourMain = extract(tourHtml, "main", "tour.html");

const out = `<meta charset="utf-8" />
<title>Turon Tour — превью системы авторских туров</title>
<style>
${styles}

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
</style>

<div class="tt-preview-note">
  <strong>Превью</strong>
  <span>Рабочая сборка на демо-данных: заявки никуда не уходят, сохраняются локально в браузере.</span>
</div>

${header}

<div id="view-search">${searchMain}</div>
<div id="view-tour" hidden>${tourMain}</div>

<script>
${configJs}
</script>
<script>
${dataJs}
</script>
<script>
${pricingJs}
</script>
<script>
${searchJs}
</script>
<script type="text/plain" id="tour-source">
${tourJs}
</script>
<script>
// Шим превью: склеивает две страницы сайта в одну.
(function () {
  "use strict";
  var searchView = document.getElementById("view-search");
  var tourView = document.getElementById("view-tour");
  var tourSource = document.getElementById("tour-source").textContent;

  function showSearch() {
    tourView.hidden = true;
    searchView.hidden = false;
    window.scrollTo(0, 0);
  }

  function openTour(slug) {
    window.__PREVIEW_QS = "?slug=" + encodeURIComponent(slug);
    // сбрасываем контейнер и заново выполняем tour.js — он сам отрисует
    // карточку выбранного тура, как при обычном переходе на tour.html
    tourView.querySelector("#tour-content").innerHTML =
      '<div class="tt-empty-state">Загрузка тура…</div>';
    searchView.hidden = true;
    tourView.hidden = false;
    window.scrollTo(0, 0);
    var s = document.createElement("script");
    s.textContent = tourSource;
    document.body.appendChild(s);
    document.body.removeChild(s);
  }

  document.addEventListener("click", function (e) {
    var toTour = e.target.closest('a[href^="tour.html"]');
    if (toTour) {
      e.preventDefault();
      var slug = new URL(toTour.getAttribute("href"), "https://example.invalid/")
        .searchParams.get("slug");
      if (slug) openTour(slug);
      return;
    }
    var toSearch = e.target.closest('a[href="index.html"]');
    if (toSearch) {
      e.preventDefault();
      showSearch();
    }
  });
})();
</script>
`;

fs.writeFileSync(path.join(ROOT, "preview.html"), out);
console.log("preview.html собран, " + Math.round(out.length / 1024) + " КБ");
