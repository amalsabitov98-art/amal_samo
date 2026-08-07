// Настройка источника данных Turon Tour.
//
// Пусто ("") — кабинет работает в демо-режиме (localStorage, см. js/api.js).
//
// Заполнено — кабинет обращается к боевому бэкенду на Cloudflare Workers + D1.
window.TURON_CONFIG = {
  apiBaseUrl: "https://turon-tour-api.turontour.workers.dev",
};

// Дополнение титульного hero вторым слайдом «Япония» подключаем отдельно,
// чтобы не переписывать существующий video hero в catalog.js. Фотография
// хранится как компактный AVIF и разбита на несколько небольших JS-частей:
// GitHub Pages получает их по порядку, затем запускается сам слайдер.
(function loadHeroSlider() {
  "use strict";

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "hero-slider.css?v=20260807-2";
  css.setAttribute("data-hero-slider", "");
  document.head.appendChild(css);

  var assets = [
    "js/japan-image-01.js?v=20260807-1",
    "js/japan-image-02.js?v=20260807-1",
    "js/japan-image-03.js?v=20260807-1",
    "js/japan-image-04.js?v=20260807-1",
  ];
  var index = 0;

  function addScript(src, onload, onerror) {
    var script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = onload;
    script.onerror = onerror;
    document.head.appendChild(script);
  }

  function loadNextImagePart() {
    if (index < assets.length) {
      addScript(assets[index++], loadNextImagePart, function () {
        // Если хотя бы одна часть фотографии не загрузилась, не запускаем
        // слайдер вовсе: существующий первый video hero остаётся как есть.
      });
      return;
    }

    if (!window.TURON_JAPAN_IMAGE) return;
    addScript("js/hero-slider.js?v=20260807-3", function () {}, function () {});
  }

  loadNextImagePart();
})();
