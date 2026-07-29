// Настройка источника данных Turon Tour.
//
// Пусто ("") — сайт работает на встроенных моковых турах (см. js/data.js),
// это состояние по умолчанию и то, что задеплоено на GitHub Pages сейчас.
//
// Чтобы подключить реальные данные из Google Sheet: задеплойте
// worker/index.js как Cloudflare Worker (см. worker/README.md) и впишите
// сюда его публичный адрес, например:
//   apiBaseUrl: "https://turon-tour-api.<ваш-субдомен>.workers.dev"
window.TURON_CONFIG = {
  apiBaseUrl: "",
};
