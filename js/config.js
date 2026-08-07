// Настройка источника данных Turon Tour.
//
// Пусто ("") — кабинет работает в демо-режиме (localStorage, см. js/api.js).
//
// Заполнено — кабинет обращается к боевому бэкенду на Cloudflare Workers + D1.
window.TURON_CONFIG = {
  apiBaseUrl: "https://turon-tour-api.turontour.workers.dev",
};

// Второй экран титульной: отдельный полноэкранный лист «Япония» СРАЗУ ПОД
// существующим video hero. Первый hero не перестраивается и не превращается
// в слайдер. Новый качественный AVIF разбит на несколько JS-частей, чтобы
// GitHub Pages получил его без отдельного бинарного пайплайна.
(function loadJapanSecondSheet() {
  "use strict";

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "hero-slider.css?v=20260807-9";
  css.setAttribute("data-japan-second-sheet", "");
  document.head.appendChild(css);

  var assets = [
    "js/japan-v3-01.js?v=20260807-1",
    "js/japan-v3-02.js?v=20260807-1",
    "js/japan-v3-03-04.js?v=20260807-1",
    "js/japan-v3-05-06.js?v=20260807-1",
    "js/japan-v3-07.js?v=20260807-1",
    "js/japan-v3-08.js?v=20260807-1",
    "js/japan-v3-09.js?v=20260807-1",
    "js/japan-v3-10.js?v=20260807-1",
    "js/japan-v3-11a.js?v=20260807-1",
    "js/japan-v3-11b.js?v=20260807-1",
    "js/japan-v3-11c.js?v=20260807-1",
    "js/japan-v3-11d.js?v=20260807-1",
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
        // Если хотя бы одна часть фотографии не загрузилась, оставляем
        // существующую страницу как есть — битый второй лист не показываем.
      });
      return;
    }

    if (!window.TURON_JAPAN_IMAGE) return;
    addScript("js/hero-slider.js?v=20260807-10", function () {}, function () {});
  }

  loadNextImagePart();
})();
