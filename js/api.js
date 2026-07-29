/*
 * Клиент API кабинета.
 *
 * Если в js/config.js задан apiBaseUrl — работаем с настоящим воркером и
 * базой D1. Если нет — включается демо-режим: те же методы, но данные
 * живут в браузере (localStorage), на реальных заездах и ценах из
 * ведомости. Демо нужен, чтобы показать кабинет без развёрнутого бэкенда;
 * экраны в js/app.js обоих режимов не различают.
 */
(function (global) {
  "use strict";

  var API_BASE = (global.TURON_CONFIG && global.TURON_CONFIG.apiBaseUrl) || "";
  var TOKEN_KEY = "turon_token";
  var DEMO_KEY = "turon_demo_state";

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  // ------------------------------------------------------------- сеть
  function request(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json" };
    if (getToken()) headers.Authorization = "Bearer " + getToken();
    return fetch(API_BASE + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "Ошибка запроса (" + r.status + ")");
        return data;
      });
    });
  }

  // ------------------------------------------------------- демо-хранилище
  var DEMO_AGENCIES = [
    { id: 1, login: "umida", name: "UMIDA" },
    { id: 2, login: "easytourism", name: "EASY TOURISM" },
    { id: 3, login: "ofotour", name: "OFO TOUR" },
    { id: 4, login: "operator", name: "Turon Tour (оператор)", role: "operator" },
  ];
  var DEMO_PASSWORD = "turon2026";

  function demoState() {
    var raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
    var fresh = {
      departures: JSON.parse(JSON.stringify(global.TURON_SEED || [])),
      bookings: [],
      agency: null,
    };
    localStorage.setItem(DEMO_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function saveDemo(s) { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); }

  function ageOn(birthDate, onDate) {
    var b = new Date(birthDate), o = new Date(onDate);
    var age = o.getFullYear() - b.getFullYear();
    var m = o.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && o.getDate() < b.getDate())) age--;
    return age;
  }

  // Те же правила, что в worker/index.js: детский тариф по возрасту на
  // дату выезда, при пересечении диапазонов — самый узкий.
  function priceFor(passenger, departure) {
    var age = ageOn(passenger.birth_date, departure.date_start);
    var child = departure.prices
      .filter(function (p) { return p.kind === "child" && age >= p.age_from && age < p.age_to; })
      .sort(function (a, b) { return (a.age_to - a.age_from) - (b.age_to - b.age_from); })[0];
    if (child) {
      return { code: child.code, label: child.label, price: child.price, occupies_seat: child.occupies_seat };
    }
    var pl = departure.prices.find(function (p) {
      return p.kind === "placement" && p.code === passenger.placement;
    });
    if (!pl) return null;
    return { code: pl.code, label: pl.label, price: pl.price, occupies_seat: 1 };
  }

/*
   * Проверка паспорта. Большинство стран, включая Турцию и Японию, требуют
   * запас в 6 месяцев после окончания поездки, поэтому предупреждаем не
   * только об уже истёкшем документе.
   *
   * Это предупреждение, а не запрет: правило зависит от направления, и
   * решать должен менеджер, а не форма.
   */
  function passportIssue(expiry, departureDate) {
    if (!expiry) return null;
    const exp = new Date(expiry), dep = new Date(departureDate);
    if (isNaN(exp.getTime())) return null;
    if (exp <= dep) return "паспорт истекает до поездки";
    const sixMonths = new Date(dep);
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    if (exp < sixMonths) return "до конца действия паспорта меньше 6 месяцев после поездки";
    return null;
  }

  function demoLogin(login, password) {
    var agency = DEMO_AGENCIES.filter(function (a) {
      return a.login === String(login).trim().toLowerCase();
    })[0];
    if (!agency || password !== DEMO_PASSWORD) {
      return Promise.reject(new Error("Неверный логин или пароль"));
    }
    agency = Object.assign({ role: "agency" }, agency);
    var s = demoState(); s.agency = agency; saveDemo(s);
    setToken("demo-" + agency.id);
    return Promise.resolve({ token: "demo-" + agency.id, agency: agency });
  }

  function demoCreateBooking(payload) {
    var s = demoState();
    var d = s.departures.filter(function (x) { return x.code === payload.departure_code; })[0];
    if (!d) return Promise.reject(new Error("Заезд не найден"));

    var priced = [], seats = 0, total = 0;
    for (var i = 0; i < payload.passengers.length; i++) {
      var p = payload.passengers[i];
      var t = priceFor(p, d);
      if (!t) {
        return Promise.reject(new Error(
          "Для заезда " + d.code + " нет цены на размещение " + p.placement));
      }
      priced.push({
        full_name: p.full_name, birth_date: p.birth_date,
        passport_number: p.passport_number, passport_expiry: p.passport_expiry || "",
        placement: p.placement, price_code: t.code, tariff: t.label,
        price: t.price, occupies_seat: t.occupies_seat,
      });
      if (t.occupies_seat) seats++;
      total += t.price;
    }
    if (d.seats_taken + seats > d.capacity) {
      return Promise.reject(new Error(
        "Не хватает мест: нужно " + seats + ", свободно " + (d.capacity - d.seats_taken)));
    }
    // Комиссия — за проданного туриста; младенец на руках продажей не считается.
    var commission = (d.agency_commission || 0) * seats;
    d.seats_taken += seats;
    var n = s.bookings.filter(function (b) { return b.departure_code === d.code; }).length + 1;
    var booking = {
      id: s.bookings.length + 1,
      code: d.code + "-" + String(n).padStart(2, "0"),
      agency_id: s.agency.id,
      departure_code: d.code,
      date_start: d.date_start,
      transport: d.transport,
      status: "confirmed",
      passengers_count: payload.passengers.length,
      seats_used: seats,
      total_price: total,
      agency_commission: commission,
      paid: 0,
      payments: [],
      note: payload.note || null,
      created_at: new Date().toISOString(),
      passengers: priced,
    };
    s.bookings.push(booking); saveDemo(s);
    return Promise.resolve({
      booking_code: booking.code, departure_code: d.code,
      seats_taken: seats, total_price: total,
      agency_commission: commission, passengers: priced,
    });
  }

  // --------------------------------------------------------------- API
  var Api = {
    isDemo: function () { return !API_BASE; },
    demoPassword: DEMO_PASSWORD,
    demoLogins: DEMO_AGENCIES.map(function (a) { return a.login; }),
    isLoggedIn: function () { return !!getToken(); },

    login: function (login, password) {
      if (!API_BASE) return demoLogin(login, password);
      return request("/api/login", { method: "POST", body: { login: login, password: password } })
        .then(function (res) { setToken(res.token); return res; });
    },

    logout: function () {
      if (!API_BASE) { setToken(""); return Promise.resolve(); }
      return request("/api/logout", { method: "POST" })
        .catch(function () {})
        .then(function () { setToken(""); });
    },

    me: function () {
      if (!API_BASE) {
        var s = demoState();
        return s.agency ? Promise.resolve({ agency: s.agency })
                        : Promise.reject(new Error("Требуется вход"));
      }
      return request("/api/me");
    },

    tours: function () {
      if (!API_BASE) return Promise.resolve((global.TURON_TOURS || []).slice());
      return request("/api/tours");
    },

    departures: function () {
      if (!API_BASE) {
        return Promise.resolve(demoState().departures.map(function (d) {
          return Object.assign({}, d, { seats_free: d.capacity - d.seats_taken });
        }));
      }
      return request("/api/departures");
    },

    createBooking: function (payload) {
      if (!API_BASE) return demoCreateBooking(payload);
      return request("/api/bookings", { method: "POST", body: payload });
    },

    bookings: function () {
      if (!API_BASE) {
        var s = demoState();
        return Promise.resolve(s.bookings
          .filter(function (b) { return s.agency && b.agency_id === s.agency.id; })
          .map(function (b) { return Object.assign({}, b, { balance: b.total_price - b.paid }); })
          .reverse());
      }
      return request("/api/bookings");
    },

    cancelBooking: function (id) {
      if (!API_BASE) {
        var s = demoState();
        var b = s.bookings.filter(function (x) { return x.id === id; })[0];
        if (!b || b.status !== "confirmed") return Promise.reject(new Error("Бронь не найдена"));
        b.status = "cancelled";
        var d = s.departures.filter(function (x) { return x.code === b.departure_code; })[0];
        if (d) d.seats_taken -= b.seats_used;
        saveDemo(s);
        return Promise.resolve({ booking_code: b.code, released_seats: b.seats_used });
      }
      return request("/api/bookings/" + id + "/cancel", { method: "POST" });
    },


    // ------------------------------------------------ сторона оператора
    adminBookings: function (departureCode) {
      if (!API_BASE) {
        var s = demoState();
        var byCode = {};
        DEMO_AGENCIES.forEach(function (a) { byCode[a.id] = a.name; });
        return Promise.resolve(s.bookings
          .filter(function (b) { return !departureCode || b.departure_code === departureCode; })
          .map(function (b) {
            return Object.assign({}, b, {
              agency_name: byCode[b.agency_id] || "—",
              balance: b.total_price - b.paid,
            });
          }).reverse());
      }
      return request("/api/admin/bookings" +
        (departureCode ? "?departure=" + encodeURIComponent(departureCode) : ""));
    },

    manifest: function (departureCode) {
      if (!API_BASE) {
        var s = demoState();
        var d = s.departures.filter(function (x) { return x.code === departureCode; })[0];
        if (!d) return Promise.reject(new Error("Заезд не найден"));
        var byId = {};
        DEMO_AGENCIES.forEach(function (a) { byId[a.id] = a; });
        var rows = [];
        s.bookings.filter(function (b) {
          return b.departure_code === departureCode && b.status === "confirmed";
        }).forEach(function (b) {
          (b.passengers || []).forEach(function (p) {
            rows.push(Object.assign({}, p, {
              booking_code: b.code, booked_at: b.created_at, note: b.note,
              agency_name: (byId[b.agency_id] || {}).name || "—",
              channel: "B2B", total_price: b.total_price, booking_paid: b.paid,
            }));
          });
        });
        return Promise.resolve({ departure: d, passengers: rows });
      }
      return request("/api/admin/manifest?departure=" + encodeURIComponent(departureCode));
    },

    addPayment: function (bookingCode, amount, note) {
      if (!API_BASE) {
        var s = demoState();
        var b = s.bookings.filter(function (x) { return x.code === bookingCode; })[0];
        if (!b || b.status !== "confirmed") {
          return Promise.reject(new Error("Бронь не найдена или отменена"));
        }
        if (b.paid + amount < 0) {
          return Promise.reject(new Error("Возврат больше оплаченного: оплачено " + b.paid));
        }
        b.paid += amount;
        (b.payments = b.payments || []).push({ amount: amount, note: note || null });
        saveDemo(s);
        return Promise.resolve({
          booking_code: bookingCode, paid: b.paid, balance: b.total_price - b.paid,
        });
      }
      return request("/api/admin/payments", {
        method: "POST", body: { booking_code: bookingCode, amount: amount, note: note },
      });
    },

    agencies: function () {
      if (!API_BASE) {
        var s = demoState();
        return Promise.resolve(DEMO_AGENCIES
          .filter(function (a) { return a.role !== "operator"; })
          .map(function (a) {
            return Object.assign({ is_active: 1 }, a, {
              bookings_count: s.bookings.filter(function (b) {
                return b.agency_id === a.id && b.status === "confirmed";
              }).length,
            });
          }));
      }
      return request("/api/admin/agencies");
    },

    createAgency: function (login, name, password) {
      if (!API_BASE) {
        return Promise.reject(new Error(
          "В демо-режиме агентства не заводятся — нужен подключённый бэкенд"));
      }
      return request("/api/admin/agencies", {
        method: "POST", body: { login: login, name: name, password: password },
      });
    },

    priceFor: priceFor,
    passportIssue: passportIssue,
    ageOn: ageOn,
  };

  global.TuronApi = Api;
})(window);
