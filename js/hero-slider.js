/*
 * Второй экран публичной титульной — Япония.
 *
 * Первый video hero полностью остаётся за catalog.js. Этот модуль ничего
 * внутри него не перестраивает: после появления .tt-public-intro он вставляет
 * отдельный полноэкранный лист Японии СРАЗУ ПОСЛЕ видео и ДО каталога.
 *
 * CTA использует существующий data-dest="Япония", поэтому клик обслуживает
 * уже существующий делегированный роутер каталога — отдельной страницы нет.
 */
(function (global) {
  "use strict";

  var ROOT_ID = "public-catalog";
  var HERO_SELECTOR = ".tt-public-intro";
  var SHEET_SELECTOR = ".tt-japan-sheet";
  var observer = null;
  var scheduled = false;

  function japanImage() {
    return global.TURON_JAPAN_IMAGE || "";
  }

  function japanSheetHtml(src) {
    return (
      '<section class="tt-japan-sheet" aria-label="Япония — сезон 2026">' +
        '<img class="tt-japan-sheet-image" src="' + src + '" alt="" ' +
          'decoding="async" fetchpriority="high" />' +
        '<div class="tt-japan-sheet-shade" aria-hidden="true"></div>' +
        '<div class="tt-japan-sheet-content">' +
          '<div class="tt-japan-sheet-label">' +
            '<span>ЯПОНИЯ · 2026</span><i aria-hidden="true"></i>' +
          '</div>' +
          '<h2 class="tt-japan-sheet-title" aria-label="Открой Японию!">' +
            '<span class="tt-japan-title-ink">ОТКРОЙ</span>' +
            '<span class="tt-japan-title-red"><span>ЯПОНИЮ!</span></span>' +
          '</h2>' +
          '<p class="tt-japan-sheet-route">Токио <i>·</i> Киото <i>·</i> Осака <i>·</i> Фудзи</p>' +
          '<div class="tt-japan-sheet-copy">' +
            '<span aria-hidden="true"></span>' +
            '<p>Четыре программы путешествий — от огней Токио до классических ' +
              'маршрутов и Japan Camp.</p>' +
          '</div>' +
          '<div class="tt-japan-sheet-actions">' +
            '<button class="tt-japan-sheet-cta" type="button" data-dest="Япония">' +
              '<span>Смотреть туры</span><span aria-hidden="true">↗</span>' +
            '</button>' +
            '<span class="tt-japan-sheet-meta">4 программы · сезон 2026</span>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function bindVideoVisibility(hero) {
    var video = hero.querySelector(".tt-hero-video");
    if (!video || !global.IntersectionObserver) return;

    var io = new global.IntersectionObserver(function (entries) {
      var entry = entries[0];
      if (!entry) return;

      if (!entry.isIntersecting) {
        if (!video.hasAttribute("data-no-autoplay")) {
          video.setAttribute("data-japan-offscreen-pause", "");
          video.setAttribute("data-no-autoplay", "");
        }
        video.pause();
        return;
      }

      if (!video.hasAttribute("data-japan-offscreen-pause")) return;
      video.removeAttribute("data-japan-offscreen-pause");
      video.removeAttribute("data-no-autoplay");
      if (global.document.hidden) return;
      var started = video.play();
      if (started && started.catch) started.catch(function () {});
    }, { threshold: 0.02 });

    io.observe(hero);
  }

  function mount(hero) {
    if (!hero || !hero.isConnected) return;
    if (hero.nextElementSibling && hero.nextElementSibling.matches(SHEET_SELECTOR)) return;

    var src = japanImage();
    if (!src) return;

    hero.classList.add("tt-has-japan-sheet");
    hero.insertAdjacentHTML("afterend", japanSheetHtml(src));
    bindVideoVisibility(hero);
  }

  function mountCurrent() {
    scheduled = false;
    var root = global.document.getElementById(ROOT_ID);
    if (!root) return;
    mount(root.querySelector(HERO_SELECTOR));
  }

  function scheduleMount() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(mountCurrent);
  }

  function boot() {
    var root = global.document.getElementById(ROOT_ID);
    if (!root) return;
    scheduleMount();
    observer = new global.MutationObserver(scheduleMount);
    observer.observe(root, { childList: true, subtree: true });
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window);
