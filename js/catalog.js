/*
 * Публичный каталог: направления → туры → карточка тура.
 *
 * Один модуль обслуживает два экрана: гостевой (без входа, бронь
 * недоступна) и вкладку «Каталог» внутри кабинета (бронь работает).
 * TuronCatalog.create() возвращает независимый экземпляр со своим
 * состоянием — иначе два каталога на одной странице делили бы одну
 * переменную и мешали друг другу.
 *
 * Гостю остаток мест показывается ведром («20+ мест»), а не точным
 * числом: сколько именно осталось — внутренняя цифра оператора. В
 * кабинете (canBook) выводится точный остаток, агенту он нужен, чтобы
 * планировать группу.
 */
(function (global) {
  "use strict";

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Авиа · Батуми" };

  function tr(key) {
    return global.TuronPublicUi ? global.TuronPublicUi.t(key) : key;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return "$" + v.toLocaleString("ru-RU", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    });
  }

  // Даты в базе без времени, поэтому форматируем в UTC: иначе местный
  // часовой пояс сдвигает «31 июля» на «30 июля».
  function dateLong(iso) {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", timeZone: "UTC",
    });
  }

  function dateShort(iso) {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
    });
  }

  // «31 июля — 7 августа», если известна длительность тура.
  function dateRange(dateStart, nights) {
    var end = TuronApi.departureEnd(dateStart, nights);
    return end ? dateLong(dateStart) + " — " + dateLong(end) : dateLong(dateStart);
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* Существительное после числа в выдаче поиска. Раньше слово «заездов» было
   * зашито прямо в строку, и на других языках получалось «Topildi 11 заездов»
   * — русское слово посреди узбекской фразы. Теперь берётся из словаря.
   *
   * Правило склонения русское, поэтому применяется только к русскому: для
   * английского оно врало бы на 21 и 31 («21 departure» вместо «departures»),
   * а узбекскому и турецкому склонение после числа вообще не нужно — там во
   * всех трёх формах одно слово. */
  function countWord(n) {
    var one = tr("search.foundOne");
    var few = tr("search.foundFew");
    var many = tr("search.foundMany");
    var lang = global.TuronPublicUi && global.TuronPublicUi.language
      ? global.TuronPublicUi.language() : "ru";
    return lang === "ru" ? plural(n, one, few, many) : (n === 1 ? one : few);
  }

  function crumbs(parts) {
    return '<nav class="tt-crumbs">' + parts.map(function (p, i) {
      if (i === parts.length - 1) return "<span>" + esc(p.text) + "</span>";
      return '<button class="tt-crumb" data-go="' + esc(p.go) + '">' +
        esc(p.text) + "</button><i>/</i>";
    }).join("") + "</nav>";
  }

  function destinationTile(d) {
    var closed = d.departures_count === 0;
    return (
      '<button class="tt-cat-tile' + (closed ? " is-soon" : "") + '" data-dest="' +
        esc(d.name) + '">' +
        // has-photo нужен из-за CSS: тёмная тема задаёт фон плитки
        // сокращением background, а оно сбрасывает background-size, и
        // фотография легла бы в натуральную величину вместо cover.
        '<span class="tt-cat-tile-art' + (d.image ? " has-photo" : "") + '"' +
          (d.image ? ' style="background-image:url(' + esc(d.image) + ')"' : "") +
        "></span>" +
        '<span class="tt-cat-tile-body">' +
          "<strong>" + esc(d.title) + "</strong>" +
          (d.blurb ? '<span class="tt-muted-note">' + esc(d.blurb) + "</span>" : "") +
          '<span class="tt-cat-tile-foot">' +
            "<span>" + d.tours_count + " " +
              plural(d.tours_count, "тур", "тура", "туров") +
              (closed ? "" : " · " + d.departures_count + " " +
                plural(d.departures_count, "заезд", "заезда", "заездов")) +
            "</span>" +
            (closed
              ? '<em class="tt-badge tt-badge-off">Скоро</em>'
              : (d.min_price != null ? "<em>от " + money(d.min_price) + "</em>" : "")) +
          "</span>" +
        "</span>" +
      "</button>"
    );
  }

  function tourRow(t) {
    var closed = !t.is_bookable || t.departures_count === 0;
    var meta = [];
    if (t.nights) meta.push(t.nights + " " + plural(t.nights, "ночь", "ночи", "ночей"));
    if (!closed) {
      meta.push(t.departures_count + " " +
        plural(t.departures_count, "заезд", "заезда", "заездов"));
      if (t.next_date) meta.push("ближайший " + dateLong(t.next_date));
    }
    return (
      '<article class="tt-cat-tour' + (closed ? " is-soon" : "") + '">' +
        "<div>" +
          "<h3>" + esc(t.name) + "</h3>" +
          (meta.length ? '<div class="tt-muted-note">' + esc(meta.join(" · ")) + "</div>" : "") +
          (t.description
            ? "<p>" + esc(t.description) + "</p>"
            : (t.note ? '<p class="tt-muted-note">' + esc(t.note) + "</p>" : "")) +
        "</div>" +
        '<div class="tt-cat-tour-side">' +
          (closed
            ? '<span class="tt-badge tt-badge-off">Скоро</span>'
            : (t.min_price != null
                ? '<div class="tt-cat-from"><span>от</span><strong>' +
                  money(t.min_price) + "</strong></div>"
                : "")) +
          '<button class="tt-btn' + (closed ? " secondary" : "") +
            ' tt-btn-sm" data-tour="' + esc(t.code) + '">' +
            (closed ? "Подробнее" : "Программа и даты") +
          "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function listBlock(title, items, cls) {
    if (!items.length) return "";
    return '<div class="tt-cat-list ' + cls + '"><h3>' + esc(title) + "</h3><ul>" +
      items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      "</ul></div>";
  }

  /*
   * Порядок оплаты: сроки считает TuronApi.paymentPolicy, здесь только
   * разметка. Функция на уровне модуля, а не экземпляра, — её рисует и
   * карточка тура, и окно брони в кабинете.
   *
   * total = 0 — показываем доли в процентах, иначе суммы в деньгах.
   */
  function policyHtml(dateStart, total) {
    var pol = TuronApi.paymentPolicy(dateStart);
    var rows = pol.steps.map(function (s) {
      var sum = total > 0
        ? money(Math.round(total * s.share * 100) / 100)
        : Math.round(s.share * 100) + "%";
      return "<li><strong>" + sum + "</strong> — " + esc(s.label) +
        '<span class="tt-muted-note"> до ' +
        dateShort(s.due.toISOString().slice(0, 10)) + "</span></li>";
    }).join("");
    return '<div class="tt-cat-policy' + (pol.urgent ? " is-urgent" : "") + '">' +
      "<h4>Порядок оплаты</h4><ul>" + rows + "</ul>" +
      (pol.urgent
        ? '<p class="tt-muted-note">До выезда меньше 20 дней — рассрочки нет.</p>'
        : "") +
      "</div>";
  }

  /*
   * ------------------------------------------------------ поиск на титульной
   * Панель ищет по РЕАЛЬНЫМ заездам (TuronApi.catalogDepartures), а не по
   * выдуманному списку курортов: варианты в select-ах строятся из того, что
   * действительно есть в продаже. Поэтому «сентябрь» появляется, только если
   * сентябрьские заезды заведены, а аэропорт — только тот, куда правда летим.
   *
   * Заезды берутся отдельным маршрутом, а не из catalogTours: там MIN(date)
   * по туру, и фильтр по месяцу врал бы (тур с ближайшим заездом в августе
   * пропал бы из сентябрьской выдачи, хотя сентябрьские заезды у него есть).
   */
  function searchPanelHtml() {
    function field(id, label, first) {
      return '<label class="tt-hero-search-field" for="' + id + '">' +
        "<span>" + esc(label) + "</span>" +
        '<select id="' + id + '"><option value="">' + esc(first) + "</option></select>" +
        "</label>";
    }
    return (
      '<form class="tt-hero-search" id="tour-search" novalidate>' +
        field("ts-dest", tr("search.destination"), tr("search.anyDestination")) +
        field("ts-month", tr("search.month"), tr("search.anyMonth")) +
        field("ts-airport", tr("search.airport"), tr("search.anyAirport")) +
        '<button class="tt-hero-search-btn" type="submit">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />' +
          "</svg>" +
          "<span>" + esc(tr("search.submit")) + "</span>" +
        "</button>" +
        '<p class="tt-hero-search-hint" data-search-hint aria-live="polite"></p>' +
      "</form>"
    );
  }

  /*
   * Блок преимуществ под героем (раскладка с референса — ряд из четырёх
   * иконок). Каждый пункт — пересказ строки из `tour_content` kind='included'
   * тура Карадениз: перелёт, отели, гид, поддержка. Ничего сверх того, что
   * оператор уже подтвердил, тут писать нельзя — иначе агент пообещает
   * клиенту услугу, которой в программе нет.
   *
   * Ссылок «подробнее» с референса нет намеренно: тур у нас пока один, и все
   * четыре вели бы в одну и ту же карточку — четыре одинаковые кнопки.
   */
  var BENEFIT_ICONS = {
    flight: '<path d="M3 13.5 21 4l-4.5 9.5L21 20l-8-3.5L5 20l3.5-6.5L3 13.5Z" />',
    hotel: '<path d="M4 20V6a2 2 0 0 1 2-2h5v16M11 10h7a2 2 0 0 1 2 2v8M15 14h1M15 17h1M6.5 8h2M6.5 11h2M6.5 14h2" />',
    guide: '<circle cx="12" cy="7" r="3" /><path d="M5.5 20c.6-4.2 3-6.2 6.5-6.2s5.9 2 6.5 6.2" />',
    support: '<circle cx="12" cy="12" r="8.5" /><path d="M12 16.5v-3a2.6 2.6 0 1 0-2.6-2.6" /><path d="M12 8.2h.01" />',
  };

  function benefitsHtml() {
    return '<section class="tt-benefits">' +
      ["flight", "hotel", "guide", "support"].map(function (k) {
        return '<article class="tt-benefit">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' + BENEFIT_ICONS[k] + "</svg>" +
          "<strong>" + esc(tr("benefit." + k + ".title")) + "</strong>" +
          "<span>" + esc(tr("benefit." + k + ".text")) + "</span>" +
          "</article>";
      }).join("") +
      "</section>";
  }

  /*
   * Подвал. Раньше в нём был только копирайт, хотя гость на публичной
   * странице — это турист или агент, которому нужно позвонить. Контакты
   * берутся из js/provisional.js (подтверждены оператором), а не пишутся
   * здесь руками: иначе телефон пришлось бы править в двух местах.
   */
  function footerHtml() {
    var op = (global.TuronProvisional && global.TuronProvisional.OPERATOR) || null;
    if (!op) {
      return '<footer class="tt-public-footer"><span>© 2026 Etihad</span>' +
        "<span>Tashkent · Uzbekistan</span></footer>";
    }
    return (
      '<footer class="tt-public-footer">' +
        '<div class="tt-foot-cols">' +
          "<div>" +
            '<strong class="tt-foot-brand">' + esc(op.name) + "</strong>" +
            '<span class="tt-muted-note">' + esc(op.address) + "</span>" +
          "</div>" +
          "<div>" +
            "<strong>Связаться</strong>" +
            '<a href="tel:' + esc(op.phone_href) + '">' + esc(op.phone) + "</a>" +
            '<a href="mailto:' + esc(op.email) + '">' + esc(op.email) + "</a>" +
            '<a href="' + esc(op.telegram_href) + '" target="_blank" rel="noopener">' +
              "Telegram</a>" +
          "</div>" +
          "<div>" +
            "<strong>Агентствам</strong>" +
            '<button type="button" class="tt-foot-link" data-go="root">Каталог туров</button>' +
            '<a href="#/login">Вход для партнёров</a>' +
          "</div>" +
        "</div>" +
        '<div class="tt-foot-bottom">' +
          // В копирайте оставляем бренд сайта: OPERATOR.name — это как
          // оператор представляется в контактах, а какое имя тут юридически
          // верное, нам не подтверждали.
          "<span>© 2026 Etihad</span>" +
          "<span>Tashkent · Uzbekistan</span>" +
        "</div>" +
      "</footer>"
    );
  }

  /*
   * ---------------------------------------------------- ближайшие заезды
   * Полоса карточек под преимуществами. Подача взята с референса Globe
   * Express (фото на всю карточку, мелкая подпись сверху, крупное главное
   * снизу, цена и действие), но содержимое — наши настоящие заезды.
   *
   * Каруселей с чужими странами не делаем: тур в продаже один, и «5
   * направлений» пришлось бы выдумывать. Крупным на карточке идёт ДАТА, а
   * не название тура: у всех заездов маршрут один и тот же, выбирают
   * именно дату.
   *
   * Фотографии настоящие, но привязаны к позиции карточки, а не к
   * конкретному заезду — все они сняты на этом же маршруте (Ризе и
   * Батуми), поэтому подписать ими любой заезд честно. Привязки «это
   * фото именно того заезда» тут нет и быть не может.
   */
  var ROUTE_PHOTOS = [
    "img/hero-rize-batumi.webp",
    "img/tour-rize-tea-valley.webp",
    "img/hero-batumi-sunset.webp",
    "img/tour-batumi-boulevard.webp",
    "img/hero-rize-morning.webp",
  ];

  // «4 — 11 сентября»: месяц не повторяем, если он один и тот же.
  function dateSpan(dateStart, nights) {
    var end = TuronApi.departureEnd(dateStart, nights);
    if (!end) return dateLong(dateStart);
    var a = new Date(dateStart + "T00:00:00Z");
    var b = new Date(end + "T00:00:00Z");
    if (a.getUTCMonth() === b.getUTCMonth()) {
      return a.getUTCDate() + " — " + dateLong(end);
    }
    return dateLong(dateStart) + " — " + dateLong(end);
  }

  /*
   * Карточки группируются по ДАТЕ, а не по заезду. На одну и ту же неделю
   * обычно есть два заезда — через Батуми и через Трабзон, — и по карточке
   * на каждый давало четыре плитки на две недели с одинаковыми крупными
   * заголовками: с виду опечатка, а не выбор. Группировка показывает четыре
   * разные недели, оба аэропорта уходят в подпись, цена берётся
   * минимальная по группе (это и есть честное «от»).
   */
  function groupByDate(list) {
    var order = [], byDate = {};
    list.forEach(function (d) {
      var g = byDate[d.date_start];
      if (!g) {
        g = byDate[d.date_start] = {
          date_start: d.date_start, nights: d.nights, tour_code: d.tour_code,
          transports: [], min_price: null,
        };
        order.push(g);
      }
      if (g.transports.indexOf(d.transport) === -1) g.transports.push(d.transport);
      if (d.min_price != null && (g.min_price == null || d.min_price < g.min_price)) {
        g.min_price = d.min_price;
      }
    });
    return order;
  }

  function upcomingCard(g, i) {
    var air = g.transports.map(function (t) {
      // в подписи только город: «Авиа · Батуми · Авиа · Трабзон» — каша
      return (TRANSPORT[t] || t).replace(/^Авиа · /, "");
    }).join(" · ");
    var meta = ["Авиа · " + air];
    if (g.nights) {
      meta.push(g.nights + " " + plural(g.nights, "ночь", "ночи", "ночей"));
    }
    return (
      '<button class="tt-up-card" data-tour="' + esc(g.tour_code) + '" ' +
        'style="background-image:url(' +
        esc(ROUTE_PHOTOS[i % ROUTE_PHOTOS.length]) + ')">' +
        '<span class="tt-up-body">' +
          '<span class="tt-up-meta">' + esc(meta.join(" · ")) + "</span>" +
          '<span class="tt-up-date">' + esc(dateSpan(g.date_start, g.nights)) + "</span>" +
          '<span class="tt-up-foot">' +
            (g.min_price != null
              ? '<span class="tt-up-price"><i>от</i>' + money(g.min_price) + "</span>"
              : "<span></span>") +
            '<span class="tt-up-go">' + esc(tr("upcoming.action")) + " →</span>" +
          "</span>" +
        "</span>" +
      "</button>"
    );
  }

  // «Сентябрь 2026» из даты заезда; ключ YYYY-MM для сравнения.
  function monthKey(iso) { return iso.slice(0, 7); }
  // Год приписываем отдельно: ru-RU с year:"numeric" выдаёт «Август 2026 г.»,
  // и это «г.» в выпадающем списке выглядит мусором.
  function monthLabel(iso) {
    var d = new Date(iso + "T00:00:00Z");
    var m = d.toLocaleDateString("ru-RU", { month: "long", timeZone: "UTC" });
    return m.charAt(0).toUpperCase() + m.slice(1) + " " + d.getUTCFullYear();
  }

  function hashFor(v) {
    if (v.kind === "tours") return "#/d/" + encodeURIComponent(v.destination);
    if (v.kind === "tour") return "#/t/" + encodeURIComponent(v.code);
    return "#/";
  }

  /*
   * Разбор адреса. null означает «этот хеш не наш» — маршруты кабинета
   * (#/app/...) и входа (#/login) ведёт роутер в app.js. Без этого каталог
   * на каждое переключение вкладки в кабинете считал бы, что его просят
   * показать список направлений, и дёргал бы сеть впустую.
   */
  function viewFromHash() {
    var h = (global.location.hash || "").replace(/^#/, "");
    if (h === "" || h === "/") return { kind: "destinations" };
    var m = h.match(/^\/d\/(.+)$/);
    if (m) return { kind: "tours", destination: decodeURIComponent(m[1]) };
    m = h.match(/^\/t\/(.+)$/);
    if (m) return { kind: "tour", code: decodeURIComponent(m[1]), variant: null };
    return null;
  }

  /*
   * opts:
   *   root     — контейнер для отрисовки (обязателен)
   *   canBook  — показывать кнопку брони и точный остаток мест
   *   onBook   — (departureCode) => void, клик по «Забронировать»
   *   onLogin  — (departureCode) => void, гость просит войти
   *   useHash  — держать текущий экран в адресе (#/t/KARADENIZ)
   */
  function create(opts) {
    var cfg = Object.assign({ canBook: false, useHash: false }, opts);
    var root = cfg.root;
    // viewFromHash может вернуть null (адрес кабинета) — тогда показываем
    // список направлений: каталог всегда должен быть с чего-то начат.
    var view = (cfg.useHash && viewFromHash()) || { kind: "destinations" };
    // Открытый калькулятор: код заезда и счётчики по тарифам.
    var calc = { code: null, counts: {} };
    // Последняя загруженная карточка тура — чтобы нажатия «+/−» в
    // калькуляторе перерисовывали её из памяти, а не дёргали API.
    var loadedTour = null;
    // Слушатели пробуждения видео вешаются на документ, а он один — значит
    // и вешать их надо один раз, а не при каждой отрисовке титульной.
    var heroWakeBound = false;

    function seatsLabel(free) {
      if (free <= 0) return { text: "мест нет", level: "is-full" };
      if (cfg.canBook) {
        return { text: "свободно " + free, level: free <= 10 ? "is-low" : "is-ok" };
      }
      if (free <= 10) return { text: "осталось " + free, level: "is-low" };
      if (free <= 20) return { text: "10+ мест", level: "is-ok" };
      return { text: "20+ мест", level: "is-ok" };
    }

    function errorBox(err) {
      root.innerHTML = '<div class="tt-empty-state">Не удалось загрузить каталог.' +
        '<div class="tt-muted-note">' + esc(err.message) + "</div></div>";
    }

    function loading() {
      root.innerHTML = '<div class="tt-empty-state">Загружаем…</div>';
    }

    // Тарифы заезда для калькулятора: взрослые по размещению и детские
    // по возрасту. Строки берутся из прайса самого заезда, а не из
    // захардкоженных возрастных групп — иначе при смене тарифной сетки
    // калькулятор начнёт считать не то, что посчитает сервер.
    function tariffRows(d) {
      var adults = d.prices.filter(function (p) { return p.kind === "placement"; })
        .sort(function (a, b) { return a.price - b.price; })
        .map(function (p) {
          return {
            code: p.code, price: p.price, occupies_seat: 1,
            title: "Взрослый", note: p.label,
          };
        });
      var kids = d.prices.filter(function (p) { return p.kind === "child"; })
        .sort(function (a, b) { return a.age_from - b.age_from; })
        .map(function (p) {
          // Верхняя граница тарифа не включается (правило `age < age_to`),
          // поэтому пишем возраст последнего подходящего года: тариф
          // «Chd 5-10» — это 5–9 лет, а не «до 10 включительно».
          var top = p.age_to - 1;
          return {
            code: p.code, price: p.price, occupies_seat: p.occupies_seat,
            title: p.label,
            note: p.occupies_seat
              ? p.age_from + "–" + top + " " + plural(top, "год", "года", "лет")
              : "младше " + p.age_to + " " + plural(p.age_to, "года", "лет", "лет") +
                ", без места",
          };
        });
      return adults.concat(kids);
    }

    function calcTotals(d, counts) {
      var total = 0, people = 0, seats = 0;
      tariffRows(d).forEach(function (t) {
        var n = counts[t.code] || 0;
        total += n * t.price;
        people += n;
        seats += n * (t.occupies_seat ? 1 : 0);
      });
      return { total: total, people: people, seats: seats };
    }

    // Калькулятор одного заезда: счётчики по тарифам, цена за человека,
    // итог и порядок оплаты. Агент называет клиенту сумму, не заполняя
    // паспорта; при бронировании форма открывается уже на нужное число мест.
    function calcHtml(d) {
      var counts = calc.counts;
      var t = calcTotals(d, counts);
      var available = d.seats_free;
      var over = t.seats > available;

      var rows = tariffRows(d).map(function (r) {
        var n = counts[r.code] || 0;
        return '<div class="tt-calc-row">' +
          '<div class="tt-calc-what"><strong>' + esc(r.title) + "</strong>" +
            '<span class="tt-muted-note">' + esc(r.note) + "</span></div>" +
          '<div class="tt-calc-price">' + money(r.price) + "</div>" +
          '<div class="tt-calc-stepper">' +
            '<button type="button" data-step="-1" data-tariff="' + esc(r.code) + '"' +
              (n === 0 ? " disabled" : "") + ' aria-label="Убрать">−</button>' +
            "<output>" + n + "</output>" +
            '<button type="button" data-step="1" data-tariff="' + esc(r.code) +
              '" aria-label="Добавить">+</button>' +
          "</div>" +
          '<div class="tt-calc-sum">' + (n ? money(n * r.price) : "") + "</div>" +
        "</div>";
      }).join("");

      return rows +
        '<div class="tt-calc-total">' +
          "<div><span>Туристов</span><strong>" + t.people + "</strong></div>" +
          "<div><span>Занимают мест</span><strong>" + t.seats + " из " +
            available + "</strong></div>" +
          '<div class="tt-calc-grand"><span>Итого</span><strong>' +
            money(t.total) + "</strong></div>" +
        "</div>" +
        (over
          ? '<div class="tt-error-box">Мест не хватает: нужно ' + t.seats +
            ", свободно " + available + ".</div>"
          : "") +
        policyHtml(d.date_start, t.total) +
        '<div class="tt-calc-actions">' +
          (cfg.canBook
            ? '<button class="tt-btn" data-book-calc="' + esc(d.code) + '"' +
              (t.people === 0 || over ? " disabled" : "") + ">Забронировать</button>"
            : '<button class="tt-btn secondary" data-login="' + esc(d.code) +
              '">Войти и забронировать</button>') +
        "</div>";
    }

    function departureRow(d) {
      var placements = d.prices.filter(function (p) { return p.kind === "placement"; })
        .sort(function (a, b) { return a.price - b.price; });
      var children = d.prices.filter(function (p) { return p.kind === "child"; })
        .sort(function (a, b) { return b.price - a.price; });
      var seats = seatsLabel(d.seats_free);
      var full = d.seats_free <= 0;
      var open = calc.code === d.code;

      return (
        '<article class="tt-cat-dep' + (open ? " is-open" : "") + '">' +
          '<div class="tt-cat-dep-when">' +
            "<strong>" + dateRange(d.date_start, d.nights) + "</strong>" +
            '<span class="tt-muted-note">' + esc(d.code) + " · " +
              (TRANSPORT[d.transport] || d.transport) +
              (d.nights ? " · " + d.nights + " " +
                plural(d.nights, "ночь", "ночи", "ночей") : "") + "</span>" +
            (d.is_info_tour ? '<span class="tt-badge tt-badge-info">Инфотур</span>' : "") +
          "</div>" +
          '<div class="tt-cat-dep-prices">' +
            placements.map(function (p) {
              return '<span class="tt-price-chip"><em>' + esc(p.code) + "</em>" +
                money(p.price) + "</span>";
            }).join("") +
            (children.length
              ? '<div class="tt-child-prices">' + children.map(function (c) {
                  return esc(c.label) + " — " + money(c.price);
                }).join(" · ") + "</div>"
              : "") +
          "</div>" +
          '<div class="tt-cat-dep-seats ' + seats.level + '">' + seats.text + "</div>" +
          '<div class="tt-cat-dep-action">' +
            (full
              ? '<span class="tt-muted-note">нет мест</span>'
              : '<button class="tt-btn' + (open ? "" : " secondary") +
                ' tt-btn-sm" data-calc="' + esc(d.code) + '">' +
                (open ? "Скрыть расчёт" : "Рассчитать") + "</button>") +
          "</div>" +
          (open
            ? '<div class="tt-cat-calc">' + calcHtml(d) + "</div>"
            : "") +
        "</article>"
      );
    }

    function programmeBlock(tour) {
      if (!tour.variants || !tour.variants.length) return "";
      var active = tour.variants.filter(function (v) { return v.code === view.variant; })[0]
        || tour.variants[0];
      var switcher = tour.variants.length > 1
        ? '<div class="tt-cat-variants">' + tour.variants.map(function (v) {
            return '<button class="tt-cat-variant' +
              (v.code === active.code ? " is-active" : "") +
              '" data-variant="' + esc(v.code) + '">' + esc(v.title) + "</button>";
          }).join("") + "</div>" +
          '<p class="tt-muted-note">Это два разных маршрута с разным направлением ' +
          "перелёта, а не два описания одного. Какой вариант у выбранного заезда — " +
          "уточните у оператора.</p>"
        : "";
      if (!active.days.length) return switcher;
      return '<section class="tt-cat-block"><h2>Программа</h2>' + switcher +
        '<ol class="tt-cat-days">' + active.days.map(function (d) {
          return "<li><strong>" + esc(d.title) + "</strong><span>" +
            esc(d.text) + "</span></li>";
        }).join("") + "</ol></section>";
    }

    /*
     * Строка выдачи поиска. Отдельная от departureRow намеренно: тот берёт
     * полный прайс заезда и открывает калькулятор в контексте загруженной
     * карточки тура, а здесь на руках только сводка (min_price, остаток).
     * Кнопка ведёт в карточку тура — там и прайс, и расчёт, и бронь.
     */
    function searchResultRow(d) {
      var seats = seatsLabel(d.seats_free);
      var meta = [TRANSPORT[d.transport] || d.transport];
      if (d.nights) {
        meta.push(d.nights + " " + plural(d.nights, "ночь", "ночи", "ночей"));
      }
      meta.push(d.code);
      return (
        '<article class="tt-search-row">' +
          '<div class="tt-search-when">' +
            "<strong>" + dateRange(d.date_start, d.nights) + "</strong>" +
            '<span class="tt-muted-note">' + esc(meta.join(" · ")) + "</span>" +
          "</div>" +
          '<div class="tt-search-what">' +
            "<strong>" + esc(d.tour_name) + "</strong>" +
            (d.destination
              ? '<span class="tt-muted-note">' + esc(d.destination) + "</span>"
              : "") +
            (d.is_info_tour
              ? '<span class="tt-badge tt-badge-info">Инфотур</span>' : "") +
          "</div>" +
          '<div class="tt-search-seats ' + seats.level + '">' + seats.text + "</div>" +
          '<div class="tt-search-price">' +
            (d.min_price != null
              ? '<span class="tt-muted-note">от</span><strong>' +
                money(d.min_price) + "</strong>"
              : "") +
          "</div>" +
          '<button class="tt-btn tt-btn-sm" data-tour="' + esc(d.tour_code) + '">' +
            "Программа и цены</button>" +
        "</article>"
      );
    }

    /*
     * Поиск на титульной. Варианты в select-ах строятся из реальных заездов,
     * поэтому пустых обещаний в выдаче не бывает: если месяц есть в списке —
     * заезды в нём точно заведены.
     *
     * Ошибку загрузки заездов глотаем намеренно: поиск — надстройка над
     * каталогом, и упавший запрос не должен убирать со страницы направления.
     * Панель в этом случае просто остаётся с одним фильтром по направлению.
     */
    /* Ближайшие заезды. Список уже загружен для поиска — второй раз в сеть
     * не ходим. Если заездов нет (или маршрут /api/public/departures ещё не
     * задеплоен и отдал пустоту), секция просто не появляется: пустой блок
     * с заголовком «Ближайшие заезды» и ничем внутри выглядел бы поломкой. */
    function renderUpcoming(list) {
      var box = root.querySelector("#upcoming-departures");
      if (!box) return;
      var soon = groupByDate(list || []).slice(0, 4);
      if (!soon.length) { box.hidden = true; return; }
      box.hidden = false;
      box.innerHTML =
        '<div class="tt-cat-heading"><div><span class="tt-eyebrow">' +
          esc(tr("upcoming.kicker")) + "</span><h2>" +
          esc(tr("upcoming.title")) + "</h2></div><p>" +
          esc(tr("upcoming.text")) + "</p></div>" +
        '<div class="tt-up-grid">' +
          soon.map(upcomingCard).join("") +
        "</div>";
    }

    function initSearch() {
      var form = root.querySelector("#tour-search");
      var out = root.querySelector("#tour-search-results");
      if (!form || !out) return;

      var destSel = form.querySelector("#ts-dest");
      var monthSel = form.querySelector("#ts-month");
      var airSel = form.querySelector("#ts-airport");
      var hint = form.querySelector("[data-search-hint]");
      var all = [];

      function matches() {
        return all.filter(function (d) {
          if (destSel.value && d.destination !== destSel.value) return false;
          if (monthSel.value && monthKey(d.date_start) !== monthSel.value) return false;
          if (airSel.value && d.transport !== airSel.value) return false;
          return true;
        });
      }

      function showCount() {
        var n = matches().length;
        hint.textContent = n
          ? tr("search.found") + " " + n + " " + countWord(n)
          : tr("search.none");
      }

      function addOptions(sel, items) {
        sel.insertAdjacentHTML("beforeend", items.map(function (o) {
          return '<option value="' + esc(o.value) + '">' + esc(o.label) + "</option>";
        }).join(""));
      }

      TuronApi.catalogDepartures().then(function (list) {
        all = list || [];
        if (!all.length) return;

        var seenD = {}, seenM = {}, seenA = {};
        var dests = [], months = [], airs = [];
        all.forEach(function (d) {
          if (d.destination && !seenD[d.destination]) {
            seenD[d.destination] = 1;
            dests.push({ value: d.destination, label: d.destination });
          }
          var mk = monthKey(d.date_start);
          if (!seenM[mk]) {
            seenM[mk] = 1;
            months.push({ value: mk, label: monthLabel(d.date_start) });
          }
          if (d.transport && !seenA[d.transport]) {
            seenA[d.transport] = 1;
            airs.push({ value: d.transport, label: TRANSPORT[d.transport] || d.transport });
          }
        });
        months.sort(function (a, b) { return a.value < b.value ? -1 : 1; });

        addOptions(destSel, dests);
        addOptions(monthSel, months);
        addOptions(airSel, airs);
        showCount();
        renderUpcoming(all);
      }).catch(function () { /* поиск необязателен — каталог уже отрисован */ });

      form.addEventListener("change", showCount);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var found = matches();
        out.hidden = false;
        out.innerHTML =
          '<div class="tt-cat-heading"><div><span class="tt-eyebrow">' +
            esc(tr("search.resultsKicker")) + "</span><h2>" +
            (found.length
              ? esc(tr("search.found")) + " " + found.length + " " +
                esc(countWord(found.length))
              : esc(tr("search.none"))) +
            "</h2></div></div>" +
          (found.length
            ? '<div class="tt-search-list">' + found.map(searchResultRow).join("") + "</div>"
            : '<div class="tt-empty-state">' + esc(tr("search.noneHint")) + "</div>");
        out.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    function renderDestinations() {
      loading();
      return TuronApi.catalogDestinations().then(function (list) {
        var catalogue =
          '<section class="tt-public-catalogue" id="tour-catalog">' +
            '<div class="tt-cat-heading"><div><span class="tt-eyebrow">' +
              esc(tr("catalog.kicker")) + "</span><h2>" +
              esc(tr("catalog.title")) + "</h2></div><p>" +
              esc(tr("catalog.text")) + "</p></div>" +
            (list.length
              ? '<div class="tt-cat-grid">' + list.map(destinationTile).join("") + "</div>"
              : '<div class="tt-empty-state">Направления пока не заведены.</div>') +
          "</section>";

        if (cfg.canBook) {
          root.innerHTML = catalogue;
          return;
        }

        // Второй полноэкранный лист — тизер Японии сразу под видео. Картинка
        // с готовой типографикой (img/japan-hero.png), поверх — кнопка.
        // has-japan-sheet схлопывает нижний отступ видео, чтобы листы шли встык.
        var jpHref = hashFor({ kind: "tours", destination: "Япония" });
        var japanSheet =
          '<section class="tt-japan-sheet" id="japan-2026" aria-label="Япония 2026">' +
            '<img class="tt-japan-sheet-image" src="img/japan-hero.png" ' +
              'alt="Открой Японию — Токио, Киото, Осака, Фудзи" loading="lazy" />' +
            '<div class="tt-japan-sheet-action">' +
              '<a class="tt-japan-sheet-cta" href="' + esc(jpHref) + '">' +
                "<span>В путь</span><span aria-hidden=\"true\">→</span>" +
              "</a>" +
            "</div>" +
          "</section>";

        root.innerHTML =
          '<section class="tt-public-intro tt-has-japan-sheet" id="excursion-tours">' +
            '<video class="tt-hero-video" autoplay muted loop playsinline ' +
              'preload="metadata" poster="img/hero-travel-poster.jpg?v=20260805-6" ' +
              'aria-hidden="true" tabindex="-1">' +
              '<source src="img/hero-travel.mp4?v=20260805-6" type="video/mp4" />' +
            "</video>" +
            '<div class="tt-hero-content">' +
              '<div class="tt-public-hero-copy">' +
                '<span class="tt-eyebrow">' + esc(tr("hero.kicker")) + "</span>" +
                "<h1>" + esc(tr("hero.title")) + " <em>" +
                  esc(tr("hero.accent")) + "</em></h1>" +
                "<p>" + esc(tr("hero.text")) + "</p>" +
              "</div>" +
              searchPanelHtml() +
            "</div>" +
          "</section>" +
          japanSheet +
          '<section class="tt-upcoming" id="upcoming-departures" hidden></section>' +
          '<section class="tt-search-results" id="tour-search-results" hidden></section>' +
          catalogue +
          '<section class="tt-about-company" id="about-company">' +
            '<div class="tt-about-brand">' +
              '<i class="tt-about-emblem" aria-hidden="true"></i>' +
              '<span>Etihad<small>Tashkent · Uzbekistan</small></span>' +
            "</div>" +
            '<div class="tt-about-copy">' +
              '<span class="tt-eyebrow">' + esc(tr("about.kicker")) + "</span>" +
              "<h2>" + esc(tr("about.title")) + "</h2>" +
              "<p>" + esc(tr("about.text")) + "</p>" +
              '<div class="tt-about-points">' +
                "<span><i>01</i>" + esc(tr("about.operator")) + "</span>" +
                "<span><i>02</i>" + esc(tr("about.partners")) + "</span>" +
                "<span><i>03</i>" + esc(tr("about.support")) + "</span>" +
              "</div>" +
            "</div>" +
            '<p class="tt-about-detail">' + esc(tr("about.detail")) + "</p>" +
          "</section>" +
          footerHtml();
        // «Уменьшить движение» — ролик не крутим, остаётся кадр-постер.
        // CSS видео не останавливает, поэтому только так.
        var video = root.querySelector(".tt-hero-video");
        if (video && global.matchMedia &&
            global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          video.removeAttribute("autoplay");
          // Метка для resumeHero: иначе, если «уменьшить движение» включили
          // уже после того, как слушатели пробуждения повисли на документе,
          // они бы честно завели остановленный ролик обратно.
          video.setAttribute("data-no-autoplay", "");
          video.pause();
        } else {
          keepHeroPlaying(video);
        }
        initSearch();
        if (global.TuronPublicUi && global.TuronPublicUi.enhance) {
          global.TuronPublicUi.enhance(root);
        }
      }).catch(errorBox);
    }

    function renderTours(destination) {
      loading();
      return TuronApi.catalogTours(destination).then(function (list) {
        var isJapan = destination === "Япония";
        root.innerHTML =
          '<section class="tt-destination-page' +
            (isJapan ? " tt-destination-japan" : "") + '">' +
          '<div class="tt-destination-inner">' +
          crumbs([{ text: "Каталог", go: "root" }, { text: destination }]) +
          '<h1 class="tt-cat-h1">' + esc(destination) + "</h1>" +
          (list.length
            ? '<div class="tt-cat-tours">' + list.map(tourRow).join("") + "</div>"
            : '<div class="tt-empty-state">В этом направлении туров пока нет.</div>') +
          "</div></section>";
      }).catch(errorBox);
    }

    function renderTour(code) {
      loading();
      return TuronApi.catalogTour(code).then(function (tour) {
        loadedTour = tour;
        paintTour(tour);
      }).catch(errorBox);
    }

    function paintTour(tour) {
      var meta = [];
        if (tour.nights) {
          meta.push((tour.nights + 1) + " " +
            plural(tour.nights + 1, "день", "дня", "дней") + " / " +
            tour.nights + " " + plural(tour.nights, "ночь", "ночи", "ночей"));
        }
        meta.push(tour.destination);

        var deps = tour.departures || [];
        var included = tour.included || [];
        var excluded = tour.excluded || [];
        var gallery = tour.gallery || [];
        var info = tour.info || [];

        root.innerHTML =
          crumbs([
            { text: "Каталог", go: "root" },
            { text: tour.destination, go: "dest:" + tour.destination },
            { text: tour.name },
          ]) +
          '<header class="tt-cat-hero">' +
            "<h1>" + esc(tour.name) + "</h1>" +
            '<div class="tt-muted-note">' + esc(meta.join(" · ")) + "</div>" +
            (tour.description ? "<p>" + esc(tour.description) + "</p>" : "") +
          "</header>" +

          programmeBlock(tour) +

          (included.length || excluded.length
            ? '<section class="tt-cat-block"><h2>Что входит в цену</h2>' +
              '<div class="tt-cat-lists">' +
                listBlock("Включено", included, "is-in") +
                listBlock("Не включено", excluded, "is-out") +
              "</div></section>"
            : "") +

          (gallery.length
            ? '<section class="tt-cat-block"><h2>Фото</h2><div class="tt-cat-gallery">' +
              gallery.map(function (g) {
                return '<img src="' + esc(g.url) + '" alt="' + esc(g.text) +
                  '" loading="lazy" />';
              }).join("") + "</div></section>"
            : "") +

          (info.length
            ? '<section class="tt-cat-block"><h2>Важно знать</h2><ul class="tt-cat-info">' +
              info.map(function (x) {
                return "<li>" + (x.url
                  ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' +
                    esc(x.text) + "</a>"
                  : esc(x.text)) + "</li>";
              }).join("") + "</ul></section>"
            : "") +

          '<section class="tt-cat-block"><h2>Заезды и цены</h2>' +
            (deps.length
              ? '<div class="tt-cat-deps">' + deps.map(function (d) {
                  // длительность живёт на туре, а рисуется в строке заезда
                  return departureRow(Object.assign({ nights: tour.nights }, d));
                }).join("") + "</div>"
              : '<div class="tt-empty-state">' +
                (tour.is_bookable
                  ? "Предстоящих заездов нет."
                  : esc(tour.note || "Тур ещё не открыт для брони.")) +
                "</div>") +
            (deps.length && !cfg.canBook
              ? '<p class="tt-muted-note">Цены партнёрские. Чтобы забронировать, ' +
                "войдите под логином агентства.</p>"
              : "") +
          "</section>";
    }

    /* has-hero говорит стилям, что на экране есть видео и шапку можно класть
     * поверх него. На карточке тура и в списке направлений видео нет —
     * прозрачная шапка там висела бы над обычным текстом. */
    function markHero() {
      var screen = root.closest("#screen-public");
      if (screen) {
        screen.classList.toggle("has-hero", !!root.querySelector(".tt-public-intro"));
      }
    }

    /* Свёрнутый браузер (или уход на другую вкладку) усыпляет фоновое видео,
     * и обратно само оно уже не заводится: вернувшись на страницу, зритель
     * видел застывший кадр вместо ролика. autoplay тут не помогает — он
     * срабатывает один раз при загрузке.
     *
     * Поэтому будим сами. visibilitychange ловит переключение вкладок и
     * сворачивание, pageshow — возврат «назад» из bfcache (там документ
     * восстанавливается целиком, событие видимости не приходит).
     * play() возвращает промис и на заблокированном автовоспроизведении
     * отваливается — гасим, иначе в консоли висит необработанный reject. */
    function resumeHero() {
      // Видео ищем заново, а не держим ссылку: каталог перерисовывается при
      // каждом переходе, и старый элемент к этому моменту уже выброшен.
      var video = root.querySelector(".tt-hero-video");
      if (!video || global.document.hidden || !video.paused) return;
      if (video.hasAttribute("data-no-autoplay")) return;
      var started = video.play();
      if (started && started.catch) started.catch(function () {});
    }

    function keepHeroPlaying(video) {
      if (!video) return;
      // Браузер может усыпить ролик и без смены видимости (экономия батареи
      // на ноутбуке) — тогда единственный сигнал это сам pause. Слушатель
      // висит на самом элементе и умирает вместе с ним при перерисовке.
      video.addEventListener("pause", function () {
        global.setTimeout(resumeHero, 120);
      });
      if (heroWakeBound) return;
      heroWakeBound = true;
      // А эти двое — на документе, поэтому вешаются один раз на экземпляр
      // каталога: иначе каждый переход «каталог → тур → назад» добавлял бы
      // ещё пару, и к концу сессии их набирались бы десятки.
      global.document.addEventListener("visibilitychange", resumeHero);
      global.addEventListener("pageshow", resumeHero);
    }

    function draw() {
      var done = view.kind === "tours" ? renderTours(view.destination)
               : view.kind === "tour" ? renderTour(view.code)
               : renderDestinations();
      return Promise.resolve(done).then(markHero, markHero);
    }

    function go(next, push) {
      view = next;
      // уходим с карточки — расчёт и кэш тура больше не актуальны
      calc = { code: null, counts: {} };
      if (next.kind !== "tour") loadedTour = null;
      if (cfg.useHash) {
        var h = hashFor(next);
        // Смена хеша сама поднимет hashchange, он и отрисует. Если адрес
        // не меняется (повторный клик по тому же туру) — рисуем сразу.
        if (push && global.location.hash !== h) {
          global.location.hash = h;
          return;
        }
        global.history.replaceState(null, "", h);
      }
      draw();
    }

    root.addEventListener("click", function (e) {
      var tile = e.target.closest("[data-dest]");
      if (tile) return go({ kind: "tours", destination: tile.dataset.dest }, true);

      var tour = e.target.closest("[data-tour]");
      if (tour) return go({ kind: "tour", code: tour.dataset.tour, variant: null }, true);

      var crumb = e.target.closest("[data-go]");
      if (crumb) {
        var target = crumb.dataset.go;
        if (target === "root") return go({ kind: "destinations" }, true);
        if (target.indexOf("dest:") === 0) {
          return go({ kind: "tours", destination: target.slice(5) }, true);
        }
      }

      var variant = e.target.closest("[data-variant]");
      if (variant) {
        view.variant = variant.dataset.variant;
        return draw();
      }

      // ------------------------------------------------- калькулятор
      var toggle = e.target.closest("[data-calc]");
      if (toggle) {
        var code = toggle.dataset.calc;
        calc = calc.code === code ? { code: null, counts: {} }
                                  : { code: code, counts: {} };
        return loadedTour && paintTour(loadedTour);
      }

      var step = e.target.closest("[data-step]");
      if (step) {
        var tariff = step.dataset.tariff;
        var next = (calc.counts[tariff] || 0) + Number(step.dataset.step);
        calc.counts[tariff] = Math.max(0, next);
        return loadedTour && paintTour(loadedTour);
      }

      var bookCalc = e.target.closest("[data-book-calc]");
      if (bookCalc && cfg.onBook) {
        return cfg.onBook(bookCalc.dataset.bookCalc, prefillFromCalc());
      }

      var book = e.target.closest("[data-book]");
      if (book && cfg.onBook) return cfg.onBook(book.dataset.book);

      var login = e.target.closest("[data-login]");
      if (login && cfg.onLogin) return cfg.onLogin(login.dataset.login);
    });

    /*
     * Что передать в форму брони: по строке на каждого посчитанного
     * туриста. Взрослым сразу подставляем размещение, детям — нет: тариф
     * ребёнка определяется датой рождения, а её знает только агент. Форма
     * и сервер всё равно пересчитают цену по факту, поэтому ошибка в
     * счётчике ничего не ломает — она просто исправится при вводе даты.
     */
    function prefillFromCalc() {
      if (!loadedTour || !calc.code) return null;
      var dep = (loadedTour.departures || []).filter(function (d) {
        return d.code === calc.code;
      })[0];
      if (!dep) return null;

      var rows = [];
      dep.prices.filter(function (p) { return p.kind === "placement"; })
        .forEach(function (p) {
          for (var i = 0; i < (calc.counts[p.code] || 0); i++) {
            rows.push({ placement: p.code });
          }
        });
      dep.prices.filter(function (p) { return p.kind === "child"; })
        .forEach(function (p) {
          for (var i = 0; i < (calc.counts[p.code] || 0); i++) rows.push({});
        });
      return rows.length ? rows : null;
    }

    if (cfg.useHash) {
      global.addEventListener("hashchange", function () {
        // хеш ведёт только гостевой каталог, кабинетный им не управляется
        var next = viewFromHash();
        if (!next) return;   // #/login и #/app/* — не наши, их ведёт app.js
        view = next;
        draw();
      });
    }

    return {
      render: draw,
      reset: function () { return go({ kind: "destinations" }, false); },
      openTour: function (code) {
        return go({ kind: "tour", code: code, variant: null }, false);
      },
    };
  }

  global.TuronCatalog = { create: create, policyHtml: policyHtml };
})(window);
