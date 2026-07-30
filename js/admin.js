/*
 * Экраны туроператора. Подключается всегда, но включается только для
 * учётной записи с ролью operator — агентство этих вкладок не видит,
 * и сервер всё равно отдаст 403 на /api/admin/*.
 *
 * Главное здесь — выгрузка списка пассажиров заезда: колонки повторяют
 * исходную ведомость, чтобы её можно было перестать вести руками.
 */
(function (global) {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var state = { departures: [], current: null, agencies: [], loaded: [], offset: 0 };

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Авиа · Батуми" };

  function money(v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return "$" + v.toLocaleString("ru-RU", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var ACTION_LABELS = {
    created: "создана",
    edited: "изменён состав",
    cancelled: "отменена",
    payment: "оплата",
    refund: "возврат",
  };

  function formatDateTime(iso) {
    if (!iso) return "";
    // даты из базы приходят как «YYYY-MM-DD HH:MM:SS» по UTC
    var d = new Date(iso.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // ------------------------------------------------------------- выгрузка
  // Колонки и их порядок — как в ведомости, включая узбекские заголовки:
  // менеджер открывает файл и видит привычную таблицу.
  var MANIFEST_COLUMNS = [
    ["ID", function (p) { return p.booking_code; }],
    ["бронь санаси", function (p) { return formatDate(p.booked_at); }],
    ["Ф.И.О.", function (p) { return p.full_name; }],
    ["туғилган санаси", function (p) { return formatDate(p.birth_date); }],
    ["паспорт рақами", function (p) { return p.passport_number; }],
    ["тугаш санаси", function (p) { return formatDate(p.passport_expiry); }],
    ["жойлашув", function (p) { return p.placement; }],
    ["B2B/B2C", function (p) { return p.channel || "B2B"; }],
    ["номланиши", function (p) { return p.agency_name; }],
    ["тариф", function (p) { return p.price_code; }],
    ["нарх USD", function (p) { return p.price; }],
    ["изоҳ", function (p) { return p.note || ""; }],
  ];

  function toCsv(passengers) {
    var cell = function (v) {
      var s = String(v == null ? "" : v);
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lines = [MANIFEST_COLUMNS.map(function (c) { return cell(c[0]); }).join(";")];
    passengers.forEach(function (p) {
      lines.push(MANIFEST_COLUMNS.map(function (c) { return cell(c[1](p)); }).join(";"));
    });
    // BOM обязателен: без него Excel открывает кириллицу кракозябрами,
    // а разделитель «;» — чтобы не спорить с локальными настройками.
    return "﻿" + lines.join("\r\n");
  }

  function downloadCsv(departureCode, passengers) {
    var blob = new Blob([toCsv(passengers)], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "turon-" + departureCode + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------- заезды
  function renderDeparturePicker() {
    $("adm-departure").innerHTML = state.departures.map(function (d) {
      return '<option value="' + esc(d.code) + '">' +
        formatDate(d.date_start) + " · " + (TRANSPORT[d.transport] || d.transport) +
        " · " + esc(d.code) + " (занято " + d.seats_taken + "/" + d.capacity + ")</option>";
    }).join("");
  }

  function renderManifest(data) {
    state.current = data;
    var pax = data.passengers;
    if (!pax.length) {
      $("adm-manifest").innerHTML =
        '<div class="tt-empty-state">На этот заезд ещё нет броней через кабинет.' +
        '<div class="tt-muted-note">Места, проданные до запуска системы, ' +
        "учтены в счётчике заезда, но пофамильно их здесь нет.</div></div>";
      $("adm-export").disabled = true;
      return;
    }
    $("adm-export").disabled = false;

    var head = MANIFEST_COLUMNS.map(function (c) { return "<th>" + esc(c[0]) + "</th>"; }).join("");
    var body = pax.map(function (p) {
      return "<tr>" + MANIFEST_COLUMNS.map(function (c) {
        return "<td>" + esc(c[1](p)) + "</td>";
      }).join("") + "</tr>";
    }).join("");

    var sum = data.summary || {};
    $("adm-manifest").innerHTML =
      '<div class="tt-earnings">' +
        '<div><span>Броней</span><strong>' + (sum.bookings_count || 0) + "</strong></div>" +
        '<div><span>Пассажиров</span><strong>' + pax.length +
          '<span class="tt-muted-note"> · мест ' + (sum.seats_used || 0) + "</span></strong></div>" +
        '<div><span>Продано на</span><strong>' + money(sum.revenue || 0) + "</strong></div>" +
        '<div><span>Оплачено</span><strong' + (sum.paid > 0 ? ' class="tt-earn-value"' : "") + ">" +
          money(sum.paid || 0) + "</strong></div>" +
        '<div><span>Долг</span><strong' + (sum.owed > 0 ? ' class="tt-owed-value"' : "") + ">" +
          money(sum.owed || 0) + "</strong></div>" +
      "</div>" +
      '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' + head +
      "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function loadManifest() {
    var code = $("adm-departure").value;
    if (!code) return;
    $("adm-manifest").innerHTML = '<div class="tt-empty-state">Загрузка…</div>';
    TuronApi.manifest(code).then(renderManifest).catch(function (err) {
      $("adm-manifest").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить список.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  // ---------------------------------------------------------------- брони
  function currentFilters() {
    return {
      query: $("ab-query").value.trim(),
      agencyId: $("ab-agency").value || null,
      departure: $("ab-departure").value || null,
      status: $("ab-status").value,
      debtOnly: $("ab-debt").checked,
    };
  }

  function renderAdminBookings(list, append) {
    if (!list.length && !append) {
      $("adm-bookings").innerHTML =
        '<div class="tt-empty-state">Ничего не найдено по этим условиям.</div>';
      return;
    }
    var html = list.map(function (b) {
      var cancelled = b.status === "cancelled";
      return (
        '<article class="tt-booking' + (cancelled ? " is-cancelled" : "") + '">' +
          "<div>" +
            "<strong>" + esc(b.code) + "</strong>" +
            '<div class="tt-muted-note">' + esc(b.agency_name) + " · " +
              formatDate(b.date_start) + " · " + b.passengers_count + " чел." +
              (cancelled ? " · отменена" : "") + "</div>" +
          "</div>" +
          '<div class="tt-booking-money">' +
            '<div class="tt-sum-line"><span>Стоимость</span><strong>' + money(b.total_price) + "</strong></div>" +
            '<div class="tt-sum-line"><span>Оплачено</span><strong>' + money(b.paid) + "</strong></div>" +
            '<div class="tt-sum-line' + (b.balance > 0 ? " tt-owed" : "") +
              '"><span>Остаток</span><strong>' + money(b.balance) + "</strong></div>" +
          "</div>" +
          '<div class="tt-booking-action">' +
            (cancelled ? "" :
              '<button class="tt-btn tt-btn-sm" data-pay="' + esc(b.code) +
              '" data-balance="' + b.balance + '">Внести оплату</button>') +
            '<button class="tt-btn secondary tt-btn-sm" data-history="' + b.id + '">История</button>' +
          "</div>" +
          '<div class="tt-history" data-history-for="' + b.id + '" hidden></div>' +
        "</article>"
      );
    }).join("");
    if (append) $("adm-bookings").insertAdjacentHTML("beforeend", html);
    else $("adm-bookings").innerHTML = html;
  }

  function loadAdminBookings(append) {
    var filters = currentFilters();
    filters.offset = append ? state.offset : 0;
    return TuronApi.adminBookings(filters).then(function (res) {
      state.offset = res.offset + res.items.length;
      renderAdminBookings(res.items, append);
      $("adm-bookings-count").textContent = res.total
        ? "Показано " + Math.min(state.offset, res.total) + " из " + res.total
        : "";
      $("adm-bookings-more").innerHTML = state.offset < res.total
        ? '<button class="tt-btn secondary" id="adm-more">Показать ещё</button>'
        : "";
    }).catch(function (err) {
      $("adm-bookings").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить брони.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  // ------------------------------------------------------------- агентства
  function loadAgencies() {
    return TuronApi.agencies().then(function (list) {
      state.agencies = list;
      var picked = $("ab-agency").value;
      $("ab-agency").innerHTML = '<option value="">Все</option>' + list.map(function (a) {
        return '<option value="' + a.id + '">' + esc(a.name) + "</option>";
      }).join("");
      $("ab-agency").value = picked;
      $("adm-agencies").innerHTML = list.map(function (a) {
        return (
          '<article class="tt-tour">' +
            "<div><strong>" + esc(a.name) + "</strong>" +
              '<div class="tt-muted-note">логин: ' + esc(a.login) + "</div></div>" +
            "<div>" + a.bookings_count + " броней</div>" +
            '<div class="tt-agency-actions">' +
              (a.is_active
                ? '<span class="tt-badge">Активно</span>'
                : '<span class="tt-badge tt-badge-off">Отключено</span>') +
              '<button class="tt-btn secondary tt-btn-sm" data-toggle="' + a.id +
                '" data-active="' + (a.is_active ? 1 : 0) + '">' +
                (a.is_active ? "Отключить" : "Включить") + "</button>" +
              '<button class="tt-btn secondary tt-btn-sm" data-password="' + a.id +
                '" data-name="' + esc(a.name) + '">Сменить пароль</button>' +
            "</div>" +
          "</article>"
        );
      }).join("");
    }).catch(function (err) {
      $("adm-agencies").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить агентства.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  // ------------------------------------------------------------------ вход
  // Поиск не дёргает сервер на каждой букве — ждём паузы в наборе.
  function debounce(fn, ms) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  function bind() {
    $("adm-departure").addEventListener("change", loadManifest);

    ["ab-agency", "ab-departure", "ab-status", "ab-debt"].forEach(function (id) {
      $(id).addEventListener("change", function () { loadAdminBookings(false); });
    });
    $("ab-query").addEventListener("input", debounce(function () {
      loadAdminBookings(false);
    }, 300));
    $("adm-bookings-more").addEventListener("click", function (e) {
      if (e.target.id === "adm-more") loadAdminBookings(true);
    });
    $("adm-export").addEventListener("click", function () {
      if (state.current) downloadCsv(state.current.departure.code, state.current.passengers);
    });

    $("adm-bookings").addEventListener("click", function (e) {
      var hist = e.target.closest("[data-history]");
      if (hist) {
        var box = document.querySelector('[data-history-for="' + hist.dataset.history + '"]');
        if (!box.hidden) { box.hidden = true; return; }
        box.hidden = false;
        box.innerHTML = '<span class="tt-muted-note">загрузка…</span>';
        TuronApi.bookingHistory(Number(hist.dataset.history)).then(function (events) {
          box.innerHTML = events.length
            ? events.map(function (ev) {
                return '<div class="tt-history-row"><span>' + formatDateTime(ev.created_at) +
                  "</span><strong>" + esc(ACTION_LABELS[ev.action] || ev.action) + "</strong>" +
                  "<span>" + esc(ev.actor_name) + "</span>" +
                  '<span class="tt-muted-note">' + esc(ev.details || "") + "</span></div>";
              }).join("")
            : '<span class="tt-muted-note">записей нет</span>';
        }).catch(function (err) {
          box.innerHTML = '<span class="tt-muted-note">' + esc(err.message) + "</span>";
        });
        return;
      }
      var btn = e.target.closest("[data-pay]");
      if (!btn) return;
      var code = btn.dataset.pay;
      var suggested = Number(btn.dataset.balance) || 0;
      var raw = prompt("Сумма оплаты по брони " + code +
        " (остаток " + money(suggested) + "). Отрицательная сумма — возврат:", suggested);
      if (raw === null) return;
      var amount = Number(String(raw).replace(",", "."));
      if (!isFinite(amount) || amount === 0) {
        alert("Введите сумму числом, не равную нулю.");
        return;
      }
      btn.disabled = true;
      TuronApi.addPayment(code, amount).then(function (res) {
        Admin.reload();
        alert("Оплата проведена. По брони " + res.booking_code +
              " оплачено " + money(res.paid) + ", остаток " + money(res.balance) + ".");
      }).catch(function (err) {
        btn.disabled = false;
        alert(err.message);
      });
    });

    $("adm-agencies").addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-toggle]");
      if (toggle) {
        var willActivate = toggle.dataset.active === "0";
        if (!willActivate && !confirm(
          "Отключить агентство? Оно не сможет войти, а открытые сессии закроются.")) return;
        toggle.disabled = true;
        TuronApi.setAgencyActive(Number(toggle.dataset.toggle), willActivate)
          .then(loadAgencies)
          .catch(function (err) { toggle.disabled = false; alert(err.message); });
        return;
      }
      var pwd = e.target.closest("[data-password]");
      if (pwd) {
        var value = prompt("Новый пароль для «" + pwd.dataset.name + "» (от 8 символов).\n" +
                           "Открытые сессии агентства будут закрыты:");
        if (value === null) return;
        TuronApi.setAgencyPassword(Number(pwd.dataset.password), value)
          .then(function (res) { alert("Пароль для " + res.login + " изменён."); })
          .catch(function (err) { alert(err.message); });
      }
    });

    $("adm-new-agency").addEventListener("submit", function (e) {
      e.preventDefault();
      var box = $("adm-agency-result");
      TuronApi.createAgency($("na-login").value.trim(), $("na-name").value.trim(),
                            $("na-password").value)
        .then(function (res) {
          box.innerHTML = '<div class="tt-ok-box">Агентство «' + esc(res.name) +
            '» заведено, логин ' + esc(res.login) + "</div>";
          e.target.reset();
          loadAgencies();
        })
        .catch(function (err) {
          box.innerHTML = '<div class="tt-error-box">' + esc(err.message) + "</div>";
        });
    });
  }

  var Admin = {
    isOperator: function (agency) { return agency && agency.role === "operator"; },

    start: function () {
      document.body.classList.add("is-operator");
      bind();
      return TuronApi.departures({ all: true }).then(function (list) {
        // у оператора в выборе — все заезды, включая заполненные
        state.departures = list.slice().reverse();
        renderDeparturePicker();
        $("ab-departure").innerHTML = '<option value="">Все</option>' +
          state.departures.map(function (d) {
            return '<option value="' + esc(d.code) + '">' + formatDate(d.date_start) +
              " · " + esc(d.code) + "</option>";
          }).join("");
        loadManifest();
        loadAgencies();
        return loadAdminBookings(false);
      });
    },

    reload: function () {
      loadManifest();
      loadAdminBookings(false);
    },
  };

  global.TuronAdmin = Admin;
})(window);
