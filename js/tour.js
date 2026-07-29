(function () {
  "use strict";

  var content = document.getElementById("tour-content");

  var state = {
    tour: null,
    excursions: [],
    insurancePlans: [],
    departureIndex: 0,
    hotelCategory: null,
    roomType: "DBL",
    travelersCount: 2,
    selectedExcursionIds: [],
    selectedModuleIds: [],
    insurancePlanId: "",
  };

  function qs(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function dayListHtml(program) {
    return program.map(function (d) {
      return (
        '<div class="tt-day-item">' +
          '<div class="tt-day-num">' + d.day + "</div>" +
          '<div>' +
            '<div class="tt-day-title">' + d.title + "</div>" +
            '<div class="tt-day-desc">' + d.description + "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function listHtml(className, items) {
    return '<ul class="' + className + '">' + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>";
  }

  function departureLabel(dep) {
    var opts = { day: "2-digit", month: "short" };
    var start = new Date(dep.date_start).toLocaleDateString("ru-RU", opts);
    var end = new Date(dep.date_end).toLocaleDateString("ru-RU", opts);
    return start + " — " + end;
  }

  function optionsForDepartures(tour) {
    return tour.departures.map(function (dep, i) {
      return '<option value="' + i + '">' + departureLabel(dep) + "</option>";
    }).join("");
  }

  function optionsForHotels(tour) {
    return tour.hotels.map(function (h) {
      return '<option value="' + h.category + '">' + TourData.HOTEL_CATEGORIES[h.category] + " — " + h.name + "</option>";
    }).join("");
  }

  function optionsForRoomTypes() {
    return Object.keys(TourData.ROOM_TYPES).map(function (code) {
      return '<option value="' + code + '">' + TourData.ROOM_TYPES[code] + "</option>";
    }).join("");
  }

  function excursionsOrModulesHtml(tour, excursions) {
    if (tour.is_constructor && tour.optional_modules && tour.optional_modules.length) {
      var modulesRows = tour.optional_modules.map(function (mod) {
        return (
          '<label class="tt-option-row">' +
            '<input type="checkbox" data-role="module" value="' + mod.id + '" />' +
            '<span>' +
              '<div class="tt-option-title">' + mod.title + "</div>" +
              '<div class="tt-option-desc">Мин. группа: ' + mod.min_group + " чел.</div>" +
            "</span>" +
            '<span class="tt-option-price">' + TourPricing.formatMoney(mod.price_per_person) + " / чел.</span>" +
          "</label>"
        );
      }).join("");
      return '<section class="tt-section"><h2>Модули тур-конструктора</h2>' + modulesRows + "</section>";
    }
    if (excursions.length) {
      var rows = excursions.map(function (ex) {
        return (
          '<label class="tt-option-row">' +
            '<input type="checkbox" data-role="excursion" value="' + ex.id + '" />' +
            '<span>' +
              '<div class="tt-option-title">' + ex.title + "</div>" +
              '<div class="tt-option-desc">' + ex.description + " &middot; мин. группа " + ex.min_group + " чел.</div>" +
            "</span>" +
            '<span class="tt-option-price">' + TourPricing.formatMoney(ex.price_per_person) + " / чел.</span>" +
          "</label>"
        );
      }).join("");
      return '<section class="tt-section"><h2>Дополнительные экскурсии</h2>' + rows + "</section>";
    }
    return "";
  }

  function insuranceHtml(plans) {
    var rows = plans.map(function (p) {
      return (
        '<label class="tt-option-row">' +
          '<input type="radio" name="insurance" data-role="insurance" value="' + p.id + '" />' +
          '<span>' +
            '<div class="tt-option-title">' + p.title + "</div>" +
            '<div class="tt-option-desc">Покрытие ' + p.coverage + "</div>" +
          "</span>" +
          '<span class="tt-option-price">' + TourPricing.formatMoney(p.price_per_person_per_day) + " / чел. в день</span>" +
        "</label>"
      );
    }).join("");
    rows += (
      '<label class="tt-option-row">' +
        '<input type="radio" name="insurance" data-role="insurance" value="" checked />' +
        '<span><div class="tt-option-title">Без страховки</div></span>' +
      "</label>"
    );
    return '<section class="tt-section"><h2>Медицинская страховка</h2>' + rows + "</section>";
  }

  function renderPage() {
    var tour = state.tour;
    var badge = tour.is_constructor ? "Тур-конструктор" : "Групповой заезд";

    content.innerHTML =
      '<div class="tt-tour-hero">' +
        '<span class="tt-badge">' + badge + "</span>" +
        "<h1>" + tour.title + "</h1>" +
        '<div class="tt-card-meta">' + tour.cities.join(" · ") + " &middot; " + tour.duration_days + " дней / " + tour.duration_nights + " ночей</div>" +
        "<p>" + tour.short_description + "</p>" +
      "</div>" +
      '<div class="tt-layout">' +
        '<div class="tt-main-col">' +
          '<section class="tt-section"><h2>Программа по дням</h2>' + dayListHtml(tour.program) + "</section>" +
          '<section class="tt-section"><h2>Проживание</h2><ul class="tt-list-check">' +
            tour.hotels.map(function (h) { return "<li>" + TourData.HOTEL_CATEGORIES[h.category] + ": " + h.name + "</li>"; }).join("") +
          "</ul></section>" +
          '<div class="tt-two-col">' +
            '<section class="tt-section"><h2>Включено</h2>' + listHtml("tt-list-check", tour.included) + "</section>" +
            '<section class="tt-section"><h2>Не включено</h2>' + listHtml("tt-list-cross", tour.excluded) + "</section>" +
          "</div>" +
          '<section class="tt-section"><h2>Документы для визы</h2>' + listHtml("tt-list-check", tour.visa_documents) + "</section>" +
          excursionsOrModulesHtml(tour, state.excursions) +
          insuranceHtml(state.insurancePlans) +
          '<section class="tt-section" id="booking-section"><h2>Данные туристов</h2><div id="travelers-list"></div>' +
            '<div class="tt-field-full"><label>Имя контактного лица</label><input type="text" id="contact-name" placeholder="Как к вам обращаться" /></div>' +
            '<div class="tt-form-grid">' +
              '<div><label>Телефон</label><input type="tel" id="contact-phone" placeholder="+998 90 123 45 67" /></div>' +
              '<div><label>Email</label><input type="email" id="contact-email" placeholder="you@example.com" /></div>' +
            "</div>" +
            '<button class="tt-btn" id="submit-booking" style="margin-top:14px">Отправить заявку</button>' +
            '<div id="booking-result"></div>' +
          "</section>" +
        "</div>" +
        '<aside class="tt-sidebar">' +
          '<div class="tt-price-box">' +
            '<div class="tt-field"><label>Дата заезда</label><select id="sel-departure">' + optionsForDepartures(tour) + "</select></div>" +
            '<div class="tt-field"><label>Категория отеля</label><select id="sel-hotel">' + optionsForHotels(tour) + "</select></div>" +
            '<div class="tt-field"><label>Тип размещения</label><select id="sel-room">' + optionsForRoomTypes() + "</select></div>" +
            '<div class="tt-field"><label>Туристов</label>' +
              '<div class="tt-stepper"><button type="button" id="travelers-minus">−</button><span id="travelers-count">2</span><button type="button" id="travelers-plus">+</button></div>' +
            "</div>" +
            '<div id="price-breakdown" style="margin-top:14px"></div>' +
          "</div>" +
        "</aside>" +
      "</div>";

    // Defaults
    state.hotelCategory = tour.hotels[0].category;
    document.getElementById("sel-room").value = state.roomType;

    bindEvents();
    renderTravelerForms();
    updatePriceBox();
  }

  function currentSeasonCode() {
    return state.tour.departures[state.departureIndex].season_code;
  }

  function updatePriceBox() {
    var breakdown = TourPricing.calculateTotal({
      tour: state.tour,
      hotelCategory: state.hotelCategory,
      roomType: state.roomType,
      seasonCode: currentSeasonCode(),
      travelersCount: state.travelersCount,
      selectedExcursionIds: state.selectedExcursionIds,
      allExcursions: state.excursions,
      selectedModuleIds: state.selectedModuleIds,
      insurancePlan: state.insurancePlans.filter(function (p) { return p.id === state.insurancePlanId; })[0] || null,
    });

    var submitBtn = document.getElementById("submit-booking");

    if (!breakdown.priceAvailable) {
      document.getElementById("price-breakdown").innerHTML =
        '<div class="tt-price-total"><span>Цена</span><span>по запросу</span></div>' +
        '<p class="tt-muted-note">Для этой комбинации даты, категории отеля и размещения ' +
        "цена не задана. Свяжитесь с менеджером — рассчитаем индивидуально.</p>";
      if (submitBtn) submitBtn.disabled = true;
      return;
    }
    if (submitBtn) submitBtn.disabled = false;

    var rows = "";
    rows += '<div class="tt-price-row"><span>Проживание (' + state.travelersCount + ' чел.)</span><span>' + TourPricing.formatMoney(breakdown.base) + "</span></div>";
    if (breakdown.excursions > 0) rows += '<div class="tt-price-row"><span>Экскурсии</span><span>' + TourPricing.formatMoney(breakdown.excursions) + "</span></div>";
    if (breakdown.modules > 0) rows += '<div class="tt-price-row"><span>Модули</span><span>' + TourPricing.formatMoney(breakdown.modules) + "</span></div>";
    if (breakdown.insurance > 0) rows += '<div class="tt-price-row"><span>Страховка</span><span>' + TourPricing.formatMoney(breakdown.insurance) + "</span></div>";
    rows += '<div class="tt-price-total"><span>Итого</span><span>' + TourPricing.formatMoney(breakdown.total) + "</span></div>";

    document.getElementById("price-breakdown").innerHTML = rows;
  }

  function travelerCardHtml(index) {
    return (
      '<div class="tt-traveler-card" data-traveler="' + index + '">' +
        "<h3>Турист " + (index + 1) + "</h3>" +
        '<div class="tt-form-grid">' +
          '<div><label>ФИО (как в паспорте)</label><input type="text" data-field="full_name" /></div>' +
          '<div><label>Гражданство</label><input type="text" data-field="citizenship" /></div>' +
          '<div><label>Дата рождения</label><input type="date" data-field="dob" /></div>' +
          '<div><label>Номер загранпаспорта</label><input type="text" data-field="passport_number" /></div>' +
          '<div><label>Срок действия паспорта</label><input type="date" data-field="passport_expiry" /></div>' +
        "</div>" +
      "</div>"
    );
  }

  function renderTravelerForms() {
    var list = document.getElementById("travelers-list");
    var existing = {};
    list.querySelectorAll(".tt-traveler-card").forEach(function (card) {
      var idx = card.dataset.traveler;
      var data = {};
      card.querySelectorAll("[data-field]").forEach(function (input) {
        data[input.dataset.field] = input.value;
      });
      existing[idx] = data;
    });

    var html = "";
    for (var i = 0; i < state.travelersCount; i++) html += travelerCardHtml(i);
    list.innerHTML = html;

    // restore values that survive a resize of the travelers list
    Object.keys(existing).forEach(function (idx) {
      var card = list.querySelector('[data-traveler="' + idx + '"]');
      if (!card) return;
      Object.keys(existing[idx]).forEach(function (field) {
        var input = card.querySelector('[data-field="' + field + '"]');
        if (input) input.value = existing[idx][field];
      });
    });
  }

  function collectTravelers() {
    var cards = document.querySelectorAll("#travelers-list .tt-traveler-card");
    var travelers = [];
    cards.forEach(function (card) {
      var t = {};
      card.querySelectorAll("[data-field]").forEach(function (input) {
        t[input.dataset.field] = input.value.trim();
      });
      travelers.push(t);
    });
    return travelers;
  }

  function bindEvents() {
    document.getElementById("sel-departure").addEventListener("change", function (e) {
      state.departureIndex = Number(e.target.value);
      updatePriceBox();
    });
    document.getElementById("sel-hotel").addEventListener("change", function (e) {
      state.hotelCategory = e.target.value;
      updatePriceBox();
    });
    document.getElementById("sel-room").addEventListener("change", function (e) {
      state.roomType = e.target.value;
      updatePriceBox();
    });
    document.getElementById("travelers-minus").addEventListener("click", function () {
      if (state.travelersCount > 1) state.travelersCount--;
      document.getElementById("travelers-count").textContent = state.travelersCount;
      renderTravelerForms();
      updatePriceBox();
    });
    document.getElementById("travelers-plus").addEventListener("click", function () {
      if (state.travelersCount < 10) state.travelersCount++;
      document.getElementById("travelers-count").textContent = state.travelersCount;
      renderTravelerForms();
      updatePriceBox();
    });

    content.addEventListener("change", function (e) {
      var role = e.target.dataset.role;
      if (role === "excursion") {
        var id = e.target.value;
        var idx = state.selectedExcursionIds.indexOf(id);
        if (e.target.checked && idx === -1) state.selectedExcursionIds.push(id);
        if (!e.target.checked && idx !== -1) state.selectedExcursionIds.splice(idx, 1);
        updatePriceBox();
      }
      if (role === "module") {
        var mid = e.target.value;
        var midx = state.selectedModuleIds.indexOf(mid);
        if (e.target.checked && midx === -1) state.selectedModuleIds.push(mid);
        if (!e.target.checked && midx !== -1) state.selectedModuleIds.splice(midx, 1);
        updatePriceBox();
      }
      if (role === "insurance") {
        state.insurancePlanId = e.target.value;
        updatePriceBox();
      }
    });

    document.getElementById("submit-booking").addEventListener("click", onSubmitBooking);
  }

  function onSubmitBooking() {
    var travelers = collectTravelers();
    var incomplete = travelers.some(function (t) { return !t.full_name || !t.citizenship || !t.passport_number; });
    var contactName = document.getElementById("contact-name").value.trim();
    var contactPhone = document.getElementById("contact-phone").value.trim();
    var resultBox = document.getElementById("booking-result");

    if (incomplete || !contactName || !contactPhone) {
      resultBox.innerHTML = '<p class="tt-muted-note" style="color:#b5453a">Заполните ФИО, гражданство и номер паспорта для каждого туриста, а также имя и телефон контактного лица.</p>';
      return;
    }

    var breakdown = TourPricing.calculateTotal({
      tour: state.tour,
      hotelCategory: state.hotelCategory,
      roomType: state.roomType,
      seasonCode: currentSeasonCode(),
      travelersCount: state.travelersCount,
      selectedExcursionIds: state.selectedExcursionIds,
      allExcursions: state.excursions,
      selectedModuleIds: state.selectedModuleIds,
      insurancePlan: state.insurancePlans.filter(function (p) { return p.id === state.insurancePlanId; })[0] || null,
    });

    var booking = {
      tour_id: state.tour.id,
      tour_title: state.tour.title,
      departure: state.tour.departures[state.departureIndex],
      hotel_category: state.hotelCategory,
      room_type: state.roomType,
      travelers: travelers,
      selected_excursion_ids: state.selectedExcursionIds.slice(),
      selected_module_ids: state.selectedModuleIds.slice(),
      insurance_plan_id: state.insurancePlanId || null,
      total_price: breakdown.total,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: document.getElementById("contact-email").value.trim(),
    };

    document.getElementById("submit-booking").disabled = true;
    TourData.submitBooking(booking).then(function (saved) {
      resultBox.innerHTML =
        '<div class="tt-success-box">' +
          "<h2>Заявка отправлена!</h2>" +
          "<p>Номер заявки: <strong>" + saved.booking_id + "</strong></p>" +
          "<p>Итоговая сумма: <strong>" + TourPricing.formatMoney(saved.total_price) + "</strong></p>" +
          "<p>Менеджер свяжется с вами по телефону " + saved.contact_phone + " для подтверждения.</p>" +
        "</div>";
    }).catch(function () {
      document.getElementById("submit-booking").disabled = false;
      resultBox.innerHTML = '<p class="tt-muted-note" style="color:#b5453a">Не удалось отправить заявку, попробуйте ещё раз.</p>';
    });
  }

  function init() {
    var slug = qs("slug");
    if (!slug) {
      content.innerHTML = '<div class="tt-empty-state">Тур не указан.</div>';
      return;
    }
    Promise.all([
      TourData.getTourBySlug(slug),
      TourData.getInsurancePlans(),
    ]).then(function (res) {
      var tour = res[0];
      state.insurancePlans = res[1];
      if (!tour) {
        content.innerHTML = '<div class="tt-empty-state">Тур не найден.</div>';
        return;
      }
      state.tour = tour;
      return TourData.getExcursionsByIds(tour.excursion_ids || []).then(function (excursions) {
        state.excursions = excursions;
        renderPage();
      });
    }).catch(function (err) {
      content.innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить данные тура.' +
        '<div class="tt-muted-note">' + (err && err.message ? err.message : "Проверьте соединение и обновите страницу.") + "</div></div>";
    });
  }

  init();
})();
