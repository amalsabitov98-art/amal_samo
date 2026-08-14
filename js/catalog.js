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

  var TRANSPORT = {
    TZX: "Авиа · Трабзон", BUS: "Авиа · Батуми",
    JED: "Авиа · Джидда", MED: "Авиа · Медина",   // Умра
  };

  // Подмена названия тура при показе (см. paintTour): боевая D1 ещё держит
  // старое имя, а мигрировать её отсюда нельзя — карточка берёт имя отсюда,
  // чтобы обновиться на бою сразу. Снять, когда прогонят миграцию 011.
  var TITLE_OVERRIDES = { KARADENIZ: "Батуми - Ризе - Трабзон" };

  // Иконки для плашек-фактов героя карточки тура (длительность/перелёт/цена).
  function factSvg(inner) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }
  var FACT_ICON = {
    clock: factSvg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>'),
    plane: factSvg('<path d="M4 13l7-1 3.5-7 2 .6-2 6.8 4.5-.6 1.5 1.2-5 2 .4 4-1.4 1-2-3.4-3 1.2v2l-1.5.5-.8-3.4L4 14.6z"/>'),
    tag: factSvg('<path d="M4 12.5V5h7.5L20 13.5 13.5 20z"/><circle cx="8.5" cy="8.5" r="1.3"/>'),
  };

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

  /* Главная витрина: три направления меняются внутри одного полноэкранного
   * кадра. Колесо страницы не трогаем — слайдер управляется таймером,
   * стрелками и превью. */
  function destinationMosaic(list) {
    var karadeniz = list.filter(function (d) { return d.name === "Турция"; })[0] || {};
    var japan = list.filter(function (d) { return d.name === "Япония"; })[0] || {};
    var karadenizPrice = karadeniz.min_price != null
      ? "от " + money(karadeniz.min_price)
      : "сезон 2026";
    var slides = [
      {
        cls: "is-karadeniz", destination: "Турция",
        image: karadeniz.image || "img/hero-rize-batumi.webp",
        kicker: "Авторский тур · сезон 2026", title: "Загадочный Карадениз",
        route: "Батуми · Ризе · Трабзон", meta: "8 дней · " + karadenizPrice,
        action: "Открыть маршрут", duration: 6000,
      },
      {
        cls: "is-umrah", destination: "Умра",
        image: "img/umrah-showcase.webp",
        kicker: "Духовное путешествие · 2026", title: "Путь к святыням",
        route: "Мекка · Медина · Джидда", meta: "9 программ · 10/13 дней · от $1200",
        action: "Выбрать программу", duration: 5000,
        scrollTarget: "tt-umrah-programs",
      },
      {
        cls: "is-japan", destination: "Япония",
        image: japan.image || "img/japan-programs-bg.webp",
        kicker: "Авторские программы · сезон 2026", title: "Япония",
        route: "Токио · Киото · Нара · Хаконэ", meta: "4 программы · март—ноябрь",
        action: "Открыть Японию", duration: 5000,
      },
    ];
    return '<div class="tt-destination-showcase" data-showcase data-active-index="0" ' +
      'role="region" aria-roledescription="carousel" aria-label="Главные направления">' +
      '<div class="tt-showcase-stage">' +
        slides.map(function (slide, index) {
          return '<article class="tt-showcase-slide ' + slide.cls +
            (index === 0 ? " is-active" : "") + '" data-showcase-slide="' + index +
            '" data-duration="' + slide.duration + '" aria-hidden="' +
            (index === 0 ? "false" : "true") + '">' +
            '<span class="tt-showcase-image" style="--tt-showcase-image:url(\'' +
              esc(slide.image) + '\')" aria-hidden="true"></span>' +
            '<span class="tt-showcase-shade" aria-hidden="true"></span>' +
            '<div class="tt-showcase-copy">' +
              '<span class="tt-showcase-kicker">' + esc(slide.kicker) + '</span>' +
              '<h2>' + esc(slide.title) + '</h2>' +
              '<p>' + esc(slide.route) + '</p>' +
              '<strong>' + esc(slide.meta) + '</strong>' +
              '<button type="button" class="tt-showcase-open" data-dest="' +
                esc(slide.destination) + '"' + (slide.scrollTarget
                  ? ' data-scroll-after-route="' + esc(slide.scrollTarget) + '"'
                  : '') + '>' + esc(slide.action) +
                ' <span aria-hidden="true">↗</span></button>' +
            '</div>' +
          '</article>';
        }).join("") +
      '</div>' +
      '<div class="tt-showcase-previews" aria-label="Следующие направления">' +
        slides.map(function (slide, index) {
          return '<button class="tt-showcase-card ' + slide.cls + '" type="button" ' +
            'data-showcase-card="' + index + '" data-showcase-goto="' + index + '" ' +
            (index === 0 ? "hidden " : "") + 'aria-label="Показать ' +
            esc(slide.title) + '" style="--tt-card-image:url(\'' + esc(slide.image) + '\')">' +
            '<span class="tt-showcase-card-image" aria-hidden="true"></span>' +
            '<span class="tt-showcase-card-shade" aria-hidden="true"></span>' +
            '<span class="tt-showcase-card-copy"><small>Следующее направление</small>' +
              '<strong>' + esc(slide.title) + '</strong><em>' + esc(slide.route) + '</em></span>' +
            '<span class="tt-showcase-card-arrow" aria-hidden="true">→</span>' +
          '</button>';
        }).join("") +
      '</div>' +
      '<div class="tt-showcase-controls">' +
        '<div class="tt-showcase-nav">' +
          '<button type="button" data-showcase-prev aria-label="Предыдущее направление">←</button>' +
          '<button type="button" data-showcase-next aria-label="Следующее направление">→</button>' +
        '</div>' +
        '<div class="tt-showcase-timer">' +
          '<span data-showcase-count>01 / 03</span>' +
          '<i aria-hidden="true"><b data-showcase-progress></b></i>' +
        '</div>' +
        '<div class="tt-showcase-dots" role="group" aria-label="Выбрать направление">' +
          slides.map(function (slide, index) {
            return '<button type="button" data-showcase-goto="' + index + '" aria-label="' +
              esc(slide.title) + '"' + (index === 0 ? ' aria-current="true"' : '') + '></button>';
          }).join("") +
        '</div>' +
      '</div>' +
      '<span class="tt-sr-only" data-showcase-status aria-live="polite">' +
        esc(slides[0].title) + ', слайд 1 из 3</span>' +
    '</div>';
  }

  function initDestinationShowcase(root) {
    var box = root.querySelector("[data-showcase]");
    if (!box) return function () {};
    var slides = Array.prototype.slice.call(box.querySelectorAll("[data-showcase-slide]"));
    var cards = Array.prototype.slice.call(box.querySelectorAll("[data-showcase-card]"));
    var dots = Array.prototype.slice.call(box.querySelectorAll(".tt-showcase-dots [data-showcase-goto]"));
    var count = box.querySelector("[data-showcase-count]");
    var progress = box.querySelector("[data-showcase-progress]");
    var status = box.querySelector("[data-showcase-status]");
    var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var active = 0, timer = null, animationTimer = null;
    var startedAt = 0, remaining = Number(slides[0].dataset.duration) || 6000;
    var transitioning = false, destroyed = false;

    function titleOf(index) {
      var title = slides[index].querySelector("h2");
      return title ? title.textContent : "Направление";
    }

    function stopClock() {
      if (timer) global.clearTimeout(timer);
      timer = null;
      if (startedAt) remaining = Math.max(120, remaining - (Date.now() - startedAt));
      startedAt = 0;
      box.classList.add("is-timer-paused");
    }

    function startClock(delay) {
      if (destroyed || reduced || global.document.hidden) return;
      remaining = delay == null ? remaining : delay;
      startedAt = Date.now();
      box.style.setProperty("--tt-showcase-duration", remaining + "ms");
      box.classList.remove("is-timer-running");
      void progress.offsetWidth;
      box.classList.remove("is-timer-paused");
      box.classList.add("is-timer-running");
      timer = global.setTimeout(function () { show(active + 1, "auto"); }, remaining);
    }

    function arrangeCards() {
      cards.forEach(function (card, index) {
        var distance = (index - active + slides.length) % slides.length;
        card.hidden = distance === 0;
        card.style.order = String(distance);
        card.setAttribute("aria-hidden", distance === 0 ? "true" : "false");
      });
    }

    function show(next, source) {
      next = (next + slides.length) % slides.length;
      if (transitioning) return;
      stopClock();
      var old = active;
      active = next;
      if (old !== active) {
        transitioning = true;
        if (animationTimer) global.clearTimeout(animationTimer);
        slides[old].classList.remove("is-active", "is-entering");
        slides[old].classList.add("is-leaving");
        slides[old].setAttribute("aria-hidden", "true");
        slides[active].classList.remove("is-leaving");
        slides[active].classList.add("is-active", "is-entering");
        slides[active].setAttribute("aria-hidden", "false");
        box.setAttribute("data-direction", source === "prev" ? "prev" : "next");
        animationTimer = global.setTimeout(function () {
          slides.forEach(function (slide) { slide.classList.remove("is-leaving", "is-entering"); });
          transitioning = false;
          animationTimer = null;
        }, 600);
      }
      box.dataset.activeIndex = String(active);
      count.textContent = "0" + (active + 1) + " / 03";
      dots.forEach(function (dot, index) {
        if (index === active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      arrangeCards();
      status.textContent = titleOf(active) + ", слайд " + (active + 1) + " из 3";
      remaining = Number(slides[active].dataset.duration) || 5000;
      startClock(remaining);
    }

    function onClick(event) {
      var target = event.target.closest("[data-showcase-goto], [data-showcase-prev], [data-showcase-next]");
      if (!target || !box.contains(target)) return;
      if (target.hasAttribute("data-showcase-prev")) show(active - 1, "prev");
      else if (target.hasAttribute("data-showcase-next")) show(active + 1, "next");
      else show(Number(target.dataset.showcaseGoto), "manual");
    }

    function onKey(event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      show(active + (event.key === "ArrowLeft" ? -1 : 1),
        event.key === "ArrowLeft" ? "prev" : "next");
    }

    function onVisibility() {
      if (global.document.hidden) stopClock();
      else startClock(remaining);
    }

    box.addEventListener("click", onClick);
    box.addEventListener("keydown", onKey);
    global.document.addEventListener("visibilitychange", onVisibility);
    arrangeCards();
    if (!reduced) startClock(remaining);
    else box.classList.add("is-reduced-motion");

    return function () {
      destroyed = true;
      if (timer) global.clearTimeout(timer);
      if (animationTimer) global.clearTimeout(animationTimer);
      global.document.removeEventListener("visibilitychange", onVisibility);
    };
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
    // CTA витрины может открыть не верх направления, а конкретный блок.
    // Храним намерение до hashchange: именно он перерисовывает страницу.
    var pendingScrollTarget = null;
    // Открытый калькулятор: код заезда и счётчики по тарифам.
    var calc = { code: null, counts: {} };
    // Последняя загруженная карточка тура — чтобы нажатия «+/−» в
    // калькуляторе перерисовывали её из памяти, а не дёргали API.
    var loadedTour = null;
    // Слушатели пробуждения видео вешаются на документ, а он один — значит
    // и вешать их надо один раз, а не при каждой отрисовке титульной.
    var heroWakeBound = false;
    var showcaseCleanup = null;

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
      if (showcaseCleanup) showcaseCleanup();
      showcaseCleanup = null;
      root.innerHTML = '<div class="tt-empty-state">Загружаем…</div>';
    }

    // Размещение и цена ОДНОГО взрослого выводятся из числа взрослых
    // (просил оператор: 1 → одноместный, 2 → двухместный, 3+ → трёхместный),
    // а не выбираются вручную по каждому типу. Цену берём из прайса заезда
    // по ценовым уровням (одноместный — дороже всех за человека, трёхместный —
    // дешевле), поэтому захардкоженных кодов в расчёте нет: сменится тарифная
    // сетка — сменится и это. Для брони нужен конкретный код размещения — берём
    // предпочтительный (SNG/DBL/TRPL), иначе первый с нужной ценой.
    function adultPlacement(d, n) {
      var places = (d.prices || []).filter(function (p) { return p.kind === "placement"; })
        .slice().sort(function (a, b) { return a.price - b.price; });
      if (!places.length) return { code: null, price: 0, label: "Взрослый" };
      var prefer;
      if (n <= 1) prefer = ["SNG"];
      else if (n === 2) prefer = ["DBL", "TWIN"];
      else prefer = ["TRPL", "DBLX"];
      for (var i = 0; i < prefer.length; i++) {
        var byCode = places.filter(function (p) { return p.code === prefer[i]; })[0];
        if (byCode) return byCode;
      }
      // Запасной путь без нужного кода: по уровню цены (single дороже, triple дешевле).
      if (n <= 1) return places[places.length - 1];
      if (n === 2) return places[Math.floor((places.length - 1) / 2)];
      return places[0];
    }

    function placementsOf(d) {
      return (d.prices || []).filter(function (p) { return p.kind === "placement"; })
        .slice().sort(function (a, b) { return a.price - b.price; });
    }

    // Две модели размещения. Карадениз: есть одноместный (SNG) — тип номера
    // выводится из числа взрослых (1 → одноместный … 3 → трёхместный), один
    // счётчик «Взрослый». Умра: одноместного нет (QUAD/TRPL/DBL), тип номера —
    // это выбор бюджета паломника, а не следствие размера группы, поэтому
    // счётчик по каждому типу номера отдельно. Признак — наличие SNG в прайсе.
    function usesOccupancy(d) {
      return placementsOf(d).some(function (p) { return p.code === "SNG"; });
    }

    // Детские тарифы заезда для калькулятора (взрослый — отдельной строкой,
    // см. adultPlacement). Строки берутся из прайса самого заезда, а не из
    // захардкоженных возрастных групп — иначе при смене тарифной сетки
    // калькулятор начнёт считать не то, что посчитает сервер.
    function tariffRows(d) {
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
      return kids;
    }

    function calcTotals(d, counts) {
      var total = 0, people = 0, seats = 0;
      if (usesOccupancy(d)) {
        // Карадениз: взрослые одной группой, размещение и цена по их числу.
        var adultN = counts.ADULT || 0;
        if (adultN > 0) {
          total += adultN * adultPlacement(d, adultN).price;
          people += adultN;
          seats += adultN;             // взрослый всегда занимает место
        }
      } else {
        // Умра: по каждому типу номера свой счётчик.
        placementsOf(d).forEach(function (p) {
          var n = counts[p.code] || 0;
          total += n * p.price;
          people += n;
          seats += n;
        });
      }
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

      function calcRow(code, title, note, price, n) {
        return '<div class="tt-calc-row">' +
          '<div class="tt-calc-what"><strong>' + esc(title) + "</strong>" +
            '<span class="tt-muted-note">' + esc(note) + "</span></div>" +
          '<div class="tt-calc-price">' + money(price) + "</div>" +
          '<div class="tt-calc-stepper">' +
            '<button type="button" data-step="-1" data-tariff="' + esc(code) + '"' +
              (n === 0 ? " disabled" : "") + ' aria-label="Убрать">−</button>' +
            "<output>" + n + "</output>" +
            '<button type="button" data-step="1" data-tariff="' + esc(code) +
              '" aria-label="Добавить">+</button>' +
          "</div>" +
          '<div class="tt-calc-sum">' + (n ? money(n * price) : "") + "</div>" +
        "</div>";
      }

      var adultRows;
      if (usesOccupancy(d)) {
        // Карадениз: одна строка «Взрослый», размещение и цена — по числу
        // взрослых (1 → одноместный, 2 → двухместный, 3+ → трёхместный).
        // Подпись и цена меняются на лету; при 0 — размещение для одного.
        var adultN = counts.ADULT || 0;
        var adultPl = adultPlacement(d, adultN || 1);
        adultRows = calcRow("ADULT", "Взрослый", adultPl.label || "", adultPl.price, adultN);
      } else {
        // Умра: свой счётчик на каждый тип номера (QUAD/TRPL/DBL).
        adultRows = placementsOf(d).map(function (p) {
          return calcRow(p.code, "Паломник", p.label, p.price, counts[p.code] || 0);
        }).join("");
      }
      var rows = adultRows +
        tariffRows(d).map(function (r) {
          return calcRow(r.code, r.title, r.note, r.price, counts[r.code] || 0);
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
      if (!active.days.length)
        return '<section class="tt-cat-block" id="tour-programme"><h2>Программа</h2>' +
          switcher + "</section>";
      // Дни сворачиваемые (<details>), а не сплошной список: 8 дней с
      // полным абзацем на каждый день на одном экране читались стеной
      // текста без конца. Первый день открыт сразу — понятно, что дальше
      // тоже есть текст, а не просто заголовки. id — чтобы перерисовывать
      // ТОЛЬКО этот блок при смене варианта маршрута, а не всю страницу
      // (иначе пересоздаётся видеофон и мигает).
      return '<section class="tt-cat-block" id="tour-programme"><h2>Программа</h2>' + switcher +
        '<div class="tt-cat-days">' + active.days.map(function (d, i) {
          return '<details class="tt-cat-day"' + (i === 0 ? " open" : "") + ">" +
            "<summary><strong>" + esc(d.title) + "</strong></summary>" +
            "<span>" + esc(d.text) + "</span>" +
          "</details>";
        }).join("") + "</div></section>";
    }

    /* Блок «Заезды и цены» — своя функция и свой id, чтобы калькулятор заезда
     * перерисовывал ТОЛЬКО его, а не всю страницу (полная перерисовка
     * пересоздавала видеофон и мигала). */
    function departuresBlock(tour) {
      var deps = tour.departures || [];
      return '<section class="tt-cat-block" id="tour-departures"><h2>Заезды и цены</h2>' +
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

    /* Плашки-факты героя в стиле Умры: длительность, перелёт, цена «от».
     * Аэропорты и цена берутся из реальных заездов, не выдумываются. */
    function heroFacts(tour) {
      var deps = tour.departures || [];
      var out = [];
      if (tour.nights) {
        out.push('<span>' + FACT_ICON.clock + esc(
          (tour.nights + 1) + " " + plural(tour.nights + 1, "день", "дня", "дней") +
          " / " + tour.nights + " " + plural(tour.nights, "ночь", "ночи", "ночей")) + "</span>");
      }
      var CITY = { TZX: "Трабзон", BUS: "Батуми", JED: "Джидда", MED: "Медина" };
      var cities = [];
      deps.forEach(function (d) {
        var c = CITY[d.transport] || null;
        if (c && cities.indexOf(c) === -1) cities.push(c);
      });
      if (cities.length) out.push('<span>' + FACT_ICON.plane + "Авиа · " + esc(cities.join(" и ")) + "</span>");
      // «от $…» — минимальная взрослая цена по всем заездам. Берём из прайса
      // (kind=placement) самого заезда, а не из d.min_price: в демо-заездах
      // этого сводного поля нет, а прайс есть и там, и в ответе воркера.
      var minPrice = null;
      deps.forEach(function (d) {
        (d.prices || []).forEach(function (p) {
          if (p.kind !== "placement") return;
          if (minPrice == null || p.price < minPrice) minPrice = p.price;
        });
        if (d.min_price != null && (minPrice == null || d.min_price < minPrice)) {
          minPrice = d.min_price;
        }
      });
      if (minPrice != null) {
        out.push('<strong>' + FACT_ICON.tag + "от " + money(minPrice) + "</strong>");
      }
      return out.length ? '<div class="tt-tour-facts">' + out.join("") + "</div>" : "";
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
            destinationMosaic(list || []) +
          "</section>";

        if (cfg.canBook) {
          root.innerHTML = catalogue;
          showcaseCleanup = initDestinationShowcase(root);
          return;
        }

        root.innerHTML =
          '<section class="tt-public-intro" id="excursion-tours">' +
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
        showcaseCleanup = initDestinationShowcase(root);
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
      }).catch(errorBox);
    }

    // Программа Умры → код бронируемого тура (заезды и цены в seed/БД,
    // build-seed.py UMRA_PROGRAMS). По этому коду карточка программы ведёт
    // на страницу тура с калькулятором и бронью.
    var UMRA_TOUR_CODE = {
      "TAJ-13": "UMRA_TAJ13", "TAJ-13+": "UMRA_TAJ13P", "ANJUM-13": "UMRA_ANJUM13",
      "SHOHADA-13": "UMRA_SHOHADA13", "JUMEIRAH-13": "UMRA_JUMEIRAH13",
      "SAJA-10": "UMRA_SAJA10", "SWISSOTEL-10": "UMRA_SWISS10",
      "ANJUM-10": "UMRA_ANJUM10", "JUMEIRAH-10": "UMRA_JUMEIRAH10",
    };
    var UMRAH_PROGRAMS = [
      {
        name: "TAJ-13", days: "13 дней / 12 ночей", route: "Ташкент → Джидда → Мекка → Медина → Ташкент",
        flight: "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        hotels: ["Джидда · Hawada Hotel Jeddah · 1 ночь", "Мекка · Taj Park · 990 м до Харама · 8 ночей", "Медина · Grand Al Shahba · 250 м до мечети Пророка · 3 ночи"],
        service: "Автобус Мекка—Медина · трёхразовое питание в Мекке и Медине · 1 питание в Джидде · руководители группы и врачи",
        dates: "1, 8, 15, 22, 29 августа; 5, 12, 19, 26 сентября; еженедельно с 3 октября по 5 декабря",
        price: "от $1200", prices: "Август—сентябрь: QUAD $1200 · TRPL $1250 · DBL $1350. Октябрь—декабрь: QUAD $1300 · TRPL $1350 · DBL $1450",
      },
      {
        name: "TAJ-13+", days: "13 дней / 12 ночей", route: "Ташкент → Джидда → Мекка → Медина → Ташкент",
        flight: "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        hotels: ["Джидда · Hawada Hotel Jeddah · 1 ночь", "Мекка · Taj Park · 990 м до Харама · 8 ночей", "Медина · Mukhtara Plaza · 250 м до мечети Пророка · 3 ночи"],
        service: "Скоростной поезд Мекка—Медина · питание: Джидда 1 раз, Мекка 3 раза, Медина 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "18 и 25 июля; 1, 8, 15 и 22 августа",
        price: "от $1250", prices: "QUAD $1250 · TRPL $1300 · DBL $1400",
      },
      {
        name: "ANJUM-13", days: "13 дней / 12 ночей", route: "Ташкент → Джидда → Мекка → Медина → Ташкент",
        flight: "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        hotels: ["Джидда · Hawada Hotel Jeddah · 1 ночь", "Мекка · Anjum · 250 м до Харама · 8 ночей", "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи"],
        service: "Скоростной поезд Мекка—Медина · питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "1, 8, 15 и 22 августа",
        price: "от $1600", prices: "QUAD $1600 · TRPL $1700 · DBL $1800",
      },
      {
        name: "SHOHADA-13", days: "13 дней / 12 ночей", route: "Ташкент → Джидда → Мекка → Медина → Ташкент",
        flight: "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        hotels: ["Джидда · Hawada Hotel Jeddah · 1 ночь", "Мекка · Al Shohada · 250 м до Харама · 8 ночей", "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи"],
        service: "Скоростной поезд Мекка—Медина · питание: Джидда 1 раз, Мекка и Медина 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "1, 8, 15 и 22 августа",
        price: "от $1650", prices: "QUAD $1650 · TRPL $1750 · DBL $1850",
      },
      {
        name: "JUMEIRAH-13", days: "13 дней / 12 ночей", route: "Ташкент → Джидда → Мекка → Медина → Ташкент",
        flight: "Centrum Air · TAS–JED 06:20–11:10 · MED–TAS 17:30–01:50",
        hotels: ["Джидда · Hawada Hotel Jeddah · 1 ночь", "Мекка · Jumeirah Hotel · 100 м до Харама · 8 ночей", "Медина · Waqf Al Safi · 50 м до мечети Пророка · 3 ночи"],
        service: "Скоростной поезд Мекка—Медина · питание: Джидда 1 раз, Мекка 1 раз, Медина 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "1, 8, 15 и 22 августа",
        price: "от $1900", prices: "QUAD $1900 · TRPL $2000 · DBL $2200",
      },
      {
        name: "SAJA-10", days: "10 дней / 9 ночей", route: "Ташкент → Медина → Мекка → Джидда → Ташкент",
        flight: "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        hotels: ["Медина · Saja Al-Madinah · 250 м до мечети Пророка · 4 ночи", "Мекка · Taj Park · 990 м до Харама · 5 ночей"],
        service: "Скоростной поезд Медина—Мекка · трёхразовое питание · виза · руководители группы и врачи",
        dates: "30 июля; 6, 13, 20, 27 августа; 3, 10, 17, 24 сентября; еженедельно с 1 октября по 3 декабря",
        price: "от $1250", prices: "Июль—сентябрь: QUAD $1250 · TRPL $1350 · DBL $1450. Октябрь—декабрь: QUAD $1400 · TRPL $1500 · DBL $1600",
      },
      {
        name: "SWISSOTEL-10", days: "10 дней / 9 ночей", route: "Ташкент → Медина → Мекка → Джидда → Ташкент",
        flight: "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        hotels: ["Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи", "Мекка · Swissotel Makkah · 50 м до Харама · 5 ночей"],
        service: "Скоростной поезд Медина—Мекка · питание: Мекка 1 раз, Медина 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "30 июля; еженедельно с 6 августа по 24 сентября; еженедельно с 1 октября по 3 декабря",
        price: "от $1650", prices: "Июль—сентябрь: QUAD $1650 · TRPL $1750 · DBL $1900. Октябрь—декабрь: QUAD $1900 · TRPL $2000 · DBL $2200",
      },
      {
        name: "ANJUM-10", days: "10 дней / 9 ночей", route: "Ташкент → Медина → Мекка → Джидда → Ташкент",
        flight: "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        hotels: ["Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи", "Мекка · Anjum Makkah · 250 м до Харама · 5 ночей"],
        service: "Скоростной поезд Медина—Мекка · питание: Мекка 1 раз, Медина 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "30 июля; еженедельно с 6 августа по 24 сентября; еженедельно с 1 октября по 3 декабря",
        price: "от $1600", prices: "Июль—сентябрь: TRPL $1600 · DBL $1700. Октябрь—декабрь: TRPL $1800 · DBL $1900",
      },
      {
        name: "JUMEIRAH-10", days: "10 дней / 9 ночей", route: "Ташкент → Медина → Мекка → Джидда → Ташкент",
        flight: "Centrum Air · TAS–MED 11:00–15:50 · JED–TAS 12:40–21:20",
        hotels: ["Медина · Waqf Al Safi · 50 м до мечети Пророка · 4 ночи", "Мекка · Jumeirah Jabal Omar · 100 м до Харама · 5 ночей"],
        service: "Скоростной поезд Медина—Мекка · питание в Мекке и Медине 2 раза (шведский стол) · виза · руководители группы и врачи",
        dates: "30 июля; еженедельно с 6 августа по 24 сентября; еженедельно с 1 октября по 3 декабря",
        price: "от $1750", prices: "Июль—сентябрь: QUAD $1750 · TRPL $1890 · DBL $1990. Октябрь—декабрь: QUAD $1990 · TRPL $2090 · DBL $2390",
      },
    ];

    var UMRAH_ICONS = {
      flight: '<path d="M3 15.5 10.2 13l4.1-8.1c.4-.8 1.2-1.2 2-1l.7.2-2.2 8.4 4.7-1.1c.7-.2 1.4.1 1.8.7l.4.7-7.8 4.1-3.2 4-1.3-.3 1.2-3.5-4.8 1.1Z"/><path d="m6.7 11.2 2.6.8"/>',
      hotel: '<path d="M4 20V7.2A2.2 2.2 0 0 1 6.2 5h8.3v15M14.5 10h3.7A1.8 1.8 0 0 1 20 11.8V20M2.5 20h19"/><path d="M7.5 9h2M7.5 12.5h2M7.5 16h2M17 13.5v2.5"/><path d="M11.2 5V3.2M9.8 4.1h2.8"/>',
      service: '<path d="M12 3.5c2.2 1.7 4.6 2.4 7 2.6v5.2c0 4.4-2.5 7.6-7 9.2-4.5-1.6-7-4.8-7-9.2V6.1c2.4-.2 4.8-.9 7-2.6Z"/><path d="m8.6 12.1 2.2 2.2 4.7-5"/><path d="M19.5 3v3M18 4.5h3"/>',
      calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
      programmes: '<path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2Z"/><path d="M9 3v16M15 5v16"/><path d="m11.2 11.6 1.4 1.4 2.6-3"/>',
      duration: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.3 2M5.8 5.8 4.3 4.3M18.2 5.8l1.5-1.5"/>',
      price: '<path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v8.5H6.5A2.5 2.5 0 0 1 4 16Z"/><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H17v3.5M15.5 12h4.5v3h-4.5a1.5 1.5 0 0 1 0-3Z"/>',
    };

    function umrahIcon(name) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true">' + UMRAH_ICONS[name] + '</svg>';
    }

    function umrahProgrammeCard(p, index, contact) {
      var duration = p.days.indexOf("13") === 0 ? "13" : "10";
      var routeTone = (index % 5) + 1;
      return '<details class="tt-umrah-program" data-umrah-duration="' + duration +
        '" data-route-tone="' + routeTone + '">' +
        '<summary><span class="tt-umrah-program-title"><small>' + esc(p.days) +
          '</small><strong>' + esc(p.name) + '</strong><em>' + esc(p.route) +
          '</em></span><b><small>от</small>' + esc(p.price.replace(/^от\s+/, "")) + '</b>' +
          '<i aria-hidden="true"><span></span><span></span></i></summary>' +
        '<div class="tt-umrah-program-body">' +
          '<div class="tt-umrah-fact">' + umrahIcon("flight") +
            '<div><h3>Перелёт</h3><p>' + esc(p.flight) + '</p></div></div>' +
          '<div class="tt-umrah-fact">' + umrahIcon("hotel") +
            '<div><h3>Проживание</h3><ul>' + p.hotels.map(function (h) {
              return '<li>' + esc(h) + '</li>';
            }).join("") + '</ul></div></div>' +
          '<div class="tt-umrah-fact">' + umrahIcon("service") +
            '<div><h3>В пакет входит</h3><p>' + esc(p.service) + '</p></div></div>' +
          '<div class="tt-umrah-fact">' + umrahIcon("calendar") +
            '<div><h3>Даты вылетов 2026</h3><p>' + esc(p.dates) + '</p></div></div>' +
          '<div class="tt-umrah-prices"><div><span>Стоимость программы</span><p>' +
            esc(p.prices) + '</p></div>' +
            (UMRA_TOUR_CODE[p.name]
              ? '<button type="button" class="tt-umrah-book" data-tour="' +
                esc(UMRA_TOUR_CODE[p.name]) + '">' +
                (cfg.canBook ? "Забронировать" : "Открыть и забронировать") +
                ' <span>→</span></button>'
              : '<a href="' + esc(contact) +
                '" target="_blank" rel="noopener">Уточнить места <span>→</span></a>') +
          '</div>' +
        '</div>' +
      '</details>';
    }

    function initUmrahProgrammes() {
      var page = root.querySelector(".tt-umrah-page");
      if (!page) return;
      var tabs = Array.prototype.slice.call(page.querySelectorAll("[data-umrah-filter]"));
      var programmes = Array.prototype.slice.call(page.querySelectorAll(".tt-umrah-program"));
      var count = page.querySelector("[data-umrah-count]");
      var video = page.querySelector(".tt-umrah-video");

      function show(duration) {
        var visible = [];
        tabs.forEach(function (tab) {
          var active = tab.dataset.umrahFilter === duration;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", active ? "true" : "false");
          tab.tabIndex = active ? 0 : -1;
        });
        programmes.forEach(function (programme) {
          var active = programme.dataset.umrahDuration === duration;
          programme.hidden = !active;
          programme.open = false;
          if (active) visible.push(programme);
        });
        if (count) count.textContent = visible.length + " " +
          plural(visible.length, "программа", "программы", "программ");
      }

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () { show(tab.dataset.umrahFilter); });
        tab.addEventListener("keydown", function (event) {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          var next = tabs[(tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
          show(next.dataset.umrahFilter);
          next.focus();
        });
      });
      programmes.forEach(function (programme) {
        programme.addEventListener("toggle", function () {
          if (!programme.open) return;
          programmes.forEach(function (other) {
            if (other !== programme) other.open = false;
          });
        });
      });
      if (video && global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        video.pause();
      } else if (video) {
        var play = video.play();
        if (play && play.catch) play.catch(function () {});
      }
      show("13");
    }

    function renderUmrah() {
      var op = (global.TuronProvisional && global.TuronProvisional.OPERATOR) || {};
      var contact = op.telegram_href || (op.phone_href ? "tel:" + op.phone_href : "#/login");
      root.innerHTML =
        '<section class="tt-umrah-page">' +
          '<div class="tt-umrah-background" aria-hidden="true">' +
            '<video class="tt-umrah-video" autoplay muted loop playsinline preload="metadata">' +
              '<source src="img/umrah-programs.mp4" type="video/mp4"></video>' +
            '<div class="tt-umrah-hero-shade"></div>' +
          '</div>' +
          '<div class="tt-umrah-shell">' +
            '<header class="tt-umrah-hero-copy">' +
              '<span class="tt-eyebrow">Умра 2026</span>' +
              '<h1>Путь к святыням</h1>' +
              '<p>Продуманное путешествие с заботой и сопровождением на каждом этапе.</p>' +
              '<div class="tt-umrah-hero-meta"><span>' + umrahIcon("programmes") + '9 программ</span>' +
                '<span>' + umrahIcon("duration") + '10 или 13 дней</span>' +
                '<strong>' + umrahIcon("price") + 'от $1200</strong></div>' +
            '</header>' +
            '<section class="tt-umrah-catalogue" id="tt-umrah-programs" aria-labelledby="tt-umrah-title">' +
              '<div class="tt-umrah-catalogue-head"><div><span class="tt-eyebrow">Программы</span>' +
                '<h2 id="tt-umrah-title">Выберите формат поездки</h2></div>' +
                '<p><span data-umrah-count>5 программ</span> · откройте пакет, чтобы сравнить ' +
                  'перелёт, отели, питание и стоимость.</p></div>' +
              '<div class="tt-umrah-duration" role="tablist" aria-label="Длительность программы">' +
                '<button type="button" class="is-active" data-umrah-filter="13" role="tab" aria-selected="true">13 дней</button>' +
                '<button type="button" data-umrah-filter="10" role="tab" aria-selected="false" tabindex="-1">10 дней</button>' +
              '</div>' +
              '<div class="tt-umrah-programs">' + UMRAH_PROGRAMS.map(function (p, index) {
                return umrahProgrammeCard(p, index, contact);
              }).join("") + '</div>' +
            '</section>' +
          '</div>' +
        '</section>' + footerHtml();
      initUmrahProgrammes();
      return Promise.resolve();
    }

    function renderTours(destination) {
      if (destination === "Умра") return renderUmrah();
      loading();
      return TuronApi.catalogTours(destination).then(function (list) {
        // Направление с ровно одним туром не нуждается в промежуточном
        // списке — там будет одна строка на всю страницу, а клиенту всё
        // равно нужна карточка. Сразу подменяем маршрут на неё, чтобы
        // «назад» из карточки уводил туда, откуда пришли, а не на пустой
        // список.
        if (list.length === 1) {
          return go({ kind: "tour", code: list[0].code, variant: null }, false);
        }
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
      // Хост может перехватить открытие конкретного тура (например, кабинет
      // показывает Карадениз в своём конструкторе mir-jahon, а не в общей
      // карточке). Если onTour вернул true — каталог карточку не рисует.
      if (cfg.onTour && cfg.onTour(code)) return Promise.resolve();
      loading();
      return TuronApi.catalogTour(code).then(function (tour) {
        loadedTour = tour;
        paintTour(tour);
      }).catch(errorBox);
    }

    function paintTour(tour) {
      // Новое название тура. В боевой БД (D1) оно ещё старое — «Карадениз —
      // Трабзон и Ризе», а мигрировать её отсюда нельзя, поэтому подменяем при
      // выводе по коду тура, чтобы карточка на бою обновилась сразу. Демо и
      // сид уже несут новое имя (build-seed.py). Когда прогонят миграцию
      // 011-rename-karadeniz.sql — эту подмену можно убрать. Длинное тире в
      // прочих названиях заменяем на обычный дефис (оператор просил — читается
      // «иишным»); в новом имени тире и так дефис, замена его не трогает.
      var displayName = TITLE_OVERRIDES[tour.code] ||
        String(tour.name == null ? "" : tour.name).replace(/\s*—\s*/g, " - ");
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
          // Видео — только на публичной карточке (гость, cfg.canBook false).
          // В кабинете этот же компонент показывает тур агенту рядом с
          // сайдбаром — там работали над другим и видео не просили, старая
          // компактная карточка остаётся как была. Фон закреплён
          // (position:fixed) позади ВСЕЙ публичной страницы, а не только
          // шапки: контент едет поверх него в полупрозрачных карточках,
          // а не «видео кончается после героя».
          // Видеофон есть только у Карадениза (свой ролик Узунгёля). У других
          // туров (Умра) видео нет — показывать чужой кадр нельзя, карточка
          // рисуется на обычном фоне. markHero снимает has-tourhero сам, раз
          // .tt-tour-bg в разметке отсутствует.
          (!cfg.canBook && tour.code === "KARADENIZ"
            ? '<div class="tt-tour-bg" aria-hidden="true">' +
                '<video class="tt-hero-video" autoplay muted loop playsinline ' +
                  'preload="metadata" poster="img/tour-karadeniz-hero-poster.jpg" ' +
                  'tabindex="-1">' +
                  '<source src="img/tour-karadeniz-hero.mp4" type="video/mp4" />' +
                "</video>" +
                '<div class="tt-tour-bg-shade"></div>' +
              "</div>"
            : "") +

          // Без промежуточной крошки направления: направление с одним туром
          // сразу открывает карточку (renderTours → go kind:tour), поэтому
          // «Турция» вела бы на ту же самую карточку — тупиковая петля. Пока
          // в направлении один тур, крошка только «Каталог».
          crumbs([
            { text: "Каталог", go: "root" },
            { text: displayName },
          ]) +
          // Публичный герой — раскладка Умры: надзаголовок, крупное название,
          // короткое описание, плашки-факты (длительность/перелёт/цена).
          // Кабинет (cfg.canBook) — прежняя компактная карточка: мета-строка
          // и описание, без надзаголовка и фактов.
          '<header class="tt-cat-hero">' +
            (!cfg.canBook
              ? '<span class="tt-eyebrow tt-tour-kicker">' +
                  esc(tour.destination === "Умра" ? "Умра · Мекка и Медина" : "Загадочный Карадениз") +
                "</span>" +
                "<h1>" + esc(displayName) + "</h1>" +
                (tour.description ? '<p class="tt-tour-lead">' + esc(tour.description) + "</p>" : "") +
                heroFacts(tour)
              : "<h1>" + esc(displayName) + "</h1>" +
                '<div class="tt-muted-note">' + esc(meta.join(" · ")) + "</div>" +
                (tour.description ? "<p>" + esc(tour.description) + "</p>" : "")) +
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

          departuresBlock(tour);

        // Тот же класс .tt-hero-video, что и у главного видео — общая
        // логика «уменьшить движение» и пробуждения после сворачивания
        // вкладки (resumeHero/keepHeroPlaying ниже) подхватывает его
        // автоматически, без отдельного набора обработчиков под карточку.
        var heroVideo = root.querySelector(".tt-hero-video");
        if (heroVideo && global.matchMedia &&
            global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          heroVideo.removeAttribute("autoplay");
          heroVideo.setAttribute("data-no-autoplay", "");
          heroVideo.pause();
        } else {
          keepHeroPlaying(heroVideo);
        }
    }

    /* has-hero говорит стилям, что на экране есть видео и шапку можно класть
     * поверх него. Это относится к главному hero, странице Умры и публичной
     * карточке тура с её закреплённым видеофоном (.tt-tour-bg — он только на
     * публике). В обычном списке направлений видео нет — прозрачная шапка
     * там висела бы над текстом. */
    function markHero() {
      var screen = root.closest("#screen-public");
      if (screen) {
        screen.classList.toggle("has-hero", !!root.querySelector(
          ".tt-public-intro, .tt-umrah-page, .tt-tour-bg"
        ));
        // На странице Умры оставляем в шапке только бренд, язык и вход.
        // Отдельный класс не затрагивает титульный hero и другие направления.
        screen.classList.toggle("has-umrah", !!root.querySelector(".tt-umrah-page"));
        // Карточка тура — то же самое: подпункты «Экскурсионные туры / Туры»
        // ведут на секции главной, которых здесь нет, поэтому шапку сжимаем
        // до бренда/языка/входа (как у Умры).
        screen.classList.toggle("has-tourhero", !!root.querySelector(".tt-tour-bg"));
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
      return Promise.resolve(done).then(function () {
        markHero();
        // enhance отвечает не только за анимации, но и за жизненный цикл
        // wheel-обработчика hero. Вызываем его после КАЖДОГО hash-маршрута:
        // на внутренних страницах старый обработчик будет снят, а новый не
        // подключится, потому что там нет пары hero-листов.
        if (global.TuronPublicUi && global.TuronPublicUi.enhance) {
          global.TuronPublicUi.enhance(root);
        }
        if (pendingScrollTarget) {
          var targetId = pendingScrollTarget;
          pendingScrollTarget = null;
          var target = global.document.getElementById(targetId);
          if (target) {
            var reduced = global.matchMedia &&
              global.matchMedia("(prefers-reduced-motion: reduce)").matches;
            global.requestAnimationFrame(function () {
              target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
            });
          }
        }
      }, function (error) {
        markHero();
        if (global.TuronPublicUi && global.TuronPublicUi.enhance) {
          global.TuronPublicUi.enhance(root);
        }
        throw error;
      });
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
      if (tile) {
        pendingScrollTarget = tile.dataset.scrollAfterRoute || null;
        return go({ kind: "tours", destination: tile.dataset.dest }, true);
      }

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
        // Перерисовываем ТОЛЬКО блок программы, а не всю страницу: полная
        // перерисовка пересоздавала закреплённое видео и оно мигало.
        var pb = loadedTour && root.querySelector("#tour-programme");
        if (pb) pb.outerHTML = programmeBlock(loadedTour);
        return;
      }

      // ------------------------------------------------- калькулятор
      var toggle = e.target.closest("[data-calc]");
      if (toggle) {
        var code = toggle.dataset.calc;
        calc = calc.code === code ? { code: null, counts: {} }
                                  : { code: code, counts: {} };
        return rerenderDepartures();
      }

      var step = e.target.closest("[data-step]");
      if (step) {
        var tariff = step.dataset.tariff;
        var next = (calc.counts[tariff] || 0) + Number(step.dataset.step);
        calc.counts[tariff] = Math.max(0, next);
        return rerenderDepartures();
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
      if (usesOccupancy(dep)) {
        // Карадениз: взрослые в одном размещении по их числу (1 → одноместный,
        // 2 → двухместный, 3+ → трёхместный). Раскладку по номерам агент потом
        // поправит в форме брони — сервер пересчитает цену по факту.
        var adultN = calc.counts.ADULT || 0;
        if (adultN > 0) {
          var pl = adultPlacement(dep, adultN);
          for (var a = 0; a < adultN; a++) rows.push({ placement: pl.code });
        }
      } else {
        // Умра: по строке на каждого паломника в выбранном типе номера.
        placementsOf(dep).forEach(function (p) {
          for (var j = 0; j < (calc.counts[p.code] || 0); j++) rows.push({ placement: p.code });
        });
      }
      dep.prices.filter(function (p) { return p.kind === "child"; })
        .forEach(function (p) {
          for (var i = 0; i < (calc.counts[p.code] || 0); i++) rows.push({});
        });
      return rows.length ? rows : null;
    }

    // Перерисовать ТОЛЬКО блок «Заезды и цены», не трогая закреплённое
    // видео-фон и остальную страницу: клик по калькулятору и ±1 турист
    // раньше звали полную перерисовку и видео мигало.
    function rerenderDepartures() {
      if (!loadedTour) return;
      var db = root.querySelector("#tour-departures");
      if (db) db.outerHTML = departuresBlock(loadedTour);
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
