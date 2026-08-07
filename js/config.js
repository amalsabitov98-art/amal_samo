// Настройка источника данных Turon Tour.
//
// Пусто ("") — кабинет работает в демо-режиме (localStorage, см. js/api.js).
//
// Заполнено — кабинет обращается к боевому бэкенду на Cloudflare Workers + D1.
window.TURON_CONFIG = {
  apiBaseUrl: "https://turon-tour-api.turontour.workers.dev",
};

// Дополнение титульного hero вторым слайдом «Япония» подключаем отдельно,
// чтобы не переписывать существующий video hero в catalog.js. Слайдер ждёт,
// пока каталог сам отрисует первый экран, и только затем аккуратно добавляет
// второй слой и управление поверх него.
(function loadHeroSlider() {
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "hero-slider.css?v=20260807-1";
  document.head.appendChild(css);

  var script = document.createElement("script");
  script.src = "js/hero-slider.js?v=20260807-1";
  script.async = false;
  document.head.appendChild(script);
})();