(function () {
  "use strict";

  var toursGrid = document.getElementById("tours-grid");
  var excursionsGrid = document.getElementById("excursions-grid");
  var form = document.getElementById("search-form");
  var countrySelect = document.getElementById("f-country");
  var queryInput = document.getElementById("f-query");
  var dateInput = document.getElementById("f-date");
  var tabs = document.querySelectorAll(".tt-tab");
  var panels = { tours: document.getElementById("panel-tours"), excursions: document.getElementById("panel-excursions") };

  function tourCardHtml(tour) {
    var minPrice = TourPricing.minPricePerPerson(tour);
    var priceHtml = minPrice
      ? TourPricing.formatMoney(minPrice) + " <small>/ чел.</small>"
      : "цена по запросу";
    var badge = tour.is_constructor ? "Тур-конструктор" : "Групповой заезд";
    return (
      '<article class="tt-card">' +
        '<div class="tt-card-cover">' + tour.cities.join(" · ") + "</div>" +
        '<div class="tt-card-body">' +
          '<span class="tt-badge">' + badge + "</span>" +
          '<div class="tt-card-title">' + tour.title + "</div>" +
          '<div class="tt-card-meta">' + tour.duration_days + " дней / " + tour.duration_nights + " ночей &middot; " + tour.country + "</div>" +
          '<div class="tt-card-desc">' + tour.short_description + "</div>" +
          '<div class="tt-card-price">' + priceHtml + "</div>" +
        "</div>" +
        '<div class="tt-card-footer">' +
          '<a class="tt-btn" style="display:block;text-align:center;text-decoration:none" href="tour.html?slug=' + encodeURIComponent(tour.slug) + '">Подробнее</a>' +
        "</div>" +
      "</article>"
    );
  }

  function excursionCardHtml(ex) {
    return (
      '<article class="tt-card">' +
        '<div class="tt-card-cover">Экскурсия</div>' +
        '<div class="tt-card-body">' +
          '<div class="tt-card-title">' + ex.title + "</div>" +
          '<div class="tt-card-meta">' + ex.duration_hours + " ч &middot; мин. группа " + ex.min_group + " чел.</div>" +
          '<div class="tt-card-desc">' + ex.description + "</div>" +
          '<div class="tt-card-price">' + TourPricing.formatMoney(ex.price_per_person) + " <small>/ чел.</small></div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderTours(list) {
    if (!list.length) {
      toursGrid.innerHTML = '<div class="tt-empty-state">Ничего не найдено. Попробуйте изменить параметры поиска.</div>';
      return;
    }
    toursGrid.innerHTML = list.map(tourCardHtml).join("");
  }

  function renderExcursions(list) {
    excursionsGrid.innerHTML = list.map(excursionCardHtml).join("");
  }

  function runSearch() {
    TourData.getTours({
      query: queryInput.value.trim(),
      country: countrySelect.value,
      dateFrom: dateInput.value,
    }).then(renderTours);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    runSearch();
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("is-active"); });
      tab.classList.add("is-active");
      Object.keys(panels).forEach(function (key) {
        panels[key].hidden = key !== tab.dataset.tab;
      });
    });
  });

  TourData.getCountries().then(function (countries) {
    countries.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      countrySelect.appendChild(opt);
    });
  });

  TourData.getAllExcursions().then(renderExcursions);
  runSearch();
})();
