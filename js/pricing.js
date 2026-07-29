/*
 * Общая логика расчёта цены тура. Используется страницей поиска (для
 * "цена от") и карточкой тура/бронирования (для live-пересчёта).
 */
(function (global) {
  "use strict";

  // Целые суммы показываем без копеек, дробные (например, тариф страховки
  // 2.5 в день) — с двумя знаками, иначе округление врёт клиенту о цене.
  function formatMoney(amount, currency) {
    currency = currency || "USD";
    var symbols = { USD: "$", EUR: "€", RUB: "₽", AED: "AED " };
    var sym = symbols[currency] || currency + " ";
    var isWhole = Math.abs(amount - Math.round(amount)) < 0.005;
    return sym + amount.toLocaleString("ru-RU", {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: isWhole ? 0 : 2,
    });
  }

  // Минимальная цена за человека по всему тур-матриксу (для карточки поиска)
  function minPricePerPerson(tour) {
    var min = Infinity;
    Object.keys(tour.price_matrix || {}).forEach(function (category) {
      var byRoom = tour.price_matrix[category];
      Object.keys(byRoom).forEach(function (roomType) {
        var bySeason = byRoom[roomType];
        Object.keys(bySeason).forEach(function (season) {
          if (bySeason[season] < min) min = bySeason[season];
        });
      });
    });
    return min === Infinity ? null : min;
  }

  function pricePerPerson(tour, hotelCategory, roomType, seasonCode) {
    var byCategory = tour.price_matrix && tour.price_matrix[hotelCategory];
    var byRoom = byCategory && byCategory[roomType];
    var price = byRoom && byRoom[seasonCode];
    return typeof price === "number" ? price : null;
  }

  // Итоговый расчёт бронирования: база (проживание) * туристов +
  // доп.услуги/модули (выбранные, за человека) + страховка (за
  // человека за день тура).
  function calculateTotal(opts) {
    var tour = opts.tour;
    var hotelCategory = opts.hotelCategory;
    var roomType = opts.roomType;
    var seasonCode = opts.seasonCode;
    var travelersCount = opts.travelersCount || 1;
    var selectedExcursionIds = opts.selectedExcursionIds || [];
    var allExcursions = opts.allExcursions || [];
    var selectedModuleIds = opts.selectedModuleIds || [];
    var insurancePlan = opts.insurancePlan || null;

    // Если в матрице нет такой комбинации (категория × размещение × сезон),
    // считать базу нулём нельзя — иначе клиент увидит цену только за
    // допуслуги и решит, что тур стоит $200. Отдаём флаг наверх, чтобы UI
    // показал «цена по запросу» и не дал отправить заявку.
    var base = pricePerPerson(tour, hotelCategory, roomType, seasonCode);
    var priceAvailable = base !== null;
    var baseTotal = (base || 0) * travelersCount;

    var excursionsTotal = 0;
    selectedExcursionIds.forEach(function (id) {
      var ex = allExcursions.filter(function (e) { return e.id === id; })[0];
      if (ex) excursionsTotal += ex.price_per_person * travelersCount;
    });

    var modulesTotal = 0;
    (tour.optional_modules || []).forEach(function (mod) {
      if (selectedModuleIds.indexOf(mod.id) !== -1) {
        modulesTotal += mod.price_per_person * travelersCount;
      }
    });

    var insuranceTotal = 0;
    if (insurancePlan) {
      insuranceTotal = insurancePlan.price_per_person_per_day * tour.duration_days * travelersCount;
    }

    return {
      priceAvailable: priceAvailable,
      base: baseTotal,
      excursions: excursionsTotal,
      modules: modulesTotal,
      insurance: insuranceTotal,
      total: baseTotal + excursionsTotal + modulesTotal + insuranceTotal,
    };
  }

  global.TourPricing = {
    formatMoney: formatMoney,
    minPricePerPerson: minPricePerPerson,
    pricePerPerson: pricePerPerson,
    calculateTotal: calculateTotal,
  };
})(window);
