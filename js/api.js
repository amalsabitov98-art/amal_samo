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
  var activityFallback = null;
  var activityFallbackAt = 0;

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

  // ------------------------------------------------------------- сеть
  /*
   * Один сорвавшийся запрос раньше убивал страницу насмерть: воркер на
   * Cloudflare после простоя стартует «на холодную», D1 иногда отвечает не с
   * первой попытки, а телефон на ходу переключается с Wi-Fi на LTE — любой
   * из этих случаев отклонял fetch, и каталог заменялся текстом ошибки без
   * шанса на повтор. Отсюда «иногда захожу — не удалось загрузить каталог».
   *
   * Поэтому переходные сбои перезапрашиваем сами, с нарастающей паузой.
   * ТОЛЬКО GET: повторить POST нельзя — /api/bookings создал бы вторую
   * бронь на тех же пассажиров, а это хуже любой ошибки загрузки.
   */
  var RETRY_DELAYS = [400, 1200];   // паузы между попытками, мс
  var REQUEST_TIMEOUT = 12000;      // на попытку; без него висим до победного

  // 5xx и 429 — сервер жив, но сейчас не может; такое проходит само.
  // 4xx (401 «протух токен», 404, 400) детерминированы — повтор даст то же.
  function retriable(err) {
    if (err && err.status) return err.status >= 500 || err.status === 429;
    return true; // обрыв сети или таймаут: fetch отклонился без статуса
  }

  function attempt(path, options, method) {
    // AbortController есть во всех живых браузерах, но если его нет —
    // работаем без таймаута, а не падаем.
    var ctrl = global.AbortController ? new global.AbortController() : null;
    var timer = ctrl && global.setTimeout(function () { ctrl.abort(); }, REQUEST_TIMEOUT);

    var headers = { "Content-Type": "application/json" };
    if (getToken()) headers.Authorization = "Bearer " + getToken();

    return fetch(API_BASE + path, {
      method: method,
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (timer) global.clearTimeout(timer);
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          // Помечаем статусом, чтобы вызвавший отличал «токен протух» (401)
          // от прочих ошибок. Сбой сети сюда не доходит — там fetch
          // отклоняется TypeError без .status, это и есть «нет связи».
          var err = new Error(data.error || "Ошибка запроса (" + r.status + ")");
          err.status = r.status;
          // Весь ответ целиком: некоторым ошибкам нужны данные, а не только
          // текст (например переплата возвращает остаток и величину лишнего,
          // чтобы интерфейс собрал внятное подтверждение).
          err.data = data;
          throw err;
        }
        return data;
      });
    }, function (err) {
      if (timer) global.clearTimeout(timer);
      throw err;
    });
  }

  /* Язык для публичных маршрутов каталога. Русский параметра не шлёт: он
   * лежит в обычных колонках базы и служит откатом, а лишний ?lang=ru
   * только мешал бы кэшированию ответа. */
  function langQuery(hasQuery) {
    var lang = global.TuronPublicUi && global.TuronPublicUi.language
      ? global.TuronPublicUi.language() : "ru";
    if (lang === "ru") return "";
    return (hasQuery ? "&" : "?") + "lang=" + encodeURIComponent(lang);
  }

  function request(path, options) {
    options = options || {};
    var method = options.method || "GET";
    var canRetry = method === "GET";

    function run(tryIndex) {
      return attempt(path, options, method).catch(function (err) {
        if (!canRetry || tryIndex >= RETRY_DELAYS.length || !retriable(err)) throw err;
        return new Promise(function (resolve) {
          global.setTimeout(resolve, RETRY_DELAYS[tryIndex]);
        }).then(function () { return run(tryIndex + 1); });
      });
    }

    return run(0);
  }

  // ------------------------------------------------------- демо-хранилище
  var DEMO_AGENCIES = [
    { id: 1, login: "umida", name: "UMIDA" },
    { id: 2, login: "easytourism", name: "EASY TOURISM" },
    { id: 3, login: "ofotour", name: "OFO TOUR" },
    { id: 4, login: "operator", name: "Etihad (оператор)", role: "operator" },
  ];
  var DEMO_PASSWORD = "turon2026";

  /*
   * У заездов в seed-данных есть только `code` — числового `id` нет, он
   * появляется лишь в базе (AUTOINCREMENT). А маршруты вроде
   * «открыть/закрыть продажу» адресуют заезд именно по id, как и всё
   * остальное в API. Поэтому проставляем его здесь по порядку.
   *
   * Backfill идёт и для УЖЕ СОХРАНЁННОГО состояния, а не только для
   * свежего: у демо-пользователя в localStorage лежит слепок без id, и без
   * дозаполнения кнопка молча не срабатывала бы (id уходил как NaN).
   */
  function withDemoIds(list) {
    (list || []).forEach(function (d, i) { if (!d.id) d.id = i + 1; });
    return list;
  }

  function demoState() {
    var raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      if (!Array.isArray(saved.events)) saved.events = [];
      withDemoIds(saved.departures);
      return saved;
    }
    var fresh = {
      departures: withDemoIds(JSON.parse(JSON.stringify(global.TURON_SEED || []))),
      bookings: [],
      events: [],
      agency: null,
    };
    localStorage.setItem(DEMO_KEY, JSON.stringify(fresh));
    return fresh;
  }

  function saveDemo(s) { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); }

  function demoLogEvent(s, booking, action, details) {
    var actor = s.agency || {};
    var events = s.events || (s.events = []);
    var max = events.reduce(function (n, e) { return Math.max(n, Number(e.id) || 0); }, 0);
    events.push({
      id: max + 1,
      booking_id: booking.id,
      actor_name: actor.name || "—",
      actor_role: actor.role || "agency",
      action: action,
      details: details || null,
      created_at: new Date().toISOString(),
    });
  }

  function ageOn(birthDate, onDate) {
    var b = new Date(birthDate), o = new Date(onDate);
    var age = o.getFullYear() - b.getFullYear();
    var m = o.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && o.getDate() < b.getDate())) age--;
    return age;
  }

  /* ------------------------------------------------------------ ФИО
   * В базе имя одно поле `full_name`, а в формах их три: фамилия, имя,
   * отчество. Склейка и разбор живут ЗДЕСЬ, а не в app.js, потому что ими
   * пользуются оба кабинета — агентский (форма брони) и операторский (окно
   * правки документа). Разъехаться этим двум операциям нельзя: что один
   * экран разобрал, другой должен собрать обратно ровно так же.
   *
   * Разбор — по первым двум пробелам: фамилия, имя, ОСТАЛЬНОЕ в отчество.
   * Двойные фамилии и составные имена в паспортах встречаются, и хвост
   * терять нельзя, поэтому остаток именно склеивается, а не отбрасывается.
   */
  function joinName(p) {
    return [p.last_name, p.first_name, p.middle_name]
      .map(function (s) { return (s || "").trim(); })
      .filter(Boolean).join(" ");
  }

  function splitName(full) {
    var parts = String(full || "").trim().split(/\s+/).filter(Boolean);
    return {
      last_name: parts[0] || "",
      first_name: parts[1] || "",
      middle_name: parts.slice(2).join(" "),
    };
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
   * Проверка паспорта. Многие страны, в т.ч. Турция, требуют
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
   * остальные 70% — не позднее чем за FINAL_DAYS дней до выезда. Если до
   * выезда осталось меньше, рассрочки нет: вся сумма в течение суток.
   *
   * Возвращает шаги с долей и крайним сроком, чтобы и карточка тура, и
   * бронь считали одно и то же, а не каждый по-своему.
   */
  var DAY_MS = 86400000;

  /*
   * ОДНА граница на два правила сразу: до неё действует рассрочка и отмена
   * бесплатна, после — платить надо всё сразу и при отмене удерживается
   * 100%. Разъехаться им нельзя: если платёж уедет раньше штрафа, между
   * этими датами деньги уже собраны полностью, а отмена ещё бесплатная —
   * оператор возвращает всё. Поэтому число ОДНО и экспортируется наружу:
   * до этого оно было продублировано в api.js, app.js и catalog.js.
   */
  var FINAL_DAYS = 14;

  /*
   * Дней до выезда — ОДИН счёт на оплату и на отмену.
   *
   * Считаем от ПОЛУНОЧИ дня отсчёта до полуночи дня выезда. Тут уже была
   * дыра: оплата брала `new Date()` с текущим временем и `Math.floor`, а
   * отмена — полночь и `Math.round`. В один и тот же день, если дело было
   * после полудня, оплата видела 13 дней («платить всё сразу»), а отмена
   * 14 («ещё бесплатно») — то есть граница FINAL_DAYS зависела от часа,
   * когда агент открыл кабинет. Одинаковый оператор сравнения этого не
   * лечит: расходилась сама БАЗА отсчёта.
   */
  function daysBetweenDates(from, dateStart) {
    var start = new Date(from.getTime());
    start.setHours(0, 0, 0, 0);
    var dep = new Date(dateStart + "T00:00:00");
    return Math.round((dep - start) / DAY_MS);
  }

  function paymentPolicy(departureDate, bookingDate) {
    var dep = new Date(departureDate + "T00:00:00");
    var from = bookingDate ? new Date(bookingDate) : new Date();
    var daysLeft = daysBetweenDates(from, departureDate);

    if (daysLeft < FINAL_DAYS) {
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
          due: new Date(dep.getTime() - FINAL_DAYS * DAY_MS),
          label: "не позднее чем за " + FINAL_DAYS + " дней до выезда",
        },
      ],
    };
  }

  /* ------------------------------------------------- отмена и штраф
   * Полных дней от сегодня до выезда.
   */
  function daysUntilDeparture(dateStart) {
    if (!dateStart) return Infinity;
    return daysBetweenDates(new Date(), dateStart);
  }

  /*
   * Штрафная зона отмены — ОДНА функция на оба кабинета.
   *
   * Правило было продублировано сравнениями в js/app.js и js/admin.js, и они
   * разъехались: оплата считала `daysLeft < FINAL_DAYS`, а отмена
   * `daysUntil <= FINAL_DAYS`. Ровно на 14-м дне получалась дыра — агентство
   * ещё имело законное право доплачивать по рассрочке (70% как раз «не
   * позднее чем за 14 дней», то есть в этот самый день), но при отмене с
   * него удерживали уже все 100%. Внесено 30%, должен 100%.
   *
   * Теперь граница одна и та же, что у полной оплаты: пока срок доплаты НЕ
   * истёк (days >= FINAL_DAYS), отмена бесплатна. Штраф начинается со
   * следующего дня — ровно тогда же, когда включается требование платить
   * всё сразу. Решение оператора: 14-й день считается ещё бесплатным.
   */
  function cancellationPenalty(dateStart, total) {
    var days = daysUntilDeparture(dateStart);
    var penalty = days < FINAL_DAYS;
    return {
      days_left: days,
      penalty: penalty,
      amount: penalty ? (Number(total) || 0) : 0,
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

  // Сквозной номер пассажира по всему демо-хранилищу: считаем от максимума,
  // а не от длины списка, иначе после правки состава номера повторились бы.
  function nextDemoPassengerId(s) {
    var max = 0;
    (s.bookings || []).forEach(function (b) {
      (b.passengers || []).forEach(function (p) {
        if (p.id > max) max = p.id;
      });
    });
    return max + 1;
  }

  /*
   * Демо-двойник операторской правки даты рождения. Повторяет порядок
   * воркера: считает новый тариф той же priceFor, без confirm только
   * возвращает предпросмотр, с confirm — двигает цену, места и комиссию.
   */
  /*
   * Дата рождения — двойник `invalidBirthDate` из worker/index.js.
   *
   * Проверка обязана быть в ОБОИХ путях: демо-режим (preview.html, ui-тесты)
   * идёт мимо воркера целиком, и без этой копии «31 февраля» проходило бы
   * в браузере молча — а по дате рождения считается тариф и признак
   * младенца, то есть цена и число мест. Расходиться копиям нельзя:
   * правите здесь — правьте и в воркере.
   */
  function invalidBirthDate(value, departureDate) {
    var birth = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
      return "Дата рождения нужна в формате ГГГГ-ММ-ДД";
    }
    var d = new Date(birth + "T00:00:00Z");
    if (isNaN(d.getTime())) return "Даты " + birth + " не существует";
    // Разбор обратно: 2026-02-31 превратится в 2026-03-03 и не совпадёт.
    if (d.toISOString().slice(0, 10) !== birth) return "Даты " + birth + " не существует";
    if (birth < "1900-01-01") return "Дата рождения раньше 1900 года — проверьте паспорт";
    if (departureDate && birth > departureDate) return "Дата рождения позже даты выезда";
    if (birth > new Date().toISOString().slice(0, 10)) return "Дата рождения в будущем";
    return null;
  }

  function demoBirthdate(passengerId, body) {
    var s = demoState();
    var booking = null, pax = null;
    s.bookings.forEach(function (b) {
      (b.passengers || []).forEach(function (p) {
        if (p.id === passengerId) { booking = b; pax = p; }
      });
    });
    if (!pax) return Promise.reject(new Error("Пассажир не найден"));
    if (booking.status !== "confirmed") {
      return Promise.reject(new Error("Бронь отменена — правка не имеет смысла"));
    }
    var d = s.departures.filter(function (x) { return x.code === booking.departure_code; })[0];
    if (!d) return Promise.reject(new Error("Заезд не найден"));

    var badDate = invalidBirthDate(body.birth_date, d.date_start);
    if (badDate) return Promise.reject(new Error(badDate));

    var tariff = priceFor({ birth_date: body.birth_date, placement: pax.placement }, d);
    if (!tariff) {
      return Promise.reject(new Error("Нет цены на размещение " + pax.placement));
    }
    var newPrice = body.keep_price ? pax.price : tariff.price;
    var seatDelta = tariff.occupies_seat - pax.occupies_seat;
    var newTotal = booking.total_price - pax.price + newPrice;

    var out = {
      passenger_id: pax.id,
      booking_code: booking.code,
      full_name: pax.full_name,
      birth_date: { from: pax.birth_date, to: body.birth_date },
      tariff: { from: pax.price_code, to: tariff.code, label: tariff.label },
      price: { from: pax.price, to: newPrice },
      seats_delta: seatDelta,
      total_price: { from: booking.total_price, to: newTotal },
    };
    if (!body.confirm) return Promise.resolve(Object.assign({ preview: true }, out));

    pax.birth_date = body.birth_date;
    pax.price_code = tariff.code;
    pax.tariff = tariff.label;
    pax.price = newPrice;
    pax.occupies_seat = tariff.occupies_seat;
    booking.total_price = newTotal;
    booking.seats_used += seatDelta;
    booking.agency_commission = (d.agency_commission || 0) * booking.seats_used;
    d.seats_taken += seatDelta;
    saveDemo(s);
    return Promise.resolve(Object.assign({ preview: false, changed: true }, out));
  }

  /*
   * Демо-двойник операторской замены состава. Повторяет порядок воркера:
   * без confirm только считает и ничего не пишет, с confirm применяет.
   * keep_price переносит прежние цены ПО ПОЗИЦИЯМ и поэтому требует того
   * же числа туристов — иначе сумма брони разошлась бы с суммой строк, и
   * счёт на оплату показывал бы таблицу, которая не сходится с итогом.
   */
  function demoAdminPassengers(id, passengers, opts) {
    var s = demoState();
    var b = s.bookings.filter(function (x) { return x.id === id; })[0];
    if (!b || b.status !== "confirmed") return Promise.reject(new Error("Бронь не найдена"));
    if (!passengers || !passengers.length) {
      return Promise.reject(new Error("В брони должен остаться хотя бы один пассажир"));
    }
    var d = s.departures.filter(function (x) { return x.code === b.departure_code; })[0];
    if (!d) return Promise.reject(new Error("Заезд не найден"));

    for (var j = 0; j < passengers.length; j++) {
      var bad = invalidBirthDate(passengers[j].birth_date, d.date_start);
      if (bad) {
        return Promise.reject(new Error(
          (passengers[j].full_name || "Пассажир") + ": " + bad));
      }
    }

    var oldPax = b.passengers || [];
    if (opts.keepPrice && passengers.length !== oldPax.length) {
      return Promise.reject(new Error(
        "Прежние цены можно оставить только при том же числе туристов"));
    }

    var priced = [], seats = 0, total = 0;
    var paxId = nextDemoPassengerId(s);
    for (var i = 0; i < passengers.length; i++) {
      var t = priceFor(passengers[i], d);
      if (!t) return Promise.reject(new Error("Нет цены на размещение " + passengers[i].placement));
      // Тариф ставим настоящий всегда — в ведомости должно стоять то, кем
      // турист летит на самом деле. Заморозить можно только цену.
      var price = opts.keepPrice ? oldPax[i].price : t.price;
      priced.push(Object.assign({}, passengers[i], {
        // Сохраняем прежний номер, если строка уже была в брони: иначе
        // операторская правка документа теряла бы адресата.
        id: passengers[i].id || paxId++,
        price_code: t.code, tariff: t.label, price: price, occupies_seat: t.occupies_seat,
      }));
      if (t.occupies_seat) seats++;
      total += price;
    }
    total = Math.round(total * 100) / 100;

    var oldSeats = b.seats_used;
    var commission = (d.agency_commission || 0) * seats;
    var out = {
      booking_code: b.code,
      departure_code: b.departure_code,
      date_start: b.date_start,
      keep_price: opts.keepPrice === true,
      from: {
        passengers_count: oldPax.length, seats: oldSeats,
        total_price: b.total_price, agency_commission: b.agency_commission,
        passengers: oldPax.slice(),
      },
      to: {
        passengers_count: priced.length, seats: seats,
        total_price: total, agency_commission: commission,
        passengers: priced.slice(),
      },
      seats_delta: seats - oldSeats,
    };
    if (!opts.confirm) return Promise.resolve(Object.assign({ preview: true }, out));

    /*
     * Закрытая продажа запрещает новые МЕСТА, а не любую правку: убрать
     * отказавшегося туриста надо уметь и на полном рейсе — это место
     * освобождает. Поэтому отказ только когда мест становится больше
     * (на сервере то же самое делает `AND is_open = 1` в UPDATE).
     */
    if (d.is_open === 0 && seats > oldSeats) {
      return Promise.reject(new Error("Заезд закрыт для продажи. Уточните у оператора."));
    }

    // Прежнюю сумму запоминаем ДО присваивания: в журнал идёт «было →
    // стало», а b.total_price ниже уже станет новым.
    var oldTotal = b.total_price;
    // Продажа открыта: по вместимости не блокируем (см. создание брони).
    d.seats_taken += seats - oldSeats;
    b.passengers = priced;
    b.passengers_count = priced.length;
    b.seats_used = seats;
    b.total_price = total;
    b.agency_commission = commission;
    // Правка закрывает открытую заявку агентства — как и на сервере, где
    // открытой считается заявка новее последней правки.
    b.change_requested_at = null;
    demoLogEvent(s, b, "edited", "состав: " + oldPax.length + " чел., $" +
      oldTotal + " → " + priced.length + " чел., $" + total +
      (opts.keepPrice ? " (цены сохранены по решению оператора)" : "") + "; " +
      priced.map(function (p) { return p.full_name; }).join(", "));
    saveDemo(s);
    return Promise.resolve(Object.assign({ preview: false, changed: true }, out, {
      passengers_count: priced.length, seats_taken: seats, total_price: total,
      agency_commission: commission,
    }));
  }

  /*
   * Демо-двойник правки прайса. Повторяет проверки воркера — иначе в
   * превью «пустая цена» или удаление проданного тарифа проходили бы
   * молча, а на бою отбивались бы сервером.
   */
  /*
   * Существует ли такая дата. Двойник invalidCalendarDate из воркера:
   * демо идёт мимо сервера, и без копии «31 февраля» прошло бы молча.
   */
  function invalidCalendarDate(value) {
    var v = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "нужен формат ГГГГ-ММ-ДД";
    var d = new Date(v + "T00:00:00Z");
    if (isNaN(d.getTime())) return "даты " + v + " не существует";
    if (d.toISOString().slice(0, 10) !== v) return "даты " + v + " не существует";
    return null;
  }

  /* ------------------------------------------------------- туры (демо)
   * Туры в демо живут в TURON_TOURS, но заводить новые надо уметь и там —
   * иначе форму нельзя ни посмотреть, ни проверить тестом. Кладём их в то
   * же хранилище, что заезды и брони.
   */
  function demoTourStore(s) {
    if (!s.tours) {
      s.tours = JSON.parse(JSON.stringify(global.TURON_TOURS || []))
        .map(function (t, i) {
          return Object.assign({
            id: i + 1, operator_commission: 0, description: null, from_price: null,
          }, t);
        });
    }
    return s.tours;
  }

  function demoTours() {
    var s = demoState();
    var list = demoTourStore(s);
    saveDemo(s);
    return list.map(function (t) {
      var deps = s.departures.filter(function (d) { return d.tour_code === t.code; });
      var today = new Date().toISOString().slice(0, 10);
      return Object.assign({}, t, {
        departures: deps.length,
        upcoming: deps.filter(function (d) { return d.date_start >= today; }).length,
      });
    });
  }

  // Общая проверка полей — двойник tourFields из воркера.
  function demoTourFields(body, cur) {
    cur = cur || {};
    var name = String(body.name != null ? body.name : cur.name || "").trim();
    var destination = String(
      body.destination != null ? body.destination : cur.destination || "").trim();
    if (!name) return { error: "Нужно название тура" };
    if (!destination) return { error: "Нужно направление" };

    function num(key, fallback) {
      if (body[key] == null || body[key] === "") return fallback;
      var v = Number(body[key]);
      return isFinite(v) ? v : NaN;
    }
    var agency = num("agency_commission", cur.agency_commission || 0);
    var operator = num("operator_commission", cur.operator_commission || 0);
    if (!isFinite(agency) || agency < 0) return { error: "Комиссия агентства: число от нуля" };
    if (!isFinite(operator) || operator < 0) return { error: "Комиссия оператора: число от нуля" };

    var nights = body.nights == null || body.nights === ""
      ? (cur.nights == null ? null : cur.nights) : Number(body.nights);
    if (nights != null && (!isFinite(nights) || nights % 1 !== 0 || nights < 0 || nights > 365)) {
      return { error: "Ночей: целое число от 0" };
    }
    var fromPrice = body.from_price == null || body.from_price === ""
      ? (cur.from_price == null ? null : cur.from_price) : Number(body.from_price);
    if (fromPrice != null && (!isFinite(fromPrice) || fromPrice < 0)) {
      return { error: "Цена «от»: число от нуля" };
    }
    return {
      name: name, destination: destination,
      agency_commission: agency, operator_commission: operator,
      nights: nights, from_price: fromPrice,
      description: body.description != null
        ? String(body.description).trim().slice(0, 4000) || null
        : (cur.description || null),
      note: body.note != null
        ? String(body.note).trim().slice(0, 500) || null
        : (cur.note || null),
      is_bookable: body.is_bookable == null
        ? (cur.is_bookable == null ? 1 : cur.is_bookable)
        : (body.is_bookable ? 1 : 0),
      hero_image: body.hero_image != null
        ? String(body.hero_image).trim().slice(0, 500) || null
        : (cur.hero_image || null),
    };
  }

  function demoSaveTour(id, payload) {
    var s = demoState();
    var list = demoTourStore(s);

    if (!id) {
      var code = String(payload.code || "").trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
        return Promise.reject(new Error(
          "Код тура: латиница, цифры, дефис — от 3 до 32 знаков"));
      }
      if (list.some(function (t) { return t.code === code; })) {
        return Promise.reject(new Error("Тур с кодом " + code + " уже есть"));
      }
      var f = demoTourFields(payload, null);
      if (f.error) return Promise.reject(new Error(f.error));
      var made = Object.assign({
        id: list.reduce(function (n, t) { return Math.max(n, t.id || 0); }, 0) + 1,
        code: code,
      }, f);
      list.push(made);
      saveDemo(s);
      return Promise.resolve(Object.assign({ departures: 0 }, made));
    }

    var cur = list.filter(function (t) { return t.id === id; })[0];
    if (!cur) return Promise.reject(new Error("Тур не найден"));
    if (payload.code && String(payload.code).trim().toUpperCase() !== cur.code) {
      return Promise.reject(new Error(
        "Код тура не меняется: он стоит в ссылке на карточку, " +
        "которую агенты уже разослали клиентам"));
    }
    var upd = demoTourFields(payload, cur);
    if (upd.error) return Promise.reject(new Error(upd.error));
    Object.assign(cur, upd);
    saveDemo(s);
    return Promise.resolve(Object.assign({}, cur));
  }

  /* ------------------------------------------- контент карточки (демо) */
  function demoContentStore(s) {
    if (!s.tourContent) s.tourContent = {};
    return s.tourContent;
  }

  function demoTourContent(id) {
    var s = demoState();
    var store = demoContentStore(s);
    var t = demoTourStore(s).filter(function (x) { return x.id === id; })[0];
    var saved = store[id] || { content: [], variants: [] };
    saveDemo(s);
    return {
      code: t ? t.code : "",
      content: saved.content || [],
      variants: saved.variants || [],
    };
  }

  // Двойник updateTourContent: те же проверки, тот же порядок по позиции.
  /* Переводы строки контента в демо-режиме. Копия cleanI18n из воркера и
   * по той же причине, что invalidBirthDate: превью и ui-тесты идут мимо
   * воркера целиком, и без копии здесь пустой {"tr":{}} проходил бы в
   * браузере молча. Правите одну — правьте вторую. */
  var I18N_LANGS = ["uz", "en", "tr"];

  function cleanI18n(raw, fields) {
    if (!raw || typeof raw !== "object") return null;
    var out = {}, any = false;
    I18N_LANGS.forEach(function (lang) {
      var src = raw[lang];
      if (!src || typeof src !== "object") return;
      var box = {}, filled = false;
      fields.forEach(function (f) {
        var v = src[f];
        if (typeof v !== "string") return;
        var value = v.trim().slice(0, 4000);
        if (!value) return;
        box[f] = value; filled = true;
      });
      if (filled) { out[lang] = box; any = true; }
    });
    return any ? out : null;
  }

  function demoSaveTourContent(id, content, variants) {
    var s = demoState();
    var t = demoTourStore(s).filter(function (x) { return x.id === id; })[0];
    if (!t) return Promise.reject(new Error("Тур не найден"));

    var KINDS = ["included", "excluded", "info", "gallery", "day"];
    var rows = content || [], vars = variants || [];
    var cleanVars = [], seenVar = {}, i, v;

    for (i = 0; i < vars.length; i++) {
      v = vars[i];
      var vcode = String(v.code || "").trim().toUpperCase();
      var vtitle = String(v.title || "").trim();
      if (!vcode) return Promise.reject(new Error("У варианта маршрута нужен код"));
      if (!/^[A-Z0-9_-]{1,16}$/.test(vcode)) {
        return Promise.reject(new Error("Вариант «" + vcode + "»: латиница, цифры, дефис"));
      }
      if (seenVar[vcode]) {
        return Promise.reject(new Error("Вариант " + vcode + " встречается дважды"));
      }
      seenVar[vcode] = true;
      if (!vtitle) return Promise.reject(new Error("Вариант " + vcode + ": нужен заголовок"));
      cleanVars.push({
        code: vcode, title: vtitle, sort: cleanVars.length,
        i18n: cleanI18n(v.i18n, ["title"]),
      });
    }

    var cleanRows = [], perKind = {};
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var kind = String(r.kind || "").trim();
      if (KINDS.indexOf(kind) === -1) {
        return Promise.reject(new Error("Неизвестный блок «" + kind + "»"));
      }
      var text = String(r.text || "").trim();
      if (!text) {
        return Promise.reject(new Error(
          "Пустая строка в контенте — уберите её или заполните"));
      }
      if (text.length > 4000) {
        return Promise.reject(new Error("Строка длиннее 4000 знаков"));
      }
      var variant = r.variant == null || r.variant === ""
        ? null : String(r.variant).trim().toUpperCase();
      if (variant && !seenVar[variant]) {
        return Promise.reject(new Error(
          "День привязан к варианту " + variant + ", которого нет в списке"));
      }
      perKind[kind] = (perKind[kind] || 0) + 1;
      cleanRows.push({
        kind: kind,
        variant: kind === "day" ? variant : null,
        sort: perKind[kind] - 1,
        title: r.title == null ? null : String(r.title).trim().slice(0, 200) || null,
        text: text,
        url: r.url == null ? null : String(r.url).trim().slice(0, 500) || null,
        i18n: cleanI18n(r.i18n, ["title", "text"]),
      });
    }

    demoContentStore(s)[id] = { content: cleanRows, variants: cleanVars };
    saveDemo(s);
    return Promise.resolve({
      code: t.code, variants: cleanVars.length, rows: cleanRows.length, by_kind: perKind,
    });
  }

  // Демо-двойник смены даты. Повторяет проверки и порядок воркера.
  function demoDepartureDate(id, dateStart, opts) {
    var s = demoState();
    var d = s.departures.filter(function (x) { return x.id === id; })[0];
    if (!d) return Promise.reject(new Error("Заезд не найден"));

    var bad = invalidCalendarDate(dateStart);
    if (bad) return Promise.reject(new Error("Дата заезда: " + bad));
    if (dateStart < new Date().toISOString().slice(0, 10)) {
      return Promise.reject(new Error("Дата заезда в прошлом"));
    }
    if (d.date_start === dateStart) {
      return Promise.reject(new Error("Это и есть текущая дата заезда"));
    }

    var affected = s.bookings.filter(function (b) {
      return b.departure_code === d.code && b.status === "confirmed";
    }).map(function (b) {
      return {
        code: b.code,
        // Имя агентства берём по брони, а не по текущему пользователю:
        // смотрит-то оператор, и подставлять его имя всем броням нельзя.
        agency_name: (DEMO_AGENCIES.filter(function (a) {
          return a.id === b.agency_id;
        })[0] || {}).name || "",
        created_at: b.created_at,
        total_price: b.total_price,
        paid: b.paid || 0,
        balance: Math.round((b.total_price - (b.paid || 0)) * 100) / 100,
      };
    });

    var out = { code: d.code, from: d.date_start, to: dateStart, bookings: affected };
    if (!opts.confirm) return Promise.resolve(Object.assign({ preview: true }, out));

    var wasDate = d.date_start;
    d.date_start = dateStart;
    // Брони держат дату отдельным полем — иначе «Платежи» у агентства
    // считали бы сроки по старому выезду.
    s.bookings.forEach(function (b) {
      if (b.departure_code === d.code) b.date_start = dateStart;
    });
    s.departures.sort(function (a, b) {
      return a.date_start < b.date_start ? -1 : (a.date_start > b.date_start ? 1 : 0);
    });
    affected.forEach(function (a) {
      var b = s.bookings.filter(function (x) { return x.code === a.code; })[0];
      if (b) {
        demoLogEvent(s, b, "edited",
          "дата заезда " + d.code + ": " + wasDate + " → " + dateStart);
      }
    });
    saveDemo(s);
    return Promise.resolve(Object.assign({ preview: false, changed: true }, out));
  }

  // Демо-двойник создания заезда. Повторяет проверки воркера.
  function demoCreateDeparture(payload) {
    var s = demoState();
    var code = String(payload.code || "").trim().toUpperCase();
    var dateStart = String(payload.date_start || "").trim();
    var sourceCode = String(payload.source_code || "").trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return Promise.reject(new Error(
        "Код заезда: латиница, цифры, дефис — от 3 до 24 знаков"));
    }
    var badDate = invalidCalendarDate(dateStart);
    if (badDate) return Promise.reject(new Error("Дата заезда: " + badDate));
    if (dateStart < new Date().toISOString().slice(0, 10)) {
      return Promise.reject(new Error("Дата заезда в прошлом"));
    }
    if (s.departures.some(function (d) { return d.code === code; })) {
      return Promise.reject(new Error("Заезд с кодом " + code + " уже есть"));
    }

    var source = null;
    if (sourceCode) {
      source = s.departures.filter(function (d) { return d.code === sourceCode; })[0];
      if (!source) {
        return Promise.reject(new Error("Заезд-образец " + sourceCode + " не найден"));
      }
    }
    if (!source && !payload.tour_code) {
      return Promise.reject(new Error("Нужен заезд-образец или код тура"));
    }

    var transport = String(payload.transport || (source ? source.transport : ""))
      .trim().toUpperCase();
    if (!/^[A-Z]{2,8}$/.test(transport)) {
      return Promise.reject(new Error("Код аэропорта: 2-8 латинских букв (TZX, BUS)"));
    }

    var capacity = payload.capacity == null
      ? (source ? source.capacity : 65) : Number(payload.capacity);
    if (!isFinite(capacity) || capacity % 1 !== 0 || capacity < 1 || capacity > 2000) {
      return Promise.reject(new Error("Вместимость: целое число от 1"));
    }

    var maxId = s.departures.reduce(function (n, d) { return Math.max(n, d.id || 0); }, 0);
    var made = {
      id: maxId + 1,
      code: code,
      date_start: dateStart,
      transport: transport,
      is_info_tour: payload.is_info_tour ? 1 : (source ? source.is_info_tour : 0),
      capacity: capacity,
      seats_taken: 0,
      // Без прайса продавать нечего — заезд рождается закрытым.
      is_open: source ? 1 : 0,
      prices: source ? JSON.parse(JSON.stringify(source.prices || [])) : [],
      agency_commission: source ? source.agency_commission : 0,
      tour_code: source ? source.tour_code : (payload.tour_code || ""),
      tour_name: source ? source.tour_name : "",
      destination: source ? source.destination : "",
      nights: source ? source.nights : null,
    };
    s.departures.push(made);
    s.departures.sort(function (a, b) {
      return a.date_start < b.date_start ? -1 : (a.date_start > b.date_start ? 1 : 0);
    });
    saveDemo(s);
    return Promise.resolve({
      id: made.id, code: code, date_start: dateStart, transport: transport,
      capacity: capacity, is_open: !!made.is_open,
      prices_copied: made.prices.length, source: sourceCode || null,
    });
  }

  function demoDeparturePrices(id, prices) {
    var s = demoState();
    var d = s.departures.filter(function (x) { return x.id === id; })[0];
    if (!d) return Promise.reject(new Error("Заезд не найден"));
    var rows = prices || [];
    if (!rows.length) {
      return Promise.reject(new Error("В прайсе должна остаться хотя бы одна строка"));
    }

    var clean = [], seen = {}, i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      var code = String(r.code || "").trim().toUpperCase();
      var label = String(r.label || "").trim();
      var kind = r.kind === "child" ? "child" : "placement";
      var price = Number(r.price);
      if (!code) return Promise.reject(new Error("У каждой строки прайса нужен код"));
      if (!/^[A-Z0-9_]{1,16}$/.test(code)) {
        return Promise.reject(new Error("Код «" + code + "»: только латиница, цифры и подчёркивание"));
      }
      if (seen[code]) return Promise.reject(new Error("Код " + code + " встречается дважды"));
      seen[code] = true;
      if (!label) return Promise.reject(new Error("Строка " + code + ": нужна подпись"));
      if (!isFinite(price) || price < 0) {
        return Promise.reject(new Error("Строка " + code + ": цена должна быть числом от нуля"));
      }
      var ageFrom = null, ageTo = null, seat = 1;
      if (kind === "child") {
        ageFrom = Number(r.age_from); ageTo = Number(r.age_to);
        if (!isFinite(ageFrom) || !isFinite(ageTo) ||
            ageFrom % 1 !== 0 || ageTo % 1 !== 0) {
          return Promise.reject(new Error("Строка " + code + ": нужен возрастной диапазон"));
        }
        if (ageFrom < 0 || ageTo > 120 || ageFrom >= ageTo) {
          return Promise.reject(new Error(
            "Строка " + code + ": диапазон «от» должен быть меньше «до»"));
        }
        seat = (r.occupies_seat === 0 || r.occupies_seat === false) ? 0 : 1;
      }
      clean.push({ code: code, label: label, kind: kind, price: price,
                   age_from: ageFrom, age_to: ageTo, occupies_seat: seat });
    }

    if (!clean.some(function (x) { return x.kind === "placement"; })) {
      return Promise.reject(new Error(
        "Нужно хотя бы одно размещение — иначе заезд нечем продавать"));
    }

    // Тариф, по которому уже едут, убрать нельзя: он подписывает строку в
    // ведомости и в билете.
    var used = {};
    s.bookings.forEach(function (b) {
      if (b.departure_code !== d.code || b.status !== "confirmed") return;
      (b.passengers || []).forEach(function (p) { used[p.price_code] = true; });
    });
    var gone = Object.keys(used).filter(function (c) { return !seen[c]; });
    if (gone.length) {
      return Promise.reject(new Error("По тарифу " + gone.join(", ") +
        " уже есть туристы — такую строку убрать нельзя. " +
        "Цену менять можно: на проданные брони она не влияет."));
    }

    var wasBy = {};
    (d.prices || []).forEach(function (x) { wasBy[x.code] = x; });
    var changed = clean.filter(function (x) {
      return !wasBy[x.code] || wasBy[x.code].price !== x.price;
    }).map(function (x) {
      return { code: x.code, from: wasBy[x.code] ? wasBy[x.code].price : null, to: x.price };
    });
    var removed = (d.prices || []).filter(function (x) { return !seen[x.code]; })
      .map(function (x) { return x.code; });

    d.prices = clean;
    saveDemo(s);
    return Promise.resolve({
      code: d.code, rows: clean.length, changed: changed, removed: removed,
      sold_untouched: Object.keys(used).length,
    });
  }

  function demoCreateBooking(payload) {
    var s = demoState();
    var d = s.departures.filter(function (x) { return x.code === payload.departure_code; })[0];
    if (!d) return Promise.reject(new Error("Заезд не найден"));
    // Закрытая продажа — единственная блокировка брони (потолок мест снят).
    if (d.is_open === 0) {
      return Promise.reject(new Error("Заезд закрыт для продажи. Уточните у оператора."));
    }

    for (var j = 0; j < payload.passengers.length; j++) {
      var bad = invalidBirthDate(payload.passengers[j].birth_date, d.date_start);
      if (bad) {
        return Promise.reject(new Error(
          (payload.passengers[j].full_name || "Пассажир") + ": " + bad));
      }
    }

    var priced = [], seats = 0, total = 0;
    // База номеров берётся ОДИН раз: внутри цикла новая бронь ещё не в
    // хранилище, и каждый вызов возвращал бы одно и то же число.
    var paxId = nextDemoPassengerId(s);
    for (var i = 0; i < payload.passengers.length; i++) {
      var p = payload.passengers[i];
      var t = priceFor(p, d);
      if (!t) {
        return Promise.reject(new Error(
          "Для заезда " + d.code + " нет цены на размещение " + p.placement));
      }
      priced.push({
        // id нужен операторской правке документа: она адресует конкретного
        // пассажира. В боевой базе это p.id, здесь выдаём сквозной номер.
        id: paxId++,
        full_name: p.full_name, birth_date: p.birth_date,
        passport_number: p.passport_number, passport_expiry: p.passport_expiry || "",
        placement: p.placement, price_code: t.code, tariff: t.label,
        price: t.price, occupies_seat: t.occupies_seat,
      });
      if (t.occupies_seat) seats++;
      total += t.price;
    }
    // Продажа открыта: по вместимости не блокируем (счётчик мест с реальностью
    // не сверяется, вместимостью оператор управляет сам). seats_taken всё равно
    // ведём — вдруг понадобится сводка, но бронь по нему не отклоняем.
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
    s.bookings.push(booking);
    demoLogEvent(s, booking, "created", priced.length + " чел.: " +
      priced.map(function (p) { return p.full_name; }).join(", ") + "; " + total + " USD");
    saveDemo(s);
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
    //
    // Язык уходит параметром ?lang=, и переводит СЕРВЕР: ответ приходит уже
    // на нужном языке, форма его не меняется. Русский параметра не требует
    // и остаётся откатом — для тура без переводов ответ тот же, что был.
    // В демо-режиме переводов нет вовсе (seed-данные русские), поэтому
    // демо-ветки параметр игнорируют и отдают русский.
    catalogDestinations: function () {
      if (!API_BASE) return Promise.resolve(demoDestinations());
      return request("/api/public/destinations" + langQuery());
    },

    catalogTours: function (destination) {
      if (!API_BASE) {
        var list = demoCatalogTours();
        return Promise.resolve(destination
          ? list.filter(function (t) { return t.destination === destination; })
          : list);
      }
      var q = destination ? "?destination=" + encodeURIComponent(destination) : "";
      return request("/api/public/tours" + q + langQuery(!!q));
    },

    catalogTour: function (code) {
      if (!API_BASE) return demoCatalogTour(code);
      return request("/api/public/tours/" + encodeURIComponent(code) + langQuery());
    },

    /*
     * Заявка с формы «Свяжитесь с нами». В демо-режиме бэкенда нет —
     * честно отклоняем, а не притворяемся, что письмо куда-то ушло;
     * catalog.js на этот случай откатывается на mailto.
     */
    contactRequest: function (payload) {
      if (!API_BASE) return Promise.reject(new Error("demo"));
      return request("/api/public/contact-request", { method: "POST", body: payload });
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
        var st = demoState();
        // Закрытый заезд видит только оператор — ему нужно уметь открыть
        // его обратно. Агентству он не показывается вовсе (как и на сервере).
        var isOp = st.agency && st.agency.role === "operator";
        return Promise.resolve(st.departures
          .filter(function (d) { return all || d.date_start >= today; })
          .filter(function (d) { return isOp || d.is_open !== 0; })
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

    /*
     * Замена состава — ТОЛЬКО ОПЕРАТОР, как и отмена: меняется тариф
     * (взрослый/детский), сумма брони и место, на которое может быть уже
     * выписан билет. Агентство шлёт заявку (requestChange).
     *
     * Два шага, как у правки даты рождения: без confirm сервер только
     * СЧИТАЕТ, что изменится, и ничего не пишет.
     */
    adminUpdatePassengers: function (id, passengers, opts) {
      var o = opts || {};
      if (!API_BASE) return demoAdminPassengers(id, passengers, o);
      return request("/api/admin/bookings/" + id + "/passengers", {
        method: "POST",
        body: {
          passengers: passengers,
          confirm: o.confirm === true,
          keep_price: o.keepPrice === true,
        },
      });
    },

    /*
     * Заявка агентства на замену состава — сестра requestCancel. Ничего не
     * меняет: пишет просьбу в журнал брони и зовёт оператора в Telegram.
     */
    requestChange: function (id, reason) {
      if (!API_BASE) {
        var s = demoState();
        var b = s.bookings.filter(function (x) { return x.id === id; })[0];
        if (!b || b.status !== "confirmed") return Promise.reject(new Error("Бронь не найдена"));
        if (b.change_requested_at) {
          return Promise.resolve({ booking_code: b.code, requested: true, already_requested: true });
        }
        b.change_requested_at = new Date().toISOString();
        demoLogEvent(s, b, "change_requested", reason || "агентство просит изменить состав");
        saveDemo(s);
        return Promise.resolve({ booking_code: b.code, requested: true });
      }
      return request("/api/bookings/" + id + "/change-request", {
        method: "POST", body: { reason: reason || "" },
      });
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

    /*
     * Заявка агентства на отмену. Саму бронь НЕ трогает: отмена — деньги
     * (после FINAL_DAYS удерживается 100%), и проводит её оператор. Здесь
     * только фиксируется просьба и уходит уведомление.
     */
    requestCancel: function (id, reason) {
      if (!API_BASE) {
        var s = demoState();
        var b = s.bookings.filter(function (x) { return x.id === id; })[0];
        if (!b || b.status !== "confirmed") return Promise.reject(new Error("Бронь не найдена"));
        if (b.cancel_requested_at) {
          return Promise.resolve({ booking_code: b.code, requested: true, already_requested: true });
        }
        b.cancel_requested_at = new Date().toISOString();
        demoLogEvent(s, b, "cancel_requested", reason || "агентство просит отменить бронь");
        saveDemo(s);
        return Promise.resolve({ booking_code: b.code, requested: true });
      }
      return request("/api/bookings/" + id + "/cancel-request", {
        method: "POST", body: { reason: reason || "" },
      });
    },

    /*
     * Открыть/закрыть продажу заезда — единственный рычаг оператора над
     * продажей (потолок мест снят). Закрытие ничего не удаляет: проданные
     * брони живут дальше, не создаются только новые.
     */
    setDepartureOpen: function (id, open) {
      if (!API_BASE) {
        var s = demoState();
        var d = s.departures.filter(function (x) { return x.id === id; })[0];
        if (!d) return Promise.reject(new Error("Заезд не найден"));
        var was = d.is_open === undefined ? 1 : d.is_open;
        if (!!was === !!open) {
          return Promise.resolve({ code: d.code, is_open: !!open, changed: false });
        }
        // Открыть заезд без цен нельзя: агентство уткнулось бы в «нет цены
        // на размещение» уже на форме брони.
        if (open && !(d.prices || []).some(function (p) { return p.kind === "placement"; })) {
          return Promise.reject(new Error(
            "У заезда нет ни одной цены размещения — сначала заполните прайс"));
        }
        d.is_open = open ? 1 : 0;
        saveDemo(s);
        return Promise.resolve({
          code: d.code, date_start: d.date_start, is_open: !!open, changed: true,
          bookings: s.bookings.filter(function (b) {
            return b.departure_code === d.code && b.status === "confirmed";
          }).length,
        });
      }
      return request("/api/admin/departures/" + id + "/" + (open ? "open" : "close"),
                     { method: "POST" });
    },

    /*
     * Новый заезд — по образцу существующего: прайс копируется целиком.
     * Заводить 3-6 размещений плюс детские тарифы руками на каждую
     * пятницу сезона нереально, поэтому это основной путь.
     *
     * Без образца тоже можно (новому туру копировать неоткуда), но такой
     * заезд создаётся сразу ЗАКРЫТЫМ: без цен продавать нечего.
     */
    createDeparture: function (payload) {
      if (!API_BASE) return demoCreateDeparture(payload);
      return request("/api/admin/departures", { method: "POST", body: payload });
    },

    /* ----------------------------------------------------------- туры
     * Тур — продукт, заезды — его даты. Код тура после создания НЕ
     * меняется: он стоит в публичной ссылке на карточку, которую агенты
     * рассылают клиентам. Удаления тура нет — только снятие с продажи.
     */
    adminTours: function () {
      if (!API_BASE) return Promise.resolve(demoTours());
      return request("/api/admin/tours");
    },

    /*
     * Загрузка фотографии. Файл уходит СЫРЫМИ БАЙТАМИ, а не в JSON: base64
     * раздувает тело на треть, а картинку всё равно принимает отдельный
     * маршрут, которому разбирать JSON незачем. Поэтому здесь не общий
     * request(), а свой fetch — тот всегда ставит Content-Type: application/json
     * и сериализует тело.
     *
     * Повторов при сбое НЕТ намеренно: повтор загрузил бы вторую копию
     * файла в хранилище, а пользы никакой — оператор нажмёт кнопку сам.
     */
    uploadMedia: function (blob, kind) {
      // В демо-режиме хранилища нет: возвращаем сам файл строкой data:.
      // Так превью и ui-тесты проверяют весь путь «выбрал → ужалось →
      // подставилось в форму», не поднимая бэкенд.
      if (!API_BASE) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () { resolve({ url: String(reader.result) }); };
          reader.onerror = function () { reject(new Error("Не удалось прочитать файл")); };
          reader.readAsDataURL(blob);
        });
      }
      return fetch(API_BASE + "/api/admin/media?kind=" + encodeURIComponent(kind || ""), {
        method: "POST",
        headers: (function () {
          var h = { "Content-Type": blob.type };
          if (getToken()) h.Authorization = "Bearer " + getToken();
          return h;
        })(),
        body: blob,
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || "Не удалось загрузить файл");
          // Адрес приходит относительным — он живёт на воркере, а страница
          // на другом домене.
          return { url: API_BASE + data.url, key: data.key };
        });
      });
    },

    createTour: function (payload) {
      if (!API_BASE) return demoSaveTour(null, payload);
      return request("/api/admin/tours", { method: "POST", body: payload });
    },

    updateTour: function (id, payload) {
      if (!API_BASE) return demoSaveTour(id, payload);
      return request("/api/admin/tours/" + id, { method: "POST", body: payload });
    },

    /*
     * Контент карточки тура: программа по дням, «включено / не включено /
     * информация» и варианты маршрута. Набор строк заменяется целиком —
     * как прайс заезда: порядок задаётся позицией в списке.
     */
    tourContent: function (id) {
      if (!API_BASE) return Promise.resolve(demoTourContent(id));
      return request("/api/admin/tours/" + id + "/content");
    },

    updateTourContent: function (id, content, variants) {
      if (!API_BASE) return demoSaveTourContent(id, content, variants);
      return request("/api/admin/tours/" + id + "/content", {
        method: "POST", body: { content: content, variants: variants || [] },
      });
    },

    /*
     * Смена даты заезда. Два шага: без confirm сервер только собирает,
     * кого это заденет, и ничего не пишет.
     *
     * Сроки оплаты и штрафную зону считает НЕ сервер, а paymentPolicy /
     * cancellationPenalty здесь же — та самая, что рисует «Платежи»
     * агентству. Вторая точка правды по срокам нам не нужна.
     */
    updateDepartureDate: function (id, dateStart, opts) {
      var o = opts || {};
      if (!API_BASE) return demoDepartureDate(id, dateStart, o);
      return request("/api/admin/departures/" + id + "/date", {
        method: "POST",
        body: { date_start: dateStart, confirm: o.confirm === true },
      });
    },

    /*
     * Правка прайса заезда. Набор строк заменяется целиком.
     *
     * На проданные брони НЕ влияет: цена пассажира заморожена в момент
     * брони (passengers.price) и из прайса не перечитывается. Именно
     * поэтому правку вообще можно давать оператору.
     */
    updateDeparturePrices: function (id, prices) {
      if (!API_BASE) return demoDeparturePrices(id, prices);
      return request("/api/admin/departures/" + id + "/prices", {
        method: "POST", body: { prices: prices },
      });
    },

    // Реальная отмена — только оператор (маршрут в ветке /api/admin/).
    adminCancelBooking: function (id) {
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
      return request("/api/admin/bookings/" + id + "/cancel", { method: "POST" });
    },

    /*
     * Исправление данных документа (ФИО, номер, срок). Ни цену, ни места
     * не трогает — это не изменение брони, а починка опечатки.
     */
    adminUpdateDocument: function (passengerId, data) {
      if (!API_BASE) {
        var s = demoState();
        var found = null;
        s.bookings.forEach(function (b) {
          (b.passengers || []).forEach(function (p) {
            if (p.id === passengerId) found = p;
          });
        });
        if (!found) return Promise.reject(new Error("Пассажир не найден"));
        // Та же развилка, что в воркере: не изменилось — не пишем и говорим
        // об этом. Без неё демо показывало бы «сохранено» на пустой правке.
        var same = found.full_name === data.full_name &&
          found.passport_number === data.passport_number &&
          (found.passport_expiry || "") === (data.passport_expiry || "");
        if (same) return Promise.resolve({ changed: false, passenger_id: passengerId });
        found.full_name = data.full_name;
        found.passport_number = data.passport_number;
        found.passport_expiry = data.passport_expiry || null;
        saveDemo(s);
        return Promise.resolve(Object.assign({ changed: true, passenger_id: passengerId }, data));
      }
      return request("/api/admin/passengers/" + passengerId + "/document", {
        method: "POST", body: data,
      });
    },

    /*
     * Исправление даты рождения. В отличие от документа ВСЕГДА пересчитывает
     * тариф, а с ним цену и число мест (младенец до 2 лет места не занимает).
     * Поэтому два шага: без confirm сервер только считает и возвращает, что
     * изменится; с confirm — применяет. keep_price оставляет прежнюю цену.
     */
    adminUpdateBirthdate: function (passengerId, birthDate, opts) {
      opts = opts || {};
      var body = {
        birth_date: birthDate,
        confirm: opts.confirm === true,
        keep_price: opts.keepPrice === true,
      };
      if (!API_BASE) return demoBirthdate(passengerId, body);
      return request("/api/admin/passengers/" + passengerId + "/birthdate", {
        method: "POST", body: body,
      });
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
          if (filters.status === "cancel_requested") {
            if (!(b.status === "confirmed" && b.cancel_requested_at)) return false;
          } else if (filters.status && b.status !== filters.status) return false;
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

    adminActivity: function (limit) {
      if (!API_BASE) {
        var s = demoState();
        var byId = {};
        var agencies = {};
        s.bookings.forEach(function (b) { byId[b.id] = b; });
        DEMO_AGENCIES.forEach(function (a) { agencies[a.id] = a.name; });
        var list = (s.events || []).filter(function (e) {
          return e.actor_role === "agency" && byId[e.booking_id];
        }).map(function (e) {
          var b = byId[e.booking_id];
          return Object.assign({}, e, {
            booking_code: b.code,
            booking_status: b.status,
            total_price: b.total_price,
            agency_name: agencies[b.agency_id] || e.actor_name || "—",
            departure_code: b.departure_code,
            date_start: b.date_start,
            passengers_count: b.passengers_count,
          });
        }).sort(function (a, b) {
          var ap = a.action === "cancel_requested" && a.booking_status === "confirmed";
          var bp = b.action === "cancel_requested" && b.booking_status === "confirmed";
          if (ap !== bp) return ap ? -1 : 1;
          return b.id - a.id;
        });
        return Promise.resolve(list.slice(0, Math.min(Number(limit) || 50, 100)));
      }
      var size = Math.min(Number(limit) || 50, 100);
      return request("/api/admin/activity?limit=" + encodeURIComponent(size)).catch(function (err) {
        if (!err || err.status !== 404) throw err;

        /* Совместимость со старым воркером во время поэтапного деплоя.
         * Общего маршрута там ещё нет, но журнал каждой брони уже есть.
         * Берём последние 50 броней и собираем их истории параллельно. Кэш
         * короткий: колокольчик опрашивает раз в 30 секунд и должен увидеть
         * новую заявку без обновления страницы. */
        if (activityFallback && Date.now() - activityFallbackAt < 15000) {
          return activityFallback.then(function (list) { return list.slice(0, size); });
        }
        activityFallbackAt = Date.now();
        activityFallback = request("/api/admin/bookings?limit=50").then(function (res) {
          return Promise.all((res.items || []).map(function (b) {
            return request("/api/admin/bookings/" + b.id + "/history")
              .catch(function () { return []; })
              .then(function (events) {
                return events.filter(function (e) { return e.actor_role === "agency"; })
                  .map(function (e, i) {
                    return Object.assign({}, e, {
                      id: String(b.id) + "-" + String(i) + "-" + e.created_at,
                      booking_id: b.id,
                      booking_code: b.code,
                      booking_status: b.status,
                      total_price: b.total_price,
                      agency_name: b.agency_name,
                      departure_code: b.departure_code,
                      date_start: b.date_start,
                      passengers_count: b.passengers_count,
                    });
                  });
              });
          }));
        }).then(function (groups) {
          var list = [].concat.apply([], groups);
          list.sort(function (a, b) {
            var ap = a.action === "cancel_requested" && a.booking_status === "confirmed";
            var bp = b.action === "cancel_requested" && b.booking_status === "confirmed";
            if (ap !== bp) return ap ? -1 : 1;
            return String(b.created_at).localeCompare(String(a.created_at));
          });
          return list;
        });
        return activityFallback.then(function (list) { return list.slice(0, size); });
      });
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
              // В боевой ведомости воркер отдаёт p.id под именем
              // passenger_id — держим то же имя, иначе кнопка правки
              // документа в демо адресовала бы undefined.
              passenger_id: p.id,
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

    /*
     * Проведение оплаты или возврата. opts.allowOverpay — согласие оператора
     * принять сумму больше остатка: сервер первым запросом такую операцию
     * не проводит, а возвращает 409 с расчётом (см. worker/index.js).
     * Блокировать переплату наглухо нельзя — деньги уже на счету.
     */
    addPayment: function (bookingCode, amount, note, opts) {
      opts = opts || {};
      if (!API_BASE) {
        var s = demoState();
        var b = s.bookings.filter(function (x) { return x.code === bookingCode; })[0];
        if (!b || b.status !== "confirmed") {
          return Promise.reject(new Error("Бронь не найдена или отменена"));
        }
        if (b.paid + amount < 0) {
          return Promise.reject(new Error("Возврат больше оплаченного: оплачено " + b.paid));
        }
        // Демо повторяет серверную развилку, иначе подтверждение переплаты
        // нельзя было бы проверить без подключённого бэкенда.
        var bal = Math.round((b.total_price - b.paid) * 100) / 100;
        var over = Math.round((amount - bal) * 100) / 100;
        if (amount > 0 && over > 0.01 && opts.allowOverpay !== true) {
          var e = new Error("Переплата " + over + " USD: остаток по брони " + bal +
            " USD, а вносится " + amount + " USD. Проверьте сумму.");
          e.status = 409;
          e.data = { overpay: true, balance: bal, amount: amount, excess: over };
          return Promise.reject(e);
        }
        b.paid += amount;
        (b.payments = b.payments || []).push({ amount: amount, note: note || null });
        saveDemo(s);
        return Promise.resolve({
          booking_code: bookingCode, paid: b.paid, balance: b.total_price - b.paid,
        });
      }
      return request("/api/admin/payments", {
        method: "POST",
        body: {
          booking_code: bookingCode, amount: amount, note: note,
          allow_overpay: opts.allowOverpay === true,
        },
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
    // Граница «полная оплата / штраф 100%» — читают app.js и catalog.js,
    // чтобы число жило в одном месте, а не в трёх.
    FINAL_DAYS: FINAL_DAYS,
    departureEnd: departureEnd,
    daysUntilDeparture: daysUntilDeparture,
    cancellationPenalty: cancellationPenalty,
    joinName: joinName,
    splitName: splitName,
  };

  global.TuronApi = Api;
})(window);
