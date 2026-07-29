(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var state = { departures: [], current: null, passengers: [] };

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Автобус" };

  function money(v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return "$" + v.toLocaleString("ru-RU", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ------------------------------------------------------------------ вход
  function showLogin() {
    $("screen-login").hidden = false;
    $("screen-app").hidden = true;
  }

  function showApp(agency) {
    $("screen-login").hidden = true;
    $("screen-app").hidden = false;
    $("agency-name").textContent = agency.name;
    loadDepartures();
    loadBookings();
    loadTours();
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
      showLogin();
    });
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
            "<strong>" + formatDate(d.date_start) + "</strong>" +
            '<span class="tt-dep-code">' + esc(d.code) + "</span>" +
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
    $("departures-list").innerHTML = list.length
      ? list.map(departureCardHtml).join("")
      : '<div class="tt-empty-state">Нет заездов по выбранным условиям.</div>';
  }

  function loadDepartures() {
    return TuronApi.departures().then(function (list) {
      state.departures = list;
      renderDepartures();
    }).catch(function (err) {
      $("departures-list").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить заезды.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  $("f-transport").addEventListener("change", renderDepartures);
  $("f-available").addEventListener("change", renderDepartures);

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

      box.innerHTML = '<span class="tt-pax-tariff">' + age + " лет · " + esc(t.label) + "</span>" +
        "<strong>" + money(t.price) + "</strong>" +
        (t.occupies_seat ? "" : '<span class="tt-muted-note"> · без места</span>') +
        (needsCheck
          ? '<span class="tt-price-warn"> · детский тариф на этот заезд не задан, ' +
            "посчитано по взрослому — менеджер уточнит</span>"
          : "");
    });

    var overflow = seats > d.seats_free;
    if (overflow) ready = false;

    var commission = (d.agency_commission || 0) * seats;
    $("bm-summary").innerHTML =
      '<div class="tt-sum-line"><span>Пассажиров</span><strong>' + rows.length + "</strong></div>" +
      '<div class="tt-sum-line"><span>Занимают мест</span><strong>' + seats + " из " + d.seats_free + " свободных</strong></div>" +
      (commission > 0
        ? '<div class="tt-sum-line tt-earn"><span>Ваша комиссия</span><strong>' +
          money(commission) + "</strong></div>"
        : "") +
      '<div class="tt-sum-total"><span>Итого к оплате</span><strong>' + money(total) + "</strong></div>" +
      (overflow ? '<div class="tt-error-box">Мест не хватает — уберите пассажиров или выберите другой заезд.</div>' : "");

    $("bm-submit").disabled = !ready;
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

  function openBooking(code) {
    var d = state.departures.filter(function (x) { return x.code === code; })[0];
    if (!d) return;
    state.current = d;
    state.passengers = [{}];
    $("bm-title").textContent = "Заезд " + formatDate(d.date_start);
    $("bm-sub").textContent = (TRANSPORT[d.transport] || d.transport) + " · " + d.code +
      " · свободно " + d.seats_free;
    $("bm-note").value = "";
    $("booking-modal").hidden = false;
    renderPassengers();
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
    TuronApi.createBooking({
      departure_code: state.current.code,
      passengers: collectPassengers(),
      note: $("bm-note").value.trim() || null,
    }).then(function (res) {
      closeBooking();
      return Promise.all([loadDepartures(), loadBookings()]).then(function () {
        switchTab("bookings");
        flash("Бронь " + res.booking_code + " создана на " + money(res.total_price) +
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
          (cancelled ? "" : '<button class="tt-btn secondary tt-btn-sm" data-cancel="' + b.id + '">Отменить</button>') +
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
    document.querySelectorAll(".tt-tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tab === name);
    });
    $("panel-departures").hidden = name !== "departures";
    $("panel-bookings").hidden = name !== "bookings";
    $("panel-tours").hidden = name !== "tours";
  }

  document.querySelector(".tt-tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tt-tab");
    if (tab) switchTab(tab.dataset.tab);
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
    TuronApi.me().then(function (res) { showApp(res.agency); }).catch(showLogin);
  } else {
    showLogin();
  }
})();
