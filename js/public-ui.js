/*
 * Публичная шапка: языки, навигация и ежедневные курсы ЦБ Узбекистана.
 * Кабинет агентства пока остаётся русскоязычным — переключатель относится
 * к титульному экрану, каталогу и форме входа.
 */
(function (global) {
  "use strict";

  var STORAGE_LANGUAGE = "turon-public-language";
  var STORAGE_RATES = "turon-cbu-rates";
  var CBU_ENDPOINT = "https://cbu.uz/ru/arkhiv-kursov-valyut/json/";

  var dictionaries = {
    ru: {
      "brand.tagline": "туроператор · Ташкент",
      "header.language": "Язык",
      "header.login": "Войти",
      "header.cabinet": "Кабинет",
      "theme.toLight": "Светлая тема",
      "theme.toDark": "Тёмная тема",
      "nav.excursions": "Экскурсионные туры",
      "nav.tours": "Туры",
      "nav.about": "О компании",
      "login.kicker": "Партнёрский доступ",
      "login.title": "Добро пожаловать",
      "login.note": "Войдите в кабинет агентства Etihad",
      "login.user": "Логин",
      "login.password": "Пароль",
      "login.back": "← В каталог",
      "login.hub": "Partner Hub",
      "login.storyKicker": "B2B для туристических агентств",
      "hero.kicker": "Туроператор из Ташкента · Узбекистан",
      "hero.title": "Путешествия,",
      "hero.accent": "которые остаются с вами.",
      "hero.text": "Экскурсионные и групповые туры с продуманной программой, перелётом и поддержкой команды на всём маршруте.",
      "benefit.flight.title": "Перелёт включён",
      "benefit.flight.text": "Авиабилеты Ташкент — Трабзон или Батуми уже в цене тура.",
      "benefit.hotel.title": "Отели на первой линии",
      "benefit.hotel.text": "7 ночей с завтраками в Батуми и Ризе, у самого моря.",
      "benefit.guide.title": "Гид и 15+ экскурсий",
      "benefit.guide.text": "Русскоговорящий узбекский гид сопровождает всю поездку.",
      "benefit.support.title": "Страховка и поддержка 24/7",
      "benefit.support.text": "Медицинская страховка на весь период и связь с нами в любое время.",
      "upcoming.kicker": "Даты в продаже",
      "upcoming.title": "Ближайшие заезды",
      "upcoming.text": "Даты, аэропорт и цена — всё, что нужно, чтобы выбрать. Мест ещё хватает.",
      "upcoming.action": "Программа и цены",
      "search.destination": "Направление",
      "search.anyDestination": "Все направления",
      "search.month": "Месяц выезда",
      "search.anyMonth": "Любая дата",
      "search.airport": "Аэропорт прилёта",
      "search.anyAirport": "Любой",
      "search.submit": "Найти туры",
      "search.found": "Найдено",
      "search.foundOne": "заезд",
      "search.foundFew": "заезда",
      "search.foundMany": "заездов",
      "search.none": "Ничего не найдено",
      "search.noneHint": "По этим условиям заездов нет. Попробуйте другой месяц или аэропорт.",
      "search.resultsKicker": "Результаты поиска",
      "catalog.kicker": "Коллекция Etihad",
      "catalog.title": "Выберите направление",
      "catalog.text": "Откройте программы, ближайшие даты и доступные варианты размещения.",
      "about.kicker": "О компании",
      "about.title": "Не просто отправляем в поездку. Собираем путешествие целиком.",
      "about.text": "Etihad — туроператор из Ташкента. Мы создаём экскурсионные и групповые маршруты, объединяя перелёт, размещение, программу и сопровождение в одной понятной системе.",
      "about.operator": "Туроператор из Узбекистана",
      "about.partners": "Работаем с туристами и агентствами",
      "about.support": "Поддержка на маршруте 24/7",
      "about.detail": "Команда знает маршрут до деталей: от первой консультации до возвращения домой.",
      "rate.source": "ЦБ РУз",
      "rate.unavailable": "курс временно недоступен"
    },
    uz: {
      "brand.tagline": "turoperator · Toshkent",
      "header.language": "Til",
      "header.login": "Kirish",
      "header.cabinet": "Kabinet",
      "theme.toLight": "Yorug‘ mavzu",
      "theme.toDark": "Qorong‘i mavzu",
      "nav.excursions": "Ekskursiya turlari",
      "nav.tours": "Turlar",
      "nav.about": "Kompaniya haqida",
      "login.kicker": "Hamkorlar uchun",
      "login.title": "Xush kelibsiz",
      "login.note": "Etihad agentlik kabinetiga kiring",
      "login.user": "Login",
      "login.password": "Parol",
      "login.back": "← Katalogga",
      "login.hub": "Partner Hub",
      "login.storyKicker": "Turagentliklar uchun B2B",
      "hero.kicker": "Toshkentdagi turoperator · O‘zbekiston",
      "hero.title": "Siz bilan qoladigan",
      "hero.accent": "sayohatlar.",
      "hero.text": "Puxta dastur, aviaqatnov va butun yo‘nalish davomida jamoa ko‘magi bilan ekskursiya hamda guruh turlari.",
      "benefit.flight.title": "Aviabilet narxda",
      "benefit.flight.text": "Toshkent — Trabzon yoki Batumi aviabiletlari tur narxiga kiritilgan.",
      "benefit.hotel.title": "Dengiz bo‘yidagi mehmonxonalar",
      "benefit.hotel.text": "Batumi va Rizeda nonushta bilan 7 kecha, birinchi qatorda.",
      "benefit.guide.title": "Gid va 15+ ekskursiya",
      "benefit.guide.text": "Rus tilida so‘zlashuvchi o‘zbek gid butun sayohat davomida yoningizda.",
      "benefit.support.title": "Sug‘urta va 24/7 ko‘mak",
      "benefit.support.text": "Butun davrga tibbiy sug‘urta va istalgan vaqtda biz bilan aloqa.",
      "upcoming.kicker": "Sotuvdagi sanalar",
      "upcoming.title": "Eng yaqin jo‘nashlar",
      "upcoming.text": "Sana, aeroport va narx — tanlash uchun kerakli hammasi. Joylar hali bor.",
      "upcoming.action": "Dastur va narxlar",
      "search.destination": "Yo‘nalish",
      "search.anyDestination": "Barcha yo‘nalishlar",
      "search.month": "Jo‘nash oyi",
      "search.anyMonth": "Istalgan sana",
      "search.airport": "Qo‘nish aeroporti",
      "search.anyAirport": "Istalgan",
      "search.submit": "Turlarni topish",
      "search.found": "Topildi",
      "search.foundOne": "jo‘nash",
      "search.foundFew": "jo‘nash",
      "search.foundMany": "jo‘nash",
      "search.none": "Hech narsa topilmadi",
      "search.noneHint": "Bu shartlar bo‘yicha jo‘nashlar yo‘q. Boshqa oy yoki aeroportni tanlang.",
      "search.resultsKicker": "Qidiruv natijalari",
      "catalog.kicker": "Etihad kolleksiyasi",
      "catalog.title": "Yo‘nalishni tanlang",
      "catalog.text": "Dasturlar, yaqin sanalar va joylashuv variantlarini ko‘ring.",
      "about.kicker": "Kompaniya haqida",
      "about.title": "Shunchaki safarga jo‘natmaymiz. Sayohatni to‘liq yaratamiz.",
      "about.text": "Etihad — Toshkentdagi turoperator. Biz parvoz, mehmonxona, dastur va hamrohlikni yagona tushunarli tizimga birlashtirgan ekskursiya va guruh yo‘nalishlarini yaratamiz.",
      "about.operator": "O‘zbekistondagi turoperator",
      "about.partners": "Sayyohlar va agentliklar bilan ishlaymiz",
      "about.support": "Yo‘nalishda 24/7 ko‘mak",
      "about.detail": "Jamoamiz birinchi maslahatdan uyga qaytishgacha bo‘lgan har bir bosqichni biladi.",
      "rate.source": "O‘zbekiston MB",
      "rate.unavailable": "kurs vaqtincha mavjud emas"
    },
    en: {
      "brand.tagline": "tour operator · Tashkent",
      "header.language": "Language",
      "header.login": "Sign in",
      "header.cabinet": "Workspace",
      "theme.toLight": "Light theme",
      "theme.toDark": "Dark theme",
      "nav.excursions": "Excursion tours",
      "nav.tours": "Tours",
      "nav.about": "About us",
      "login.kicker": "Partner access",
      "login.title": "Welcome",
      "login.note": "Sign in to the Etihad agency workspace",
      "login.user": "Login",
      "login.password": "Password",
      "login.back": "← Back to catalogue",
      "login.hub": "Partner Hub",
      "login.storyKicker": "B2B for travel agencies",
      "hero.kicker": "Tour operator from Tashkent · Uzbekistan",
      "hero.title": "Journeys that",
      "hero.accent": "stay with you.",
      "hero.text": "Excursion and group tours with a thoughtful programme, flights and support from our team throughout the route.",
      "benefit.flight.title": "Flights included",
      "benefit.flight.text": "Tashkent — Trabzon or Batumi air tickets are already in the price.",
      "benefit.hotel.title": "Seafront hotels",
      "benefit.hotel.text": "7 nights with breakfast in Batumi and Rize, right on the coast.",
      "benefit.guide.title": "Guide and 15+ excursions",
      "benefit.guide.text": "A Russian-speaking Uzbek guide accompanies the whole trip.",
      "benefit.support.title": "Insurance and 24/7 support",
      "benefit.support.text": "Medical insurance for the whole period and our team on call anytime.",
      "upcoming.kicker": "Dates on sale",
      "upcoming.title": "Upcoming departures",
      "upcoming.text": "Dates, airport and price — everything you need to choose. Seats still available.",
      "upcoming.action": "Programme and prices",
      "search.destination": "Destination",
      "search.anyDestination": "All destinations",
      "search.month": "Departure month",
      "search.anyMonth": "Any date",
      "search.airport": "Arrival airport",
      "search.anyAirport": "Any",
      "search.submit": "Find tours",
      "search.found": "Found",
      "search.foundOne": "departure",
      "search.foundFew": "departures",
      "search.foundMany": "departures",
      "search.none": "Nothing found",
      "search.noneHint": "No departures match these filters. Try another month or airport.",
      "search.resultsKicker": "Search results",
      "catalog.kicker": "The Etihad collection",
      "catalog.title": "Choose a destination",
      "catalog.text": "Explore programmes, upcoming dates and available accommodation options.",
      "about.kicker": "About us",
      "about.title": "We do more than send you away. We build the whole journey.",
      "about.text": "Etihad is a Tashkent-based tour operator. We create excursion and group itineraries that bring flights, accommodation, experiences and on-route support into one clear system.",
      "about.operator": "Tour operator from Uzbekistan",
      "about.partners": "For travellers and travel agencies",
      "about.support": "24/7 support along the route",
      "about.detail": "Our team knows every stage of the journey, from the first conversation to the return home.",
      "rate.source": "CBU",
      "rate.unavailable": "rate temporarily unavailable"
    },
    tr: {
      "brand.tagline": "tur operatörü · Taşkent",
      "header.language": "Dil",
      "header.login": "Giriş",
      "header.cabinet": "Panel",
      "theme.toLight": "Açık tema",
      "theme.toDark": "Koyu tema",
      "nav.excursions": "Kültür turları",
      "nav.tours": "Turlar",
      "nav.about": "Hakkımızda",
      "login.kicker": "İş ortağı erişimi",
      "login.title": "Hoş geldiniz",
      "login.note": "Etihad acente paneline giriş yapın",
      "login.user": "Kullanıcı adı",
      "login.password": "Şifre",
      "login.back": "← Kataloğa dön",
      "login.hub": "Partner Hub",
      "login.storyKicker": "Seyahat acenteleri için B2B",
      "hero.kicker": "Taşkent merkezli tur operatörü · Özbekistan",
      "hero.title": "Sizinle kalan",
      "hero.accent": "yolculuklar.",
      "hero.text": "Özenle hazırlanan program, uçuşlar ve rota boyunca ekip desteğiyle kültür ve grup turları.",
      "benefit.flight.title": "Uçuş dahil",
      "benefit.flight.text": "Taşkent — Trabzon veya Batum uçak biletleri tur fiyatına dahil.",
      "benefit.hotel.title": "Sahil şeridinde oteller",
      "benefit.hotel.text": "Batum ve Rize\'de kahvaltı dahil 7 gece, denize sıfır.",
      "benefit.guide.title": "Rehber ve 15+ gezi",
      "benefit.guide.text": "Rusça konuşan Özbek rehber tüm yolculuk boyunca yanınızda.",
      "benefit.support.title": "Sigorta ve 7/24 destek",
      "benefit.support.text": "Tüm dönem için sağlık sigortası ve dilediğiniz an bize ulaşma imkânı.",
      "upcoming.kicker": "Satıştaki tarihler",
      "upcoming.title": "Yaklaşan kalkışlar",
      "upcoming.text": "Tarih, havalimanı ve fiyat — seçim için gereken her şey. Yerler hâlâ mevcut.",
      "upcoming.action": "Program ve fiyatlar",
      "search.destination": "Rota",
      "search.anyDestination": "Tüm rotalar",
      "search.month": "Kalkış ayı",
      "search.anyMonth": "Herhangi bir tarih",
      "search.airport": "Varış havalimanı",
      "search.anyAirport": "Herhangi biri",
      "search.submit": "Tur ara",
      "search.found": "Bulundu",
      "search.foundOne": "kalkış",
      "search.foundFew": "kalkış",
      "search.foundMany": "kalkış",
      "search.none": "Sonuç bulunamadı",
      "search.noneHint": "Bu filtrelere uyan kalkış yok. Başka bir ay veya havalimanı deneyin.",
      "search.resultsKicker": "Arama sonuçları",
      "catalog.kicker": "Etihad koleksiyonu",
      "catalog.title": "Rotanızı seçin",
      "catalog.text": "Programları, yaklaşan tarihleri ve konaklama seçeneklerini inceleyin.",
      "about.kicker": "Hakkımızda",
      "about.title": "Sadece tatile göndermiyoruz. Yolculuğun tamamını tasarlıyoruz.",
      "about.text": "Etihad, Taşkent merkezli bir tur operatörüdür. Uçuş, konaklama, program ve rota desteğini tek bir anlaşılır sistemde birleştiren kültür ve grup turları hazırlıyoruz.",
      "about.operator": "Özbekistan merkezli tur operatörü",
      "about.partners": "Gezginler ve acenteler için",
      "about.support": "Rota boyunca 7/24 destek",
      "about.detail": "Ekibimiz ilk görüşmeden eve dönüşe kadar yolculuğun her ayrıntısını bilir.",
      "rate.source": "Özbekistan MB",
      "rate.unavailable": "kur geçici olarak kullanılamıyor"
    }
  };

  function savedLanguage() {
    try {
      var value = global.localStorage.getItem(STORAGE_LANGUAGE);
      return dictionaries[value] ? value : "ru";
    } catch (_) {
      return "ru";
    }
  }

  var language = savedLanguage();

  function t(key) {
    return (dictionaries[language] && dictionaries[language][key]) ||
      dictionaries.ru[key] || key;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
    syncLangWidget();
  }

  /* Флаги — инлайновый SVG (3:2), а не эмодзи: Windows флаг-эмодзи не рисует,
   * показывает вместо 🇷🇺 буквы «RU». Векторные флаги чёткие на любом кегле
   * и одинаковы во всех системах. Union Jack упрощён (без контршахматного
   * смещения диагоналей) — на 22px это не читается, а код короче. */
  var FLAGS = {
    ru: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/>' +
      '<rect y="5.33" width="24" height="5.34" fill="#0039a6"/>' +
      '<rect y="10.67" width="24" height="5.33" fill="#d52b1e"/></svg>',
    uz: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#fff"/>' +
      '<rect width="24" height="5" fill="#1eb0e7"/><rect y="11" width="24" height="5" fill="#1eb53a"/>' +
      '<rect y="4.6" width="24" height="0.5" fill="#ce1126"/><rect y="10.9" width="24" height="0.5" fill="#ce1126"/>' +
      '<circle cx="4.3" cy="2.5" r="1.55" fill="#fff"/><circle cx="5" cy="2.5" r="1.25" fill="#1eb0e7"/></svg>',
    en: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#012169"/>' +
      '<path d="M0 0 24 16 M24 0 0 16" stroke="#fff" stroke-width="3.2"/>' +
      '<path d="M0 0 24 16 M24 0 0 16" stroke="#c8102e" stroke-width="1.8"/>' +
      '<path d="M12 0 V16 M0 8 H24" stroke="#fff" stroke-width="5.2"/>' +
      '<path d="M12 0 V16 M0 8 H24" stroke="#c8102e" stroke-width="3.1"/></svg>',
    tr: '<svg viewBox="0 0 24 16"><rect width="24" height="16" fill="#e30a17"/>' +
      '<circle cx="9.2" cy="8" r="4" fill="#fff"/><circle cx="10.4" cy="8" r="3.2" fill="#e30a17"/>' +
      '<path d="M14 8 16.3 7.2 14.9 9.2 14.9 6.8 16.3 8.8Z" fill="#fff"/></svg>',
  };
  var LANG_CODES = { ru: "RU", uz: "UZ", en: "EN", tr: "TR" };
  var LANG_ORDER = ["ru", "uz", "en", "tr"];

  function syncLangWidget() {
    var flag = document.getElementById("lang-current-flag");
    var code = document.getElementById("lang-current-code");
    if (flag) flag.innerHTML = FLAGS[language] || "";
    if (code) code.textContent = LANG_CODES[language] || language.toUpperCase();
    var menu = document.getElementById("lang-menu");
    if (menu) {
      menu.querySelectorAll("[data-lang]").forEach(function (li) {
        li.setAttribute("aria-selected", li.dataset.lang === language ? "true" : "false");
      });
    }
  }

  function initLangWidget() {
    var widget = document.getElementById("lang-widget");
    var toggle = document.getElementById("lang-toggle");
    var menu = document.getElementById("lang-menu");
    if (!widget || !toggle || !menu) return;

    menu.innerHTML = LANG_ORDER.map(function (lc) {
      return '<li class="tt-lang-opt" role="option" data-lang="' + lc + '">' +
        '<span class="tt-lang-flag">' + FLAGS[lc] + "</span>" +
        '<span class="tt-lang-code">' + LANG_CODES[lc] + "</span></li>";
    }).join("");

    function close() { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
    function open() { menu.hidden = false; toggle.setAttribute("aria-expanded", "true"); }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    menu.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-lang]");
      if (!opt) return;
      setLanguage(opt.dataset.lang);
      close();
    });
    // клик вне виджета и Esc закрывают список
    document.addEventListener("click", function (e) {
      if (!widget.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    syncLangWidget();
  }

  function setLanguage(next) {
    if (!dictionaries[next]) return;
    language = next;
    try { global.localStorage.setItem(STORAGE_LANGUAGE, next); } catch (_) {}
    applyStaticTranslations();
    syncThemeButton();
    global.dispatchEvent(new CustomEvent("turon:language", {
      detail: { language: language }
    }));
    paintStoredRates();
  }

  /* --------------------------------------------------------------- тема
   * День/ночь для публичной части. Тёмная — по умолчанию: так утверждён
   * дизайн. Светлая — это прежнее кремовое оформление, оно никуда не
   * делось: тёмные правила в styles.css навешены через
   * :root:not([data-theme="light"]), поэтому «день» просто перестаёт их
   * применять, а не красит поверх.
   *
   * Кабинет темой НЕ управляется намеренно: он светлый в обоих режимах.
   * Агентства к нему привыкли, а в его разметке много зашитых цветов —
   * перекрашивать вслепую значит выкатить наполовину сломанный кабинет.
   *
   * Начальное значение ставит инлайн-скрипт в <head> — до первой отрисовки,
   * иначе на тёмной теме мелькала бы белая вспышка.
   */
  var STORAGE_THEME = "turon.theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light" : "dark";
  }

  function setTheme(next) {
    var value = next === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", value);
    try { global.localStorage.setItem(STORAGE_THEME, value); } catch (_) {}
    syncThemeButton();
    // Цвет строки состояния браузера на телефоне — иначе на тёмной теме
    // сверху остаётся зелёная полоса от светлого оформления.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", value === "light" ? "#0d302a" : "#070b0d");
    global.dispatchEvent(new CustomEvent("turon:theme", { detail: { theme: value } }));
  }

  function syncThemeButton() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var dark = currentTheme() === "dark";
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    // Подпись описывает ДЕЙСТВИЕ, а не текущее состояние: так понятнее,
    // что произойдёт по нажатию.
    btn.setAttribute("aria-label", dark ? t("theme.toLight") : t("theme.toDark"));
    btn.setAttribute("title", dark ? t("theme.toLight") : t("theme.toDark"));
  }

  /* Высота шапки уходит в CSS-переменную. На титульной шапка лежит поверх
   * видео, и герою нужен отступ сверху ровно под неё. Угадывать нельзя: на
   * телефоне полосы переносятся и высота вырастает с 138 до 254 px — на
   * этом уже поймались, заголовок оказался под логотипом. Меняется она и
   * при смене языка (подписи другой длины), поэтому слушаем ResizeObserver.
   */
  function syncTopbarHeight() {
    var bar = document.querySelector(".tt-public-topbar");
    if (!bar) return;
    document.documentElement.style.setProperty(
      "--tt-topbar-h", Math.round(bar.getBoundingClientRect().height) + "px");
  }

  function initTopbarHeight() {
    var bar = document.querySelector(".tt-public-topbar");
    if (!bar) return;
    syncTopbarHeight();
    if (global.ResizeObserver) {
      new global.ResizeObserver(syncTopbarHeight).observe(bar);
    } else {
      global.addEventListener("resize", syncTopbarHeight);
    }
  }

  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        setTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    }
    syncThemeButton();
  }

  function formatRate(value) {
    var numeric = Number(String(value).replace(",", "."));
    if (!Number.isFinite(numeric)) return "—";
    var locale = language === "uz" ? "uz-UZ" :
      language === "tr" ? "tr-TR" :
      language === "en" ? "en-US" : "ru-RU";
    // ЦБ отдаёт курс с копейками, но в табло показываем целыми — как у
    // операторского кабинета: «$ 1 = 11 976», без дробной части.
    return numeric.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function readStoredRates() {
    try {
      return JSON.parse(global.localStorage.getItem(STORAGE_RATES) || "null");
    } catch (_) {
      return null;
    }
  }

  function paintRates(rates) {
    if (!rates || !rates.USD || !rates.EUR) return false;
    // Курсы рисуем во ВСЕ табло сразу (публичная шапка + шапка кабинета),
    // поэтому ищем по data-атрибуту, а не по одному id.
    var dateText = t("rate.source") + (rates.date ? " · " + rates.date : "");
    document.querySelectorAll('[data-rate="usd"]').forEach(function (n) {
      n.textContent = formatRate(rates.USD);
    });
    document.querySelectorAll('[data-rate="eur"]').forEach(function (n) {
      n.textContent = formatRate(rates.EUR);
    });
    document.querySelectorAll('[data-rate="date"]').forEach(function (n) {
      n.textContent = dateText;
    });
    return true;
  }

  function paintStoredRates() {
    return paintRates(readStoredRates());
  }

  // Наш воркер отдаёт уже разобранный {USD, EUR, date}; прямой запрос к ЦБ —
  // резерв для демо без бэкенда (в браузере он часто падает из-за CORS).
  function apiBase() {
    var cfg = global.TURON_CONFIG;
    return cfg && cfg.apiBaseUrl ? String(cfg.apiBaseUrl).replace(/\/$/, "") : "";
  }

  function fromCbuRows(rows) {
    var result = {};
    rows.forEach(function (row) {
      if (row.Ccy === "USD" || row.Ccy === "EUR") {
        result[row.Ccy] = row.Rate;
        result.date = row.Date;
      }
    });
    return result;
  }

  function loadRates() {
    paintStoredRates();
    var base = apiBase();
    var viaWorker = base
      ? global.fetch(base + "/api/public/rates", { cache: "no-store" })
          .then(function (r) {
            if (!r.ok) throw new Error("rates " + r.status);
            return r.json();
          })
      : Promise.reject(new Error("no-api"));

    viaWorker
      .catch(function () {
        // демо/резерв: пробуем ЦБ напрямую (в браузере может не пройти CORS)
        return global.fetch(CBU_ENDPOINT, { cache: "no-store" })
          .then(function (r) {
            if (!r.ok) throw new Error("CBU " + r.status);
            return r.json();
          })
          .then(fromCbuRows);
      })
      .then(function (result) {
        if (!result || !result.USD || !result.EUR) {
          throw new Error("rates incomplete");
        }
        try { global.localStorage.setItem(STORAGE_RATES, JSON.stringify(result)); } catch (_) {}
        paintRates(result);
      })
      .catch(function () {
        document.querySelectorAll('[data-rate="date"]').forEach(function (n) {
          if (!readStoredRates()) n.textContent = t("rate.unavailable");
        });
      });
  }

  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    document.querySelectorAll(".tt-public-subnav [data-scroll-target]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.scrollTarget === id);
    });
  }

  var revealObserver = null;
  var heroScrollCleanup = null;

  /* Первый экран намеренно выше окна, чтобы широкоформатное видео не резало
   * важные детали. Из-за этого обычным колесом до Японии приходится долго
   * прокручивать пустой хвост ролика. На гостевой титульной один уверенный
   * жест переводит ровно к следующему листу; дальше страница снова скроллится
   * как обычно. На тач-экранах не вмешиваемся — там естественный свайп точнее
   * программного перехвата. */
  function initHeroScroll(container) {
    if (heroScrollCleanup) heroScrollCleanup();
    heroScrollCleanup = null;

    var hero = container.querySelector(".tt-public-intro.tt-has-japan-sheet");
    var japan = container.querySelector(".tt-japan-sheet");
    if (!hero || !japan) return;

    var reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = global.matchMedia && global.matchMedia("(pointer: coarse)").matches;
    var locked = false;
    var unlockTimer = 0;

    function activateJapan(active) {
      japan.classList.toggle("is-scroll-active", active);
    }

    var observer = null;
    if (!reduced && "IntersectionObserver" in global) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          activateJapan(entry.isIntersecting && entry.intersectionRatio >= 0.28);
        });
      }, { threshold: [0, 0.28, 0.7] });
      observer.observe(japan);
    } else {
      activateJapan(true);
    }

    function glideTo(target) {
      locked = true;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      global.clearTimeout(unlockTimer);
      unlockTimer = global.setTimeout(function () { locked = false; }, reduced ? 0 : 900);
    }

    function onWheel(event) {
      if (coarse || locked || event.ctrlKey || Math.abs(event.deltaY) < 4) return;
      if (event.target.closest("select, input, textarea, [contenteditable='true']")) return;

      var heroRect = hero.getBoundingClientRect();
      var japanRect = japan.getBoundingClientRect();
      var nearJapanTop = Math.abs(japanRect.top) <= 10;

      if (event.deltaY > 0 && heroRect.top <= 10 && japanRect.top > 10) {
        event.preventDefault();
        glideTo(japan);
      } else if (event.deltaY < 0 && nearJapanTop) {
        event.preventDefault();
        glideTo(hero);
      }
    }

    global.addEventListener("wheel", onWheel, { passive: false });
    heroScrollCleanup = function () {
      global.removeEventListener("wheel", onWheel);
      global.clearTimeout(unlockTimer);
      if (observer) observer.disconnect();
    };
  }

  function initReveal(container) {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = null;

    var targets = Array.prototype.slice.call(container.querySelectorAll(
      ".tt-public-intro, .tt-public-catalogue, .tt-about-company"
    ));
    if (!targets.length) return;

    var reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    targets.forEach(function (target) { target.classList.add("tt-reveal-ready"); });
    if (reduced || !("IntersectionObserver" in global)) {
      targets.forEach(function (target) { target.classList.add("is-visible"); });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

    targets.forEach(function (target) { revealObserver.observe(target); });
  }

  function enhance(container) {
    container = container || document;
    initReveal(container);
    initHeroScroll(container);
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-scroll-target]");
    if (target) {
      event.preventDefault();
      scrollToSection(target.dataset.scrollTarget);
    }
  });

  initLangWidget();

  applyStaticTranslations();
  loadRates();

  initTheme();
  initTopbarHeight();

  global.TuronPublicUi = {
    t: t,
    theme: currentTheme,
    setTheme: setTheme,
    language: function () { return language; },
    setLanguage: setLanguage,
    loadRates: loadRates,
    enhance: enhance
  };
})(window);
