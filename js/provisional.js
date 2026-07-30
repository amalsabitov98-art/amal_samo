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
   * Основание: четыре настоящих билета Centrum Air на заезд 31.07.2026
   * (TAS→TZX C63309, TZX→TAS C63310, TAS→BUS C6225, BUS→TAS C6226).
   *
   * ДОПУЩЕНИЕ: рейсы и время одинаковы для всех заездов через тот же
   * аэропорт. Реально расписание может меняться от даты к дате.
   *
   * ЧТО УТОЧНИТЬ У ОПЕРАТОРА: рейсы и время по каждому из 15 заездов.
   * Если расписание правда одно на весь сезон — достаточно подтвердить.
   *
   * day_offset — на сколько суток позже даты возврата вылетает рейс.
   * У Батуми обратный рейс в 00:20, то есть уже следующей ночью.
   */
  var FLIGHTS = {
    TZX: {
      out: {
        code: "C63309", carrier: "Centrum Air", aircraft: "A321-251N",
        from: "TAS", from_city: "Ташкент", to: "TZX", to_city: "Трабзон",
        dep: "14:30", arr: "16:20", duration: "3 ч 50 мин",
        baggage: "20 кг", day_offset: 0,
      },
      back: {
        code: "C63310", carrier: "Centrum Air", aircraft: "A321-251N",
        from: "TZX", from_city: "Трабзон", to: "TAS", to_city: "Ташкент",
        dep: "17:20", arr: "22:20", duration: "3 ч",
        baggage: "20 кг", day_offset: 0,
      },
    },
    BUS: {
      out: {
        code: "C6225", carrier: "Centrum Air", aircraft: "A320-233",
        from: "TAS", from_city: "Ташкент", to: "BUS", to_city: "Батуми",
        dep: "20:50", arr: "23:20", duration: "3 ч 30 мин",
        baggage: "23 кг", day_offset: 0,
      },
      back: {
        code: "C6226", carrier: "Centrum Air", aircraft: "A320-233",
        from: "BUS", from_city: "Батуми", to: "TAS", to_city: "Ташкент",
        dep: "00:20", arr: "04:20", duration: "3 ч",
        baggage: "23 кг", day_offset: 1,
      },
    },
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

  global.TuronProvisional = {
    FLIGHTS: FLIGHTS,
    HOTELS: HOTELS,
    OPERATOR: OPERATOR,

    // Рейсы заезда с посчитанными датами вылета и возврата.
    flightsFor: function (departure) {
      var set = FLIGHTS[departure.transport];
      if (!set) return null;
      var back = TuronApi.departureEnd(departure.date_start, departure.nights);
      function shift(iso, days) {
        if (!iso) return null;
        var d = new Date(iso + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
      }
      return {
        out: Object.assign({}, set.out, {
          date: shift(departure.date_start, set.out.day_offset),
        }),
        back: Object.assign({}, set.back, {
          date: shift(back, set.back.day_offset),
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
