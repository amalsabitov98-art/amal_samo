(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    departures: [], current: null, passengers: [], editing: null,
    // выбранный в конструкторе заезд и счётчики по тарифам
    builder: { code: null, counts: {} },
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
      day: "2-digit", month: "long", timeZone: "UTC",
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
    $("agency-name").textContent = agency.name;
    $("top-agency-name").textContent = agency.name;

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

  $("logout-btn").addEventListener("click", function () {
    TuronApi.logout().then(function () {
      $("l-password").value = "";
      showPublic();
    });
  });

  $("public-login-btn").addEventListener("click", function () { showLogin(); });

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
      state.departures = list;
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

  function renderBuilder() {
    var d = builderDeparture();
    if (!d) return;
    state.builder.code = d.code;

    var t = builderTotals(d);
    var over = t.seats > d.seats_free;
    var end = TuronApi.departureEnd(d.date_start, d.nights);

    $("builder-title").innerHTML = esc(d.tour_name || "Заезд");
    $("builder-meta").innerHTML =
      "<span>▣</span>" + formatRange(d.date_start, d.nights) +
      " <span>♙</span>" + t.people + " " +
      (t.people === 1 ? "турист" : t.people >= 2 && t.people <= 4 ? "туриста" : "туристов");

    // ------------------------------------------------- дата и маршрут
    $("builder-route").innerHTML =
      "<div><strong>" + formatRange(d.date_start, d.nights) + "</strong><small>" +
        (d.nights ? d.nights + " ночей / " + (d.nights + 1) + " дней" : "длительность уточняется") +
      "</small></div>" +
      '<div class="tt-route-cities"><span>' +
        esc(TRANSPORT[d.transport] || d.transport) +
        "<small>" + esc(d.code) + "</small></span><i>·</i><span>Свободно<small>" +
        d.seats_free + " из " + d.capacity + "</small></span></div>" +
      '<select class="tt-outline-btn" id="builder-departure" aria-label="Выбрать заезд">' +
        state.departures.map(function (x) {
          return '<option value="' + esc(x.code) + '"' +
            (x.code === d.code ? " selected" : "") +
            (x.seats_free <= 0 ? " disabled" : "") + ">" +
            formatRange(x.date_start, x.nights) + " · " + esc(x.code) +
            (x.seats_free <= 0 ? " · мест нет" : " · свободно " + x.seats_free) +
          "</option>";
        }).join("") +
      "</select>";

    // ------------------------------------------------------------ рейсы
    // Рейсы по заездам оператор пока не передал. Показывать выдуманные
    // номера и время нельзя — агент отдаст их клиенту как настоящие.
    $("builder-flights").innerHTML =
      '<p class="tt-builder-empty">Рейсы по этому заезду ещё не заведены — ' +
      "уточните время вылета у оператора.</p>";

    // --------------------------------------------------------- туристы
    $("builder-travellers").innerHTML = builderTariffs(d).map(function (r, i) {
      var n = state.builder.counts[r.code] || 0;
      return '<article class="tt-tariff-row">' +
        "<b>" + (i + 1) + "</b>" +
        "<div><strong>" + esc(r.title) + "</strong><small>" + esc(r.note) + "</small></div>" +
        "<span>" + money(r.price) + "</span>" +
        '<div class="tt-qty">' +
          '<button type="button" data-bstep="-1" data-tariff="' + esc(r.code) + '"' +
            (n === 0 ? " disabled" : "") + ">−</button>" +
          "<strong>" + n + "</strong>" +
          '<button type="button" data-bstep="1" data-tariff="' + esc(r.code) + '">＋</button>' +
        "</div>" +
        "<span>" + (n ? money(n * r.price) : "") + "</span>" +
      "</article>";
    }).join("");

    // ------------------------------------------------------------ сводка
    var lines = builderTariffs(d).filter(function (r) {
      return (state.builder.counts[r.code] || 0) > 0;
    }).map(function (r) {
      var n = state.builder.counts[r.code];
      return "<div><span>" + esc(r.title) + " · " + esc(r.note) + " × " + n +
        "</span><strong>" + money(n * r.price) + "</strong></div>";
    }).join("");

    // Комиссия у нас в долларах за проданного туриста, а не процентом,
    // и младенцы без места продажей не считаются.
    var commission = (d.agency_commission || 0) * t.seats;

    $("builder-summary").innerHTML =
      "<h2>Сводка бронирования</h2>" +
      (lines || '<div><span>Выберите туристов</span><strong>—</strong></div>') +
      (commission > 0
        ? '<div><span>Комиссия агентства</span><strong class="is-accent">− ' +
          money(commission) + "</strong></div>"
        : "") +
      "<footer><span>Итого<small>Все суммы в USD</small></span><strong>" +
        money(t.total) + "</strong></footer>" +
      (over
        ? '<div class="tt-error-box">Мест не хватает: нужно ' + t.seats +
          ", свободно " + d.seats_free + ".</div>"
        : "");

    // ---------------------------------------------------- график платежей
    var pol = TuronApi.paymentPolicy(d.date_start);
    $("builder-payplan").innerHTML = "<h2>График платежей</h2>" +
      pol.steps.map(function (s) {
        return "<div><i></i><span><strong>" + Math.round(s.share * 100) + "% " +
          esc(s.label) + "</strong><small>до " +
          formatDate(s.due.toISOString().slice(0, 10)) + "</small></span><b>" +
          (t.total > 0 ? money(Math.round(t.total * s.share * 100) / 100) : "—") +
        "</b></div>";
      }).join("") +
      (pol.urgent
        ? '<p class="tt-builder-hint">До выезда меньше 20 дней — рассрочки нет.</p>'
        : "");

    var box = $("builder-commission");
    box.hidden = commission <= 0;
    if (commission > 0) {
      box.innerHTML = "<span><strong>Комиссия агентства</strong><small>" +
        money(d.agency_commission) + " за проданного туриста</small></span><b>" +
        money(commission) + "</b>";
    }

    $("builder-book").disabled = t.people === 0 || over;
  }

  // смена заезда и счётчиков
  $("panel-builder").addEventListener("change", function (e) {
    if (e.target.id !== "builder-departure") return;
    state.builder = { code: e.target.value, counts: {} };
    renderBuilder();
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
        : '<div class="tt-empty-state">Броней пока нет. Выберите заезд на вкладке «Заезды».</div>';
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

  function switchTab(name) {
    var labels = {
      builder: ["Новый тур", "Конструктор путешествия"],
      departures: ["Заезды", "Рабочее пространство"],
      catalog: ["Каталог туров", "Маршруты и программы"],
      bookings: ["Мои брони", "Продажи агентства"],
      tours: ["Туры и комиссии", "Партнёрская программа"],
      manifest: ["Списки пассажиров", "Операторская панель"],
      "admin-bookings": ["Все брони", "Контроль продаж и оплат"],
      agencies: ["Агентства", "Партнёрская сеть"],
    };
    document.querySelectorAll(".tt-tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tab === name);
    });
    ["builder", "departures", "catalog", "bookings", "tours", "manifest", "admin-bookings", "agencies"]
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
    // остатки мест могли измениться после брони — перерисовываем каталог
    if (tab.dataset.tab === "catalog" && cabinetCatalog) cabinetCatalog.render();
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
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNav(false);
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

  if (TuronApi.isLoggedIn()) {
    TuronApi.me().then(function (res) { showApp(res.agency); }).catch(showPublic);
  } else {
    showPublic();
  }
})();
