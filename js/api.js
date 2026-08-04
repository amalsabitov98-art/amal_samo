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
        if (!r.ok) {
          // Помечаем статусом, чтобы вызвавший отличал «токен протух» (401)
          // от прочих ошибок. Сбой сети сюда не доходит — там fetch
          // отклоняется TypeError без .status, это и есть «нет связи».
          var err = new Error(data.error || "Ошибка запроса (" + r.status + ")");
          err.status = r.status;
          throw err;
        }
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

  // ------------------------------------------------ демо: каталог
  function futureDepartures() {
    var today = new Date().toISOString().slice(0, 10);
    return demoState().departures
      .filter(function (d) { return d.date_start >= today; })
      .map(function (d) {
        return Object.assign({}, d, { seats_free: d.capacity - d.seats_taken });
      });
  }

  function demoCatalogTours() {
    var deps = futureDepartures();
    return (global.TURON_TOURS || []).map(function (t) {
      var mine = t.is_bookable
        ? deps.filter(function (d) { return d.tour_code === t.code; })
        : [];
      var prices = [];
      mine.forEach(function (d) {
        (d.prices || []).forEach(function (p) {
          if (p.kind === "placement") prices.push(p.price);
        });
      });
      return {
        code: t.code, name: t.name, destination: t.destination, note: t.note,
        description: t.description, nights: t.nights, is_bookable: t.is_bookable,
        departures_count: mine.length,
        min_price: prices.length ? Math.min.apply(null, prices) : null,
        next_date: mine.length
          ? mine.map(function (d) { return d.date_start; }).sort()[0]
          : null,
      };
    });
  }

  function demoDestinations() {
    var meta = {};
    (global.TURON_DESTINATIONS || []).forEach(function (d) { meta[d.name] = d; });
    var grouped = {}, order = [];
    demoCatalogTours().forEach(function (t) {
      var g = grouped[t.destination];
      if (!g) {
        var m = meta[t.destination] || {};
        g = grouped[t.destination] = {
          name: t.destination, title: m.title || t.destination,
          blurb: m.blurb || null, image: m.image || null,
          sort: m.sort == null ? 999 : m.sort,
          tours_count: 0, departures_count: 0, min_price: null, next_date: null,
        };
        order.push(g);
      }
      g.tours_count++;
      g.departures_count += t.departures_count;
      if (t.min_price != null && (g.min_price == null || t.min_price < g.min_price)) {
        g.min_price = t.min_price;
      }
      if (t.next_date && (!g.next_date || t.next_date < g.next_date)) {
        g.next_date = t.next_date;
      }
    });
    return order.sort(function (a, b) {
      return a.sort - b.sort || a.title.localeCompare(b.title);
    });
  }

  function demoCatalogTour(code) {
    var t = (global.TURON_TOURS || []).filter(function (x) { return x.code === code; })[0];
    if (!t) return Promise.reject(new Error("Тур не найден"));
    var deps = t.is_bookable
      ? futureDepartures().filter(function (d) { return d.tour_code === code; })
      : [];
    return Promise.resolve(Object.assign({}, t, { departures: deps }));
  }

  /*
   * Правила оплаты. Обычный порядок: 30% в течение 3 дней с момента брони,
   * остальные 70% — не позднее чем за 20 дней до выезда. Если до выезда
   * осталось меньше 20 дней, рассрочки нет: вся сумма в течение суток.
   *
   * Возвращает шаги с долей и крайним сроком, чтобы и карточка тура, и
   * бронь считали одно и то же, а не каждый по-своему.
   */
  var DAY_MS = 86400000;

  function paymentPolicy(departureDate, bookingDate) {
    var dep = new Date(departureDate + "T00:00:00Z");
    var from = bookingDate ? new Date(bookingDate) : new Date();
    var daysLeft = Math.floor((dep - from) / DAY_MS);

    if (daysLeft < 20) {
      return {
        urgent: true,
        days_left: daysLeft,
        steps: [{
          share: 1,
          due: new Date(from.getTime() + DAY_MS),
          label: "в течение суток с момента брони",
        }],
      };
    }
    return {
      urgent: false,
      days_left: daysLeft,
      steps: [
        {
          share: 0.3,
          due: new Date(from.getTime() + 3 * DAY_MS),
          label: "в течение 3 дней с момента брони",
        },
        {
          share: 0.7,
          due: new Date(dep.getTime() - 20 * DAY_MS),
          label: "не позднее чем за 20 дней до выезда",
        },
      ],
    };
  }

  // Дата возврата: заезд плюс столько ночей, сколько в туре. Считаем в UTC —
  // даты в базе без времени, и местный часовой пояс не должен их сдвигать.
  function departureEnd(dateStart, nights) {
    if (!nights) return null;
    var d = new Date(dateStart + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + nights);
    return d.toISOString().slice(0, 10);
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

    // ------------------------------------------------- публичный каталог
    // Работают и без входа: карточку тура агент может показать клиенту.
    catalogDestinations: function () {
      if (!API_BASE) return Promise.resolve(demoDestinations());
      return request("/api/public/destinations");
    },

    catalogTours: function (destination) {
      if (!API_BASE) {
        var list = demoCatalogTours();
        return Promise.resolve(destination
          ? list.filter(function (t) { return t.destination === destination; })
          : list);
      }
      return request("/api/public/tours" +
        (destination ? "?destination=" + encodeURIComponent(destination) : ""));
    },

    catalogTour: function (code) {
      if (!API_BASE) return demoCatalogTour(code);
      return request("/api/public/tours/" + encodeURIComponent(code));
    },

    /*
     * Плоский список заездов для поиска на титульной. Маршрут появился
     * позже остального каталога, поэтому 404 от ещё не задеплоенного
     * воркера гасим в пустой список: поиск сузится до направления, а
     * страница не сломается.
     */
    catalogDepartures: function () {
      if (!API_BASE) {
        // В демо-заездах направления нет — оно лежит на туре, доклеиваем.
        var dest = {};
        (global.TURON_TOURS || []).forEach(function (t) {
          dest[t.code] = t.destination;
        });
        return Promise.resolve(futureDepartures().map(function (d) {
          return {
            code: d.code, date_start: d.date_start, transport: d.transport,
            is_info_tour: d.is_info_tour, tour_code: d.tour_code,
            tour_name: d.tour_name, destination: dest[d.tour_code], nights: d.nights,
            seats_free: Math.max(0, Math.min(d.seats_free, 21)),
            min_price: (d.prices || []).reduce(function (min, p) {
              if (p.kind !== "placement") return min;
              return min == null || p.price < min ? p.price : min;
            }, null),
          };
        }));
      }
      return request("/api/public/departures").catch(function (err) {
        if (err && err.status === 404) return [];
        throw err;
      });
    },

    departures: function (opts) {
      var all = opts && opts.all;
      if (!API_BASE) {
        var today = new Date().toISOString().slice(0, 10);
        return Promise.resolve(demoState().departures
          .filter(function (d) { return all || d.date_start >= today; })
          .map(function (d) {
            return Object.assign({}, d, { seats_free: d.capacity - d.seats_taken });
          }));
      }
      return request("/api/departures" + (all ? "?all=1" : ""));
    },

    createBooking: function (payload) {
      if (!API_BASE) return demoCreateBooking(payload);
      return request("/api/bookings", { method: "POST", body: payload });
    },

    updateBookingPassengers: function (id, passengers) {
      if (!API_BASE) {
        var s = demoState();
        var b = s.bookings.filter(function (x) { return x.id === id; })[0];
        if (!b || b.status !== "confirmed") return Promise.reject(new Error("Бронь не найдена"));
        var d = s.departures.filter(function (x) { return x.code === b.departure_code; })[0];
        var priced = [], seats = 0, total = 0;
        for (var i = 0; i < passengers.length; i++) {
          var t = priceFor(passengers[i], d);
          if (!t) return Promise.reject(new Error("Нет цены на размещение " + passengers[i].placement));
          priced.push(Object.assign({}, passengers[i], {
            price_code: t.code, tariff: t.label, price: t.price, occupies_seat: t.occupies_seat,
          }));
          if (t.occupies_seat) seats++;
          total += t.price;
        }
        var delta = seats - b.seats_used;
        if (delta > 0 && d.seats_taken + delta > d.capacity) {
          return Promise.reject(new Error(
            "Не хватает мест: нужно ещё " + delta + ", свободно " + (d.capacity - d.seats_taken)));
        }
        d.seats_taken += delta;
        b.passengers = priced;
        b.passengers_count = priced.length;
        b.seats_used = seats;
        b.total_price = total;
        b.agency_commission = (d.agency_commission || 0) * seats;
        saveDemo(s);
        return Promise.resolve({
          booking_code: b.code, passengers_count: priced.length,
          seats_taken: seats, total_price: total,
        });
      }
      return request("/api/bookings/" + id + "/passengers",
                     { method: "POST", body: { passengers: passengers } });
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
    adminBookings: function (filters) {
      filters = filters || {};
      if (!API_BASE) {
        var s = demoState();
        var byId = {};
        DEMO_AGENCIES.forEach(function (a) { byId[a.id] = a.name; });
        var q = (filters.query || "").toLowerCase();
        var list = s.bookings.filter(function (b) {
          if (filters.departure && b.departure_code !== filters.departure) return false;
          if (filters.agencyId && b.agency_id !== Number(filters.agencyId)) return false;
          if (filters.status && b.status !== filters.status) return false;
          if (filters.debtOnly && !(b.status === "confirmed" && b.total_price > b.paid)) return false;
          if (q) {
            var inCode = b.code.toLowerCase().indexOf(q) !== -1;
            var inName = (b.passengers || []).some(function (p) {
              return (p.full_name || "").toLowerCase().indexOf(q) !== -1;
            });
            if (!inCode && !inName) return false;
          }
          return true;
        }).map(function (b) {
          return Object.assign({}, b, {
            agency_name: byId[b.agency_id] || "—",
            balance: b.total_price - b.paid,
          });
        }).reverse();
        var limit = Number(filters.limit) || 50;
        var offset = Number(filters.offset) || 0;
        return Promise.resolve({
          total: list.length, limit: limit, offset: offset,
          items: list.slice(offset, offset + limit),
        });
      }
      var qs = [];
      if (filters.departure) qs.push("departure=" + encodeURIComponent(filters.departure));
      if (filters.agencyId) qs.push("agency_id=" + encodeURIComponent(filters.agencyId));
      if (filters.status) qs.push("status=" + encodeURIComponent(filters.status));
      if (filters.debtOnly) qs.push("debt=1");
      if (filters.query) qs.push("q=" + encodeURIComponent(filters.query));
      if (filters.limit) qs.push("limit=" + filters.limit);
      if (filters.offset) qs.push("offset=" + filters.offset);
      return request("/api/admin/bookings" + (qs.length ? "?" + qs.join("&") : ""));
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
        var bookings = s.bookings.filter(function (b) {
          return b.departure_code === departureCode && b.status === "confirmed";
        });
        return Promise.resolve({
          departure: d,
          summary: {
            bookings_count: bookings.length,
            passengers_count: rows.length,
            seats_used: rows.filter(function (x) { return x.occupies_seat; }).length,
            revenue: bookings.reduce(function (a, b) { return a + b.total_price; }, 0),
            paid: bookings.reduce(function (a, b) { return a + b.paid; }, 0),
            owed: bookings.reduce(function (a, b) { return a + (b.total_price - b.paid); }, 0),
          },
          passengers: rows,
        });
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

    bookingHistory: function (id) {
      if (!API_BASE) {
        return Promise.reject(new Error(
          "В демо-режиме журнал не ведётся — нужен подключённый бэкенд"));
      }
      return request("/api/admin/bookings/" + id + "/history");
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

    setAgencyActive: function (id, active) {
      if (!API_BASE) {
        return Promise.reject(new Error(
          "В демо-режиме агентства не меняются — нужен подключённый бэкенд"));
      }
      return request("/api/admin/agencies/" + id + (active ? "/activate" : "/deactivate"),
                     { method: "POST" });
    },

    setAgencyPassword: function (id, password) {
      if (!API_BASE) {
        return Promise.reject(new Error(
          "В демо-режиме пароли не меняются — нужен подключённый бэкенд"));
      }
      return request("/api/admin/agencies/" + id + "/password",
                     { method: "POST", body: { password: password } });
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
    paymentPolicy: paymentPolicy,
    departureEnd: departureEnd,
  };

  global.TuronApi = Api;
})(window);
