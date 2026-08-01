(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    departures: [], current: null, passengers: [], editing: null,
    // выбранный в конструкторе заезд и счётчики по тарифам
    builder: { code: null, counts: {} },
    // брони агентства: их читают разделы «Туристы», «Платежи», «Документы»
    bookings: [],
    mediaIndex: 0,
  };

  // Каталоги: гостевой (на публичном экране) и кабинетный (вкладка).
  // Экземпляры независимы, создаются по одному разу.
  var publicCatalog = null, cabinetCatalog = null;
  // Заезд, который гость выбрал до входа: откроем бронь сразу после логина.
  var pendingBooking = null;

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Авиа · Батуми" };

  function money(v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return "$" + v.toLocaleString("ru-RU", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    });
  }

  // Даты в базе без времени — форматируем в UTC, иначе местный часовой
  // пояс сдвигает день назад.
  function formatDate(iso) {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", timeZone: "UTC",
    });
  }

  // «31 июля — 7 августа», когда у тура известна длительность.
  function formatRange(iso, nights) {
    var end = TuronApi.departureEnd(iso, nights);
    return end ? formatDate(iso) + " — " + formatDate(end) : formatDate(iso);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ------------------------------------------------------------------ вход
  // Гостя встречает каталог, а не форма входа: тур можно показать клиенту
  // по ссылке, логин нужен только чтобы забронировать.
  function showPublic() {
    $("screen-public").hidden = false;
    $("screen-login").hidden = true;
    $("screen-app").hidden = true;
    if (!publicCatalog) {
      publicCatalog = TuronCatalog.create({
        root: $("public-catalog"),
        canBook: false,
        useHash: true,
        onLogin: function (code) {
          pendingBooking = code;
          showLogin();
        },
      });
    }
    publicCatalog.render();
  }

  function showLogin() {
    $("screen-public").hidden = true;
    $("screen-login").hidden = false;
    $("screen-app").hidden = true;
  }

  function showApp(agency) {
    $("screen-public").hidden = true;
    $("screen-login").hidden = true;
    $("screen-app").hidden = false;
    // Нижняя карточка агентства удалена из бокового меню. Обновляем имя
    // только там, где соответствующий элемент действительно существует.
    var agencyName = $("agency-name");
    if (agencyName) agencyName.textContent = agency.name;
    var topAgencyName = $("top-agency-name");
    if (topAgencyName) topAgencyName.textContent = agency.name;
    // инициалы были захардкожены («GW», «TT») и не совпадали с агентством;
    // из одного слова берём две первые буквы, иначе кружок с одной буквой
    var words = agency.name.split(/\s+/).filter(Boolean);
    var initials = (words.length > 1
      ? words.slice(0, 2).map(function (w) { return w[0]; }).join("")
      : (words[0] || "").slice(0, 2)).toUpperCase();

    // Оператору показываем его вкладки и прячем агентские: он не бронирует
    // и своих комиссий не имеет.
    var isOperator = TuronAdmin.isOperator(agency);
    document.querySelectorAll(".tt-tab-op").forEach(function (t) { t.hidden = !isOperator; });
    document.querySelectorAll(".tt-tab-ag").forEach(function (t) { t.hidden = isOperator; });
    if (isOperator) {
      TuronAdmin.start();
      switchTab("manifest");
      return;
    }

    if (!cabinetCatalog) {
      cabinetCatalog = TuronCatalog.create({
        root: $("cabinet-catalog"),
        canBook: true,
        onBook: bookFromCatalog,
      });
    }

    switchTab("builder");
    var ready = loadDepartures();
    loadBookings();
    loadTours();

    // Гость выбрал заезд, потом вошёл — доводим его до брони, а не
    // оставляем разбираться заново.
    if (pendingBooking) {
      var code = pendingBooking;
      pendingBooking = null;
      ready.then(function () { bookFromCatalog(code); });
    }
  }

  // Бронь из каталога: карточка тура отдаёт код заезда, а окно брони
  // работает с доской заездов. Если списки разошлись — говорим об этом,
  // а не открываем пустое окно.
  //
  // prefill — строки от калькулятора: сколько туристов и с каким
  // размещением. Цену форма всё равно считает сама по датам рождения.
  function bookFromCatalog(code, prefill) {
    var known = state.departures.some(function (d) { return d.code === code; });
    if (!known) {
      flash("Заезд " + code + " недоступен для брони — обновите страницу.");
      return;
    }
    openBooking(code, null, prefill);
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("login-btn");
    btn.disabled = true;
    $("login-error").innerHTML = "";
    TuronApi.login($("l-login").value, $("l-password").value)
      .then(function (res) { showApp(res.agency); })
      .catch(function (err) {
        $("login-error").innerHTML = '<div class="tt-error-box">' + esc(err.message) + "</div>";
      })
      .then(function () { btn.disabled = false; });
  });

  function doLogout() {
    TuronApi.logout().then(function () {
      $("l-password").value = "";
      showPublic();
    });
  }
  $("logout-top").addEventListener("click", doLogout);

  /* Колокольчик: открытие панели, закрытие по клику вне и по Esc.
   * Содержимое собирает renderNotices() из загруженных броней. */
  function setNotices(open) {
    $("notice-panel").hidden = !open;
    $("notice-btn").setAttribute("aria-expanded", open ? "true" : "false");
  }
  $("notice-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    var willOpen = $("notice-panel").hidden;
    if (willOpen) renderNotices();
    setNotices(willOpen);
  });
  $("notice-panel").addEventListener("click", function (e) {
    e.stopPropagation();
    var go = e.target.closest("[data-goto]");
    if (!go) return;
    setNotices(false);
    switchTab(go.dataset.goto);
    renderPayments();
  });
  document.addEventListener("click", function () { setNotices(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNotices(false);
  });

  $("public-login-btn").addEventListener("click", function () { showLogin(); });

  $("public-home-btn").addEventListener("click", function () {
    if (publicCatalog) publicCatalog.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("turon:language", function () {
    if (publicCatalog && !$("screen-public").hidden) publicCatalog.render();
  });

  $("login-back").addEventListener("click", function () {
    pendingBooking = null;
    $("login-error").innerHTML = "";
    showPublic();
  });

  // --------------------------------------------------------------- заезды
  function departureCardHtml(d) {
    var placements = d.prices.filter(function (p) { return p.kind === "placement"; })
      .sort(function (a, b) { return a.price - b.price; });
    var children = d.prices.filter(function (p) { return p.kind === "child"; })
      .sort(function (a, b) { return b.price - a.price; });

    var free = d.seats_free;
    var pct = d.capacity ? Math.round((d.seats_taken / d.capacity) * 100) : 0;
    var level = free === 0 ? "is-full" : free <= 10 ? "is-low" : "";

    return (
      '<article class="tt-dep ' + level + '">' +
        '<div class="tt-dep-main">' +
          '<div class="tt-dep-date">' +
            "<strong>" + formatRange(d.date_start, d.nights) + "</strong>" +
            '<span class="tt-dep-code">' + esc(d.code) +
              (d.nights ? " · " + d.nights + " ноч." : "") + "</span>" +
          "</div>" +
          '<div class="tt-dep-meta">' +
            '<span class="tt-badge">' + (TRANSPORT[d.transport] || d.transport) + "</span>" +
            (d.is_info_tour ? '<span class="tt-badge tt-badge-info">Инфотур</span>' : "") +
          "</div>" +
        "</div>" +

        '<div class="tt-dep-prices">' +
          placements.map(function (p) {
            return '<span class="tt-price-chip"><em>' + esc(p.code) + "</em>" + money(p.price) + "</span>";
          }).join("") +
          (children.length
            ? '<div class="tt-child-prices">' + children.map(function (c) {
                return esc(c.label) + " — " + money(c.price);
              }).join(" · ") + "</div>"
            : "") +
        "</div>" +

        '<div class="tt-dep-seats">' +
          '<div class="tt-seat-bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="tt-seat-text">' +
            (free === 0 ? "мест нет" : "свободно <strong>" + free + "</strong> из " + d.capacity) +
          "</div>" +
        "</div>" +

        '<div class="tt-dep-action">' +
          '<button class="tt-btn" data-book="' + esc(d.code) + '"' +
            (free === 0 ? " disabled" : "") + ">Забронировать</button>" +
        "</div>" +
      "</article>"
    );
  }

  function renderDepartures() {
    var transport = $("f-transport").value;
    var onlyFree = $("f-available").checked;
    var list = state.departures.filter(function (d) {
      if (transport && d.transport !== transport) return false;
      if (onlyFree && d.seats_free <= 0) return false;
      return true;
    });
    var totalFree = list.reduce(function (sum, d) { return sum + d.seats_free; }, 0);
    var lowCount = list.filter(function (d) {
      return d.seats_free > 0 && d.seats_free <= Math.max(4, Math.ceil(d.capacity * 0.2));
    }).length;
    var nextDate = list.length ? formatDate(list[0].date_start) : "—";
    $("departure-stats").innerHTML =
      '<article><span>Предстоящие заезды</span><strong>' + list.length + '</strong><small>по выбранным условиям</small></article>' +
      '<article><span>Свободные места</span><strong>' + totalFree + '</strong><small>доступно для брони</small></article>' +
      '<article><span>Мест на исходе</span><strong>' + lowCount + '</strong><small>заездов требуют внимания</small></article>' +
      '<article><span>Ближайший вылет</span><strong class="is-date">' + esc(nextDate) + '</strong><small>следующая экспедиция</small></article>';
    $("departures-list").innerHTML = list.length
      ? list.map(departureCardHtml).join("")
      : '<div class="tt-empty-state">Нет заездов по выбранным условиям.</div>';
  }

  function loadDepartures() {
    return TuronApi.departures().then(function (list) {
      // Заезды НЕ фильтруем по полётной программе: если оператор заведёт
      // заезд на новый сезон или не на пятницу, он всё равно должен
      // продаваться. От расписания зависит только блок рейсов — там, где
      // рейс неизвестен, честно пишем об этом.
      state.departures = list.map(function (d) {
        // Подстраховка: если в базе у тура не проставлена длительность
        // (старый seed без nights), берём её из отелей (4 + 3 = 7),
        // чтобы заезд не показывал «длительность уточняется».
        if (!d.nights) {
          var hn = TuronProvisional.hotelsFor(d).reduce(function (s, h) {
            return s + (h.nights || 0);
          }, 0);
          if (hn) d.nights = hn;
        }
        return d;
      });
      renderDepartures();
      renderBuilder();
    }).catch(function (err) {
      $("departures-list").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить заезды.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  $("f-transport").addEventListener("change", renderDepartures);
  $("f-available").addEventListener("change", renderDepartures);

  /* ------------------------------------------------------------- билдер
   * «Новый тур» — тот же расчёт, что и калькулятор в каталоге, только в
   * оформлении конструктора. Все цифры берутся из выбранного заезда:
   * выдуманных пассажиров, рейсов и сумм здесь быть не должно — агент
   * называет клиенту то, что видит.
   */
  function builderDeparture() {
    if (!state.departures.length) return null;
    var chosen = state.departures.filter(function (d) {
      return d.code === state.builder.code;
    })[0];
    if (chosen) return chosen;
    // по умолчанию — ближайший заезд, где ещё есть места
    return state.departures.filter(function (d) { return d.seats_free > 0; })[0]
      || state.departures[0];
  }

  // Тарифы заезда: взрослые по размещению + детские по возрасту. Строим из
  // прайса самого заезда, чтобы счётчики не разошлись с расчётом сервера.
  function builderTariffs(d) {
    var adults = d.prices.filter(function (p) { return p.kind === "placement"; })
      .sort(function (a, b) { return a.price - b.price; })
      .map(function (p) {
        return { code: p.code, price: p.price, seat: 1, title: "Взрослый", note: p.label };
      });
    var kids = d.prices.filter(function (p) { return p.kind === "child"; })
      .sort(function (a, b) { return a.age_from - b.age_from; })
      .map(function (p) {
        // верхняя граница не включается: тариф 5-10 — это 5–9 лет
        var top = p.age_to - 1;
        return {
          code: p.code, price: p.price, seat: p.occupies_seat, title: p.label,
          note: p.occupies_seat ? p.age_from + "–" + top + " лет"
                                : "младше " + p.age_to + " лет, без места",
        };
      });
    return adults.concat(kids);
  }

  function builderTotals(d) {
    var counts = state.builder.counts, total = 0, people = 0, seats = 0;
    builderTariffs(d).forEach(function (t) {
      var n = counts[t.code] || 0;
      total += n * t.price;
      people += n;
      seats += n * (t.seat ? 1 : 0);
    });
    return { total: total, people: people, seats: seats };
  }

  // Один ряд таблицы «Авиабилеты» — раскладка как в привычном агентствам
  // кабинете: перевозчик, багаж, отправление, прибытие, длительность.
  function flightRow(f) {
    return "<tr>" +
      '<td class="tt-mj-fl-check"><span class="tt-mj-tick" aria-hidden="true">✓</span></td>' +
      '<td class="tt-mj-fl-carrier">' +
        '<img class="tt-mj-airline-logo" src="img/centrum-air.svg" alt="' +
          esc(f.carrier) + '" /><small>' + esc(f.code) + "</small></td>" +
      '<td class="tt-mj-fl-bag"><span aria-hidden="true">🧳</span> ' + esc(f.baggage) + "</td>" +
      '<td class="tt-mj-fl-time"><strong>' + esc(f.from_city) + "</strong><small>" +
        (f.date ? formatDate(f.date) + " · " : "") + esc(f.dep) + "</small></td>" +
      '<td class="tt-mj-fl-time"><strong>' + esc(f.to_city) + "</strong><small>" +
        (f.date ? formatDate(f.date) + " · " : "") + esc(f.arr) + "</small></td>" +
      '<td class="tt-mj-fl-dur"><span aria-hidden="true">🕐</span> ' + esc(f.duration) + "</td>" +
    "</tr>";
  }

  // Контент карточки (включено / доп. расходы / информация) грузим один раз
  // на тур и кэшируем — это подтверждённые данные из каталога, не выдуманные.
  var builderContentCache = {};
  function fillBuilderContent(code) {
    function li(items, map) {
      return (items && items.length
        ? items.map(map).join("")
        : "<li class=\"tt-mj-muted\">—</li>");
    }
    function render(c) {
      $("builder-included").innerHTML = li(c.included, function (x) {
        return "<li>" + esc(x) + "</li>";
      });
      $("builder-excluded").innerHTML = li(c.excluded, function (x) {
        return "<li>" + esc(x) + "</li>";
      });
      $("builder-notes").innerHTML = li(c.info, function (x) {
        var text = typeof x === "string" ? x : x.text;
        var url = typeof x === "string" ? null : x.url;
        return "<li>" + (url
          ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' +
            esc(text) + "</a>"
          : esc(text)) + "</li>";
      });
    }
    if (builderContentCache[code]) { render(builderContentCache[code]); return; }
    TuronApi.catalogTour(code)
      .then(function (c) { builderContentCache[code] = c || {}; render(c || {}); })
      .catch(function () { render({}); });
  }

  function renderBuilder() {
    var d = builderDeparture();
    if (!d) {
      // Заездов нет вообще (все закрыты или сезон кончился) — раньше экран
      // навсегда замирал на «Загрузка…», агент не понимал, что случилось.
      $("builder-title").textContent = "Нет доступных заездов";
      $("builder-route").innerHTML = "";
      $("builder-flights").innerHTML =
        '<p class="tt-mj-empty">Оператор пока не открыл заезды для продажи. ' +
        "Уточните расписание у менеджера.</p>";
      $("builder-departure").innerHTML = "";
      $("builder-hotelfield").innerHTML = "<div><small>—</small></div>";
      $("builder-travellers").innerHTML = "";
      $("builder-paxhead").innerHTML = "";
      $("builder-book").disabled = true;
      return;
    }
    state.builder.code = d.code;

    var t = builderTotals(d);
    var over = t.seats > d.seats_free;
    var nights = d.nights || 0;

    // ----------------------------------------------- заголовок + маршрут
    $("builder-title").innerHTML = esc(d.tour_name || "Заезд") +
      ' <span class="tt-mj-year">Турция · 2026</span>';
    $("builder-route").innerHTML =
      "<span>Батуми</span><i>→</i><span>Ризе</span><i>→</i><span>Трабзон</span>";

    // ---------------------------------------------- селектор «Период»
    $("builder-departure").innerHTML = state.departures.map(function (x) {
      return '<option value="' + esc(x.code) + '"' +
        (x.code === d.code ? " selected" : "") +
        (x.seats_free <= 0 ? " disabled" : "") + ">" +
        formatRange(x.date_start, x.nights) +
        (x.nights ? " · " + x.nights + " ночей" : "") +
        (x.seats_free <= 0 ? " · мест нет" : " · свободно " + x.seats_free) +
      "</option>";
    }).join("");

    // ------------------------------------------- поле «Отель» (пакет)
    var hotels = TuronProvisional.hotelsFor(d);
    $("builder-hotelfield").innerHTML = hotels.length
      ? hotels.map(function (h) {
          var name = esc(h.name) + ' <span class="tt-mj-stars">' +
            "★".repeat(h.stars) + "</span>";
          var title = h.url
            ? '<a href="' + esc(h.url) + '" target="_blank" rel="noopener">' +
              name + "</a>"
            : name;
          return "<div><strong>" + title + "</strong><small>" + esc(h.city) +
            " · " + h.nights + " ноч. · " + esc(h.board) + "</small></div>";
        }).join('<i class="tt-mj-plus" aria-hidden="true">+</i>')
      : "<div><small>Отель уточняется</small></div>";

    // -------------------------------------------------- авиабилеты
    var fl = TuronProvisional.flightsFor(d);
    $("builder-flights").innerHTML = fl
      ? '<table class="tt-mj-fltable"><thead><tr>' +
          "<th>Выбрать</th><th>Перевозчик</th><th>Багаж</th>" +
          "<th>Отправление</th><th>Прибытие</th><th>Длительность</th>" +
        "</tr></thead><tbody>" + flightRow(fl.out) + flightRow(fl.back) +
        "</tbody></table>"
      : '<p class="tt-mj-empty">Рейсы на этот заезд ещё не опубликованы: ' +
        'подтверждённая полётная программа — ' + TuronProvisional.SCHEDULE.weekday_label +
        " по " + TuronProvisional.SCHEDULE.season_end_label +
        ". Уточните рейсы у оператора.</p>";

    // -------------------------------------- шапка карточки туристов
    $("builder-paxhead").innerHTML = "<strong>" + formatRange(d.date_start, nights) +
      "</strong><small>" + (nights ? nights + " ночей / " + (nights + 1) + " дней · " : "") +
      "свободно " + d.seats_free + " из " + d.capacity + "</small>";

    // --------------------------------------------- счётчики туристов
    $("builder-travellers").innerHTML = builderTariffs(d).map(function (r) {
      var n = state.builder.counts[r.code] || 0;
      return '<div class="tt-mj-paxrow">' +
        '<div class="tt-mj-paxlabel"><strong>' + esc(r.title) + "</strong><small>" +
          esc(r.note) + "</small></div>" +
        '<div class="tt-mj-qty">' +
          '<button type="button" data-bstep="-1" data-tariff="' + esc(r.code) + '"' +
            (n === 0 ? " disabled" : "") + ">−</button>" +
          "<b>" + n + "</b>" +
          '<button type="button" data-bstep="1" data-tariff="' + esc(r.code) + '">+</button>' +
        "</div>" +
        '<div class="tt-mj-paxprice">' +
          (n ? "<strong>" + n + " × " + money(r.price) + "</strong><small>" +
                money(n * r.price) + "</small>"
             : "<small>" + money(r.price) + "</small>") +
        "</div>" +
      "</div>";
    }).join("");

    // ------------------------------------------------- правила оплаты
    var pol = TuronApi.paymentPolicy(d.date_start);
    $("builder-payplan").innerHTML =
      '<ul class="tt-mj-rules">' +
        "<li><b>30%</b> стоимости — в течение <b>3 дней</b> с брони, оставшиеся " +
          "<b>70%</b> — не позднее чем за <b>20 дней</b> до выезда.</li>" +
        "<li>Если до выезда меньше <b>20 дней</b> — <b>100%</b> в течение <b>суток</b>.</li>" +
      "</ul>" +
      (t.total > 0
        ? '<div class="tt-mj-schedule">' + pol.steps.map(function (s) {
            return "<div><span>" + Math.round(s.share * 100) + "% · до " +
              formatDate(s.due.toISOString().slice(0, 10)) + "</span><b>" +
              money(Math.round(t.total * s.share * 100) / 100) + "</b></div>";
          }).join("") + "</div>"
        : "");

    // --------------------------------------------- с билетом / без
    $("builder-ticket").innerHTML =
      '<div class="tt-mj-ticket-opts">' +
        '<label class="is-on"><input type="radio" name="tk" checked disabled /> С билетом</label>' +
        '<label class="is-off"><input type="radio" name="tk" disabled /> Без билетов</label>' +
      "</div>" +
      "<small>Авиаперелёт Ташкент — Трабзон / Батуми включён в цену.</small>";

    // ----------------------------------------- питание / вид / номер
    var placements = d.prices.filter(function (p) { return p.kind === "placement"; })
      .map(function (p) { return p.label; }).join(" · ");
    $("builder-room").innerHTML =
      '<div class="tt-mj-roomrow"><span>Виды еды</span><b>BB · завтраки</b></div>' +
      '<div class="tt-mj-roomrow"><span>Вид из комнаты</span><b>без гарантии вида</b></div>' +
      '<div class="tt-mj-roomrow"><span>Типы номеров</span><b>' + esc(placements) + "</b></div>";

    // --------------------------------------------------- «Общий»
    var commission = (d.agency_commission || 0) * t.seats;
    var lines = builderTariffs(d).filter(function (r) {
      return (state.builder.counts[r.code] || 0) > 0;
    }).map(function (r) {
      var n = state.builder.counts[r.code];
      return "<div><span>" + esc(r.title) + " · " + esc(r.note) + " × " + n +
        "</span><b>" + money(n * r.price) + "</b></div>";
    }).join("");
    $("builder-summary").innerHTML =
      '<div class="tt-mj-total-lines">' + lines + "</div>" +
      '<div class="tt-mj-total-grand"><span>Общий</span><strong>' + money(t.total) +
        "</strong></div>" +
      (over
        ? '<div class="tt-mj-error">Мест не хватает: нужно ' + t.seats +
          ", свободно " + d.seats_free + ".</div>"
        : "");

    var cbox = $("builder-commission");
    cbox.hidden = commission <= 0;
    if (commission > 0) {
      cbox.innerHTML = "<span>Комиссия агентства</span><b>" + money(commission) + "</b>";
    }

    // --------------------------------------------- кнопки и контент
    var prog = TuronProvisional.programFor(d);
    var progBtn = $("builder-program");
    progBtn.textContent = prog
      ? "⤓ Скачать программу · " + prog.title
      : "Программа тура · " + (nights || 7) + " ночей";
    progBtn.dataset.url = prog ? prog.url : "";
    $("builder-book").disabled = t.people === 0 || over;
    fillBuilderContent(d.tour_code || "KARADENIZ");
  }

  // смена заезда и счётчиков
  $("panel-builder").addEventListener("change", function (e) {
    if (e.target.id !== "builder-departure") return;
    state.builder = { code: e.target.value, counts: {} };
    renderBuilder();
  });

  // Кнопка «Программа тура»: если есть PDF под направление — качаем его,
  // иначе открываем карточку тура в каталоге с программой по дням.
  $("builder-program").addEventListener("click", function () {
    var url = $("builder-program").dataset.url;
    if (url) { window.open(url, "_blank", "noopener"); return; }
    // Резерв без PDF: открываем каталог и обязательно перерисовываем его —
    // сам по себе switchTab содержимое вкладки не строит.
    switchTab("catalog");
    if (cabinetCatalog) cabinetCatalog.render();
  });

  $("panel-builder").addEventListener("click", function (e) {
    var step = e.target.closest("[data-bstep]");
    if (!step) return;
    var code = step.dataset.tariff;
    var next = (state.builder.counts[code] || 0) + Number(step.dataset.bstep);
    state.builder.counts[code] = Math.max(0, next);
    renderBuilder();
  });

  // --------------------------------------------------------- бронирование
  function passengerRowHtml(i, placements) {
    return (
      '<div class="tt-pax" data-pax="' + i + '">' +
        '<div class="tt-pax-head"><strong>Пассажир ' + (i + 1) + "</strong>" +
          (i > 0 ? '<button class="tt-icon-btn" data-remove="' + i + '" aria-label="Убрать">&times;</button>' : "") +
        "</div>" +
        '<div class="tt-pax-grid">' +
          '<div class="tt-col-2"><label>ФИО латиницей, как в паспорте</label>' +
            '<input type="text" data-f="full_name" placeholder="IVANOV IVAN" /></div>' +
          "<div><label>Дата рождения</label><input type=\"date\" data-f=\"birth_date\" /></div>" +
          '<div><label>Размещение</label><select data-f="placement">' +
            placements.map(function (p) {
              return '<option value="' + esc(p.code) + '">' + esc(p.label) + "</option>";
            }).join("") +
          "</select></div>" +
          '<div><label>Номер паспорта</label><input type="text" data-f="passport_number" /></div>' +
          '<div><label>Действителен до</label><input type="date" data-f="passport_expiry" /></div>' +
        "</div>" +
        '<div class="tt-pax-price" data-price></div>' +
      "</div>"
    );
  }

  function collectPassengers() {
    return [].map.call(document.querySelectorAll("#bm-passengers .tt-pax"), function (card) {
      var p = {};
      card.querySelectorAll("[data-f]").forEach(function (input) {
        p[input.dataset.f] = input.value.trim();
      });
      return p;
    });
  }

  // Живой расчёт: те же правила, что применит сервер при сохранении.
  function updateSummary() {
    var d = state.current;
    var rows = collectPassengers();
    var total = 0, seats = 0, ready = rows.length > 0;

    rows.forEach(function (p, i) {
      var box = document.querySelector('[data-pax="' + i + '"] [data-price]');
      if (!p.full_name || !p.birth_date || !p.passport_number) {
        ready = false;
        box.innerHTML = '<span class="tt-muted-note">заполните ФИО, дату рождения и паспорт</span>';
        return;
      }
      var t = TuronApi.priceFor(p, d);
      if (!t) {
        ready = false;
        box.innerHTML = '<span class="tt-price-warn">нет цены на «' + esc(p.placement) + '» для этого заезда</span>';
        return;
      }
      total += t.price;
      if (t.occupies_seat) seats++;
      var age = TuronApi.ageOn(p.birth_date, d.date_start);

      // Ребёнку достался взрослый тариф — обычно значит, что для этого
      // заезда детские цены в прайсе не заданы (так в ведомости у инфотура).
      // Не блокируем, но и молча по взрослой цене не проводим.
      var childByAge = age < 12;
      var gotAdultTariff = d.prices.some(function (pr) {
        return pr.kind === "placement" && pr.code === t.code;
      });
      var needsCheck = childByAge && gotAdultTariff;

      var passport = TuronApi.passportIssue(p.passport_expiry, d.date_start);

      box.innerHTML = '<span class="tt-pax-tariff">' + age + " лет · " + esc(t.label) + "</span>" +
        "<strong>" + money(t.price) + "</strong>" +
        (t.occupies_seat ? "" : '<span class="tt-muted-note"> · без места</span>') +
        (needsCheck
          ? '<span class="tt-price-warn"> · детский тариф на этот заезд не задан, ' +
            "посчитано по взрослому — менеджер уточнит</span>"
          : "") +
        (passport ? '<span class="tt-price-warn"> · ' + esc(passport) + "</span>" : "");
    });

    // при правке места, уже занятые этой бронью, снова доступны ей самой
    var available = d.seats_free + (state.editing ? state.editing.seats_used || 0 : 0);
    var overflow = seats > available;
    if (overflow) ready = false;

    var commission = (d.agency_commission || 0) * seats;
    $("bm-summary").innerHTML =
      '<div class="tt-sum-line"><span>Пассажиров</span><strong>' + rows.length + "</strong></div>" +
      '<div class="tt-sum-line"><span>Занимают мест</span><strong>' + seats + " из " + available + " доступных</strong></div>" +
      (commission > 0
        ? '<div class="tt-sum-line tt-earn"><span>Ваша комиссия</span><strong>' +
          money(commission) + "</strong></div>"
        : "") +
      '<div class="tt-sum-total"><span>Итого к оплате</span><strong>' + money(total) + "</strong></div>" +
      (total > 0 ? TuronCatalog.policyHtml(d.date_start, total) : "") +
      (overflow ? '<div class="tt-error-box">Мест не хватает — уберите пассажиров или выберите другой заезд.</div>' : "");

    $("bm-submit").disabled = !ready;
  }

  function prefillPassengers(list) {
    list.forEach(function (p, i) {
      var card = document.querySelector('[data-pax="' + i + '"]');
      if (!card) return;
      ["full_name", "birth_date", "passport_number", "passport_expiry", "placement"]
        .forEach(function (f) {
          var input = card.querySelector('[data-f="' + f + '"]');
          if (input && p[f]) input.value = p[f];
        });
    });
    updateSummary();
  }

  function renderPassengers() {
    var placements = state.current.prices.filter(function (p) { return p.kind === "placement"; });
    var saved = collectPassengers();
    $("bm-passengers").innerHTML = state.passengers
      .map(function (_, i) { return passengerRowHtml(i, placements); }).join("");
    saved.forEach(function (p, i) {
      var card = document.querySelector('[data-pax="' + i + '"]');
      if (!card) return;
      Object.keys(p).forEach(function (f) {
        var input = card.querySelector('[data-f="' + f + '"]');
        if (input && p[f]) input.value = p[f];
      });
    });
    updateSummary();
  }

  // Окно одно на два случая: новая бронь и правка состава существующей.
  // Различие только в том, чем заполняем форму и куда отправляем.
  function openBooking(code, booking, prefill) {
    var d = state.departures.filter(function (x) { return x.code === code; })[0];
    if (!d) return;
    state.current = d;
    state.editing = booking || null;
    state.passengers = booking && booking.passengers && booking.passengers.length
      ? booking.passengers.slice()
      : (prefill && prefill.length ? prefill.slice() : [{}]);
    $("bm-title").textContent = booking
      ? "Правка брони " + booking.code
      : "Заезд " + formatDate(d.date_start);
    $("bm-sub").textContent = (TRANSPORT[d.transport] || d.transport) + " · " + d.code +
      " · свободно " + d.seats_free;
    $("bm-note").value = (booking && booking.note) || "";
    $("bm-submit").textContent = booking ? "Сохранить" : "Забронировать";
    $("booking-modal").hidden = false;
    // Чистим форму перед отрисовкой: renderPassengers переносит в новые
    // строки то, что осталось в старых, и без этого данные прошлой брони
    // всплывали бы в следующей.
    $("bm-passengers").innerHTML = "";
    renderPassengers();
    prefillPassengers(state.passengers);
  }

  function closeBooking() {
    $("booking-modal").hidden = true;
    state.current = null;
  }

  $("departures-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-book]");
    if (btn) openBooking(btn.dataset.book);
  });

  $("bm-close").addEventListener("click", closeBooking);
  $("booking-modal").addEventListener("click", function (e) {
    if (e.target === $("booking-modal")) closeBooking();
  });

  $("bm-add").addEventListener("click", function () {
    state.passengers.push({});
    renderPassengers();
  });

  $("bm-passengers").addEventListener("click", function (e) {
    var rm = e.target.closest("[data-remove]");
    if (!rm) return;
    var rows = collectPassengers();
    rows.splice(Number(rm.dataset.remove), 1);
    state.passengers = rows;
    $("bm-passengers").innerHTML = "";
    renderPassengers();
    rows.forEach(function (p, i) {
      var card = document.querySelector('[data-pax="' + i + '"]');
      Object.keys(p).forEach(function (f) {
        var input = card && card.querySelector('[data-f="' + f + '"]');
        if (input && p[f]) input.value = p[f];
      });
    });
    updateSummary();
  });

  $("bm-passengers").addEventListener("input", updateSummary);
  $("bm-passengers").addEventListener("change", updateSummary);

  $("bm-submit").addEventListener("click", function () {
    var btn = $("bm-submit");
    btn.disabled = true;
    var editing = state.editing;
    var action = editing
      ? TuronApi.updateBookingPassengers(editing.id, collectPassengers())
      : TuronApi.createBooking({
          departure_code: state.current.code,
          passengers: collectPassengers(),
          note: $("bm-note").value.trim() || null,
        });
    action.then(function (res) {
      closeBooking();
      return Promise.all([loadDepartures(), loadBookings()]).then(function () {
        switchTab("bookings");
        flash(editing
          ? "Бронь " + res.booking_code + " обновлена: " + res.passengers_count +
            " чел., " + money(res.total_price)
          : "Бронь " + res.booking_code + " создана на " + money(res.total_price) +
            ", занято мест: " + res.seats_taken);
      });
    }).catch(function (err) {
      $("bm-summary").innerHTML += '<div class="tt-error-box">' + esc(err.message) + "</div>";
      btn.disabled = false;
    });
  });

  // ------------------------------------------------------------ мои брони
  function bookingRowHtml(b) {
    var cancelled = b.status === "cancelled";
    var paidPart = b.paid > 0 && b.balance > 0;
    return (
      '<article class="tt-booking' + (cancelled ? " is-cancelled" : "") + '">' +
        '<div class="tt-booking-main">' +
          '<div><strong>' + esc(b.code) + "</strong>" +
            '<div class="tt-muted-note">' + formatDate(b.date_start) + " · " +
              (TRANSPORT[b.transport] || b.transport) + " · " + b.passengers_count + " чел.</div>" +
          "</div>" +
          (cancelled ? '<span class="tt-badge tt-badge-off">Отменена</span>' : "") +
        "</div>" +
        '<div class="tt-booking-money">' +
          '<div class="tt-sum-line"><span>Стоимость</span><strong>' + money(b.total_price) + "</strong></div>" +
          '<div class="tt-sum-line"><span>Оплачено</span><strong>' + money(b.paid) + "</strong></div>" +
          '<div class="tt-sum-line' + (b.balance > 0 ? " tt-owed" : "") + '"><span>Остаток</span><strong>' +
            money(b.balance) + "</strong></div>" +
          (b.agency_commission > 0
            ? '<div class="tt-sum-line tt-earn"><span>Комиссия</span><strong>' +
              money(b.agency_commission) + "</strong></div>"
            : "") +
          (paidPart ? '<div class="tt-muted-note">частичная оплата</div>' : "") +
        "</div>" +
        '<div class="tt-booking-action">' +
          (cancelled ? "" :
            '<button class="tt-btn secondary tt-btn-sm" data-edit="' + b.id + '">Изменить</button>' +
            '<button class="tt-btn secondary tt-btn-sm" data-cancel="' + b.id + '">Отменить</button>') +
        "</div>" +
      "</article>"
    );
  }

  function loadBookings() {
    return TuronApi.bookings().then(function (list) {
      state.bookings = list;
      var active = list.filter(function (b) { return b.status !== "cancelled"; });
      var earned = active.reduce(function (s, b) { return s + (b.agency_commission || 0); }, 0);
      var owed = active.reduce(function (s, b) { return s + (b.balance || 0); }, 0);
      $("earnings-summary").innerHTML = active.length
        ? '<div class="tt-earnings">' +
            '<div><span>Активных броней</span><strong>' + active.length + "</strong></div>" +
            '<div><span>Заработано комиссии</span><strong class="tt-earn-value">' + money(earned) + "</strong></div>" +
            '<div><span>К доплате оператору</span><strong' + (owed > 0 ? ' class="tt-owed-value"' : "") + ">" +
              money(owed) + "</strong></div>" +
          "</div>"
        : "";
      $("bookings-list").innerHTML = list.length
        ? list.map(bookingRowHtml).join("")
        : '<div class="tt-empty-state">Броней пока нет. Выберите заезд на вкладке «Туры».</div>';
      renderTravellers();
      renderPayments();
      renderDocuments();
      renderNotices();   // колокольчик считается по тем же броням
    }).catch(function (err) {
      $("bookings-list").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить брони.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  $("bookings-list").addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      TuronApi.bookings().then(function (list) {
        var b = list.filter(function (x) { return x.id === Number(editBtn.dataset.edit); })[0];
        if (!b) return;
        var dep = state.departures.filter(function (d) { return d.code === b.departure_code; })[0];
        if (!dep) {
          alert("Заезд уже прошёл — состав не меняется.");
          return;
        }
        openBooking(b.departure_code, b);
      });
      return;
    }
    var btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    if (!confirm("Отменить бронь? Места вернутся в продажу.")) return;
    btn.disabled = true;
    TuronApi.cancelBooking(Number(btn.dataset.cancel)).then(function (res) {
      flash("Бронь " + res.booking_code + " отменена, освобождено мест: " + res.released_seats);
      return Promise.all([loadDepartures(), loadBookings()]);
    }).catch(function (err) {
      alert(err.message);
      btn.disabled = false;
    });
  });

  // ---------------------------------------------------------------- прочее
  function tourRowHtml(t) {
    return (
      '<article class="tt-tour' + (t.is_bookable ? "" : " is-pending") + '">' +
        "<div>" +
          "<strong>" + esc(t.name) + "</strong>" +
          '<div class="tt-muted-note">' + esc(t.destination) +
            (t.note ? " · " + esc(t.note) : "") + "</div>" +
        "</div>" +
        '<div class="tt-tour-commission">' +
          (t.agency_commission > 0
            ? '<span class="tt-earn-value">' + money(t.agency_commission) + "</span>" +
              '<span class="tt-muted-note">с туриста</span>'
            : '<span class="tt-muted-note">без комиссии</span>') +
        "</div>" +
        "<div>" +
          (t.is_bookable
            ? '<span class="tt-badge">Открыт</span>'
            : '<span class="tt-badge tt-badge-off">Скоро</span>') +
        "</div>" +
      "</article>"
    );
  }

  function loadTours() {
    return TuronApi.tours().then(function (list) {
      $("tours-list").innerHTML = list.map(tourRowHtml).join("") +
        '<p class="tt-muted-note" style="margin-top:16px">' +
        "Комиссия начисляется за каждого проданного туриста. Младенцы до 2 лет " +
        "не занимают место и продажей не считаются.</p>";
    }).catch(function () {
      $("tours-list").innerHTML = '<div class="tt-empty-state">Не удалось загрузить туры.</div>';
    });
  }

  /* ------------------------------------------------- туристы агентства
   * Отдельного API не нужно: /api/bookings уже отдаёт состав каждой
   * брони. Собираем плоский список по всем броням агентства.
   */
  function allTravellers() {
    var rows = [];
    state.bookings.forEach(function (b) {
      (b.passengers || []).forEach(function (p) {
        rows.push({
          name: p.full_name, birth: p.birth_date,
          passport: p.passport_number, expiry: p.passport_expiry,
          tariff: p.tariff || p.price_code, price: p.price,
          booking: b.code, status: b.status,
          date_start: b.date_start, transport: b.transport,
        });
      });
    });
    return rows;
  }

  function renderTravellers() {
    var q = ($("tv-query").value || "").trim().toLowerCase();
    var rows = allTravellers().filter(function (r) {
      if (!q) return true;
      return (r.name || "").toLowerCase().indexOf(q) !== -1 ||
             (r.passport || "").toLowerCase().indexOf(q) !== -1 ||
             (r.booking || "").toLowerCase().indexOf(q) !== -1;
    });

    $("travellers-list").innerHTML = rows.length
      ? '<div class="tt-muted-note" style="margin-bottom:12px">Всего туристов: ' +
        rows.length + "</div>" +
        rows.map(function (r) {
          var issue = TuronApi.passportIssue(r.expiry, r.date_start);
          return '<article class="tt-row-card' +
              (r.status === "cancelled" ? " is-cancelled" : "") + '">' +
            "<div><strong>" + esc(r.name) + "</strong>" +
              '<div class="tt-muted-note">' + esc(r.birth || "—") +
              " · паспорт " + esc(r.passport || "—") + "</div></div>" +
            "<div><span>Заезд</span><strong>" + formatDate(r.date_start) + "</strong>" +
              '<div class="tt-muted-note">' + esc(TRANSPORT[r.transport] || r.transport) +
              "</div></div>" +
            "<div><span>Бронь</span><strong>" + esc(r.booking) + "</strong>" +
              (r.status === "cancelled"
                ? '<div class="tt-muted-note">отменена</div>' : "") + "</div>" +
            "<div><span>Тариф</span><strong>" + esc(r.tariff || "—") + "</strong>" +
              '<div class="tt-muted-note">' + money(r.price || 0) + "</div></div>" +
            (issue ? '<div class="tt-row-warn">' + esc(issue) + "</div>" : "") +
          "</article>";
        }).join("")
      : '<div class="tt-empty-state">' +
        (q ? "Никто не найден по запросу." : "Туристов пока нет — они появятся после первой брони.") +
        "</div>";
  }

  /* ----------------------------------------------------------- платежи
   * Сроки считает TuronApi.paymentPolicy от даты брони и даты выезда —
   * та же логика, что в карточке тура и в окне брони.
   */
  /* ------------------------------------------------------- уведомления
   * Колокольчик раньше был просто иконкой. Теперь собирает то, что
   * агенту важно не пропустить, из уже загруженных броней:
   * просроченные платежи, ближайшие выезды и проблемы с паспортами.
   * Отдельного запроса нет — считаем по state.bookings.
   */
  function collectNotices() {
    var out = [];
    var today = new Date().toISOString().slice(0, 10);
    var soon = new Date();
    soon.setDate(soon.getDate() + 7);
    var soonIso = soon.toISOString().slice(0, 10);

    state.bookings.filter(function (b) { return b.status !== "cancelled"; })
      .forEach(function (b) {
        // 1. просроченные этапы оплаты
        var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
        var lateSum = 0;
        pol.steps.forEach(function (s) {
          var due = s.due.toISOString().slice(0, 10);
          var need = Math.round(b.total_price * s.share * 100) / 100;
          if (b.paid < need - 0.01 && due < today) lateSum = Math.max(lateSum, need - b.paid);
        });
        if (lateSum > 0) {
          out.push({ kind: "late", code: b.code,
            text: "Просрочен платёж по брони " + b.code + " — " + money(lateSum) });
        }

        // 2. выезд на этой неделе
        if (b.date_start >= today && b.date_start <= soonIso) {
          out.push({ kind: "soon", code: b.code,
            text: "Выезд " + formatDate(b.date_start) + " · бронь " + b.code +
                  (b.balance > 0 ? " · остаток " + money(b.balance) : "") });
        }

        // 3. паспорта: истекающие и незаполненные
        (b.passengers || []).forEach(function (p) {
          if (!p.passport_number || !p.passport_expiry) {
            out.push({ kind: "pass", code: b.code,
              text: "Не заполнен паспорт: " + (p.full_name || "пассажир") +
                    " · бронь " + b.code });
            return;
          }
          var issue = TuronApi.passportIssue(p.passport_expiry, b.date_start);
          if (issue) {
            out.push({ kind: "pass", code: b.code,
              text: (p.full_name || "Пассажир") + " — " + issue + " · бронь " + b.code });
          }
        });
      });

    // сначала просрочки, затем ближайшие выезды, затем паспорта
    var order = { late: 0, soon: 1, pass: 2 };
    return out.sort(function (a, b) { return order[a.kind] - order[b.kind]; });
  }

  function renderNotices() {
    var list = collectNotices();
    var dot = $("notice-dot");
    var button = $("notice-btn");
    if (dot) {
      dot.hidden = list.length === 0;
      dot.textContent = list.length > 9 ? "9+" : String(list.length);
    }
    if (button) {
      button.classList.toggle("has-notices", list.length > 0);
      button.setAttribute("aria-label", list.length
        ? "Уведомления: " + list.length + " новых"
        : "Уведомлений нет");
    }

    var icons = { late: "!", soon: "✈", pass: "▣" };
    $("notice-panel").innerHTML = list.length
      ? '<div class="tt-notice-head">Уведомления<span>' + list.length + "</span></div>" +
        '<ul class="tt-notice-list">' + list.map(function (n) {
          return '<li class="is-' + n.kind + '"><b>' + icons[n.kind] + "</b>" +
            esc(n.text) + "</li>";
        }).join("") + "</ul>" +
        '<button type="button" class="tt-notice-go" data-goto="payments">Перейти к платежам</button>'
      : '<div class="tt-notice-head">Уведомления</div>' +
        '<p class="tt-notice-empty">Всё в порядке: просрочек нет, ' +
        "ближайших выездов на этой неделе тоже.</p>";
  }

  function renderPayments() {
    var active = state.bookings.filter(function (b) { return b.status !== "cancelled"; });
    var total = active.reduce(function (s, b) { return s + b.total_price; }, 0);
    var paid = active.reduce(function (s, b) { return s + b.paid; }, 0);
    var owed = active.reduce(function (s, b) { return s + b.balance; }, 0);
    var today = new Date().toISOString().slice(0, 10);

    var overdue = 0;
    var cards = active.map(function (b) {
      var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
      var steps = pol.steps.map(function (s) {
        var due = s.due.toISOString().slice(0, 10);
        var need = Math.round(b.total_price * s.share * 100) / 100;
        // шаг закрыт, если оплачено уже не меньше, чем требует этот этап
        var covered = b.paid >= need - 0.01;
        var late = !covered && due < today;
        if (late) overdue++;
        return '<li class="' + (covered ? "is-done" : late ? "is-late" : "") + '">' +
          "<strong>" + money(need) + "</strong> — " + esc(s.label) +
          '<span class="tt-muted-note"> до ' + formatDate(due) + "</span>" +
          (covered ? "<em>внесено</em>" : late ? "<em>просрочено</em>" : "") +
        "</li>";
      }).join("");

      return '<article class="tt-pay-card' + (b.balance > 0 ? "" : " is-paid") + '">' +
        "<header><strong>" + esc(b.code) + "</strong>" +
          '<span class="tt-muted-note">' + formatDate(b.date_start) + " · " +
          esc(TRANSPORT[b.transport] || b.transport) + " · " +
          b.passengers_count + " чел.</span></header>" +
        '<div class="tt-pay-money">' +
          "<div><span>Стоимость</span><strong>" + money(b.total_price) + "</strong></div>" +
          "<div><span>Оплачено</span><strong>" + money(b.paid) + "</strong></div>" +
          '<div><span>Остаток</span><strong' + (b.balance > 0 ? ' class="tt-owed-value"' : "") +
            ">" + money(b.balance) + "</strong></div>" +
        "</div>" +
        '<ul class="tt-pay-steps">' + steps + "</ul>" +
      "</article>";
    }).join("");

    $("payments-summary").innerHTML = active.length
      ? '<div class="tt-earnings">' +
          "<div><span>К оплате всего</span><strong>" + money(total) + "</strong></div>" +
          "<div><span>Внесено</span><strong>" + money(paid) + "</strong></div>" +
          '<div><span>Остаток</span><strong' + (owed > 0 ? ' class="tt-owed-value"' : "") +
            ">" + money(owed) + "</strong></div>" +
          "<div><span>Просроченных этапов</span><strong" +
            (overdue > 0 ? ' class="tt-owed-value"' : "") + ">" + overdue + "</strong></div>" +
        "</div>"
      : "";
    $("payments-list").innerHTML = cards ||
      '<div class="tt-empty-state">Оплачивать пока нечего — броней нет.</div>';
  }

  /* --------------------------------------------------------- документы
   * Ваучер собирается на клиенте из данных брони и открывается в новом
   * окне на печать. Отдельного хранилища документов нет.
   */
  function renderDocuments() {
    var active = state.bookings.filter(function (b) { return b.status !== "cancelled"; });
    $("documents-list").innerHTML = active.length
      ? active.map(function (b) {
          return '<article class="tt-row-card">' +
            "<div><strong>Ваучер " + esc(b.code) + "</strong>" +
              '<div class="tt-muted-note">' + formatDate(b.date_start) + " · " +
              b.passengers_count + " чел. · " + money(b.total_price) + "</div></div>" +
            '<div class="tt-row-actions">' +
              '<button class="tt-btn secondary tt-btn-sm" data-voucher="' +
                esc(b.code) + '">Открыть и распечатать</button>' +
            "</div>" +
          "</article>";
        }).join("") + TuronProvisional.noteHtml("бланк ваучера")
      : '<div class="tt-empty-state">Документы появятся после первой брони.</div>';
  }

  function openVoucher(code) {
    var b = state.bookings.filter(function (x) { return x.code === code; })[0];
    if (!b) return;
    var op = TuronProvisional.OPERATOR;
    // у брони нет длительности — берём её у заезда, иначе в ваучере
    // окажется только дата вылета без даты возврата
    var dep = state.departures.filter(function (x) {
      return x.code === b.departure_code;
    })[0];
    var nights = dep ? dep.nights : null;
    var fl = TuronProvisional.flightsFor({
      transport: b.transport, date_start: b.date_start, nights: nights,
    });
    var win = window.open("", "_blank");
    if (!win) { flash("Разрешите всплывающие окна, чтобы открыть ваучер."); return; }

    win.document.write(
      '<!doctype html><meta charset="utf-8"><title>Ваучер ' + esc(b.code) + "</title>" +
      "<style>body{font:14px/1.5 Georgia,serif;margin:40px;color:#222}" +
      "h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:16px 0}" +
      "th,td{border:1px solid #ccc;padding:7px 9px;text-align:left;font-size:13px}" +
      "th{background:#f2efe9}.muted{color:#666;font-size:12px}" +
      ".head{display:flex;justify-content:space-between;align-items:flex-start;" +
      "border-bottom:2px solid #0d302a;padding-bottom:12px}" +
      "@media print{.no-print{display:none}}</style>" +
      '<div class="head"><div><h1>Turon Tour</h1>' +
        '<div class="muted">' + esc(op.address) + "<br />" +
        esc(op.phone) + " · " + esc(op.email) + "</div></div>" +
        "<div><strong>Ваучер " + esc(b.code) + '</strong><div class="muted">от ' +
        esc((b.created_at || "").slice(0, 10)) + "</div></div></div>" +
      "<p><strong>Заезд:</strong> " + formatRange(b.date_start, nights) + " · " +
        esc(TRANSPORT[b.transport] || b.transport) + " · " + esc(b.departure_code) + "</p>" +
      (fl
        ? "<p><strong>Рейсы:</strong> " +
          esc(fl.out.code) + " " + esc(fl.out.from) + "–" + esc(fl.out.to) + " " +
          esc(fl.out.dep) + ", " + esc(fl.back.code) + " " + esc(fl.back.from) + "–" +
          esc(fl.back.to) + " " + esc(fl.back.dep) +
          ". Багаж " + esc(fl.out.baggage) + ", ручная кладь " +
          esc(fl.out.cabin_baggage) + "</p>"
        : "") +
      "<table><tr><th>#</th><th>Фамилия и имя</th><th>Дата рождения</th>" +
        "<th>Паспорт</th><th>Размещение</th><th>Тариф</th></tr>" +
      (b.passengers || []).map(function (p, i) {
        return "<tr><td>" + (i + 1) + "</td><td>" + esc(p.full_name) + "</td><td>" +
          esc(p.birth_date) + "</td><td>" + esc(p.passport_number) + "</td><td>" +
          esc(p.placement) + "</td><td>" + esc(p.tariff || p.price_code) + "</td></tr>";
      }).join("") + "</table>" +
      "<p><strong>Стоимость:</strong> " + money(b.total_price) +
        " · оплачено " + money(b.paid) + " · остаток " + money(b.balance) + "</p>" +
      (b.note ? "<p><strong>Примечание:</strong> " + esc(b.note) + "</p>" : "") +
      '<p class="muted">Документ сформирован кабинетом агентства. Бланк ' +
      "предварительный — форму ваучера оператор ещё не утвердил.</p>" +
      '<button class="no-print" onclick="window.print()">Печать</button>'
    );
    win.document.close();
  }

  $("documents-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-voucher]");
    if (btn) openVoucher(btn.dataset.voucher);
  });

  $("tv-query").addEventListener("input", renderTravellers);

  /* --------------------------------------------------------- контакты
   * Связь с оператором идёт по телефону и в Telegram — переписки внутри
   * кабинета нет. Здесь показаны рабочие контакты менеджера.
   */
  function renderMessages() {
    var op = TuronProvisional.OPERATOR;
    $("messages-body").innerHTML =
      '<div class="tt-panel">' +
        "<h2>Контакты оператора</h2>" +
        '<p class="tt-muted-note">По броням отвечает менеджер Turon Tour. ' +
        "Пишите в Telegram или звоните.</p>" +
        '<div class="tt-contact-grid">' +
          (op.contact_name ? "<div><span>Менеджер</span><strong>" +
            esc(op.contact_name) + "</strong></div>" : "") +
          "<div><span>Телефон</span><strong><a href=\"tel:" + esc(op.phone_href) +
            '">' + esc(op.phone) + "</a></strong></div>" +
          (op.telegram_href ? "<div><span>Telegram</span><strong><a href=\"" +
            esc(op.telegram_href) + '" target="_blank" rel="noopener">' +
            esc(op.phone) + "</a></strong></div>" : "") +
          "<div><span>Почта</span><strong><a href=\"mailto:" + esc(op.email) +
            '">' + esc(op.email) + "</a></strong></div>" +
          "<div><span>Офис</span><strong>" + esc(op.address) + "</strong></div>" +
        "</div>" +
      "</div>";
  }

  function switchTab(name) {
    var labels = {
      builder: ["Новый тур", "Конструктор путешествия"],
      departures: ["Направления", "Заезды и свободные места"],
      catalog: ["Каталог туров", "Маршруты и программы"],
      travellers: ["Туристы", "Все пассажиры агентства"],
      payments: ["Платежи", "Сроки и задолженность"],
      documents: ["Документы", "Ваучеры по броням"],
      messages: ["Контакты", "Связь с оператором"],
      bookings: ["Бронирования", "Продажи агентства"],
      tours: ["Комиссии", "Партнёрская программа"],
      manifest: ["Списки пассажиров", "Операторская панель"],
      "admin-bookings": ["Все брони", "Контроль продаж и оплат"],
      agencies: ["Агентства", "Партнёрская сеть"],
    };
    document.querySelectorAll(".tt-tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tab === name);
    });
    ["builder", "departures", "catalog", "bookings", "tours", "travellers",
     "payments", "documents", "messages", "manifest", "admin-bookings", "agencies"]
      .forEach(function (key) {
        var panel = $("panel-" + key);
        if (panel) panel.hidden = key !== name;
      });
    $("screen-app").classList.toggle("is-builder", name === "builder");
    if (labels[name]) {
      $("workspace-title").textContent = labels[name][0];
      $("workspace-kicker").textContent = labels[name][1];
    }
  }

  document.querySelector(".tt-tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tt-tab");
    if (!tab || !tab.dataset.tab) return;
    switchTab(tab.dataset.tab);
    setNav(false);   // на телефоне меню выдвижное — закрываем после выбора
    // данные могли измениться после брони — перерисовываем раздел
    var t = tab.dataset.tab;
    if (t === "catalog" && cabinetCatalog) cabinetCatalog.render();
    if (t === "travellers") renderTravellers();
    if (t === "payments") renderPayments();
    if (t === "documents") renderDocuments();
    if (t === "messages") renderMessages();
  });

  // Выдвижное меню на узком экране. Кнопка ☰ в шапке была, но ни к чему
  // не подключена, а боковая колонка оставалась шириной 248px — из-за
  // этого страница ехала вбок.
  function setNav(open) {
    $("screen-app").classList.toggle("is-nav-open", open);
    $("nav-scrim").hidden = !open;
    $("nav-toggle").setAttribute("aria-expanded", open ? "true" : "false");
  }

  $("nav-toggle").addEventListener("click", function () {
    setNav(!$("screen-app").classList.contains("is-nav-open"));
  });
  $("nav-scrim").addEventListener("click", function () { setNav(false); });

  // На широком экране меню можно оставить полноценным или свернуть до
  // вертикальной полосы иконок. Выбор агентства запоминается на устройстве.
  var sidebarStorageKey = "turon.sidebar.compact";
  var sidebarBtn = $("sidebar-collapse");

  document.querySelectorAll(".tt-sidebar .tt-tab").forEach(function (tab) {
    var label = tab.querySelector("span:last-child");
    if (!label) return;
    tab.dataset.tooltip = label.textContent.trim();
    tab.setAttribute("aria-label", label.textContent.trim());
  });

  function applySidebarMode(compact, remember) {
    $("screen-app").classList.toggle("is-sidebar-collapsed", compact);
    sidebarBtn.setAttribute("aria-pressed", compact ? "true" : "false");
    sidebarBtn.setAttribute("aria-label", compact
      ? "Развернуть боковую панель"
      : "Свернуть боковую панель");
    sidebarBtn.title = compact ? "Развернуть меню" : "Свернуть меню";
    if (remember) {
      try { localStorage.setItem(sidebarStorageKey, compact ? "1" : "0"); } catch (_) {}
    }
  }

  var savedSidebar = false;
  try { savedSidebar = localStorage.getItem(sidebarStorageKey) === "1"; } catch (_) {}
  applySidebarMode(savedSidebar, false);
  sidebarBtn.addEventListener("click", function () {
    applySidebarMode(!$("screen-app").classList.contains("is-sidebar-collapsed"), true);
  });

  // Слайдер тура: ручные стрелки, точки, клавиатура, свайп, спокойная
  // автопрокрутка и полноэкранный просмотр. При reduced-motion автоплей
  // отключён, а CSS убирает переходы.
  var media = $("builder-media");
  var mediaSlides = Array.from(media.querySelectorAll("[data-media-slide]"));
  var mediaDots = Array.from(media.querySelectorAll("[data-media-dot]"));
  var mediaCaptions = [
    ["Ризе", "Чайные долины"],
    ["Трабзон", "Черноморское побережье"],
    ["Батуми", "Приморский бульвар"],
    ["Батуми", "Отель у моря"],
  ];
  var mediaTimer = null;
  var mediaPointerX = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showMedia(index, announce) {
    state.mediaIndex = (index + mediaSlides.length) % mediaSlides.length;
    mediaSlides.forEach(function (slide, i) {
      var active = i === state.mediaIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    mediaDots.forEach(function (dot, i) {
      var active = i === state.mediaIndex;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    var caption = mediaCaptions[state.mediaIndex];
    $("builder-media-caption").innerHTML = "<small>" + esc(caption[0]) +
      "</small><strong>" + esc(caption[1]) + "</strong>";
    if (announce) {
      $("builder-media-status").textContent = "Фото " + (state.mediaIndex + 1) +
        " из " + mediaSlides.length + ": " + caption[0] + ", " + caption[1];
    }
  }

  function stopMediaAuto() {
    if (mediaTimer) window.clearInterval(mediaTimer);
    mediaTimer = null;
  }
  function startMediaAuto() {
    stopMediaAuto();
    if (reduceMotion || document.hidden) return;
    mediaTimer = window.setInterval(function () {
      showMedia(state.mediaIndex + 1, false);
    }, 6500);
  }
  function moveMedia(step) {
    showMedia(state.mediaIndex + step, true);
    startMediaAuto();
  }

  $("builder-media-prev").addEventListener("click", function () { moveMedia(-1); });
  $("builder-media-next").addEventListener("click", function () { moveMedia(1); });
  $("builder-media-dots").addEventListener("click", function (e) {
    var dot = e.target.closest("[data-media-dot]");
    if (!dot) return;
    showMedia(Number(dot.dataset.mediaDot), true);
    startMediaAuto();
  });
  media.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); moveMedia(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); moveMedia(1); }
  });
  media.addEventListener("pointerdown", function (e) { mediaPointerX = e.clientX; });
  media.addEventListener("pointerup", function (e) {
    if (mediaPointerX == null) return;
    var delta = e.clientX - mediaPointerX;
    mediaPointerX = null;
    if (Math.abs(delta) > 45) moveMedia(delta > 0 ? -1 : 1);
  });
  media.addEventListener("pointercancel", function () { mediaPointerX = null; });
  media.addEventListener("mouseenter", stopMediaAuto);
  media.addEventListener("mouseleave", startMediaAuto);
  media.addEventListener("focusin", stopMediaAuto);
  media.addEventListener("focusout", startMediaAuto);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopMediaAuto(); else startMediaAuto();
  });

  function setMediaFullscreen(open) {
    media.classList.toggle("is-fullscreen", open);
    $("builder-media-full").setAttribute("aria-pressed", open ? "true" : "false");
    $("builder-media-full").setAttribute("aria-label", open
      ? "Закрыть полноэкранный просмотр"
      : "Открыть фотографию на весь экран");
    $("builder-media-full").title = open ? "Закрыть" : "На весь экран";
    document.body.style.overflow = open ? "hidden" : "";
  }

  $("builder-media-full").addEventListener("click", function () {
    if (document.fullscreenElement === media) {
      document.exitFullscreen().catch(function () { setMediaFullscreen(false); });
      return;
    }
    if (media.classList.contains("is-fullscreen")) {
      setMediaFullscreen(false);
      return;
    }
    if (media.requestFullscreen) {
      media.requestFullscreen().catch(function () { setMediaFullscreen(true); });
    } else {
      setMediaFullscreen(true);
    }
  });
  document.addEventListener("fullscreenchange", function () {
    setMediaFullscreen(document.fullscreenElement === media);
  });
  showMedia(0, false);
  startMediaAuto();

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNav(false);
    if (e.key === "Escape" && media.classList.contains("is-fullscreen") && !document.fullscreenElement) {
      setMediaFullscreen(false);
    }
  });

  $("builder-book").addEventListener("click", function () {
    var d = builderDeparture();
    if (!d) {
      flash("Нет доступных заездов для бронирования.");
      return;
    }
    // Открываем ровно тот заезд и тот состав, что показаны в конструкторе:
    // раньше кнопка брала первый попавшийся заезд, и бронь не совпадала
    // с тем, что агент только что посчитал.
    var rows = [];
    builderTariffs(d).forEach(function (r) {
      var n = state.builder.counts[r.code] || 0;
      for (var i = 0; i < n; i++) {
        // взрослому подставляем размещение, ребёнку нет: его тариф
        // определит дата рождения
        rows.push(r.title === "Взрослый" ? { placement: r.code } : {});
      }
    });
    openBooking(d.code, null, rows.length ? rows : null);
  });

  function flash(text) {
    var el = document.createElement("div");
    el.className = "tt-flash";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add("is-out"); }, 3200);
    setTimeout(function () { el.remove(); }, 3800);
  }

  // ----------------------------------------------------------------- старт
  if (TuronApi.isDemo()) {
    var hint = $("demo-hint");
    hint.hidden = false;
    hint.innerHTML = "Демо-режим: бэкенд не подключён, данные хранятся в браузере.<br>" +
      "Логины: <strong>" + TuronApi.demoLogins.join("</strong>, <strong>") +
      "</strong> · пароль <strong>" + TuronApi.demoPassword + "</strong>";
  }

  // При загрузке восстанавливаем сессию. Раньше ЛЮБАЯ ошибка /api/me роняла
  // в публичный экран — и мигание сети выглядело как «выкинуло из кабинета».
  // Теперь: 401 (токен протух) — честный выход; нет связи — держим токен и
  // показываем «нет связи» с кнопкой «Повторить».
  function restoreSession() {
    TuronApi.me().then(
      function (res) {
        hideOffline();
        showApp(res.agency);
      },
      function (err) {
        // Обрабатываем здесь только отказ самого запроса /api/me.
        // Ошибка интерфейса после успешного ответа больше не маскируется
        // под отсутствие связи с сервером.
        if (err && err.status) { showPublic(); }   // сервер ответил (401 и т.п.) — выходим
        else { showOffline(); }                    // сеть недоступна — сессию не трогаем
      }
    );
  }

  function showOffline() {
    var el = $("offline-screen");
    el.hidden = false;
    $("screen-public").hidden = true;
    $("screen-login").hidden = true;
    $("screen-app").hidden = true;
  }
  function hideOffline() { $("offline-screen").hidden = true; }

  $("offline-retry").addEventListener("click", function () {
    var btn = $("offline-retry");
    btn.disabled = true;
    btn.textContent = "Проверяем…";
    restoreSession();
    setTimeout(function () { btn.disabled = false; btn.textContent = "Повторить"; }, 1500);
  });

  if (TuronApi.isLoggedIn()) {
    restoreSession();
  } else {
    showPublic();
  }
})();
