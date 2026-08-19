/*
 * Экраны туроператора. Подключается всегда, но включается только для
 * учётной записи с ролью operator — агентство этих вкладок не видит,
 * и сервер всё равно отдаст 403 на /api/admin/*.
 *
 * Главное здесь — выгрузка списка пассажиров заезда: колонки повторяют
 * исходную ведомость, чтобы её можно было перестать вести руками.
 */
(function (global) {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    departures: [], current: null, agencies: [], selectedDeparture: null,
    departureFilter: "", showPast: false, page: 0, pageSize: 20, total: 0,
    // «Обзор» и статистика агентств считаются из одного и того же среза
    // подтверждённых броней — второй запрос не нужен. AGGREGATE_LIMIT это
    // потолок сервера (200): при большем количестве броней сводка станет
    // неполной, и это явно подписывается на экране, а не замалчивается.
    confirmedAll: [], confirmedTotal: 0,
  };
  var AGGREGATE_LIMIT = 200;

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Авиа · Батуми" };

  function money(v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return "$" + v.toLocaleString("ru-RU", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var ACTION_LABELS = {
    created: "создана",
    edited: "изменён состав",
    cancelled: "отменена",
    payment: "оплата",
    refund: "возврат",
  };

  // Даты из воркера приходят как «YYYY-MM-DD HH:MM:SS» по UTC без смещения;
  // демо-режим (js/api.js) отдаёт готовый ISO с «T»/«Z». Слепой
  // replace()+"Z" на уже полном ISO даёт двойной «Z» и невалидную дату —
  // разбираем формат по наличию «T», а не всегда одинаково.
  function parseUtc(s) {
    if (!s) return null;
    var d = new Date(/T/.test(s) ? s : s.replace(" ", "T") + "Z");
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDateTime(iso) {
    var d = parseUtc(iso);
    if (!d) return iso || "";
    return d.toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // ------------------------------------------------------------- выгрузка
  // Колонки и их порядок — как в ведомости, включая узбекские заголовки:
  // менеджер открывает файл и видит привычную таблицу.
  var MANIFEST_COLUMNS = [
    ["ID", function (p) { return p.booking_code; }],
    ["бронь санаси", function (p) { return formatDate(p.booked_at); }],
    ["Ф.И.О.", function (p) { return p.full_name; }],
    ["туғилган санаси", function (p) { return formatDate(p.birth_date); }],
    ["паспорт рақами", function (p) { return p.passport_number; }],
    ["тугаш санаси", function (p) { return formatDate(p.passport_expiry); }],
    ["жойлашув", function (p) { return p.placement; }],
    ["B2B/B2C", function (p) { return p.channel || "B2B"; }],
    ["номланиши", function (p) { return p.agency_name; }],
    ["тариф", function (p) { return p.price_code; }],
    ["нарх USD", function (p) { return p.price; }],
    ["изоҳ", function (p) { return p.note || ""; }],
  ];

  /*
   * Выгрузка в НАСТОЯЩИЙ .xlsx — без сторонних библиотек. .xlsx это просто
   * ZIP из нескольких XML-файлов, поэтому собираем его руками: пара
   * килобайт кода, никакой тяжёлой зависимости, на скорость сайта не
   * влияет (код грузится вместе с admin.js, срабатывает только по клику).
   * Excel открывает файл сразу: жирная шапка, закреплённая первая строка,
   * автофильтр по колонкам, цена — числом (можно суммировать).
   */
  var XML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  function xmlEsc(s) { return String(s).replace(/[&<>"]/g, function (c) { return XML_ESC[c]; }); }

  function colLetter(n) {
    var s = "";
    n += 1;
    while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
    return s;
  }

  function sheetXml(columns, rows) {
    function cell(ref, value, style) {
      var s = style ? ' s="' + style + '"' : "";
      if (typeof value === "number" && isFinite(value)) {
        return '<c r="' + ref + '"' + s + '><v>' + value + "</v></c>";
      }
      return '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' +
        xmlEsc(value == null ? "" : value) + "</t></is></c>";
    }
    var cols = '<cols>' + columns.map(function (c, i) {
      var w = Math.max(12, Math.min(40, String(c[0]).length + 6));
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join("") + "</cols>";
    var head = "<row r=\"1\">" + columns.map(function (c, i) {
      return cell(colLetter(i) + "1", c[0], 1);
    }).join("") + "</row>";
    var body = rows.map(function (p, ri) {
      var r = ri + 2;
      return '<row r="' + r + '">' + columns.map(function (c, i) {
        return cell(colLetter(i) + r, c[1](p));
      }).join("") + "</row>";
    }).join("");
    var last = colLetter(columns.length - 1);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0">' +
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
      '<selection pane="bottomLeft"/></sheetView></sheetViews>' +
      cols + "<sheetData>" + head + body + "</sheetData>" +
      '<autoFilter ref="A1:' + last + "1\"/></worksheet>";
  }

  var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF3A2A16"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3E6D6"/></patternFill></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';

  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

  var WORKBOOK_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Список пассажиров" sheetId="1" r:id="rId1"/></sheets></workbook>';

  var WORKBOOK_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';

  // CRC32 — нужен для ZIP-заголовков.
  var CRC_TABLE = (function () {
    var t = [], c;
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Минимальный ZIP без сжатия (method=store) — Excel читает такой .xlsx.
  function zipStore(files) {
    var enc = new TextEncoder();
    var chunks = [], central = [], offset = 0;
    function u16(n) { return [n & 255, (n >> 8) & 255]; }
    function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var data = enc.encode(f.data);
      var crc = crc32(data);
      var local = new Uint8Array([].concat(
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)));
      chunks.push(local, name, data);
      central.push(new Uint8Array([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length),
        u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))));
      central.push(name);
      offset += local.length + name.length + data.length;
    });
    var centralStart = offset, centralSize = 0;
    central.forEach(function (c) { chunks.push(c); centralSize += c.length; });
    chunks.push(new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(centralSize), u32(centralStart), u16(0))));
    var total = chunks.reduce(function (s, c) { return s + c.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  }

  function downloadCsv(departureCode, passengers) {
    var zip = zipStore([
      { name: "[Content_Types].xml", data: CONTENT_TYPES },
      { name: "_rels/.rels", data: ROOT_RELS },
      { name: "xl/workbook.xml", data: WORKBOOK_XML },
      { name: "xl/_rels/workbook.xml.rels", data: WORKBOOK_RELS },
      { name: "xl/styles.xml", data: STYLES_XML },
      { name: "xl/worksheets/sheet1.xml", data: sheetXml(MANIFEST_COLUMNS, passengers) },
    ]);
    var blob = new Blob([zip], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "turon-" + departureCode + ".xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --------------------------------------------------------------- заезды
  // Карточки заезда переиспользуют визуал агентской вкладки «Направления»
  // (.tt-dep, .tt-seat-bar) — оператору место в кабинете такое же родное,
  // просто без цен и кнопки «Забронировать»: тут это выбор, а не продажа.
  function opDepCardHtml(d, active) {
    return '<button type="button" class="tt-op-dep' +
      (active ? " is-active" : "") + '" data-departure="' + esc(d.code) + '">' +
      '<div class="tt-dep-date"><strong>' + formatDate(d.date_start) + "</strong>" +
        '<span class="tt-dep-code">' + esc(d.code) + "</span></div>" +
      '<span class="tt-badge">' + (TRANSPORT[d.transport] || d.transport) + "</span>" +
    "</button>";
  }

  function grid(list) {
    return '<div class="tt-op-dep-grid">' +
      list.map(function (d) { return opDepCardHtml(d, d.code === state.selectedDeparture); }).join("") +
    "</div>";
  }

  // Заездов за сезон десятки — стеной карточек прошедшие мешают найти
  // ближайший. По умолчанию видны только предстоящие, прошедшие сворачиваем
  // за кнопку; поиск ищет по всем без разбора, раз человек уже назвал дату.
  function renderDepartureCards() {
    var q = state.departureFilter.trim().toLowerCase();
    if (q) {
      var found = state.departures.filter(function (d) {
        return d.code.toLowerCase().indexOf(q) !== -1 ||
          formatDate(d.date_start).indexOf(q) !== -1;
      });
      $("adm-departure-cards").innerHTML = found.length
        ? grid(found) : '<div class="tt-empty-state">Заезды не найдены.</div>';
      return;
    }

    var today = new Date().toISOString().slice(0, 10);
    var upcoming = state.departures.filter(function (d) { return d.date_start >= today; });
    var past = state.departures.filter(function (d) { return d.date_start < today; });

    var html = upcoming.length ? grid(upcoming)
      : '<div class="tt-empty-state">Предстоящих заездов нет.</div>';
    if (past.length) {
      html += '<button type="button" class="tt-btn secondary tt-btn-sm tt-toggle-past" ' +
        'id="adm-toggle-past">' +
        (state.showPast ? "Скрыть прошедшие" : "Показать прошедшие (" + past.length + ")") +
        "</button>";
      if (state.showPast) html += grid(past.slice().reverse());
    }
    $("adm-departure-cards").innerHTML = html;
  }

  function setSelectedDeparture(code) {
    state.selectedDeparture = code;
    renderDepartureCards();
    loadManifest();
  }

  function renderManifest(data) {
    state.current = data;
    var pax = data.passengers;
    if (!pax.length) {
      $("adm-manifest").innerHTML =
        '<div class="tt-empty-state">На этот заезд ещё нет броней через кабинет.' +
        '<div class="tt-muted-note">Места, проданные до запуска системы, ' +
        "учтены в счётчике заезда, но пофамильно их здесь нет.</div></div>";
      $("adm-export").disabled = true;
      return;
    }
    $("adm-export").disabled = false;

    var head = MANIFEST_COLUMNS.map(function (c) { return "<th>" + esc(c[0]) + "</th>"; }).join("");
    var body = pax.map(function (p) {
      return "<tr>" + MANIFEST_COLUMNS.map(function (c) {
        return "<td>" + esc(c[1](p)) + "</td>";
      }).join("") + "</tr>";
    }).join("");

    var sum = data.summary || {};
    $("adm-manifest").innerHTML =
      '<div class="tt-earnings">' +
        '<div><span>Броней</span><strong>' + (sum.bookings_count || 0) + "</strong></div>" +
        '<div><span>Пассажиров</span><strong>' + pax.length +
          '<span class="tt-muted-note"> · мест ' + (sum.seats_used || 0) + "</span></strong></div>" +
        '<div><span>Продано на</span><strong>' + money(sum.revenue || 0) + "</strong></div>" +
        '<div><span>Оплачено</span><strong' + (sum.paid > 0 ? ' class="tt-earn-value"' : "") + ">" +
          money(sum.paid || 0) + "</strong></div>" +
        '<div><span>Долг</span><strong' + (sum.owed > 0 ? ' class="tt-owed-value"' : "") + ">" +
          money(sum.owed || 0) + "</strong></div>" +
      "</div>" +
      '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' + head +
      "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function loadManifest() {
    var code = state.selectedDeparture;
    if (!code) {
      $("adm-manifest").innerHTML = '<div class="tt-empty-state">Заездов пока нет.</div>';
      $("adm-export").disabled = true;
      return;
    }
    $("adm-manifest").innerHTML = '<div class="tt-empty-state">Загрузка…</div>';
    TuronApi.manifest(code).then(renderManifest).catch(function (err) {
      $("adm-manifest").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить список.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  // ------------------------------------------------------------- обзор
  // Единый срез подтверждённых броней для дашборда и статистики агентств —
  // второй запрос не нужен, оба экрана считают из одного и того же массива.
  function loadOverviewData() {
    return TuronApi.adminBookings({ status: "confirmed", limit: AGGREGATE_LIMIT })
      .then(function (res) {
        state.confirmedAll = res.items;
        state.confirmedTotal = res.total;
        renderOverview();
      })
      .catch(function (err) {
        $("ov-stats").innerHTML =
          '<div class="tt-empty-state">Не удалось загрузить сводку.<div class="tt-muted-note">' +
          esc(err.message) + "</div></div>";
      });
  }

  function jumpToTab(name) {
    var tab = document.querySelector('.tt-tab[data-tab="' + name + '"]');
    if (tab) tab.click();
  }

  function jumpToAgencyDebt(name) {
    var match = state.agencies.filter(function (a) { return a.name === name; })[0];
    $("ab-agency").value = match ? String(match.id) : "";
    $("ab-status").value = "confirmed";
    $("ab-debt").checked = true;
    loadAdminBookings(true);
    jumpToTab("admin-bookings");
  }

  function renderOverview() {
    var bookings = state.confirmedAll;
    var truncated = state.confirmedTotal > bookings.length;
    var today = new Date().toISOString().slice(0, 10);
    var weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    var dayAgo = Date.now() - 86400000;

    var weekDeps = state.departures.filter(function (d) {
      return d.date_start >= today && d.date_start <= weekAhead;
    }).sort(function (a, b) { return a.date_start < b.date_start ? -1 : 1; });

    var recent24h = bookings.filter(function (b) {
      var d = parseUtc(b.created_at);
      return d && d.getTime() >= dayAgo;
    });

    // Долг и просрочка — та же логика TuronApi.paymentPolicy, что и в
    // агентском «Платежи», просто собрана по всем агентствам сразу.
    var debtByAgency = {};
    var overdueSteps = 0;
    bookings.forEach(function (b) {
      if (b.balance <= 0) return;
      var key = b.agency_name || "—";
      if (!debtByAgency[key]) debtByAgency[key] = { name: key, debt: 0, overdue: 0 };
      debtByAgency[key].debt += b.balance;
      var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
      pol.steps.forEach(function (s) {
        var need = Math.round(b.total_price * s.share * 100) / 100;
        var due = s.due.toISOString().slice(0, 10);
        var covered = b.paid >= need - 0.01;
        if (!covered && due < today) { debtByAgency[key].overdue++; overdueSteps++; }
      });
    });
    var debtors = Object.keys(debtByAgency).map(function (k) { return debtByAgency[k]; })
      .sort(function (a, b) { return b.debt - a.debt; });
    var totalDebt = debtors.reduce(function (s, a) { return s + a.debt; }, 0);

    $("ov-stats").innerHTML =
      '<div class="tt-earnings">' +
        '<div><span>Заездов за 7 дней</span><strong>' + weekDeps.length + "</strong></div>" +
        '<div><span>Броней за 24 часа</span><strong>' + recent24h.length + "</strong></div>" +
        '<div><span>Общий долг</span><strong' + (totalDebt > 0 ? ' class="tt-owed-value"' : "") + ">" +
          money(totalDebt) + "</strong></div>" +
        '<div><span>Просроченных этапов</span><strong' +
          (overdueSteps > 0 ? ' class="tt-owed-value"' : "") + ">" + overdueSteps + "</strong></div>" +
      "</div>" +
      (truncated
        ? '<div class="tt-muted-note">Сводка по последним ' + bookings.length + " из " +
          state.confirmedTotal + " броней.</div>"
        : "");

    $("ov-debtors").innerHTML = debtors.length
      ? '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' +
          "<th>Агентство</th><th>Долг</th><th>Просрочено</th></tr></thead><tbody>" +
          debtors.map(function (a) {
            return '<tr class="tt-row-link" data-jump-agency="' + esc(a.name) + '">' +
              "<td>" + esc(a.name) + "</td>" +
              '<td class="tt-owed-value">' + money(a.debt) + "</td>" +
              "<td>" + (a.overdue || "—") + "</td></tr>";
          }).join("") + "</tbody></table></div>"
      : '<div class="tt-empty-state">Долгов нет.</div>';

    $("ov-departures").innerHTML = weekDeps.length
      ? '<div class="tt-op-dep-grid">' +
          weekDeps.slice(0, 6).map(function (d) { return opDepCardHtml(d, false); }).join("") +
        "</div>"
      : '<div class="tt-empty-state">На ближайшие 7 дней заездов нет.</div>';

    var recentSorted = recent24h.slice().sort(function (a, b) {
      return b.created_at < a.created_at ? -1 : 1;
    });
    $("ov-recent").innerHTML = recentSorted.length
      ? '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' +
          "<th>Время</th><th>Бронь</th><th>Агентство</th><th>Заезд</th><th>Сумма</th>" +
          "</tr></thead><tbody>" +
          recentSorted.map(function (b) {
            return "<tr><td>" + formatDateTime(b.created_at) + "</td><td>" + esc(b.code) +
              "</td><td>" + esc(b.agency_name) + "</td><td>" + formatDate(b.date_start) +
              "</td><td>" + money(b.total_price) + "</td></tr>";
          }).join("") + "</tbody></table></div>"
      : '<div class="tt-empty-state">За последние сутки новых броней нет.</div>';
  }

  // ---------------------------------------------------------------- брони
  function currentFilters() {
    return {
      query: $("ab-query").value.trim(),
      agencyId: $("ab-agency").value || null,
      departure: $("ab-departure").value || null,
      status: $("ab-status").value,
      debtOnly: $("ab-debt").checked,
    };
  }

  function renderAdminBookings(list) {
    if (!list.length) {
      $("adm-bookings").innerHTML =
        '<div class="tt-empty-state">Ничего не найдено по этим условиям.</div>';
      return;
    }
    var html = list.map(function (b) {
      var cancelled = b.status === "cancelled";
      return (
        '<article class="tt-booking' + (cancelled ? " is-cancelled" : "") + '">' +
          "<div>" +
            "<strong>" + esc(b.code) + "</strong>" +
            '<div class="tt-muted-note">' + esc(b.agency_name) + " · " +
              formatDate(b.date_start) + " · " + b.passengers_count + " чел." +
              (cancelled ? " · отменена" : "") + "</div>" +
          "</div>" +
          '<div class="tt-booking-money">' +
            '<div class="tt-sum-line"><span>Стоимость</span><strong>' + money(b.total_price) + "</strong></div>" +
            '<div class="tt-sum-line"><span>Оплачено</span><strong>' + money(b.paid) + "</strong></div>" +
            '<div class="tt-sum-line' + (b.balance > 0 ? " tt-owed" : "") +
              '"><span>Остаток</span><strong>' + money(b.balance) + "</strong></div>" +
          "</div>" +
          '<div class="tt-booking-action">' +
            (cancelled ? "" :
              '<button class="tt-btn tt-btn-sm" data-pay="' + esc(b.code) +
              '" data-balance="' + b.balance + '">Внести оплату</button>') +
            '<button class="tt-btn secondary tt-btn-sm" data-history="' + b.id + '">История</button>' +
          "</div>" +
          '<div class="tt-history" data-history-for="' + b.id + '" hidden></div>' +
        "</article>"
      );
    }).join("");
    $("adm-bookings").innerHTML = html;
  }

  function renderPager() {
    var pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    var current = state.page + 1;
    $("adm-bookings-pager").innerHTML = state.total > state.pageSize
      ? '<button type="button" class="tt-btn secondary tt-btn-sm" id="adm-page-prev"' +
          (state.page <= 0 ? " disabled" : "") + ">← Назад</button>" +
        '<span class="tt-muted-note">стр. ' + current + " из " + pages + "</span>" +
        '<button type="button" class="tt-btn secondary tt-btn-sm" id="adm-page-next"' +
          (current >= pages ? " disabled" : "") + ">Вперёд →</button>"
      : "";
  }

  // resetPage — сбросить на первую страницу (смена фильтра); при листании
  // «Вперёд»/«Назад» текущая страница уже выставлена вызывающим кодом.
  function loadAdminBookings(resetPage) {
    if (resetPage) state.page = 0;
    var filters = currentFilters();
    filters.limit = state.pageSize;
    filters.offset = state.page * state.pageSize;
    return TuronApi.adminBookings(filters).then(function (res) {
      state.total = res.total;
      renderAdminBookings(res.items);
      $("adm-bookings-count").textContent = res.total
        ? "Показано " + Math.min(filters.offset + res.items.length, res.total) +
          " из " + res.total
        : "";
      renderPager();
    }).catch(function (err) {
      $("adm-bookings").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить брони.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  // ------------------------------------------------------------- агентства
  // Оборот/долг считаем из того же среза confirmedAll, что и «Обзор» — сервер
  // не отдаёт agency_id в /api/admin/bookings, только имя, поэтому агрегируем
  // по названию (в системе оно и так уникальный идентификатор агентства).
  function agencyStatsByName() {
    var stats = {};
    state.confirmedAll.forEach(function (b) {
      var key = b.agency_name || "—";
      if (!stats[key]) stats[key] = { revenue: 0, paid: 0, debt: 0 };
      stats[key].revenue += b.total_price;
      stats[key].paid += b.paid;
      stats[key].debt += b.balance;
    });
    return stats;
  }

  function loadAgencies() {
    return TuronApi.agencies().then(function (list) {
      state.agencies = list;
      var picked = $("ab-agency").value;
      $("ab-agency").innerHTML = '<option value="">Все</option>' + list.map(function (a) {
        return '<option value="' + a.id + '">' + esc(a.name) + "</option>";
      }).join("");
      $("ab-agency").value = picked;

      var stats = agencyStatsByName();
      var truncated = state.confirmedTotal > state.confirmedAll.length;
      $("adm-agencies").innerHTML =
        (truncated
          ? '<div class="tt-muted-note">Оборот и долг посчитаны по последним ' +
            state.confirmedAll.length + " из " + state.confirmedTotal + " броней.</div>"
          : "") +
        list.map(function (a) {
          var s = stats[a.name] || { revenue: 0, paid: 0, debt: 0 };
          return (
            '<article class="tt-tour">' +
              "<div><strong>" + esc(a.name) + "</strong>" +
                '<div class="tt-muted-note">логин: ' + esc(a.login) + "</div></div>" +
              '<div class="tt-agency-stats">' +
                "<span>" + a.bookings_count + " броней</span>" +
                "<span>оборот " + money(s.revenue) + "</span>" +
                '<span' + (s.debt > 0 ? ' class="tt-owed-value"' : "") +
                  ">долг " + money(s.debt) + "</span>" +
              "</div>" +
              '<div class="tt-agency-actions">' +
                (a.is_active
                  ? '<span class="tt-badge">Активно</span>'
                  : '<span class="tt-badge tt-badge-off">Отключено</span>') +
                '<button class="tt-btn secondary tt-btn-sm" data-toggle="' + a.id +
                  '" data-active="' + (a.is_active ? 1 : 0) + '">' +
                  (a.is_active ? "Отключить" : "Включить") + "</button>" +
                '<button class="tt-btn secondary tt-btn-sm" data-password="' + a.id +
                  '" data-name="' + esc(a.name) + '">Сменить пароль</button>' +
              "</div>" +
            "</article>"
          );
        }).join("");
    }).catch(function (err) {
      $("adm-agencies").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить агентства.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  // ------------------------------------------------------------------ вход
  // Поиск не дёргает сервер на каждой букве — ждём паузы в наборе.
  function debounce(fn, ms) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  function bind() {
    $("adm-departure-search").addEventListener("input", debounce(function () {
      state.departureFilter = $("adm-departure-search").value;
      renderDepartureCards();
    }, 200));
    $("adm-departure-cards").addEventListener("click", function (e) {
      var card = e.target.closest("[data-departure]");
      if (card) { setSelectedDeparture(card.dataset.departure); return; }
      if (e.target.id === "adm-toggle-past") {
        state.showPast = !state.showPast;
        renderDepartureCards();
      }
    });
    $("ov-departures").addEventListener("click", function (e) {
      var card = e.target.closest("[data-departure]");
      if (!card) return;
      setSelectedDeparture(card.dataset.departure);
      jumpToTab("manifest");
    });
    $("ov-debtors").addEventListener("click", function (e) {
      var row = e.target.closest("[data-jump-agency]");
      if (row) jumpToAgencyDebt(row.dataset.jumpAgency);
    });

    ["ab-agency", "ab-departure", "ab-status", "ab-debt"].forEach(function (id) {
      $(id).addEventListener("change", function () { loadAdminBookings(true); });
    });
    $("ab-query").addEventListener("input", debounce(function () {
      loadAdminBookings(true);
    }, 300));
    $("adm-bookings-pager").addEventListener("click", function (e) {
      if (e.target.id === "adm-page-prev" && state.page > 0) {
        state.page--; loadAdminBookings(false);
      } else if (e.target.id === "adm-page-next") {
        state.page++; loadAdminBookings(false);
      }
    });
    $("adm-export").addEventListener("click", function () {
      if (state.current) downloadCsv(state.current.departure.code, state.current.passengers);
    });

    $("adm-bookings").addEventListener("click", function (e) {
      var hist = e.target.closest("[data-history]");
      if (hist) {
        var box = document.querySelector('[data-history-for="' + hist.dataset.history + '"]');
        if (!box.hidden) { box.hidden = true; return; }
        box.hidden = false;
        box.innerHTML = '<span class="tt-muted-note">загрузка…</span>';
        TuronApi.bookingHistory(Number(hist.dataset.history)).then(function (events) {
          box.innerHTML = events.length
            ? events.map(function (ev) {
                return '<div class="tt-history-row"><span>' + formatDateTime(ev.created_at) +
                  "</span><strong>" + esc(ACTION_LABELS[ev.action] || ev.action) + "</strong>" +
                  "<span>" + esc(ev.actor_name) + "</span>" +
                  '<span class="tt-muted-note">' + esc(ev.details || "") + "</span></div>";
              }).join("")
            : '<span class="tt-muted-note">записей нет</span>';
        }).catch(function (err) {
          box.innerHTML = '<span class="tt-muted-note">' + esc(err.message) + "</span>";
        });
        return;
      }
      var btn = e.target.closest("[data-pay]");
      if (!btn) return;
      var code = btn.dataset.pay;
      var suggested = Number(btn.dataset.balance) || 0;
      var raw = prompt("Сумма оплаты по брони " + code +
        " (остаток " + money(suggested) + "). Отрицательная сумма — возврат:", suggested);
      if (raw === null) return;
      var amount = Number(String(raw).replace(",", "."));
      if (!isFinite(amount) || amount === 0) {
        alert("Введите сумму числом, не равную нулю.");
        return;
      }
      btn.disabled = true;
      TuronApi.addPayment(code, amount).then(function (res) {
        Admin.reload();
        alert("Оплата проведена. По брони " + res.booking_code +
              " оплачено " + money(res.paid) + ", остаток " + money(res.balance) + ".");
      }).catch(function (err) {
        btn.disabled = false;
        alert(err.message);
      });
    });

    $("adm-agencies").addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-toggle]");
      if (toggle) {
        var willActivate = toggle.dataset.active === "0";
        if (!willActivate && !confirm(
          "Отключить агентство? Оно не сможет войти, а открытые сессии закроются.")) return;
        toggle.disabled = true;
        TuronApi.setAgencyActive(Number(toggle.dataset.toggle), willActivate)
          .then(loadAgencies)
          .catch(function (err) { toggle.disabled = false; alert(err.message); });
        return;
      }
      var pwd = e.target.closest("[data-password]");
      if (pwd) {
        var value = prompt("Новый пароль для «" + pwd.dataset.name + "» (от 8 символов).\n" +
                           "Открытые сессии агентства будут закрыты:");
        if (value === null) return;
        TuronApi.setAgencyPassword(Number(pwd.dataset.password), value)
          .then(function (res) { alert("Пароль для " + res.login + " изменён."); })
          .catch(function (err) { alert(err.message); });
      }
    });

    $("adm-new-agency-toggle").addEventListener("click", function () {
      var form = $("adm-new-agency");
      var willOpen = form.hidden;
      form.hidden = !willOpen;
      this.setAttribute("aria-expanded", willOpen ? "true" : "false");
      this.textContent = willOpen ? "− Свернуть" : "+ Новое агентство";
      if (willOpen) $("na-name").focus();
    });

    $("adm-new-agency").addEventListener("submit", function (e) {
      e.preventDefault();
      var box = $("adm-agency-result");
      TuronApi.createAgency($("na-login").value.trim(), $("na-name").value.trim(),
                            $("na-password").value)
        .then(function (res) {
          box.innerHTML = '<div class="tt-ok-box">Агентство «' + esc(res.name) +
            '» заведено, логин ' + esc(res.login) + "</div>";
          e.target.reset();
          loadAgencies();
        })
        .catch(function (err) {
          box.innerHTML = '<div class="tt-error-box">' + esc(err.message) + "</div>";
        });
    });
  }

  var Admin = {
    isOperator: function (agency) { return agency && agency.role === "operator"; },

    start: function () {
      document.body.classList.add("is-operator");
      bind();
      return TuronApi.departures({ all: true }).then(function (list) {
        // у оператора в выборе — все заезды, включая заполненные; сервер
        // уже отдаёт их по возрастанию даты
        state.departures = list.slice();
        var today = new Date().toISOString().slice(0, 10);
        var upcoming = state.departures.filter(function (d) { return d.date_start >= today; });
        // по умолчанию открываем ближайший предстоящий, а не самый дальний —
        // это то, что оператору нужно проверять каждый день
        state.selectedDeparture = upcoming.length ? upcoming[0].code
          : (state.departures.length ? state.departures[state.departures.length - 1].code : null);
        renderDepartureCards();
        $("ab-departure").innerHTML = '<option value="">Все</option>' +
          state.departures.map(function (d) {
            return '<option value="' + esc(d.code) + '">' + formatDate(d.date_start) +
              " · " + esc(d.code) + "</option>";
          }).join("");
        loadManifest();
        // «Обзор» и статистика агентств читают один и тот же срез броней —
        // агентства грузим только после него, иначе оборот/долг на первом
        // кадре были бы нулевыми.
        return loadOverviewData();
      }).then(function () {
        return loadAgencies();
      }).then(function () {
        return loadAdminBookings(true);
      });
    },

    reload: function () {
      loadManifest();
      loadAdminBookings(false);
      loadOverviewData().then(loadAgencies);
    },
  };

  global.TuronAdmin = Admin;
})(window);
