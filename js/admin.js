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
    confirmedAll: [], confirmedTotal: 0, activity: [],
    // последний отрисованный список броней — см. renderAdminBookings
    shown: [],
  };
  var AGGREGATE_LIMIT = 200;

  // Открывалку окна правки состава кладёт сюда app.js: форма брони живёт
  // там, а admin.js грузится раньше и о ней ничего не знает.
  var compositionOpener = null;

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
    passport: "исправлен документ",
    birthdate: "исправлена дата рождения",
    cancel_requested: "запрошена отмена",
    change_requested: "запрошена замена туриста",
  };

  // Полных дней до выезда — для показа сроков. Правило удержания при отмене
  // здесь НЕ считается: оно одно на оба кабинета, см.
  // TuronApi.cancellationPenalty.
  function daysUntil(dateStr) {
    if (!dateStr) return Infinity;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(dateStr + "T00:00:00") - today) / 86400000);
  }

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

  // date_start — календарная дата без времени. Разбираем её как UTC,
  // чтобы в часовом поясе оператора она не перепрыгнула на соседний день.
  function calendarDate(iso) {
    if (!iso) return null;
    var d = new Date(iso + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDepartureDay(iso) {
    var d = calendarDate(iso);
    if (!d) return iso || "";
    var text = d.toLocaleDateString("ru-RU", {
      weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
    });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function plural(n, one, few, many) {
    var mod100 = Math.abs(n) % 100;
    var mod10 = mod100 % 10;
    if (mod100 > 10 && mod100 < 20) return many;
    if (mod10 === 1) return one;
    if (mod10 > 1 && mod10 < 5) return few;
    return many;
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
    // Закрытый заезд из сетки не убираем: оператору его надо найти, чтобы
    // открыть обратно. Помечаем и приглушаем.
    var closed = d.is_open === 0;
    return '<button type="button" class="tt-op-dep' +
      (active ? " is-active" : "") + (closed ? " is-closed" : "") +
      '" data-departure="' + esc(d.code) + '">' +
      '<div class="tt-dep-date"><strong>' + formatDate(d.date_start) + "</strong>" +
        '<span class="tt-dep-code">' + esc(d.code) + "</span></div>" +
      '<span class="tt-badge">' + (TRANSPORT[d.transport] || d.transport) + "</span>" +
      (closed ? '<span class="tt-badge tt-badge-off">Продажа закрыта</span>' : "") +
    "</button>";
  }

  /*
   * Панель управления выбранным заездом. Пока в ней одна кнопка — открыть
   * или закрыть продажу; сюда же лягут правка цен и даты.
   *
   * Закрытие мягкое и ничего не удаляет: проданные брони живут дальше,
   * ведомость печатается, оплаты проводятся. Удаления заезда нет и не
   * планируется — каскад снёс бы прайс, а брони остались бы без заезда.
   */
  function renderDepartureControls() {
    var box = $("adm-dep-controls");
    if (!box) return;
    var d = state.departures.filter(function (x) {
      return x.code === state.selectedDeparture;
    })[0];
    if (!d) { box.hidden = true; box.innerHTML = ""; return; }

    var closed = d.is_open === 0;
    box.hidden = false;
    box.innerHTML =
      '<div class="tt-dep-controls">' +
        "<div><strong>" + esc(d.code) + "</strong> · " + formatDate(d.date_start) +
          ' <span class="tt-muted-note">' +
          (closed
            ? "продажа закрыта — новые брони не принимаются"
            : "продажа открыта") +
          "</span></div>" +
        '<div class="tt-dep-controls-actions">' +
          '<button type="button" class="tt-btn secondary tt-btn-sm" data-dep-prices="' +
            d.id + '">' + (priceEditor === d.id ? "Скрыть цены" : "Цены") + "</button>" +
          '<button type="button" class="tt-btn secondary tt-btn-sm" data-dep-toggle="' +
            d.id + '" data-open="' + (closed ? "1" : "0") + '">' +
            (closed ? "Открыть продажу" : "Закрыть продажу") + "</button>" +
        "</div>" +
      "</div>" +
      (priceEditor === d.id ? priceEditorHtml(d) : "");
  }

  /* ------------------------------------------------------- прайс заезда
   * Редактор цен. Открыт не более чем у одного заезда за раз — id лежит
   * здесь, а не в разметке: перерисовка карточек его бы стёрла.
   */
  var priceEditor = null;

  function priceRowHtml(p, i) {
    var child = p.kind === "child";
    return '<div class="tt-price-row" data-price-row="' + i + '">' +
      '<input type="text" class="tt-price-code" data-p="code" value="' +
        esc(p.code || "") + '" placeholder="DBL" aria-label="Код тарифа" />' +
      '<input type="text" data-p="label" value="' + esc(p.label || "") +
        '" placeholder="Двухместный" aria-label="Подпись" />' +
      '<select data-p="kind" aria-label="Тип">' +
        '<option value="placement"' + (child ? "" : " selected") + ">Размещение</option>" +
        '<option value="child"' + (child ? " selected" : "") + ">Детский</option>" +
      "</select>" +
      '<input type="number" class="tt-price-age" data-p="age_from" min="0" max="120" value="' +
        (p.age_from == null ? "" : p.age_from) + '" placeholder="от" aria-label="Возраст от"' +
        (child ? "" : " disabled") + " />" +
      '<input type="number" class="tt-price-age" data-p="age_to" min="0" max="120" value="' +
        (p.age_to == null ? "" : p.age_to) + '" placeholder="до" aria-label="Возраст до"' +
        (child ? "" : " disabled") + " />" +
      '<label class="tt-price-seat' + (child ? "" : " is-off") + '">' +
        '<input type="checkbox" data-p="occupies_seat"' +
          (p.occupies_seat === 0 ? "" : " checked") + (child ? "" : " disabled") +
        " /> место</label>" +
      '<input type="number" class="tt-price-money" data-p="price" min="0" step="1" value="' +
        (p.price == null ? "" : p.price) + '" aria-label="Цена" />' +
      '<button type="button" class="tt-icon-btn" data-price-del="' + i +
        '" aria-label="Убрать строку">&times;</button>' +
    "</div>";
  }

  function priceEditorHtml(d) {
    var rows = (d.prices || []).slice().sort(function (a, b) {
      // Размещения сверху, детские снизу — так же, как их видит агент
      // в форме брони.
      if (a.kind !== b.kind) return a.kind === "placement" ? -1 : 1;
      return String(a.code).localeCompare(String(b.code));
    });
    return '<div class="tt-price-editor" id="adm-price-editor" data-dep="' + d.id + '">' +
      "<h4>Цены заезда " + esc(d.code) + "</h4>" +
      '<p class="tt-editor-hint">На уже проданные брони это не влияет: цена ' +
        "туриста записана в момент брони и из прайса не перечитывается. " +
        "Меняется только то, по чему будут продавать дальше.</p>" +
      '<div class="tt-price-head">' +
        "<span>Код</span><span>Подпись</span><span>Тип</span>" +
        "<span>Возраст</span><span></span><span>Место</span><span>Цена, $</span><span></span>" +
      "</div>" +
      '<div id="adm-price-rows">' + rows.map(priceRowHtml).join("") + "</div>" +
      '<div class="tt-price-actions">' +
        '<button type="button" class="tt-btn secondary tt-btn-sm" id="adm-price-add">' +
          "+ Строка</button>" +
        '<span class="tt-editor-msg" id="adm-price-msg"></span>' +
        '<button type="button" class="tt-btn tt-btn-sm" id="adm-price-save">Сохранить цены</button>' +
      "</div>" +
    "</div>";
  }

  /* ------------------------------------------------------- новый заезд
   * Код заезда в ведомости собран как «аэропорт + ДДММ» (BUS2808). Пока
   * оператор не тронул поле руками, подставляем его сами: набирать код
   * заново на каждую пятницу сезона незачем, а вводить его вручную легко
   * с опечаткой — и заезд уйдёт в базу под кривым номером.
   */
  function suggestDepartureCode(transport, date) {
    if (!transport || !date) return "";
    var parts = date.split("-");
    if (parts.length !== 3) return "";
    return String(transport).toUpperCase() + parts[2] + parts[1];
  }

  function fillNewDepForm() {
    var sel = $("nd-source");
    var today = new Date().toISOString().slice(0, 10);
    // В образцы годятся и прошедшие заезды: прайс у них выверен, а даты
    // нового сезона всё равно вводятся заново.
    sel.innerHTML = '<option value="">— без образца (заезд создастся закрытым) —</option>' +
      state.departures.slice().reverse().map(function (d) {
        return '<option value="' + esc(d.code) + '">' + formatDate(d.date_start) +
          " · " + esc(d.code) + " · " + (d.prices || []).length + " цен" +
          (d.date_start < today ? " (прошедший)" : "") + "</option>";
      }).join("");
    // По умолчанию — ближайший предстоящий: у него прайс актуальнее всего.
    var upcoming = state.departures.filter(function (d) { return d.date_start >= today; })[0];
    if (upcoming) sel.value = upcoming.code;
    syncNewDepFromSource();
    $("nd-date").value = "";
    $("nd-code").value = "";
    $("nd-msg").textContent = "";
    $("nd-msg").className = "tt-editor-msg";
    newDepCodeTouched = false;
  }

  // Оператор мог вписать код сам — тогда не перетираем его подсказкой.
  var newDepCodeTouched = false;

  function syncNewDepFromSource() {
    var src = state.departures.filter(function (d) {
      return d.code === $("nd-source").value;
    })[0];
    if (src) {
      $("nd-transport").value = src.transport;
      $("nd-capacity").value = src.capacity;
    } else if (!$("nd-capacity").value) {
      $("nd-capacity").value = 65;
    }
    refreshSuggestedCode();
  }

  function refreshSuggestedCode() {
    if (newDepCodeTouched) return;
    $("nd-code").value = suggestDepartureCode($("nd-transport").value, $("nd-date").value);
  }

  // Читаем таблицу обратно в массив. Порядок строк = порядок в разметке,
  // поэтому индексы в data-price-row нужны только для удаления.
  function collectPrices() {
    return Array.prototype.map.call(
      document.querySelectorAll("#adm-price-rows .tt-price-row"),
      function (row) {
        function v(name) {
          var el = row.querySelector('[data-p="' + name + '"]');
          return el ? el.value : "";
        }
        var kind = v("kind");
        var seatEl = row.querySelector('[data-p="occupies_seat"]');
        return {
          code: v("code"),
          label: v("label"),
          kind: kind,
          price: v("price") === "" ? NaN : Number(v("price")),
          age_from: kind === "child" && v("age_from") !== "" ? Number(v("age_from")) : null,
          age_to: kind === "child" && v("age_to") !== "" ? Number(v("age_to")) : null,
          occupies_seat: kind === "child" && seatEl && !seatEl.checked ? 0 : 1,
        };
      });
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
    renderDepartureControls();
    loadManifest();
    /*
     * Прокрутка к результату. Заездов за сезон десятки, сетка карточек выше
     * списка — при 20+ заездах список пассажиров уезжает под сгиб, и после
     * клика на экране НИЧЕГО не менялось: оператор думал, что кнопка не
     * работает, и шёл выгружать Excel. Сам список при этом грузился исправно.
     *
     * rAF, а не прямой вызов: со страницы «Обзор» клик сначала зовёт
     * setSelectedDeparture, а сразу за ним jumpToTab("manifest") — если
     * прокрутить синхронно, переключение вкладки следом сбросит позицию.
     */
    var box = $("adm-manifest");
    if (!box || !box.scrollIntoView) return;
    global.requestAnimationFrame(function () {
      var smooth = !(global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches);
      box.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    });
  }

  /*
   * Шапка списка: какой именно заезд открыт и его загрузка. Рисуется ВСЕГДА,
   * в том числе когда пассажиров нет — иначе пустой экран не отвечал на
   * вопрос «а почему пусто». У заездов, проданных до запуска системы,
   * seats_taken больше нуля при пустом списке, и счётчик это прямо показывает.
   */
  function manifestHeadHtml(d) {
    if (!d) return "";
    var taken = Number(d.seats_taken || 0);
    var cap = Number(d.capacity || 0);
    return '<div class="tt-manifest-head">' +
      '<div class="tt-manifest-when">' +
        "<strong>" + formatDate(d.date_start) + "</strong>" +
        '<span class="tt-dep-code">' + esc(d.code) + "</span>" +
      "</div>" +
      '<span class="tt-badge">' + esc(TRANSPORT[d.transport] || d.transport) + "</span>" +
      (cap ? '<span class="tt-manifest-seats tt-muted-note">занято ' + taken +
        " из " + cap + "</span>" : "") +
    "</div>";
  }

  function renderManifest(data) {
    state.current = data;
    var pax = data.passengers;
    var head = manifestHeadHtml(data.departure);
    if (!pax.length) {
      $("adm-manifest").innerHTML = head +
        '<div class="tt-empty-state">На этот заезд ещё нет броней через кабинет.' +
        '<div class="tt-muted-note">Места, проданные до запуска системы, ' +
        "учтены в счётчике заезда, но пофамильно их здесь нет.</div></div>";
      $("adm-export").disabled = true;
      return;
    }
    $("adm-export").disabled = false;

    // Правка документа живёт ИМЕННО здесь: оператор смотрит ведомость и
    // видит опечатку в паспорте глазами — чинить её логично на месте, а не
    // разыскивая бронь в общем списке.
    var cols = MANIFEST_COLUMNS.map(function (c) { return "<th>" + esc(c[0]) + "</th>"; })
      .join("") + "<th></th>";
    var body = pax.map(function (p) {
      return "<tr>" + MANIFEST_COLUMNS.map(function (c) {
        return "<td>" + esc(c[1](p)) + "</td>";
      }).join("") +
        // Одна кнопка на обе правки: окно разделено внутри, и документ от
        // даты рождения там отделён и рамкой, и порядком действий.
        '<td><button class="tt-btn secondary tt-btn-sm" data-fix-pax="' +
          p.passenger_id + '">Изменить</button></td>' +
      "</tr>";
    }).join("");

    var sum = data.summary || {};
    $("adm-manifest").innerHTML = head +
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
      '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' + cols +
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
    return Promise.all([
      TuronApi.adminBookings({ status: "confirmed", limit: AGGREGATE_LIMIT }),
      // Во время поэтапного деплоя старый воркер может ещё не знать новый
      // маршрут. Сводку броней не роняем целиком — лента появится после
      // обновления API при следующей перезагрузке.
      TuronApi.adminActivity(50).catch(function () { return []; }),
    ]).then(function (res) {
        state.confirmedAll = res[0].items;
        state.confirmedTotal = res[0].total;
        state.activity = res[1] || [];
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

  function openBooking(code) {
    $("ab-query").value = code || "";
    $("ab-agency").value = "";
    $("ab-departure").value = "";
    $("ab-status").value = "";
    $("ab-debt").checked = false;
    jumpToTab("admin-bookings");
    loadAdminBookings(true);
  }

  function departureUrgency(date, today) {
    var start = calendarDate(date);
    var base = calendarDate(today);
    var days = start && base ? Math.round((start - base) / 86400000) : 0;
    if (days === 0) return { label: "Сегодня", className: "is-today" };
    if (days === 1) return { label: "Завтра", className: "is-tomorrow" };
    return { label: "Через " + days + " " + plural(days, "день", "дня", "дней"), className: "is-soon" };
  }

  function renderUpcomingDepartures(departures, bookings, pendingCancel, today, truncated) {
    if (!departures.length) {
      return '<div class="tt-empty-state">На ближайшие 7 дней заездов нет.</div>';
    }

    var byDeparture = {};
    bookings.forEach(function (b) {
      var key = b.departure_code || "";
      if (!byDeparture[key]) byDeparture[key] = [];
      byDeparture[key].push(b);
    });

    var byDay = {};
    departures.forEach(function (d) {
      if (!byDay[d.date_start]) byDay[d.date_start] = [];
      byDay[d.date_start].push(d);
    });

    var groups = Object.keys(byDay).sort().map(function (date) {
      var urgency = departureUrgency(date, today);
      var rows = byDay[date].map(function (d) {
        var list = byDeparture[d.code] || [];
        var pax = list.reduce(function (sum, b) { return sum + (Number(b.passengers_count) || 0); }, 0);
        var sold = list.reduce(function (sum, b) { return sum + (Number(b.total_price) || 0); }, 0);
        var paid = list.reduce(function (sum, b) { return sum + (Number(b.paid) || 0); }, 0);
        var debt = list.reduce(function (sum, b) { return sum + Math.max(0, Number(b.balance) || 0); }, 0);
        var agencies = {};
        var cancels = 0;
        list.forEach(function (b) {
          agencies[b.agency_name || "—"] = true;
          if (b.cancel_requested_at || pendingCancel[b.id]) cancels++;
        });
        var agencyCount = Object.keys(agencies).length;
        var paidShare = sold > 0 ? Math.max(0, Math.min(100, Math.round(paid / sold * 100))) : 0;
        var title = d.tour_name || d.tour_code || d.code;
        var route = [d.code, TRANSPORT[d.transport] || d.transport, d.destination]
          .filter(Boolean).join(" · ");
        var stateClass = cancels ? " has-cancel" : (debt > 0 ? " has-debt" : " is-ready");

        return '<button type="button" class="tt-ops-departure ' + stateClass +
          '" data-departure="' + esc(d.code) + '">' +
          '<span class="tt-ops-departure-main"><strong>' + esc(title) + '</strong>' +
            '<small>' + esc(route) + '</small></span>' +
          '<span class="tt-ops-counts" aria-label="Загрузка заезда">' +
            '<span><b>' + list.length + '</b><small>Брони</small></span>' +
            '<span><b>' + pax + '</b><small>Туристы</small></span>' +
            '<span><b>' + agencyCount + '</b><small>Агентства</small></span>' +
          '</span>' +
          '<span class="tt-ops-finance">' +
            '<span><small>Продано</small><b>' + money(sold) + '</b></span>' +
            '<span><small>Оплачено</small><b>' + money(paid) + '</b></span>' +
            '<span class="tt-ops-debt"><small>Долг</small><b>' + money(debt) + '</b></span>' +
            '<i class="tt-ops-progress" title="Оплачено ' + paidShare + '%"><em style="width:' + paidShare + '%"></em></i>' +
          '</span>' +
          '<span class="tt-ops-flags">' +
            (cancels
              ? '<span class="tt-badge tt-badge-cancel">' + cancels + ' ' +
                  plural(cancels, "отмена", "отмены", "отмен") + '</span>'
              : (debt > 0
                ? '<span class="tt-badge tt-badge-info">Есть долг</span>'
                : '<span class="tt-badge">Оплачено</span>')) +
            '<span class="tt-ops-open" aria-hidden="true">→</span>' +
          '</span>' +
        '</button>';
      }).join("");

      return '<section class="tt-ops-day ' + urgency.className + '">' +
        '<header class="tt-ops-day-head"><div><strong>' + urgency.label + '</strong>' +
          '<span>' + esc(formatDepartureDay(date)) + '</span></div>' +
          '<small>' + byDay[date].length + ' ' +
            plural(byDay[date].length, "заезд", "заезда", "заездов") + '</small></header>' +
        '<div class="tt-ops-departure-list">' + rows + '</div></section>';
    }).join("");

    return (truncated
      ? '<div class="tt-ops-data-warning">Финансовая сводка показана по последним ' +
          bookings.length + ' из ' + state.confirmedTotal + ' броней.</div>'
      : "") + '<div class="tt-ops-days">' + groups + '</div>';
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
    var pendingCancel = {};
    state.activity.forEach(function (ev) {
      if (ev.action === "cancel_requested" && ev.booking_status === "confirmed") {
        pendingCancel[ev.booking_id] = true;
      }
    });

    $("ov-stats").innerHTML =
      '<div class="tt-earnings">' +
        '<div><span>Заездов за 7 дней</span><strong>' + weekDeps.length + "</strong></div>" +
        '<div><span>Броней за 24 часа</span><strong>' + recent24h.length + "</strong></div>" +
        '<div><span>Общий долг</span><strong' + (totalDebt > 0 ? ' class="tt-owed-value"' : "") + ">" +
          money(totalDebt) + "</strong></div>" +
        '<div><span>Просроченных этапов</span><strong' +
          (overdueSteps > 0 ? ' class="tt-owed-value"' : "") + ">" + overdueSteps + "</strong></div>" +
        '<div><span>Заявок на отмену</span><strong' +
          (Object.keys(pendingCancel).length ? ' class="tt-cancel-value"' : "") + ">" +
          Object.keys(pendingCancel).length + "</strong></div>" +
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

    $("ov-departures").innerHTML = renderUpcomingDepartures(
      weekDeps, bookings, pendingCancel, today, truncated
    );

    $("ov-activity").innerHTML = state.activity.length
      ? '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' +
          "<th>Время</th><th>Действие</th><th>Агентство</th><th>Бронь</th><th>Подробности</th>" +
          "</tr></thead><tbody>" +
          state.activity.map(function (ev) {
            var cancel = ev.action === "cancel_requested" && ev.booking_status === "confirmed";
            return '<tr class="tt-row-link tt-activity-row' + (cancel ? " is-cancel-request" : "") +
              '" data-activity-booking="' + esc(ev.booking_code) + '">' +
              "<td>" + formatDateTime(ev.created_at) + "</td>" +
              "<td><strong>" + esc(ACTION_LABELS[ev.action] || ev.action) + "</strong>" +
                (cancel ? '<span class="tt-badge tt-badge-cancel">Требует решения</span>' : "") +
              "</td><td>" + esc(ev.agency_name || ev.actor_name) + "</td>" +
              "<td>" + esc(ev.booking_code) + "</td>" +
              '<td class="tt-muted-note">' + esc(ev.details || "—") + "</td></tr>";
          }).join("") + "</tbody></table></div>"
      : '<div class="tt-empty-state">Действий агентств пока нет.</div>';
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
    // Показанный срез запоминаем целиком: кнопке «Изменить состав» нужна
    // сама бронь с пассажирами, а из разметки её не восстановить.
    state.shown = list;
    var html = list.map(function (b) {
      var cancelled = b.status === "cancelled";
      return (
        '<article class="tt-booking' + (cancelled ? " is-cancelled" : "") + '">' +
          "<div>" +
            "<strong>" + esc(b.code) + "</strong>" +
            (b.cancel_requested_at && !cancelled
              ? ' <span class="tt-badge tt-badge-cancel">Запрошена отмена</span>' : "") +
            (b.change_requested_at && !cancelled
              ? ' <span class="tt-badge tt-badge-change">Просят замену</span>' : "") +
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
            // Замену состава тоже проводит только оператор: у агентства
            // маршрут закрыт на 403, оно шлёт заявку (requestChange).
            (cancelled ? "" :
              '<button class="tt-btn secondary tt-btn-sm" data-composition="' + b.id + '">' +
                (b.change_requested_at ? "Провести замену" : "Изменить состав") + "</button>") +
            // Отмену проводит только оператор — у агентства этой кнопки нет,
            // оно шлёт заявку (см. requestCancel в worker/index.js).
            (cancelled ? "" :
              '<button class="tt-btn secondary tt-btn-sm" data-cancel="' + b.id +
                '" data-code="' + esc(b.code) + '" data-total="' + b.total_price +
                '" data-date="' + esc(b.date_start) + '">' +
                (b.cancel_requested_at ? "Обработать отмену" : "Отменить") + "</button>") +
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
      var pending = {};
      state.activity.forEach(function (ev) {
        if (ev.action === "cancel_requested" && ev.booking_status === "confirmed") {
          pending[ev.booking_id] = ev.created_at;
        }
      });
      var items = res.items || [];
      var serverHasCancelField = items.some(function (b) {
        return Object.prototype.hasOwnProperty.call(b, "cancel_requested_at");
      });
      items.forEach(function (b) {
        if (!b.cancel_requested_at && pending[b.id]) b.cancel_requested_at = pending[b.id];
      });
      // Старый воркер ещё не понимает status=cancel_requested и отдаёт все
      // брони. Лента действий позволяет отфильтровать их на клиенте.
      if (filters.status === "cancel_requested" && !serverHasCancelField) {
        items = items.filter(function (b) { return !!pending[b.id]; });
        res.total = items.length;
      }
      state.total = res.total;
      renderAdminBookings(items);
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
    /*
     * Редактор цен. Всё внутри #adm-dep-controls, поэтому один обработчик
     * на контейнер: сама панель перерисовывается целиком, и обработчики,
     * навешенные на её содержимое, терялись бы при каждой перерисовке.
     */
    $("adm-dep-controls").addEventListener("click", function (e) {
      var open = e.target.closest("[data-dep-prices]");
      if (open) {
        var openId = Number(open.dataset.depPrices);
        priceEditor = priceEditor === openId ? null : openId;
        renderDepartureControls();
        return;
      }

      if (e.target.id === "adm-price-add") {
        var box = $("adm-price-rows");
        var tmp = document.createElement("div");
        // Индекс новой строки — по числу уже нарисованных: он нужен только
        // кнопке удаления и уникальности внутри одной отрисовки.
        tmp.innerHTML = priceRowHtml(
          { code: "", label: "", kind: "placement", price: "" },
          box.children.length);
        box.appendChild(tmp.firstChild);
        return;
      }

      var del = e.target.closest("[data-price-del]");
      if (del) {
        var row = del.closest(".tt-price-row");
        if (row) row.remove();
        return;
      }

      if (e.target.id === "adm-price-save") {
        var editor = $("adm-price-editor");
        if (!editor) return;
        var depId = Number(editor.dataset.dep);
        var msg = $("adm-price-msg");
        var save = $("adm-price-save");
        msg.className = "tt-editor-msg";
        msg.textContent = "Сохраняю…";
        save.disabled = true;
        TuronApi.updateDeparturePrices(depId, collectPrices()).then(function (res) {
          save.disabled = false;
          msg.className = "tt-editor-msg is-ok";
          msg.textContent = res.changed.length
            ? "Сохранено. Изменено цен: " + res.changed.length +
              (res.sold_untouched ? "; проданные брони не тронуты" : "")
            : "Сохранено, цены не менялись.";
          // Перечитываем заезды: в state.departures лежит старый прайс, а
          // по нему считает и калькулятор, и форма брони.
          return TuronApi.departures({ all: true }).then(function (list) {
            state.departures = list;
            renderDepartureCards();
          });
        }).catch(function (err) {
          save.disabled = false;
          msg.className = "tt-editor-msg is-err";
          msg.textContent = err.message;
        });
        return;
      }

      var btn = e.target.closest("[data-dep-toggle]");
      if (!btn) return;
      var id = Number(btn.dataset.depToggle);
      var open = btn.dataset.open === "1";
      var dep = state.departures.filter(function (x) { return x.id === id; })[0];
      // Закрытие спрашиваем подтверждением, открытие — нет: закрыть заезд
      // на сезоне значит остановить продажу, а открыть обратно безобидно.
      if (!open && !confirm(
            "Закрыть продажу заезда " + (dep ? dep.code : "") + "?\n\n" +
            "Уже проданные брони останутся в силе — не примутся только новые.")) {
        return;
      }
      btn.disabled = true;
      TuronApi.setDepartureOpen(id, open).then(function (res) {
        if (dep) dep.is_open = res.is_open ? 1 : 0;
        renderDepartureCards();
        renderDepartureControls();
        alert(res.is_open
          ? "Продажа заезда " + res.code + " открыта."
          : "Продажа заезда " + res.code + " закрыта." +
            (res.bookings ? " Уже продано броней: " + res.bookings + "." : ""));
      }).catch(function (err) {
        btn.disabled = false;
        alert("Не удалось изменить продажу: " + err.message);
      });
    });
    /*
     * Возрастной диапазон и «место» осмысленны только у детского тарифа —
     * у размещения они гасятся. Иначе оператор заполнил бы «от 5 до 10» у
     * строки DBL и не понял, почему это ни на что не влияет.
     */
    $("adm-dep-controls").addEventListener("change", function (e) {
      var sel = e.target.closest('[data-p="kind"]');
      if (!sel) return;
      var row = sel.closest(".tt-price-row");
      var child = sel.value === "child";
      row.querySelectorAll('[data-p="age_from"], [data-p="age_to"], [data-p="occupies_seat"]')
        .forEach(function (el) { el.disabled = !child; });
      var seat = row.querySelector(".tt-price-seat");
      if (seat) seat.classList.toggle("is-off", !child);
    });

    /* --------------------------------------------------- новый заезд */
    $("adm-new-dep").addEventListener("click", function () {
      var form = $("adm-new-dep-form");
      form.hidden = !form.hidden;
      if (!form.hidden) { fillNewDepForm(); $("nd-date").focus(); }
    });
    $("nd-cancel").addEventListener("click", function () {
      $("adm-new-dep-form").hidden = true;
    });
    $("nd-source").addEventListener("change", syncNewDepFromSource);
    $("nd-date").addEventListener("change", refreshSuggestedCode);
    $("nd-transport").addEventListener("input", refreshSuggestedCode);
    $("nd-code").addEventListener("input", function () { newDepCodeTouched = true; });

    $("adm-new-dep-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("nd-msg"), save = $("nd-save");
      msg.className = "tt-editor-msg";
      msg.textContent = "Создаю…";
      save.disabled = true;
      TuronApi.createDeparture({
        source_code: $("nd-source").value || null,
        code: $("nd-code").value,
        date_start: $("nd-date").value,
        transport: $("nd-transport").value,
        capacity: $("nd-capacity").value === "" ? null : Number($("nd-capacity").value),
      }).then(function (res) {
        save.disabled = false;
        $("adm-new-dep-form").hidden = true;
        // Перечитываем список: в нём и прайс, и порядок по датам.
        return TuronApi.departures({ all: true }).then(function (list) {
          state.departures = list;
          setSelectedDeparture(res.code);
          alert("Заезд " + res.code + " создан" +
            (res.prices_copied
              ? ". Скопировано цен: " + res.prices_copied + "."
              : " БЕЗ ЦЕН и закрыт для продажи — заполните прайс кнопкой «Цены» " +
                "и откройте продажу."));
        });
      }).catch(function (err) {
        save.disabled = false;
        msg.className = "tt-editor-msg is-err";
        msg.textContent = err.message;
      });
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
    $("ov-activity").addEventListener("click", function (e) {
      var row = e.target.closest("[data-activity-booking]");
      if (row) openBooking(row.dataset.activityBooking);
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

    /*
     * Правка данных туриста. Одно окно, две формы, и разделены они не для
     * красоты: документ (ФИО, номер, срок) не трогает ни размещение, ни дату
     * рождения, ни цену — сумма брони и число мест измениться не могут в
     * принципе. Дата рождения наоборот определяет тариф, а значит цену
     * пассажира, число занятых мест и сумму брони, поэтому идёт в два шага:
     * сначала сервер СЧИТАЕТ и возвращает, что изменится, и только потом
     * применяем. Иначе оператор подписывался бы под сменой суммы вслепую.
     */
    var paxEdit = null;   // { id, row, previewDate, preview }

    function paxMsg(id, text, kind) {
      var el = $(id);
      el.textContent = text || "";
      el.className = "tt-editor-msg" + (kind ? " is-" + kind : "");
    }

    // Расчёт устаревает, как только оператор трогает дату: применять можно
    // только то, что он реально видел на экране.
    function dropBirthPreview() {
      paxEdit && (paxEdit.preview = null, paxEdit.previewDate = null);
      $("pax-bd-preview").hidden = true;
      $("pax-bd-preview").innerHTML = "";
      $("pax-bd-apply").hidden = true;
      $("pax-bd-calc").hidden = false;
    }

    function openPaxEditor(id) {
      var row = ((state.current && state.current.passengers) || [])
        .filter(function (p) { return p.passenger_id === id; })[0];
      if (!row) return;
      paxEdit = { id: id, row: row, previewDate: null, preview: null };

      $("pax-sub").textContent = (row.full_name || "") +
        " · бронь " + (row.booking_code || "") +
        " · " + (row.agency_name || "");
      var nm = TuronApi.splitName(row.full_name);
      $("pax-last").value = nm.last_name;
      $("pax-first").value = nm.first_name;
      $("pax-middle").value = nm.middle_name;
      $("pax-passport").value = row.passport_number || "";
      $("pax-expiry").value = row.passport_expiry || "";
      $("pax-birth").value = row.birth_date || "";
      paxMsg("pax-doc-msg", "");
      paxMsg("pax-bd-msg", "");
      dropBirthPreview();
      $("pax-doc-save").disabled = false;
      $("pax-bd-calc").disabled = false;
      $("pax-modal").hidden = false;
      $("pax-last").focus();
    }

    function closePaxEditor() {
      $("pax-modal").hidden = true;
      paxEdit = null;
    }

    $("pax-close").addEventListener("click", closePaxEditor);
    $("pax-modal").addEventListener("click", function (e) {
      if (e.target === $("pax-modal")) closePaxEditor();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("pax-modal").hidden) closePaxEditor();
    });

    $("pax-doc-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!paxEdit) return;
      var name = TuronApi.joinName({
        last_name: $("pax-last").value,
        first_name: $("pax-first").value,
        middle_name: $("pax-middle").value,
      });
      var num = $("pax-passport").value.trim();
      var exp = $("pax-expiry").value.trim();
      // Формат номера намеренно не проверяем: паспорта разных стран, и
      // шаблон вроде AA1234567 отсёк бы законный документ. Отчество тоже
      // не требуем — в загранпаспортах его часто нет.
      if (!$("pax-last").value.trim() || !$("pax-first").value.trim() || !num) {
        paxMsg("pax-doc-msg", "Фамилия, имя и номер паспорта обязательны.", "err");
        return;
      }
      $("pax-doc-save").disabled = true;
      paxMsg("pax-doc-msg", "Сохраняем…");
      TuronApi.adminUpdateDocument(paxEdit.id, {
        full_name: name, passport_number: num, passport_expiry: exp,
      }).then(function (res) {
        $("pax-doc-save").disabled = false;
        if (res.changed === false) {
          paxMsg("pax-doc-msg", "Данные не изменились.");
          return;
        }
        paxMsg("pax-doc-msg", "Сохранено, правка записана в историю брони.", "ok");
        // Ведомость перечитываем, но окно не закрываем: оператор мог прийти
        // чинить и дату рождения тоже.
        loadManifest();
      }).catch(function (err) {
        $("pax-doc-save").disabled = false;
        paxMsg("pax-doc-msg", err.message, "err");
      });
    });

    $("pax-birth").addEventListener("input", function () {
      paxMsg("pax-bd-msg", "");
      dropBirthPreview();
    });

    $("pax-bd-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!paxEdit) return;
      var date = $("pax-birth").value.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        paxMsg("pax-bd-msg", "Укажите дату рождения.", "err");
        return;
      }
      if (date === paxEdit.row.birth_date) {
        paxMsg("pax-bd-msg", "Дата не изменилась.");
        return;
      }
      $("pax-bd-calc").disabled = true;
      paxMsg("pax-bd-msg", "Считаем…");
      TuronApi.adminUpdateBirthdate(paxEdit.id, date).then(function (pv) {
        $("pax-bd-calc").disabled = false;
        paxEdit.previewDate = date;
        paxEdit.preview = pv;
        paxMsg("pax-bd-msg", "Проверьте расчёт и примените.");
        renderBirthPreview(pv);
      }).catch(function (err) {
        $("pax-bd-calc").disabled = false;
        paxMsg("pax-bd-msg", err.message, "err");
      });
    });

    function line(label, value) {
      return '<div class="tt-sum-line"><span>' + esc(label) + "</span><strong>" +
        esc(value) + "</strong></div>";
    }

    function renderBirthPreview(pv) {
      var sameTariff = pv.tariff.from === pv.tariff.to;
      var priceMoves = pv.price.from !== pv.price.to;
      var html =
        line("Дата рождения", pv.birth_date.from + " → " + pv.birth_date.to) +
        (sameTariff
          ? line("Тариф", "не меняется (" + pv.tariff.to + ")")
          : line("Тариф", pv.tariff.from + " → " + pv.tariff.to)) +
        (pv.seats_delta !== 0
          ? line("Мест", (pv.seats_delta > 0 ? "+" : "") + pv.seats_delta)
          : "") +
        (priceMoves
          ? line("Цена пассажира", money(pv.price.from) + " → " + money(pv.price.to)) +
            line("Сумма брони", money(pv.total_price.from) + " → " + money(pv.total_price.to))
          : line("Цена пассажира", "не меняется (" + money(pv.price.to) + ")"));

      // Чекбокс только когда есть что оставлять: тариф уехал и цена вместе с
      // ним. Решает оператор — ошибку внёс агент, и двигать деньги
      // необязательно.
      if (!sameTariff && priceMoves) {
        html += '<label class="tt-editor-keep"><input type="checkbox" id="pax-keep-price" />' +
          "<span>Оставить прежнюю цену " + esc(money(pv.price.from)) +
          " — тариф исправить, деньги не двигать</span></label>";
      }
      $("pax-bd-preview").innerHTML = html;
      $("pax-bd-preview").hidden = false;
      $("pax-bd-apply").hidden = false;
      $("pax-bd-calc").hidden = true;
    }

    $("pax-bd-apply").addEventListener("click", function () {
      if (!paxEdit || !paxEdit.preview) return;
      // Дата берётся ИЗ РАСЧЁТА, а не из поля: поле могли поправить после
      // расчёта, и тогда применилось бы не то, что оператор видел.
      var date = paxEdit.previewDate;
      var keepBox = $("pax-keep-price");
      var keep = !!(keepBox && keepBox.checked);
      $("pax-bd-apply").disabled = true;
      paxMsg("pax-bd-msg", "Применяем…");
      TuronApi.adminUpdateBirthdate(paxEdit.id, date, { confirm: true, keepPrice: keep })
        .then(function () {
          $("pax-bd-apply").disabled = false;
          paxMsg("pax-bd-msg", "Дата исправлена, правка записана в историю брони.", "ok");
          dropBirthPreview();
          loadManifest();
          closePaxEditor();
        }).catch(function (err) {
          $("pax-bd-apply").disabled = false;
          paxMsg("pax-bd-msg", err.message, "err");
        });
    });

    $("adm-manifest").addEventListener("click", function (e) {
      var fix = e.target.closest("[data-fix-pax]");
      if (fix) openPaxEditor(Number(fix.dataset.fixPax));
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
      /*
       * Замена состава. Саму форму держит app.js (она одна на кабинет —
       * и на новую бронь, и на правку), поэтому здесь только находим бронь
       * и передаём её открывалке. Если app.js ещё не зарегистрировал её,
       * честно говорим об этом, а не молчим сломанной кнопкой.
       */
      var compBtn = e.target.closest("[data-composition]");
      if (compBtn) {
        var compId = Number(compBtn.dataset.composition);
        var booking = (state.shown || []).filter(function (x) { return x.id === compId; })[0];
        if (!booking) return;
        if (!compositionOpener) {
          alert("Окно правки состава недоступно — обновите страницу.");
          return;
        }
        compositionOpener(booking);
        return;
      }

      var cancelBtn = e.target.closest("[data-cancel]");
      if (cancelBtn) {
        var cid = Number(cancelBtn.dataset.cancel);
        // Показываем удержание по тому же правилу, что видит агентство,
        // чтобы оператор не считал его в уме перед разговором с агентом.
        // То же правило, что видит агентство: одна функция на оба кабинета,
        // иначе оператор и агент считали бы удержание по-разному.
        var pen = TuronApi.cancellationPenalty(
          cancelBtn.dataset.date, cancelBtn.dataset.total);
        var warn = pen.penalty
          ? "До выезда меньше " + TuronApi.FINAL_DAYS + " дней — удержание 100% (" +
            money(pen.amount) + ").\n\n"
          : "До выезда " + TuronApi.FINAL_DAYS + " дней или больше — без удержания.\n\n";
        if (!confirm(warn + "Отменить бронь " + cancelBtn.dataset.code +
                     "? Места вернутся в продажу.")) return;
        cancelBtn.disabled = true;
        TuronApi.adminCancelBooking(cid).then(function (res) {
          Admin.reload();
          alert("Бронь " + res.booking_code + " отменена, освобождено мест: " +
            res.released_seats + ".");
        }).catch(function (err) {
          alert(err.message);
          cancelBtn.disabled = false;
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

      /*
       * Переплата не блокируется, а подтверждается: деньги уже пришли на
       * счёт, и запретить оператору провести реальное поступление нельзя.
       * Сервер первым запросом такую сумму не проводит и возвращает 409 с
       * расчётом — показываем его и переспрашиваем. Так ловится лишний ноль
       * в сумме, а законный аванс проходит в один дополнительный клик.
       */
      function done(res) {
        Admin.reload();
        alert("Оплата проведена. По брони " + res.booking_code +
              " оплачено " + money(res.paid) + ", остаток " + money(res.balance) + ".");
      }
      function failed(err) {
        btn.disabled = false;
        alert(err.message);
      }

      TuronApi.addPayment(code, amount).then(done).catch(function (err) {
        var d = err && err.data;
        if (!(err.status === 409 && d && d.overpay)) return failed(err);
        if (!confirm(err.message + "\n\nПровести всё равно? " +
                     "Переплата останется на брони как аванс.")) {
          btn.disabled = false;
          return;
        }
        TuronApi.addPayment(code, amount, null, { allowOverpay: true })
          .then(done).catch(failed);
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
    openBooking: openBooking,
    setActivity: function (activity) {
      state.activity = activity || [];
      if ($("ov-activity") && state.confirmedAll.length) renderOverview();
    },

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
        renderDepartureControls();
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

    setCompositionOpener: function (fn) { compositionOpener = fn; },

    reload: function () {
      loadManifest();
      loadAdminBookings(false);
      loadOverviewData().then(loadAgencies);
    },
  };

  global.TuronAdmin = Admin;
})(window);
