/*
 * Слой данных Turon Tour.
 *
 * Источник данных абстрагирован через DataSource: сейчас это моки ниже,
 * позже — замена на fetch() к Cloudflare Worker, который отдаёт те же
 * структуры из Google Sheet. Экраны (search.js, tour.js, booking.js)
 * работают только через функции TourData.* и не знают, откуда данные.
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------
  // Категории размещения и типы номеров — общий справочник
  // ---------------------------------------------------------------------
  var ROOM_TYPES = {
    DBL: "Двухместный (Standard Double/Twin)",
    SGL: "Одноместный (Single)",
    TRPL: "Трёхместный (Triple)",
  };

  var HOTEL_CATEGORIES = {
    standard: "Стандарт",
    comfort: "Комфорт",
    premium: "Премиум",
  };

  // ---------------------------------------------------------------------
  // Моковые туры (структура соответствует будущим листам Google Sheet:
  // Tours, TourDepartures, TourPriceMatrix, TourProgram, Excursions)
  // ---------------------------------------------------------------------
  var TOURS = [
    {
      id: "jp-golden-ring",
      slug: "zolotoe-koltso-yaponii",
      title: "Золотое кольцо Японии",
      country: "Япония",
      cities: ["Токио", "Киото", "Осака", "Нара"],
      duration_days: 10,
      duration_nights: 9,
      cover_image: "assets/tours/jp-golden-ring/cover.jpg",
      short_description:
        "Классический маршрут по главным городам Японии: императорский Токио, древний Киото, храмы Нары и гастрономическая Осака.",
      is_constructor: false,
      departures: [
        { date_start: "2026-09-12", date_end: "2026-09-21", season_code: "autumn_low" },
        { date_start: "2026-10-03", date_end: "2026-10-12", season_code: "autumn_high" },
        { date_start: "2026-11-07", date_end: "2026-11-16", season_code: "autumn_high" },
        { date_start: "2027-04-03", date_end: "2027-04-12", season_code: "sakura_peak" },
      ],
      hotels: [
        { category: "standard", name: "3* сети Sotetsu Fresa / аналог" },
        { category: "comfort", name: "4* сети Mitsui Garden / аналог" },
        { category: "premium", name: "5* сети Hyatt Regency / аналог" },
      ],
      // цена за человека, USD, по категории отеля -> типу номера -> сезону
      price_matrix: {
        standard: {
          DBL: { autumn_low: 2190, autumn_high: 2390, sakura_peak: 2690 },
          SGL: { autumn_low: 2890, autumn_high: 3090, sakura_peak: 3390 },
          TRPL: { autumn_low: 2050, autumn_high: 2230, sakura_peak: 2510 },
        },
        comfort: {
          DBL: { autumn_low: 2490, autumn_high: 2690, sakura_peak: 2990 },
          SGL: { autumn_low: 3290, autumn_high: 3490, sakura_peak: 3790 },
          TRPL: { autumn_low: 2340, autumn_high: 2520, sakura_peak: 2800 },
        },
        premium: {
          DBL: { autumn_low: 3190, autumn_high: 3490, sakura_peak: 3890 },
          SGL: { autumn_low: 4190, autumn_high: 4490, sakura_peak: 4890 },
          TRPL: { autumn_low: 2990, autumn_high: 3250, sakura_peak: 3620 },
        },
      },
      program: [
        { day: 1, title: "Прилёт в Токио", description: "Встреча в аэропорту Нарита/Ханэда, трансфер в отель, свободное время." },
        { day: 2, title: "Токио: императорский дворец и Асакуса", description: "Площадь Императорского дворца, храм Сэнсо-дзи, квартал Асакуса, смотровая площадка Tokyo Skytree." },
        { day: 3, title: "Токио: Сибуя и Харадзюку", description: "Перекрёсток Сибуя, улица Такэсита, парк Ёёги, современные кварталы." },
        { day: 4, title: "Переезд в Киото на синкансэне", description: "Скоростной поезд Токио–Киото, размещение, вечерняя прогулка по Гиону." },
        { day: 5, title: "Киото: золотой и серебряный павильоны", description: "Кинкаку-дзи, Гинкаку-дзи, философская тропа." },
        { day: 6, title: "Нара: олений парк и Тодай-дзи", description: "Дневная экскурсия в Нару, храм Тодай-дзи, парк с ручными оленями." },
        { day: 7, title: "Киото: Фусими Инари", description: "Тысячи оранжевых тории храма Фусими Инари, район Арасияма и бамбуковая роща." },
        { day: 8, title: "Переезд в Осаку", description: "Замок Осаки, квартал Дотонбори, гастрономический вечер." },
        { day: 9, title: "Осака: свободный день", description: "Свободное время для шоппинга и дополнительных экскурсий (см. блок «Дополнительно»)." },
        { day: 10, title: "Вылет из Осаки/Токио", description: "Трансфер в аэропорт, вылет." },
      ],
      included: [
        "Проживание согласно выбранной категории отеля",
        "Завтраки на протяжении всего тура",
        "Внутренние переезды по программе (синкансэн, трансферы)",
        "Русскоговорящий гид-сопровождающий",
        "Входные билеты по программе",
      ],
      excluded: [
        "Авиаперелёт до Токио и обратно из Осаки",
        "Виза в Японию",
        "Медицинская страховка",
        "Личные расходы",
        "Дополнительные экскурсии",
      ],
      visa_documents: [
        "Загранпаспорт (срок действия от 6 мес. после окончания поездки)",
        "Анкета на визу",
        "Фото 4.5×4.5 см",
        "Справка с места работы",
        "Выписка со счёта / спонсорское письмо",
      ],
      excursion_ids: ["jp-osaka-food", "jp-teamlab", "jp-mtfuji"],
    },
    {
      id: "jp-tokyo-lights",
      slug: "legendy-i-ogni-tokio",
      title: "Легенды и огни Токио",
      country: "Япония",
      cities: ["Токио"],
      duration_days: 6,
      duration_nights: 5,
      cover_image: "assets/tours/jp-tokyo-lights/cover.jpg",
      short_description:
        "Компактный городской тур по Токио: от древних храмов до неоновых кварталов будущего.",
      is_constructor: false,
      departures: [
        { date_start: "2026-09-05", date_end: "2026-09-10", season_code: "autumn_low" },
        { date_start: "2026-10-17", date_end: "2026-10-22", season_code: "autumn_high" },
        { date_start: "2026-12-26", date_end: "2026-12-31", season_code: "newyear" },
      ],
      hotels: [
        { category: "standard", name: "3* сети Sotetsu Fresa / аналог" },
        { category: "comfort", name: "4* сети Shinagawa Prince / аналог" },
        { category: "premium", name: "5* сети Park Hyatt / аналог" },
      ],
      price_matrix: {
        standard: {
          DBL: { autumn_low: 1290, autumn_high: 1390, newyear: 1690 },
          SGL: { autumn_low: 1690, autumn_high: 1790, newyear: 2190 },
          TRPL: { autumn_low: 1190, autumn_high: 1280, newyear: 1560 },
        },
        comfort: {
          DBL: { autumn_low: 1490, autumn_high: 1590, newyear: 1890 },
          SGL: { autumn_low: 1990, autumn_high: 2090, newyear: 2490 },
          TRPL: { autumn_low: 1390, autumn_high: 1480, newyear: 1760 },
        },
        premium: {
          DBL: { autumn_low: 1990, autumn_high: 2190, newyear: 2590 },
          SGL: { autumn_low: 2690, autumn_high: 2890, newyear: 3390 },
          TRPL: { autumn_low: 1860, autumn_high: 2040, newyear: 2420 },
        },
      },
      program: [
        { day: 1, title: "Прилёт в Токио", description: "Встреча, трансфер в отель, вечерняя прогулка по Синдзюку." },
        { day: 2, title: "Асакуса и Уэно", description: "Храм Сэнсо-дзи, парк Уэно, музеи (по желанию)." },
        { day: 3, title: "Сибуя, Харадзюку, Одайба", description: "Современный Токио и ночная иллюминация Одайбы." },
        { day: 4, title: "TeamLab и Акихабара", description: "Цифровой музей искусства, квартал электроники и аниме-культуры." },
        { day: 5, title: "Свободный день", description: "Время для шоппинга и дополнительных экскурсий." },
        { day: 6, title: "Вылет из Токио", description: "Трансфер в аэропорт." },
      ],
      included: [
        "Проживание согласно выбранной категории отеля",
        "Завтраки",
        "Трансферы аэропорт-отель-аэропорт",
        "Русскоговорящий гид",
      ],
      excluded: [
        "Авиаперелёт",
        "Виза в Японию",
        "Медицинская страховка",
        "Дополнительные экскурсии",
      ],
      visa_documents: [
        "Загранпаспорт (срок действия от 6 мес. после окончания поездки)",
        "Анкета на визу",
        "Фото 4.5×4.5 см",
      ],
      excursion_ids: ["jp-teamlab", "jp-disneysea"],
    },
    {
      id: "jp-tokyo-constructor",
      slug: "tur-konstruktor-legendy-i-ogni-tokio",
      title: "Тур-конструктор «Легенды и огни Токио»",
      country: "Япония",
      cities: ["Токио"],
      duration_days: 6,
      duration_nights: 5,
      cover_image: "assets/tours/jp-tokyo-lights/cover.jpg",
      short_description:
        "Та же база, что и «Легенды и огни Токио», но вы сами собираете программу: гид, экскурсии и трансферы — по желанию.",
      is_constructor: true,
      departures: [
        { date_start: "2026-09-05", date_end: "2026-09-10", season_code: "autumn_low" },
        { date_start: "2026-10-17", date_end: "2026-10-22", season_code: "autumn_high" },
        { date_start: "2026-12-26", date_end: "2026-12-31", season_code: "newyear" },
      ],
      hotels: [
        { category: "standard", name: "3* сети Sotetsu Fresa / аналог" },
        { category: "comfort", name: "4* сети Shinagawa Prince / аналог" },
        { category: "premium", name: "5* сети Park Hyatt / аналог" },
      ],
      // в конструкторе базовая цена — это только перелёт+проживание,
      // остальное собирается из optional_modules
      price_matrix: {
        standard: {
          DBL: { autumn_low: 990, autumn_high: 1060, newyear: 1290 },
          SGL: { autumn_low: 1290, autumn_high: 1360, newyear: 1690 },
          TRPL: { autumn_low: 910, autumn_high: 970, newyear: 1190 },
        },
        comfort: {
          DBL: { autumn_low: 1160, autumn_high: 1230, newyear: 1460 },
          SGL: { autumn_low: 1560, autumn_high: 1630, newyear: 1960 },
          TRPL: { autumn_low: 1080, autumn_high: 1140, newyear: 1360 },
        },
        premium: {
          DBL: { autumn_low: 1590, autumn_high: 1730, newyear: 2060 },
          SGL: { autumn_low: 2160, autumn_high: 2320, newyear: 2760 },
          TRPL: { autumn_low: 1490, autumn_high: 1620, newyear: 1930 },
        },
      },
      program: [
        { day: 1, title: "Прилёт в Токио", description: "Заселение в отель. Трансфер и гид — опционально (см. модули)." },
        { day: 2, title: "Свободный день / модуль «Классика Токио»", description: "Асакуса, Сибуя, Харадзюку — при выборе модуля." },
        { day: 3, title: "Свободный день / модуль «TeamLab + Одайба»", description: "Цифровое искусство и вечерний Токио — при выборе модуля." },
        { day: 4, title: "Свободный день / модуль «Диснейленд/DisneySea»", description: "Полный день в парке развлечений — при выборе модуля." },
        { day: 5, title: "Свободный день", description: "На усмотрение туриста." },
        { day: 6, title: "Вылет из Токио", description: "Трансфер в аэропорт — опционально." },
      ],
      included: [
        "Проживание согласно выбранной категории отеля",
        "Завтраки",
      ],
      excluded: [
        "Авиаперелёт",
        "Виза в Японию",
        "Медицинская страховка",
        "Трансферы (доступны как модуль)",
        "Гид и экскурсии (доступны как модули)",
      ],
      visa_documents: [
        "Загранпаспорт (срок действия от 6 мес. после окончания поездки)",
        "Анкета на визу",
        "Фото 4.5×4.5 см",
      ],
      excursion_ids: [],
      optional_modules: [
        { id: "mod-transfer", title: "Трансфер аэропорт-отель-аэропорт", price_per_person: 65, min_group: 1 },
        { id: "mod-guide-classic", title: "Модуль «Классика Токио» с гидом", price_per_person: 120, min_group: 2 },
        { id: "mod-teamlab", title: "Модуль «TeamLab + Одайба»", price_per_person: 95, min_group: 2 },
        { id: "mod-disney", title: "Модуль «Диснейленд/DisneySea», билет+трансфер", price_per_person: 140, min_group: 1 },
      ],
    },
  ];

  // ---------------------------------------------------------------------
  // Экскурсии — независимая сущность, привязывается к турам по excursion_ids
  // ---------------------------------------------------------------------
  var EXCURSIONS = [
    {
      id: "jp-osaka-food",
      title: "Гастрономический вечер в Дотонбори",
      description: "Дегустация такояки, окономияки и крафтового саке с местным гидом.",
      price_per_person: 85,
      min_group: 2,
      duration_hours: 3,
    },
    {
      id: "jp-teamlab",
      title: "TeamLab Planets — цифровое искусство",
      description: "Билет и трансфер в интерактивный музей цифрового искусства.",
      price_per_person: 60,
      min_group: 1,
      duration_hours: 3,
    },
    {
      id: "jp-mtfuji",
      title: "Гора Фудзи и озеро Кавагутико",
      description: "Однодневная поездка к подножию Фудзи, смотровая площадка, озеро.",
      price_per_person: 140,
      min_group: 4,
      duration_hours: 10,
    },
    {
      id: "jp-disneysea",
      title: "Tokyo DisneySea — целый день",
      description: "Входной билет и трансфер в парк развлечений Tokyo DisneySea.",
      price_per_person: 130,
      min_group: 1,
      duration_hours: 9,
    },
  ];

  // ---------------------------------------------------------------------
  // Страховки — фиксированный список тарифов
  // ---------------------------------------------------------------------
  var INSURANCE_PLANS = [
    { id: "ins-basic", title: "Базовая медицинская страховка", price_per_person_per_day: 2.5, coverage: "до $30 000" },
    { id: "ins-extended", title: "Расширенная страховка (спорт, эвакуация)", price_per_person_per_day: 4.5, coverage: "до $75 000" },
  ];

  // ---------------------------------------------------------------------
  // Источник данных переключается через window.TURON_CONFIG.apiBaseUrl
  // (см. js/config.js). Пусто/не задан — работаем на моках выше, что
  // удобно для разработки фронта и для демо на GitHub Pages без бэкенда.
  // Задан — данные читаются из Cloudflare Worker (worker/index.js),
  // который сам тянет их из Google Sheet. Экраны вызывают только
  // TourData.* и не знают, какой источник активен.
  // ---------------------------------------------------------------------
  var API_BASE = (global.TURON_CONFIG && global.TURON_CONFIG.apiBaseUrl) || "";

  function apiGet(path) {
    return fetch(API_BASE + path).then(function (r) {
      if (!r.ok) throw new Error("API error " + r.status + " on " + path);
      return r.json();
    });
  }

  var toursPromise = null;
  var excursionsPromise = null;
  var insurancePromise = null;

  function loadTours() {
    if (!toursPromise) {
      toursPromise = API_BASE ? apiGet("/api/tours") : Promise.resolve(TOURS.slice());
    }
    return toursPromise;
  }

  function loadExcursions() {
    if (!excursionsPromise) {
      excursionsPromise = API_BASE ? apiGet("/api/excursions") : Promise.resolve(EXCURSIONS.slice());
    }
    return excursionsPromise;
  }

  function loadInsurancePlans() {
    if (!insurancePromise) {
      insurancePromise = API_BASE ? apiGet("/api/insurance") : Promise.resolve(INSURANCE_PLANS.slice());
    }
    return insurancePromise;
  }

  var TourData = {
    ROOM_TYPES: ROOM_TYPES,
    HOTEL_CATEGORIES: HOTEL_CATEGORIES,

    getTours: function (filters) {
      filters = filters || {};
      return loadTours().then(function (all) {
        var list = all.slice();
        if (filters.country) {
          list = list.filter(function (t) { return t.country === filters.country; });
        }
        if (filters.query) {
          var q = filters.query.toLowerCase();
          list = list.filter(function (t) {
            return t.title.toLowerCase().indexOf(q) !== -1 ||
              t.cities.join(" ").toLowerCase().indexOf(q) !== -1;
          });
        }
        if (filters.dateFrom) {
          list = list.filter(function (t) {
            return t.departures.some(function (d) { return d.date_start >= filters.dateFrom; });
          });
        }
        return list;
      });
    },

    getTourBySlug: function (slug) {
      return loadTours().then(function (all) {
        return all.filter(function (t) { return t.slug === slug; })[0] || null;
      });
    },

    getExcursionsByIds: function (ids) {
      var set = {};
      (ids || []).forEach(function (id) { set[id] = true; });
      return loadExcursions().then(function (all) {
        return all.filter(function (e) { return set[e.id]; });
      });
    },

    getAllExcursions: function () {
      return loadExcursions();
    },

    getInsurancePlans: function () {
      return loadInsurancePlans();
    },

    getCountries: function () {
      return loadTours().then(function (all) {
        var seen = {};
        all.forEach(function (t) { seen[t.country] = true; });
        return Object.keys(seen);
      });
    },

    // Без API_BASE заявка складывается в localStorage (демо-режим).
    // С настроенным Worker'ом — POST на /api/bookings, который дописывает
    // строку в лист "Заявки" Google Sheet.
    submitBooking: function (booking) {
      if (API_BASE) {
        return fetch(API_BASE + "/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking),
        }).then(function (r) {
          if (!r.ok) throw new Error("Booking API error " + r.status);
          return r.json();
        });
      }
      try {
        var key = "turon_bookings";
        var existing = JSON.parse(localStorage.getItem(key) || "[]");
        booking.booking_id = "TT-" + Date.now().toString(36).toUpperCase();
        booking.created_at = new Date().toISOString();
        existing.push(booking);
        localStorage.setItem(key, JSON.stringify(existing));
        return Promise.resolve(booking);
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };

  global.TourData = TourData;
})(window);
