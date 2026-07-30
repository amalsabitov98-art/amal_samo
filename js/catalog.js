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

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Автобус" };

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

  function dateLong(iso) {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
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
        '<span class="tt-cat-tile-art"' +
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

  function hashFor(v) {
    if (v.kind === "tours") return "#/d/" + encodeURIComponent(v.destination);
    if (v.kind === "tour") return "#/t/" + encodeURIComponent(v.code);
    return "#/";
  }

  function viewFromHash() {
    var h = (global.location.hash || "").replace(/^#/, "");
    var m = h.match(/^\/d\/(.+)$/);
    if (m) return { kind: "tours", destination: decodeURIComponent(m[1]) };
    m = h.match(/^\/t\/(.+)$/);
    if (m) return { kind: "tour", code: decodeURIComponent(m[1]), variant: null };
    return { kind: "destinations" };
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
    var view = cfg.useHash ? viewFromHash() : { kind: "destinations" };

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

    function departureRow(d) {
      var placements = d.prices.filter(function (p) { return p.kind === "placement"; })
        .sort(function (a, b) { return a.price - b.price; });
      var children = d.prices.filter(function (p) { return p.kind === "child"; })
        .sort(function (a, b) { return b.price - a.price; });
      var seats = seatsLabel(d.seats_free);
      var full = d.seats_free <= 0;

      return (
        '<article class="tt-cat-dep">' +
          '<div class="tt-cat-dep-when">' +
            "<strong>" + dateLong(d.date_start) + "</strong>" +
            '<span class="tt-muted-note">' + esc(d.code) + " · " +
              (TRANSPORT[d.transport] || d.transport) + "</span>" +
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
            (cfg.canBook
              ? '<button class="tt-btn tt-btn-sm" data-book="' + esc(d.code) + '"' +
                (full ? " disabled" : "") + ">Забронировать</button>"
              : (full
                  ? ""
                  : '<button class="tt-btn secondary tt-btn-sm" data-login="' +
                    esc(d.code) + '">Войти и забронировать</button>')) +
          "</div>" +
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

    function renderDestinations() {
      loading();
      return TuronApi.catalogDestinations().then(function (list) {
        root.innerHTML =
          '<h1 class="tt-cat-h1">Направления</h1>' +
          (list.length
            ? '<div class="tt-cat-grid">' + list.map(destinationTile).join("") + "</div>"
            : '<div class="tt-empty-state">Направления пока не заведены.</div>');
      }).catch(errorBox);
    }

    function renderTours(destination) {
      loading();
      return TuronApi.catalogTours(destination).then(function (list) {
        root.innerHTML =
          crumbs([{ text: "Каталог", go: "root" }, { text: destination }]) +
          '<h1 class="tt-cat-h1">' + esc(destination) + "</h1>" +
          (list.length
            ? '<div class="tt-cat-tours">' + list.map(tourRow).join("") + "</div>"
            : '<div class="tt-empty-state">В этом направлении туров пока нет.</div>');
      }).catch(errorBox);
    }

    function renderTour(code) {
      loading();
      return TuronApi.catalogTour(code).then(function (tour) {
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
              ? '<div class="tt-cat-deps">' + deps.map(departureRow).join("") + "</div>"
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
      }).catch(errorBox);
    }

    function draw() {
      if (view.kind === "tours") return renderTours(view.destination);
      if (view.kind === "tour") return renderTour(view.code);
      return renderDestinations();
    }

    function go(next, push) {
      view = next;
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

      var book = e.target.closest("[data-book]");
      if (book && cfg.onBook) return cfg.onBook(book.dataset.book);

      var login = e.target.closest("[data-login]");
      if (login && cfg.onLogin) return cfg.onLogin(login.dataset.login);
    });

    if (cfg.useHash) {
      global.addEventListener("hashchange", function () {
        // хеш ведёт только гостевой каталог, кабинетный им не управляется
        view = viewFromHash();
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

  global.TuronCatalog = { create: create };
})(window);
