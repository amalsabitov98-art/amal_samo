/*
 * Общая логика расчёта цены тура. Используется страницей поиска (для
 * "цена от") и карточкой тура/бронирования (для live-пересчёта).
 */
(function (global) {
  "use strict";

  function formatMoney(amount, currency) {
    currency = currency || "USD";
    var symbols = { USD: "$", EUR: "€", RUB: "₽", AED: "AED " };
    var sym = symbols[currency] || currency + " ";
    return sym + Math.round(amount).toLocaleString("ru-RU");
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

    var base = pricePerPerson(tour, hotelCategory, roomType, seasonCode) || 0;
    var baseTotal = base * travelersCount;

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
