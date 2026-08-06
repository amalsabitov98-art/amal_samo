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
   * включительно, одни и те же рейсы на весь сезон. В обоих
   * направлениях: багаж 23 кг и ручная кладь 8 кг. Номера рейсов и
   * время — с настоящих билетов Centrum Air.
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
   * ПОДТВЕРЖДЕНО ВАУЧЕРАМИ ОПЕРАТОРА (Centrum Air / Etihad):
   *   заезд через Батуми (BUS): Batumi View Luxury 4 ночи → Rhisos Gold
   *     Otel Rize 3 ночи;
   *   заезд через Трабзон (TZX): Rhisos Gold Otel Rize 4 ночи → Batumi
   *     View Luxury 3 ночи.
   * Разбивка 4 + 3 одинакова для всех заездов сезона. Номеров с видом
   * подороже оператор не предлагает — тип размещения один.
   */
  var HOTEL_BATUMI = {
    name: "Batumi View Luxury", city: "Батуми", stars: 5,
    board: "Завтраки включены", image: "img/hotel-batumi-view-luxury.webp",
    url: "https://www.booking.com/hotel/ge/batumi-view-luxury.ru.html",
  };
  var HOTEL_RIZE = {
    name: "Rhisos Gold Otel Rize", city: "Ризе", stars: 4,
    board: "Завтраки включены", image: "img/hotel-rhisos-gold-rize.webp",
    url: "https://www.booking.com/hotel/tr/rhisos-gold-otel-rize.ru.html",
  };
  function nights(hotel, n) { return Object.assign({}, hotel, { nights: n }); }

  var HOTELS = {
    BUS: [nights(HOTEL_BATUMI, 4), nights(HOTEL_RIZE, 3)],
    TZX: [nights(HOTEL_RIZE, 4), nights(HOTEL_BATUMI, 3)],
  };

  /*
   * 3. КОНТАКТЫ ОПЕРАТОРА
   * ---------------------
   * Подтверждено: рабочий телефон/Telegram для агентств. Связь с
   * оператором идёт по телефону и в Telegram — переписки внутри
   * кабинета не нужно.
   */
  /* Менеджеров несколько, поэтому список, а не одно поле. Первый в списке
   * считается основным: его телефон стоит в подвале публичной страницы и в
   * ваучере, где место есть ровно под один контакт. Полный список показывает
   * вкладка «Контакты» в кабинете.
   *
   * Telegram есть у обоих: оператор подтвердил, что у Ойбека он на том же
   * номере, поэтому ссылка собрана как t.me/+номер. */
  var MANAGERS = [
    {
      name: "Аскар",
      phone: "+998 99 830 77 11",
      phone_href: "+998998307711",
      telegram_href: "https://t.me/+998998307711",
    },
    {
      name: "Ойбек",
      phone: "+998 97 743 09 09",
      phone_href: "+998977430909",
      telegram_href: "https://t.me/+998977430909",
    },
  ];

  var OPERATOR = {
    name: "Etihad",
    managers: MANAGERS,
    // Основной контакт продублирован плоскими полями: подвал и ваучер
    // читают их напрямую, и разбирать там список незачем. Берётся из
    // MANAGERS[0], чтобы телефон не пришлось править в двух местах.
    contact_name: MANAGERS[0].name,
    phone: MANAGERS[0].phone,
    phone_href: MANAGERS[0].phone_href,
    telegram_href: MANAGERS[0].telegram_href,
    email: "info@turontourism.uz",
    address: "Нурафшон 51",
  };

  /*
   * 4. PDF-ПРОГРАММЫ ТУРА
   * ---------------------
   * Две программы по направлениям (маршруты зеркальные). Файлы лежат на
   * Google Диске оператора — их размер (55 и 39 МБ) слишком велик, чтобы
   * держать в самом сайте. Кнопка «Программа тура» скачивает нужную.
   * ВАЖНО: файлы должны быть открыты «для всех, у кого есть ссылка».
   */
  var PROGRAMS = {
    BUS: { title: "Батуми + Ризе",
           url: "https://drive.google.com/uc?export=download&id=17BS2w_RPpvmGLOvjyfWn2qCllEpaJWOY" },
    TZX: { title: "Ризе + Батуми",
           url: "https://drive.google.com/uc?export=download&id=1MQwAqPMDjkgzSLDA7nvEOnV-IC3DEOU3" },
  };

  /*
   * 5. ДОП. КРОВАТЬ (DBL+1) — ЦЕНА НЕ ПОДТВЕРЖДЕНА
   * ----------------------------------------------
   * Сам тип размещения настоящий: оператор сказал, что в двухместный
   * номер иногда можно поставить дополнительную кровать. А вот тарифа на
   * него в ведомости нет ни у одного заезда, поэтому цена временно
   * приравнена к TRPL («третий в номере») — ближайшему реальному тарифу.
   *
   * Пока цену не подтвердили, в форме брони рядом с суммой висит
   * предупреждение: агент не должен называть клиенту эту цифру как
   * окончательную. Когда цену дадут — правится EXTRA_BED_* в
   * tools/build-seed.py, миграция для боевой базы, и отсюда убирается
   * pricePending.
   */
  var EXTRA_BED = {
    code: "DBLX",
    pricePending: true,
    note: "цена доп. кровати предварительная — уточните у оператора",
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
    EXTRA_BED: EXTRA_BED,
    PROGRAMS: PROGRAMS,

    // «прилёт Батуми · вылет Трабзон» — чтобы зеркальность была видна
    // в интерфейсе, а не только в коде.
    routeLabel: function (transport) {
      var r = ROUTES[transport];
      return r ? r.label : null;
    },

    // PDF-программа под направление заезда (Батуми+Ризе / Ризе+Батуми).
    programFor: function (departure) {
      return PROGRAMS[departure.transport] || null;
    },

    isScheduledDate: isScheduledDate,

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
