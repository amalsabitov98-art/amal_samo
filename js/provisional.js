/*
 * ПРЕДВАРИТЕЛЬНЫЕ ДАННЫЕ — ОДИН ФАЙЛ НА ВСЕ ДОПУЩЕНИЯ
 * ===================================================
 *
 * Здесь лежит всё, что интерфейс показывает, но оператор ещё не
 * подтвердил. Собрано в одном месте намеренно: чтобы отделу не пришлось
 * искать по коду, где именно поправить.
 *
 * Всё, что отсюда рисуется, помечено в интерфейсе плашкой
 * «Предварительные данные» — агент видит, что цифры не окончательные.
 *
 * Что НЕ отсюда (это подтверждённые данные, менять не здесь):
 *   - цены, места, даты заездов      → seed/departures.json (из ведомости)
 *   - программа тура, включено/нет   → tools/build-seed.py, TOUR_CONTENT
 *   - комиссии агентств              → tools/build-seed.py, TOURS
 */
(function (global) {
  "use strict";

  /*
   * 1. РЕЙСЫ
   * --------
   * ВАЖНО: у Карадениза маршрут зеркальный — прилетают в один город, а
   * улетают из другого. Код заезда (TZX.../BUS...) — это аэропорт
   * ПРИЛЁТА; обратный рейс всегда из ВТОРОГО аэропорта:
   *
   *   заезд BUS...  прилёт Батуми  →  обратно из Трабзона (TZX → TAS)
   *   заезд TZX...  прилёт Трабзон →  обратно из Батуми   (BUS → TAS)
   *
   * Основание: четыре настоящих билета Centrum Air на заезд 31.07.2026.
   * Если разложить их по этому правилу, всё сходится:
   *   группа с прилётом в Батуми: TAS→BUS 31.07, обратно TZX→TAS 07.08
   *   группа с прилётом в Трабзон: TAS→TZX 31.07, обратно BUS→TAS 08.08
   *
   * ПОДТВЕРЖДЕНО ОПЕРАТОРОМ: вылеты каждую пятницу по 11.09.2026
   * включительно. В обоих направлениях: багаж 23 кг и ручная кладь 8 кг.
   *
   * ДОПУЩЕНИЕ: номера рейсов и время одинаковы для всех дат сезона.
   * ЧТО УТОЧНИТЬ: номера рейсов и время по каждому заезду.
   *
   * day_offset — на сколько суток позже даты возврата вылетает рейс.
   * Рейс из Батуми в 00:20 уходит уже следующей ночью, отсюда +1.
   */

  // Плечи перелёта, ключ — «откуда-куда». Взяты с билетов как есть.
  var LEGS = {
    "TAS-TZX": {
      code: "C63309", carrier: "Centrum Air", aircraft: "A321-251N",
      from: "TAS", from_city: "Ташкент", to: "TZX", to_city: "Трабзон",
      dep: "14:30", arr: "16:20", duration: "3 ч 50 мин",
      baggage: "23 кг", cabin_baggage: "8 кг", day_offset: 0,
    },
    "TZX-TAS": {
      code: "C63310", carrier: "Centrum Air", aircraft: "A321-251N",
      from: "TZX", from_city: "Трабзон", to: "TAS", to_city: "Ташкент",
      dep: "17:20", arr: "22:20", duration: "3 ч",
      baggage: "23 кг", cabin_baggage: "8 кг", day_offset: 0,
    },
    "TAS-BUS": {
      code: "C6225", carrier: "Centrum Air", aircraft: "A320-233",
      from: "TAS", from_city: "Ташкент", to: "BUS", to_city: "Батуми",
      dep: "20:50", arr: "23:20", duration: "3 ч 30 мин",
      baggage: "23 кг", cabin_baggage: "8 кг", day_offset: 0,
    },
    "BUS-TAS": {
      code: "C6226", carrier: "Centrum Air", aircraft: "A320-233",
      from: "BUS", from_city: "Батуми", to: "TAS", to_city: "Ташкент",
      dep: "00:20", arr: "04:20", duration: "3 ч",
      baggage: "23 кг", cabin_baggage: "8 кг", day_offset: 1,
    },
  };

  // Подтверждённое окно полётной программы: еженедельно по пятницам.
  var SCHEDULE = {
    weekday: 5,
    weekday_label: "каждую пятницу",
    season_end: "2026-09-11",
    season_end_label: "11 сентября 2026",
  };

  function isScheduledDate(iso) {
    if (!iso || iso > SCHEDULE.season_end) return false;
    return new Date(iso + "T00:00:00Z").getUTCDay() === SCHEDULE.weekday;
  }

  /*
   * Маршрут заезда: куда прилетают и откуда улетают. Ключ — transport
   * заезда из базы. Именно здесь задаётся зеркальность: раньше код брал
   * один и тот же аэропорт на оба перелёта, и обратный рейс уходил не
   * из того города.
   */
  var ROUTES = {
    BUS: { arrival: "BUS", departure: "TZX",
           label: "прилёт Батуми · вылет Трабзон" },
    TZX: { arrival: "TZX", departure: "BUS",
           label: "прилёт Трабзон · вылет Батуми" },
  };

  /*
   * 2. ОТЕЛИ И НОЧИ
   * ---------------
   * Основание: karadeniz-tour-info.md — Batumi View Luxury 03.07–07.07
   * (4 ночи) и Rhisos Gold Otel Rize 07.07–10.07 (3 ночи), плюс порядок
   * дней в программе каждого варианта маршрута.
   *
   * ДОПУЩЕНИЕ: у заезда через Батуми сначала Батуми (4 ночи), потом Ризе
   * (3); у заезда через Трабзон — наоборот. Разбивка одинакова для всех
   * заездов.
   *
   * ЧТО УТОЧНИТЬ: сколько ночей в каком отеле по каждому заезду и не
   * меняется ли отель от даты к дате.
   */
  var HOTELS = {
    BUS: [
      { name: "Batumi View Luxury", city: "Батуми", stars: 5, nights: 4,
        board: "Завтраки включены", image: "img/hotel-batumi-view-luxury.webp" },
      { name: "Rhisos Gold Otel Rize", city: "Ризе", stars: 4, nights: 3,
        board: "Завтраки включены", image: "img/hotel-rhisos-gold-rize.webp" },
    ],
    TZX: [
      { name: "Rhisos Gold Otel Rize", city: "Ризе", stars: 4, nights: 4,
        board: "Завтраки включены", image: "img/hotel-rhisos-gold-rize.webp" },
      { name: "Batumi View Luxury", city: "Батуми", stars: 5, nights: 3,
        board: "Завтраки включены", image: "img/hotel-batumi-view-luxury.webp" },
    ],
  };

  /*
   * 3. КОНТАКТЫ ОПЕРАТОРА
   * ---------------------
   * Основание: агентский блок в электронных билетах Centrum Air.
   * ЧТО УТОЧНИТЬ: телефон и почта для агентств — те же или отдельные.
   */
  var OPERATOR = {
    name: "Turon Tourism",
    phone: "+998 71 200-09-09",
    phone_href: "+998712000909",
    email: "info@turontourism.uz",
    address: "Ташкент, Алмазарский район, ул. Нурафшон, 51",
  };

  function shiftDate(iso, days) {
    if (!iso) return null;
    var d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  global.TuronProvisional = {
    LEGS: LEGS,
    SCHEDULE: SCHEDULE,
    ROUTES: ROUTES,
    HOTELS: HOTELS,
    OPERATOR: OPERATOR,

    // «прилёт Батуми · вылет Трабзон» — чтобы зеркальность была видна
    // в интерфейсе, а не только в коде.
    routeLabel: function (transport) {
      var r = ROUTES[transport];
      return r ? r.label : null;
    },

    isScheduledDate: isScheduledDate,

    flightNoteHtml: function () {
      return '<p class="tt-provisional"><strong>Подтверждено:</strong> рейсы ' +
        SCHEDULE.weekday_label + ' по ' + SCHEDULE.season_end_label +
        ' включительно · багаж 23 кг · ручная кладь 8 кг. ' +
        'Номера и время рейсов пока предварительные.</p>';
    },

    /*
     * Рейсы заезда с посчитанными датами. Туда — в аэропорт прилёта,
     * обратно — из аэропорта вылета, а это разные города.
     */
    flightsFor: function (departure) {
      if (!isScheduledDate(departure.date_start)) return null;
      var route = ROUTES[departure.transport];
      if (!route) return null;
      var out = LEGS["TAS-" + route.arrival];
      var back = LEGS[route.departure + "-TAS"];
      if (!out || !back) return null;

      var endDate = TuronApi.departureEnd(departure.date_start, departure.nights);
      return {
        out: Object.assign({}, out, {
          date: shiftDate(departure.date_start, out.day_offset),
        }),
        back: Object.assign({}, back, {
          date: shiftDate(endDate, back.day_offset),
        }),
      };
    },

    hotelsFor: function (departure) {
      return (HOTELS[departure.transport] || []).slice();
    },

    // Плашка «данные не подтверждены» — ставится рядом с такими блоками.
    noteHtml: function (what) {
      return '<p class="tt-provisional">Предварительные данные' +
        (what ? ": " + what : "") +
        ". Оператор ещё не подтвердил — уточните перед выдачей клиенту.</p>";
    },
  };
})(window);
