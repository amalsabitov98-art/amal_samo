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
      "login.hub": "Turon Partner Hub",
      "login.storyKicker": "B2B для туристических агентств",
      "login.storyTitle": "Авторские туры для вашего агентства",
      "login.storyText": "Партнёрские условия, программы и бронирование эксклюзивных маршрутов Turon Tour.",
      "login.benefitTerms": "Партнёрские условия",
      "login.benefitMaterials": "Готовые материалы",
      "login.benefitBooking": "Онлайн-бронирование",
      "hero.kicker": "Туроператор из Ташкента · Узбекистан",
      "hero.title": "Путешествия,",
      "hero.accent": "которые остаются с вами.",
      "hero.text": "Экскурсионные и групповые туры с продуманной программой, перелётом и поддержкой команды на всём маршруте.",
      "hero.primary": "Смотреть экскурсионные туры",
      "hero.secondary": "Все туры",
      "hero.route": "Маршрут Карадениз",
      "slider.label": "Визуальная история маршрута Ризе и Батуми",
      "slider.controls": "Управление слайдером",
      "slider.previous": "Предыдущий слайд",
      "slider.next": "Следующий слайд",
      "slider.pause": "Остановить автопрокрутку",
      "slider.play": "Возобновить автопрокрутку",
      "slider.slide1": "Чайные террасы Ризе переходят в побережье Батуми",
      "slider.slide2": "Утренний туман над чайными террасами Ризе",
      "slider.slide3": "Бульвар и побережье Батуми на закате",
      "slider.goto1": "Показать слайд 1",
      "slider.goto2": "Показать слайд 2",
      "slider.goto3": "Показать слайд 3",
      "slider.status1": "Слайд 1 из 3",
      "slider.status2": "Слайд 2 из 3",
      "slider.status3": "Слайд 3 из 3",
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
      "login.hub": "Turon Partner Hub",
      "login.storyKicker": "Turagentliklar uchun B2B",
      "login.storyTitle": "Agentligingiz uchun mualliflik turlari",
      "login.storyText": "Turon Tour eksklyuziv yo‘nalishlari uchun hamkorlik shartlari, dasturlar va bronlash.",
      "login.benefitTerms": "Hamkorlik shartlari",
      "login.benefitMaterials": "Tayyor materiallar",
      "login.benefitBooking": "Onlayn bronlash",
      "hero.kicker": "Toshkentdagi turoperator · O‘zbekiston",
      "hero.title": "Siz bilan qoladigan",
      "hero.accent": "sayohatlar.",
      "hero.text": "Puxta dastur, aviaqatnov va butun yo‘nalish davomida jamoa ko‘magi bilan ekskursiya hamda guruh turlari.",
      "hero.primary": "Ekskursiya turlarini ko‘rish",
      "hero.secondary": "Barcha turlar",
      "hero.route": "Karadeniz yo‘nalishi",
      "slider.label": "Rize va Batumi yo‘nalishining vizual hikoyasi",
      "slider.controls": "Slayder boshqaruvi",
      "slider.previous": "Oldingi slayd",
      "slider.next": "Keyingi slayd",
      "slider.pause": "Avtomatik aylantirishni to‘xtatish",
      "slider.play": "Avtomatik aylantirishni davom ettirish",
      "slider.slide1": "Rize choy terassalaridan Batumi sohiliga",
      "slider.slide2": "Rize choy terassalari uzra tonggi tuman",
      "slider.slide3": "Batumi bulvari va sohili quyosh botishida",
      "slider.goto1": "1-slaydni ko‘rsatish",
      "slider.goto2": "2-slaydni ko‘rsatish",
      "slider.goto3": "3-slaydni ko‘rsatish",
      "slider.status1": "3 slayddan 1-si",
      "slider.status2": "3 slayddan 2-si",
      "slider.status3": "3 slayddan 3-si",
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
      "login.hub": "Turon Partner Hub",
      "login.storyKicker": "B2B for travel agencies",
      "login.storyTitle": "Signature tours for your agency",
      "login.storyText": "Partner terms, programmes and booking for exclusive Turon Tour itineraries.",
      "login.benefitTerms": "Partner terms",
      "login.benefitMaterials": "Ready-to-use materials",
      "login.benefitBooking": "Online booking",
      "hero.kicker": "Tour operator from Tashkent · Uzbekistan",
      "hero.title": "Journeys that",
      "hero.accent": "stay with you.",
      "hero.text": "Excursion and group tours with a thoughtful programme, flights and support from our team throughout the route.",
      "hero.primary": "Explore excursion tours",
      "hero.secondary": "All tours",
      "hero.route": "Karadeniz route",
      "slider.label": "A visual journey through Rize and Batumi",
      "slider.controls": "Carousel controls",
      "slider.previous": "Previous slide",
      "slider.next": "Next slide",
      "slider.pause": "Pause automatic rotation",
      "slider.play": "Resume automatic rotation",
      "slider.slide1": "From Rize tea terraces to the Batumi coast",
      "slider.slide2": "Morning mist over Rize tea terraces",
      "slider.slide3": "Batumi boulevard and coastline at sunset",
      "slider.goto1": "Show slide 1",
      "slider.goto2": "Show slide 2",
      "slider.goto3": "Show slide 3",
      "slider.status1": "Slide 1 of 3",
      "slider.status2": "Slide 2 of 3",
      "slider.status3": "Slide 3 of 3",
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
      "login.hub": "Turon Partner Hub",
      "login.storyKicker": "Seyahat acenteleri için B2B",
      "login.storyTitle": "Acentenize özel özgün turlar",
      "login.storyText": "Turon Tour’un seçkin rotaları için iş ortaklığı koşulları, programlar ve rezervasyon.",
      "login.benefitTerms": "İş ortaklığı koşulları",
      "login.benefitMaterials": "Hazır materyaller",
      "login.benefitBooking": "Online rezervasyon",
      "hero.kicker": "Taşkent merkezli tur operatörü · Özbekistan",
      "hero.title": "Sizinle kalan",
      "hero.accent": "yolculuklar.",
      "hero.text": "Özenle hazırlanan program, uçuşlar ve rota boyunca ekip desteğiyle kültür ve grup turları.",
      "hero.primary": "Kültür turlarını keşfet",
      "hero.secondary": "Tüm turlar",
      "hero.route": "Karadeniz rotası",
      "slider.label": "Rize ve Batum rotasının görsel hikâyesi",
      "slider.controls": "Slayt kontrolleri",
      "slider.previous": "Önceki slayt",
      "slider.next": "Sonraki slayt",
      "slider.pause": "Otomatik geçişi durdur",
      "slider.play": "Otomatik geçişi sürdür",
      "slider.slide1": "Rize çay teraslarından Batum sahiline",
      "slider.slide2": "Rize çay terasları üzerinde sabah sisi",
      "slider.slide3": "Gün batımında Batum bulvarı ve sahili",
      "slider.goto1": "1. slaydı göster",
      "slider.goto2": "2. slaydı göster",
      "slider.goto3": "3. slaydı göster",
      "slider.status1": "3 slayttan 1.",
      "slider.status2": "3 slayttan 2.",
      "slider.status3": "3 slayttan 3.",
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

  var heroCleanup = null;
  var revealObserver = null;

  function initHeroCarousel(container) {
    if (heroCleanup) heroCleanup();
    heroCleanup = null;

    var hero = container.querySelector("[data-hero-carousel]");
    if (!hero) return;

    var slides = Array.prototype.slice.call(hero.querySelectorAll(".tt-hero-slide"));
    var dots = Array.prototype.slice.call(hero.querySelectorAll("[data-hero-dot]"));
    var previous = hero.querySelector("[data-hero-prev]");
    var next = hero.querySelector("[data-hero-next]");
    var toggle = hero.querySelector("[data-hero-toggle]");
    var toggleIcon = toggle && toggle.querySelector("span");
    var status = hero.querySelector("[data-hero-status]");
    var reducedQuery = global.matchMedia
      ? global.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };
    var index = 0;
    var timer = null;
    var pointerStart = null;
    // Автопрокрутка включена по умолчанию — оператор хочет, чтобы кадры
    // менялись сами. При системном «уменьшить движение» кадры всё равно
    // сменяются, но мгновенно (fade убирается в CSS), а не замирают.
    var manuallyPaused = false;
    var focusInside = false;

    function updateToggle() {
      if (!toggle) return;
      toggle.setAttribute("aria-pressed", manuallyPaused ? "true" : "false");
      toggle.setAttribute("aria-label", t(manuallyPaused ? "slider.play" : "slider.pause"));
      if (toggleIcon) toggleIcon.textContent = manuallyPaused ? "▶" : "Ⅱ";
    }

    function setSlide(nextIndex, announce) {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach(function (dot, dotIndex) {
        var active = dotIndex === index;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      if (status) {
        status.setAttribute("aria-live", announce ? "polite" : "off");
        status.textContent = t("slider.status" + (index + 1)) + " — " +
          t("slider.slide" + (index + 1));
      }
    }

    function stopTimer() {
      if (timer) global.clearInterval(timer);
      timer = null;
    }

    function startTimer() {
      stopTimer();
      // Наведение мыши больше не ставит на паузу: hero теперь во весь
      // экран, курсор почти всегда над ним — иначе карусель стояла бы.
      // Пауза остаётся ручной (кнопка) и при скрытой вкладке.
      if (slides.length < 2 || manuallyPaused || focusInside || document.hidden) return;
      timer = global.setInterval(function () {
        setSlide(index + 1, false);
      }, 6500);
    }

    function choose(nextIndex) {
      manuallyPaused = true;
      updateToggle();
      setSlide(nextIndex, true);
      stopTimer();
    }

    function onPrevious() { choose(index - 1); }
    function onNext() { choose(index + 1); }
    function onToggle() {
      manuallyPaused = !manuallyPaused;
      updateToggle();
      if (manuallyPaused) stopTimer();
      else startTimer();
    }
    function onKeydown(event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "Home") {
        event.preventDefault();
        choose(0);
      } else if (event.key === "End") {
        event.preventDefault();
        choose(slides.length - 1);
      }
    }
    function onPointerDown(event) {
      if (event.pointerType !== "touch") return;
      pointerStart = { x: event.clientX, y: event.clientY };
    }
    function onPointerUp(event) {
      if (!pointerStart || event.pointerType !== "touch") return;
      var x = event.clientX - pointerStart.x;
      var y = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(x) < 48 || Math.abs(x) < Math.abs(y) * 1.2) return;
      if (x < 0) onNext();
      else onPrevious();
    }
    function onVisibility() {
      if (document.hidden) stopTimer();
      else startTimer();
    }
    function onMotionChange() {
      // «Уменьшить движение» больше не выключает автопрокрутку — только
      // убирает плавность перехода (это делает CSS). Кадры идут дальше.
    }

    if (previous) previous.addEventListener("click", onPrevious);
    if (next) next.addEventListener("click", onNext);
    if (toggle) toggle.addEventListener("click", onToggle);
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        choose(Number(dot.dataset.heroDot));
      });
    });
    hero.addEventListener("keydown", onKeydown);
    hero.addEventListener("pointerdown", onPointerDown, { passive: true });
    hero.addEventListener("pointerup", onPointerUp, { passive: true });
    hero.addEventListener("pointercancel", function () { pointerStart = null; });
    hero.addEventListener("focusin", function () {
      focusInside = true;
      stopTimer();
    });
    hero.addEventListener("focusout", function (event) {
      if (event.relatedTarget && hero.contains(event.relatedTarget)) return;
      focusInside = false;
      startTimer();
    });
    document.addEventListener("visibilitychange", onVisibility);
    if (reducedQuery.addEventListener) reducedQuery.addEventListener("change", onMotionChange);

    setSlide(0, false);
    updateToggle();
    startTimer();

    heroCleanup = function () {
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      if (reducedQuery.removeEventListener) {
        reducedQuery.removeEventListener("change", onMotionChange);
      }
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
    initHeroCarousel(container || document);
    initReveal(container || document);
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
    loadRates: loadRates,
    enhance: enhance
  };
})(window);
