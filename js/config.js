// Настройка источника данных Etihad.
//
// Пусто ("") — кабинет работает в демо-режиме (localStorage, см. js/api.js).
//
// Заполнено — кабинет обращается к боевому бэкенду на Cloudflare Workers + D1.
window.TURON_CONFIG = {
  apiBaseUrl: "https://turon-tour-api.turontour.workers.dev",
};
