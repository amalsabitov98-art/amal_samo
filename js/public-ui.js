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
      "nav.excursions": "Экскурсионные туры",
      "nav.tours": "Туры",
      "nav.about": "О компании",
      "login.kicker": "Партнёрский доступ",
      "login.title": "Добро пожаловать",
      "login.note": "Войдите в кабинет агентства Turon Tour",
      "login.user": "Логин",
      "login.password": "Пароль",
      "login.back": "← В каталог",
      "hero.kicker": "Туроператор из Ташкента · Узбекистан",
      "hero.title": "Путешествия,",
      "hero.accent": "которые остаются с вами.",
      "hero.text": "Экскурсионные и групповые туры с продуманной программой, перелётом и поддержкой команды на всём маршруте.",
      "hero.primary": "Смотреть экскурсионные туры",
      "hero.secondary": "Все туры",
      "catalog.kicker": "Коллекция Turon Tour",
      "catalog.title": "Выберите направление",
      "catalog.text": "Откройте программы, ближайшие даты и доступные варианты размещения.",
      "about.kicker": "О компании",
      "about.title": "Не просто отправляем в поездку. Собираем путешествие целиком.",
      "about.text": "Turon Tour — туроператор из Ташкента. Мы создаём экскурсионные и групповые маршруты, объединяя перелёт, размещение, программу и сопровождение в одной понятной системе.",
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
      "nav.excursions": "Ekskursiya turlari",
      "nav.tours": "Turlar",
      "nav.about": "Kompaniya haqida",
      "login.kicker": "Hamkorlar uchun",
      "login.title": "Xush kelibsiz",
      "login.note": "Turon Tour agentlik kabinetiga kiring",
      "login.user": "Login",
      "login.password": "Parol",
      "login.back": "← Katalogga",
      "hero.kicker": "Toshkentdagi turoperator · O‘zbekiston",
      "hero.title": "Siz bilan qoladigan",
      "hero.accent": "sayohatlar.",
      "hero.text": "Puxta dastur, aviaqatnov va butun yo‘nalish davomida jamoa ko‘magi bilan ekskursiya hamda guruh turlari.",
      "hero.primary": "Ekskursiya turlarini ko‘rish",
      "hero.secondary": "Barcha turlar",
      "catalog.kicker": "Turon Tour kolleksiyasi",
      "catalog.title": "Yo‘nalishni tanlang",
      "catalog.text": "Dasturlar, yaqin sanalar va joylashuv variantlarini ko‘ring.",
      "about.kicker": "Kompaniya haqida",
      "about.title": "Shunchaki safarga jo‘natmaymiz. Sayohatni to‘liq yaratamiz.",
      "about.text": "Turon Tour — Toshkentdagi turoperator. Biz parvoz, mehmonxona, dastur va hamrohlikni yagona tushunarli tizimga birlashtirgan ekskursiya va guruh yo‘nalishlarini yaratamiz.",
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
      "nav.excursions": "Excursion tours",
      "nav.tours": "Tours",
      "nav.about": "About us",
      "login.kicker": "Partner access",
      "login.title": "Welcome",
      "login.note": "Sign in to the Turon Tour agency workspace",
      "login.user": "Login",
      "login.password": "Password",
      "login.back": "← Back to catalogue",
      "hero.kicker": "Tour operator from Tashkent · Uzbekistan",
      "hero.title": "Journeys that",
      "hero.accent": "stay with you.",
      "hero.text": "Excursion and group tours with a thoughtful programme, flights and support from our team throughout the route.",
      "hero.primary": "Explore excursion tours",
      "hero.secondary": "All tours",
      "catalog.kicker": "The Turon Tour collection",
      "catalog.title": "Choose a destination",
      "catalog.text": "Explore programmes, upcoming dates and available accommodation options.",
      "about.kicker": "About us",
      "about.title": "We do more than send you away. We build the whole journey.",
      "about.text": "Turon Tour is a Tashkent-based tour operator. We create excursion and group itineraries that bring flights, accommodation, experiences and on-route support into one clear system.",
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
      "nav.excursions": "Kültür turları",
      "nav.tours": "Turlar",
      "nav.about": "Hakkımızda",
      "login.kicker": "İş ortağı erişimi",
      "login.title": "Hoş geldiniz",
      "login.note": "Turon Tour acente paneline giriş yapın",
      "login.user": "Kullanıcı adı",
      "login.password": "Şifre",
      "login.back": "← Kataloğa dön",
      "hero.kicker": "Taşkent merkezli tur operatörü · Özbekistan",
      "hero.title": "Sizinle kalan",
      "hero.accent": "yolculuklar.",
      "hero.text": "Özenle hazırlanan program, uçuşlar ve rota boyunca ekip desteğiyle kültür ve grup turları.",
      "hero.primary": "Kültür turlarını keşfet",
      "hero.secondary": "Tüm turlar",
      "catalog.kicker": "Turon Tour koleksiyonu",
      "catalog.title": "Rotanızı seçin",
      "catalog.text": "Programları, yaklaşan tarihleri ve konaklama seçeneklerini inceleyin.",
      "about.kicker": "Hakkımızda",
      "about.title": "Sadece tatile göndermiyoruz. Yolculuğun tamamını tasarlıyoruz.",
      "about.text": "Turon Tour, Taşkent merkezli bir tur operatörüdür. Uçuş, konaklama, program ve rota desteğini tek bir anlaşılır sistemde birleştiren kültür ve grup turları hazırlıyoruz.",
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
    var select = document.getElementById("public-language");
    if (select) select.value = language;
  }

  function setLanguage(next) {
    if (!dictionaries[next]) return;
    language = next;
    try { global.localStorage.setItem(STORAGE_LANGUAGE, next); } catch (_) {}
    applyStaticTranslations();
    global.dispatchEvent(new CustomEvent("turon:language", {
      detail: { language: language }
    }));
    paintStoredRates();
  }

  function formatRate(value) {
    var numeric = Number(String(value).replace(",", "."));
    if (!Number.isFinite(numeric)) return "—";
    var locale = language === "uz" ? "uz-UZ" :
      language === "tr" ? "tr-TR" :
      language === "en" ? "en-US" : "ru-RU";
    return numeric.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
    var usd = document.getElementById("rate-usd");
    var eur = document.getElementById("rate-eur");
    var date = document.getElementById("rate-date");
    if (usd) usd.textContent = formatRate(rates.USD);
    if (eur) eur.textContent = formatRate(rates.EUR);
    if (date) date.textContent = t("rate.source") + (rates.date ? " · " + rates.date : "");
    return true;
  }

  function paintStoredRates() {
    return paintRates(readStoredRates());
  }

  function loadRates() {
    paintStoredRates();
    global.fetch(CBU_ENDPOINT, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("CBU " + response.status);
        return response.json();
      })
      .then(function (rows) {
        var result = {};
        rows.forEach(function (row) {
          if (row.Ccy === "USD" || row.Ccy === "EUR") {
            result[row.Ccy] = row.Rate;
            result.date = row.Date;
          }
        });
        if (!result.USD || !result.EUR) throw new Error("CBU data incomplete");
        try { global.localStorage.setItem(STORAGE_RATES, JSON.stringify(result)); } catch (_) {}
        paintRates(result);
      })
      .catch(function () {
        var date = document.getElementById("rate-date");
        if (date && !readStoredRates()) date.textContent = t("rate.unavailable");
      });
  }

  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll(".tt-public-subnav [data-scroll-target]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.scrollTarget === id);
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-scroll-target]");
    if (target) {
      event.preventDefault();
      scrollToSection(target.dataset.scrollTarget);
    }
  });

  var languageSelect = document.getElementById("public-language");
  if (languageSelect) {
    languageSelect.addEventListener("change", function () {
      setLanguage(languageSelect.value);
    });
  }

  applyStaticTranslations();
  loadRates();

  global.TuronPublicUi = {
    t: t,
    language: function () { return language; },
    setLanguage: setLanguage,
    loadRates: loadRates
  };
})(window);
