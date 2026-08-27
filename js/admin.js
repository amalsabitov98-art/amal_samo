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
    detailTab: "passengers", departureListScroll: 0,
    departurePeriod: "upcoming", departureDirection: "", departureRoute: "",
    departureSale: "", departureLoad: "",
    // «Обзор» и статистика агентств считаются из одного и того же среза
    // подтверждённых броней — второй запрос не нужен. AGGREGATE_LIMIT это
    // потолок сервера (200): при большем количестве броней сводка станет
    // неполной, и это явно подписывается на экране, а не замалчивается.
    confirmedAll: [], confirmedTotal: 0, activity: [],
    // последний отрисованный список броней — см. renderAdminBookings
    shown: [],
    // каталог туров операторской вкладки «Туры»
    tours: [],
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

  /* ------------------------------------------------- фотографии оператора
   *
   * Снимок ужимается В БРАУЗЕРЕ, до отправки: с телефона приходят кадры на
   * 8-12 МБ, а на странице они всё равно показываются шириной от силы в
   * тысячу точек. Так не улетает лишний трафик у оператора, воркеру не
   * нужна библиотека обработки картинок (в Workers её и не поставить без
   * платного Images), а в хранилище не копятся оригиналы.
   *
   * 1600px по длинной стороне и JPEG 0.82 — на глаз неотличимо от
   * оригинала на любом экране, а вес падает с мегабайтов до 200-400 КБ.
   * PNG и WebP тоже пересобираются в JPEG: прозрачность фотографиям не
   * нужна, а PNG для снимка это всегда мегабайты вместо десятков килобайт
   * (тем же кончилась история с фотографией в блоке «Свяжитесь с нами»).
   */
  var MEDIA_MAX_SIDE = 1600;
  var MEDIA_QUALITY = 0.82;

  function shrinkImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) {
        reject(new Error("Это не картинка"));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { reject(new Error("Не удалось прочитать снимок")); return; }
        var scale = Math.min(1, MEDIA_MAX_SIDE / Math.max(w, h));
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        var ctx = canvas.getContext("2d");
        // Белая подложка: у PNG с прозрачностью иначе получается чёрный фон,
        // потому что JPEG прозрачность не хранит.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Не удалось пересобрать снимок"));
        }, "image/jpeg", MEDIA_QUALITY);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось открыть снимок"));
      };
      img.src = url;
    });
  }

  /* Виджет «фотография»: превью, кнопка выбора, кнопка «убрать».
   * Значение хранится в скрытом поле — форма собирает его как обычный ввод
   * и ничего не знает про загрузку. */
  function photoFieldHtml(id, value, label) {
    return '<div class="tt-photo-field" data-photo="' + esc(id) + '">' +
      '<span class="tt-photo-label">' + esc(label) + "</span>" +
      '<div class="tt-photo-body">' +
        '<span class="tt-photo-preview' + (value ? " has-photo" : "") + '"' +
          (value ? ' style="background-image:url(' + esc(value) + ')"' : "") +
          " data-photo-preview></span>" +
        '<div class="tt-photo-actions">' +
          '<label class="tt-btn tt-btn-sm">' +
            '<input type="file" accept="image/*" hidden data-photo-input />' +
            "Выбрать файл</label>" +
          '<button type="button" class="tt-btn tt-btn-sm tt-btn-ghost"' +
            (value ? "" : " hidden") + " data-photo-clear>Убрать</button>" +
          '<span class="tt-photo-note" data-photo-note>' +
            (value ? "" : "JPEG или PNG, снимок ужмётся сам") + "</span>" +
        "</div>" +
      "</div>" +
      '<input type="hidden" id="' + esc(id) + '" value="' + esc(value || "") + '" />' +
    "</div>";
  }

  /* Один обработчик на весь кабинет, а не по одному на каждый виджет:
   * формы перерисовываются целиком, и навешенные на элементы обработчики
   * терялись бы вместе с разметкой. */
  document.addEventListener("change", function (e) {
    var input = e.target.closest("[data-photo-input]");
    if (!input || !input.files || !input.files[0]) return;
    var box = input.closest("[data-photo]");
    var hidden = document.getElementById(box.dataset.photo);
    var preview = box.querySelector("[data-photo-preview]");
    var note = box.querySelector("[data-photo-note]");
    var clear = box.querySelector("[data-photo-clear]");
    var file = input.files[0];
    input.value = "";   // чтобы повторный выбор того же файла тоже сработал

    note.textContent = "Готовим снимок…";
    shrinkImage(file).then(function (blob) {
      note.textContent = "Загружаем…";
      return TuronApi.uploadMedia(blob, box.dataset.photo);
    }).then(function (res) {
      hidden.value = res.url;
      preview.style.backgroundImage = "url(" + res.url + ")";
      preview.classList.add("has-photo");
      clear.hidden = false;
      note.textContent = "Загружено — не забудьте сохранить";
    }).catch(function (err) {
      note.textContent = err.message || "Не удалось загрузить";
    });
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-photo-clear]");
    if (!btn) return;
    var box = btn.closest("[data-photo]");
    document.getElementById(box.dataset.photo).value = "";
    var preview = box.querySelector("[data-photo-preview]");
    preview.style.backgroundImage = "";
    preview.classList.remove("has-photo");
    btn.hidden = true;
    box.querySelector("[data-photo-note]").textContent = "Убрано — не забудьте сохранить";
  });

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
  var OP_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var OP_MONTHS_SHORT = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН",
    "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
  var OP_ARRIVAL = { TZX: "Трабзон", BUS: "Батуми", MED: "Медина", JED: "Джидда" };

  /* Подпись заезда: НАЗВАНИЕ ТУРА и город прилёта.
   *
   * Раньше здесь стояло «Умра» или «Карадениз» — жёстко, по коду заезда.
   * Пока туры заводились только seed-файлом, других вариантов и не было;
   * с появлением вкладки «Туры» любой новый заезд стал подписываться
   * «Карадениз», к какому бы туру ни принадлежал. Название приходит в
   * listDepartures (t.name AS tour_name), брать его больше неоткуда не
   * нужно.
   *
   * Город прилёта откатывается на сам код транспорта: у нового тура это
   * может быть аэропорт, которого нет в OP_ARRIVAL, и «CHZ» честнее
   * выдуманного названия. */
  function opDepIdentity(d) {
    var umra = /^UMRA_/i.test(d.code || "");
    var arrival = OP_ARRIVAL[d.transport] || d.transport || "Маршрут";
    var tour = d.tour_name || (umra ? "Умра" : "Тур");
    return {
      badge: umra ? "Умра · " + (d.transport || arrival) : (TRANSPORT[d.transport] || arrival),
      route: tour + " · " + arrival,
    };
  }

  // Вся строка остаётся кнопкой: визуальное действие справа не уменьшает
  // область клика и не меняет существующую логику выбора заезда.
  function opDepCardHtml(d, active) {
    // Закрытый заезд из сетки не убираем: оператору его надо найти, чтобы
    // открыть обратно. Помечаем и приглушаем.
    var closed = d.is_open === 0;
    var date = calendarDate(d.date_start);
    var identity = opDepIdentity(d);
    return '<button type="button" class="tt-op-dep' +
      (active ? " is-active" : "") + (closed ? " is-closed" : "") +
      '" data-departure="' + esc(d.code) + '">' +
      '<span class="tt-op-date"><strong>' + (date ? date.getUTCDate() : "—") + '</strong>' +
        '<small>' + (date ? OP_MONTHS_SHORT[date.getUTCMonth()] : "") + '</small></span>' +
      '<span class="tt-op-dot" aria-hidden="true"></span>' +
      '<span class="tt-op-code">' + esc(d.code) + "</span>" +
      '<span class="tt-badge tt-op-route-badge">' + esc(identity.badge) + "</span>" +
      '<span class="tt-op-route">' + esc(identity.route) + "</span>" +
      '<span class="tt-badge tt-op-status ' + (closed ? "tt-badge-off" : "is-open") + '">' +
        (closed ? "Продажа закрыта" : "Продажа открыта") + "</span>" +
      '<span class="tt-op-open">Открыть <b aria-hidden="true">›</b></span>' +
    "</button>";
  }

  function opWeekKey(d) {
    var date = calendarDate(d.date_start);
    if (!date) return "unknown";
    return date.getUTCFullYear() + "-" + date.getUTCMonth() + "-" +
      Math.floor((date.getUTCDate() - 1) / 7);
  }

  function opWeekLabel(list) {
    var first = calendarDate(list[0].date_start);
    if (!first) return "Даты не указаны";
    var start = Math.floor((first.getUTCDate() - 1) / 7) * 7 + 1;
    var lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    var end = Math.min(start + 6, lastDay);
    return start + "–" + end + " " + OP_MONTHS[first.getUTCMonth()];
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
    // Панель собирается заново, и расчёт переноса вместе с ней исчезает —
    // сбрасываем и его состояние, иначе «Перенести» осталось бы висеть
    // указывающим на заезд, которого на экране уже нет.
    dateChange = null;
    var d = state.departures.filter(function (x) {
      return x.code === state.selectedDeparture;
    })[0];
    if (!d) { box.hidden = true; box.innerHTML = ""; return; }

    var closed = d.is_open === 0;
    box.hidden = false;
    var identity = opDepIdentity(d);
    box.innerHTML =
      '<div class="tt-detail-head">' +
        '<div class="tt-detail-title"><h2>' + esc(d.code + " · " + identity.route) + '</h2>' +
          '<div><span>' + formatDate(d.date_start) + '</span><span>·</span>' +
          '<span>' + esc(identity.badge) + '</span>' +
          '<span class="tt-badge tt-op-status ' + (closed ? "tt-badge-off" : "is-open") + '">' +
            (closed ? "Продажа закрыта" : "Продажа открыта") + "</span>" +
          // Загрузка заезда. Она жила в шапке списка пассажиров, а при
          // переезде на отдельный экран заезда потерялась вместе с ней.
          // Нужна именно здесь: у заездов, проданных ДО запуска системы,
          // seats_taken больше нуля при пустом списке, и без счётчика
          // пустой экран не отвечает на вопрос «а почему пусто».
          (Number(d.capacity || 0)
            ? '<span class="tt-manifest-seats tt-muted-note">занято ' +
              Number(d.seats_taken || 0) + " из " + Number(d.capacity) + "</span>"
            : "") +
          "</div></div>" +
        '<div class="tt-detail-actions">' +
          '<button type="button" class="tt-btn secondary" id="adm-export" disabled>Выгрузить Excel</button>' +
          '<button type="button" class="tt-btn secondary" data-detail-open="prices">Цены</button>' +
          '<button type="button" class="tt-btn secondary" data-dep-date="' + d.id +
            '" data-current="' + esc(d.date_start) + '">Изменить дату</button>' +
          '<button type="button" class="tt-btn secondary tt-detail-sale" data-dep-toggle="' +
            d.id + '" data-open="' + (closed ? "1" : "0") + '">' +
            (closed ? "Открыть продажу" : "Закрыть продажу") + "</button>" +
        "</div>" +
      "</div>";
  }

  /* ----------------------------------------------------------- туры
   * Тур — ПРОДУКТ, заезды — его даты. Код после создания не меняется: он
   * стоит в публичной ссылке на карточку, которую агенты уже разослали
   * клиентам. Удаления нет — только снятие с продажи, как у заезда.
   */
  var tourEditing = null;   // id правимого тура; null — форма создаёт новый

  /* ------------------------------------------- плитки направлений
   * Направление НЕ заводится и НЕ удаляется отдельно: оно появляется само,
   * как только у тура в поле «направление» написано новое слово. Здесь
   * правится только оформление плитки — заголовок, подзаголовок,
   * фотография, порядок.
   *
   * Список приходит СОБРАННЫМ ИЗ ТУРОВ, а не из таблицы destinations:
   * направление без оформления должно быть видно, иначе оператор не поймёт,
   * что его надо оформить.
   */
  function destRowHtml(d) {
    var id = "od-" + d.name.replace(/[^\wА-Яа-яЁё]+/g, "_");
    var plain = !d.title;
    return '<form class="tt-dest-row' + (plain ? " is-plain" : "") +
      '" data-dest="' + esc(d.name) + '">' +
      '<div class="tt-dest-head">' +
        "<strong>" + esc(d.name) + "</strong>" +
        '<span class="tt-muted-note">' + esc(d.tours_count + " " + plural(d.tours_count, "тур", "тура", "туров")) +
          (d.bookable_count !== d.tours_count
            ? ", в продаже " + d.bookable_count : "") + "</span>" +
        (plain ? '<span class="tt-badge tt-badge-off">Без оформления</span>' : "") +
      "</div>" +
      '<div class="tt-dest-grid">' +
        '<div class="tt-field-full">' +
          '<label for="' + id + '-title">Заголовок плитки</label>' +
          '<input type="text" id="' + id + '-title" data-f="title" value="' +
            esc(d.title || "") + '" placeholder="' + esc(d.name) + '" />' +
        "</div>" +
        '<div class="tt-field-full">' +
          '<label for="' + id + '-sort">Порядок</label>' +
          '<input type="number" id="' + id + '-sort" data-f="sort" min="0" max="999" value="' +
            (d.sort == null ? "" : d.sort) + '" />' +
        "</div>" +
        '<div class="tt-field-full tt-col-2">' +
          '<label for="' + id + '-blurb">Подзаголовок</label>' +
          '<input type="text" id="' + id + '-blurb" data-f="blurb" value="' +
            esc(d.blurb || "") + '" placeholder="Черноморское побережье: Трабзон, Ризе, Батуми" />' +
        "</div>" +
      "</div>" +
      photoFieldHtml(id + "-image", d.image || "", "Фотография плитки") +
      '<div class="tt-newdep-actions">' +
        '<span class="tt-editor-msg" data-dest-msg></span>' +
        '<button type="submit" class="tt-btn tt-btn-sm">Сохранить</button>' +
      "</div>" +
    "</form>";
  }

  function renderDestinations(list) {
    $("od-list").innerHTML = list.length
      ? list.map(destRowHtml).join("")
      : '<p class="tt-muted-note">Нет ни одного тура — направления появятся ' +
        "вместе с ними.</p>";
  }

  function loadDestinations() {
    $("od-list").innerHTML = '<p class="tt-muted-note">Загружаем…</p>';
    return TuronApi.adminDestinations().then(renderDestinations).catch(function (e) {
      $("od-list").innerHTML = '<p class="tt-editor-msg is-err">' +
        esc(e.message || "Не удалось загрузить") + "</p>";
    });
  }

  function tourRowHtml(t) {
    var off = t.is_bookable === 0;
    return '<article class="tt-booking' + (off ? " is-cancelled" : "") + '">' +
      "<div><strong>" + esc(t.name) + "</strong>" +
        (off ? ' <span class="tt-badge tt-badge-off">Снят с продажи</span>' : "") +
        '<div class="tt-muted-note">' + esc(t.code) + " · " + esc(t.destination) +
          (t.nights ? " · " + t.nights + " ноч." : "") + "</div></div>" +
      '<div class="tt-booking-money">' +
        '<div class="tt-sum-line"><span>Заездов</span><strong>' +
          (t.upcoming || 0) + " из " + (t.departures || 0) + "</strong></div>" +
        '<div class="tt-sum-line"><span>Комиссия агентства</span><strong>' +
          money(t.agency_commission || 0) + "</strong></div>" +
        '<div class="tt-sum-line"><span>Комиссия оператора</span><strong>' +
          money(t.operator_commission || 0) + "</strong></div>" +
      "</div>" +
      '<div class="tt-booking-action">' +
        '<button type="button" class="tt-btn secondary tt-btn-sm" data-tour-edit="' +
          t.id + '">Изменить</button>' +
        '<button type="button" class="tt-btn secondary tt-btn-sm" data-tour-content="' +
          t.id + '">Карточка</button>' +
      "</div>" +
    "</article>";
  }

  function renderTours() {
    $("ot-list").innerHTML = state.tours.length
      ? state.tours.map(tourRowHtml).join("")
      : '<div class="tt-empty-state">Туров пока нет.</div>';
    // Направления подсказываем уже заведёнными: они связаны с плитками
    // каталога ПО ТЕКСТУ, и «Турция » с пробелом завела бы вторую плитку.
    var seen = {};
    $("ot-dest-list").innerHTML = state.tours.map(function (t) {
      if (!t.destination || seen[t.destination]) return "";
      seen[t.destination] = true;
      return '<option value="' + esc(t.destination) + '"></option>';
    }).join("");
  }

  function loadTours() {
    return TuronApi.adminTours().then(function (list) {
      state.tours = list || [];
      renderTours();
    }).catch(function (err) {
      $("ot-list").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить туры.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  function fillTourForm(t) {
    tourEditing = t ? t.id : null;
    $("ot-form-title").textContent = t ? "Тур " + t.code : "Новый тур";
    $("ot-form-hint").textContent = t
      ? "Код тура не меняется: он стоит в ссылке на карточку, которую агенты " +
        "уже разослали клиентам. Всё остальное правится свободно."
      : "После создания к туру можно вешать заезды. Код в ссылке на карточку — " +
        "поменять его потом нельзя.";
    $("ot-code").value = t ? t.code : "";
    $("ot-code").disabled = !!t;
    $("ot-name").value = t ? t.name : "";
    $("ot-destination").value = t ? t.destination : "";
    $("ot-nights").value = t && t.nights != null ? t.nights : "";
    $("ot-agency").value = t ? (t.agency_commission || 0) : "";
    $("ot-operator").value = t ? (t.operator_commission || 0) : "";
    $("ot-from").value = t && t.from_price != null ? t.from_price : "";
    $("ot-description").value = (t && t.description) || "";
    $("ot-bookable").checked = !t || t.is_bookable !== 0;
    // Виджет фотографии перерисовывается ЦЕЛИКОМ на каждое открытие формы:
    // в нём есть состояние (превью, подпись «загружено»), и от прошлого
    // тура оно осталось бы висеть на новом.
    $("ot-hero-slot").innerHTML = photoFieldHtml(
      "ot-hero", (t && t.hero_image) || "", "Заглавный кадр карточки");
    $("ot-msg").textContent = "";
    $("ot-msg").className = "tt-editor-msg";
    $("ot-form").hidden = false;
  }

  /* ------------------------------------------ контент карточки тура
   * Порядок строк задаётся их ПОЛОЖЕНИЕМ в списке: оператор двигает
   * строку стрелками, а sort проставляет сервер по позиции. Числа
   * сортировки руками не правятся — на них ошибаются.
   */
  var contentEditing = null;   // id тура, чья карточка открыта

  /*
   * Имя блока по виду строки. Не выводится формулой: блоки вариантов и
   * дней названы во множественном числе (#oc-variants, #oc-days), а
   * остальные — по виду (#oc-included). На попытке вывести это правилом
   * уже спотыкались: «variant» превращался в несуществующий #oc-variant,
   * и кнопка «+ Вариант» молча падала.
   */
  function ocBoxId(kind) {
    if (kind === "variant") return "oc-variants";
    if (kind === "day") return "oc-days";
    return "oc-" + kind;
  }

  /* Переводы строки контента. Свёрнуты в <details> намеренно: оператор
   * заводит тур по-русски, а переводы дописывает потом — развёрнутые поля
   * втрое удлинили бы форму и мешали бы основной работе.
   *
   * Пустое поле = перевода нет, и карточка на этом языке покажет русский.
   * Это не ошибка, а рабочее состояние: новый тур живёт без переводов,
   * пока их не напишут.
   */
  var OC_LANGS = [["uz", "O‘zbekcha"], ["en", "English"], ["tr", "Türkçe"]];

  function ocI18nBox(fields, i18n) {
    var data = i18n || {};
    var filled = OC_LANGS.some(function (l) {
      var v = data[l[0]] || {};
      return fields.some(function (f) { return v[f[0]]; });
    });
    return '<details class="tt-oc-i18n"' + (filled ? " open" : "") + ">" +
      "<summary>" + (filled ? "Переводы ✓" : "Переводы") + "</summary>" +
      OC_LANGS.map(function (l) {
        var v = data[l[0]] || {};
        return '<div class="tt-oc-i18n-lang"><b>' + l[1] + "</b>" +
          fields.map(function (f) {
            return '<input type="text" data-i18n="' + l[0] + "." + f[0] +
              '" value="' + esc(v[f[0]] || "") + '" placeholder="' + esc(f[1]) +
              '" aria-label="' + esc(f[1] + ", " + l[1]) + '" />';
          }).join("") +
        "</div>";
      }).join("") +
    "</details>";
  }

  /** Собрать {uz:{…},en:{…},tr:{…}} из полей строки; пусто → null. */
  function collectI18n(row) {
    var out = {};
    var any = false;
    Array.prototype.forEach.call(row.querySelectorAll("[data-i18n]"), function (el) {
      var parts = el.dataset.i18n.split(".");
      var value = el.value.trim();
      if (!value) return;
      (out[parts[0]] = out[parts[0]] || {})[parts[1]] = value;
      any = true;
    });
    return any ? out : null;
  }

  function ocVariantRow(v) {
    return '<div class="tt-oc-row" data-oc-kind="variant">' +
      '<input type="text" data-f="code" value="' + esc(v.code || "") +
        '" placeholder="A" maxlength="16" aria-label="Код варианта" />' +
      '<input type="text" data-f="title" value="' + esc(v.title || "") +
        '" placeholder="Прилёт в Батуми" aria-label="Заголовок варианта" />' +
      ocRowButtons() +
      ocI18nBox([["title", "Заголовок варианта"]], v.i18n) +
    "</div>";
  }

  function ocRowButtons() {
    return '<span class="tt-oc-actions">' +
      '<button type="button" class="tt-icon-btn" data-oc-up aria-label="Выше">↑</button>' +
      '<button type="button" class="tt-icon-btn" data-oc-down aria-label="Ниже">↓</button>' +
      '<button type="button" class="tt-icon-btn" data-oc-del aria-label="Убрать">&times;</button>' +
    "</span>";
  }

  function ocVariantOptions(selected) {
    var opts = '<option value="">все варианты</option>';
    Array.prototype.forEach.call(
      document.querySelectorAll('#oc-variants [data-f="code"]'),
      function (input) {
        var code = input.value.trim().toUpperCase();
        if (!code) return;
        opts += '<option value="' + esc(code) + '"' +
          (code === String(selected || "").toUpperCase() ? " selected" : "") +
          ">" + esc(code) + "</option>";
      });
    return opts;
  }

  function ocDayRow(r) {
    return '<div class="tt-oc-row tt-oc-day" data-oc-kind="day">' +
      '<input type="text" data-f="title" value="' + esc(r.title || "") +
        '" placeholder="День 1 · Прилёт" aria-label="Заголовок дня" />' +
      '<select data-f="variant" aria-label="Вариант маршрута">' +
        ocVariantOptions(r.variant) + "</select>" +
      '<textarea data-f="text" rows="2" placeholder="Что происходит в этот день"' +
        ' aria-label="Описание дня">' + esc(r.text || "") + "</textarea>" +
      ocRowButtons() +
      ocI18nBox([["title", "Заголовок дня"], ["text", "Описание дня"]], r.i18n) +
    "</div>";
  }

  function ocLineRow(kind, r) {
    return '<div class="tt-oc-row" data-oc-kind="' + kind + '">' +
      '<input type="text" data-f="text" value="' + esc(r.text || "") +
        '" placeholder="' + (kind === "info"
          ? "Виза не нужна до 30 дней" : "Авиаперелёт Ташкент — Батуми") +
        '" aria-label="Текст строки" />' +
      (kind === "info"
        ? '<input type="text" data-f="url" value="' + esc(r.url || "") +
          '" placeholder="ссылка, если нужна" aria-label="Ссылка" />'
        : "") +
      ocRowButtons() +
      ocI18nBox([["text", "Текст строки"]], r.i18n) +
    "</div>";
  }

  function renderContentEditor(data) {
    $("oc-title").textContent = "Карточка тура " + (data.code || "");
    var content = data.content || [];
    var pick = function (kind) {
      return content.filter(function (r) { return r.kind === kind; });
    };
    $("oc-variants").innerHTML = (data.variants || []).map(ocVariantRow).join("");
    // Дни рисуем ПОСЛЕ вариантов: список вариантов в их выпадающем поле
    // собирается из уже отрисованных полей выше.
    $("oc-days").innerHTML = pick("day").map(ocDayRow).join("");
    ["included", "excluded", "info"].forEach(function (kind) {
      $("oc-" + kind).innerHTML = pick(kind).map(function (r) {
        return ocLineRow(kind, r);
      }).join("");
    });
    $("oc-msg").textContent = "";
    $("oc-msg").className = "tt-editor-msg";
  }

  // Собираем обратно: порядок = порядок строк в разметке.
  function collectContent() {
    var out = [];
    ["day", "included", "excluded", "info"].forEach(function (kind) {
      var box = $(ocBoxId(kind));
      Array.prototype.forEach.call(box.querySelectorAll(".tt-oc-row"), function (row) {
        function v(name) {
          var el = row.querySelector('[data-f="' + name + '"]');
          return el ? el.value : "";
        }
        out.push({
          kind: kind,
          title: v("title") || null,
          variant: kind === "day" ? (v("variant") || null) : null,
          text: v("text"),
          url: v("url") || null,
          i18n: collectI18n(row),
        });
      });
    });
    return out;
  }

  function collectVariants() {
    return Array.prototype.map.call(
      $("oc-variants").querySelectorAll(".tt-oc-row"), function (row) {
        return {
          code: row.querySelector('[data-f="code"]').value,
          title: row.querySelector('[data-f="title"]').value,
          i18n: collectI18n(row),
        };
      });
  }

  // Список вариантов поменялся — обновляем выпадающие поля у дней, сохраняя
  // уже выбранное. Иначе день молча терял бы привязку при добавлении
  // нового варианта, и сервер отбил бы сохранение целиком.
  function refreshDayVariants() {
    Array.prototype.forEach.call(
      $("oc-days").querySelectorAll('[data-f="variant"]'), function (sel) {
        var was = sel.value;
        sel.innerHTML = ocVariantOptions(was);
      });
  }

  /* --------------------------------------------------- смена даты заезда
   * Дата тянет за собой сроки оплаты и штрафную зону по УЖЕ ПРОДАННЫМ
   * броням, поэтому сначала показываем, кого заденет, и только потом
   * применяем. Сроки считает TuronApi.paymentPolicy — та же функция, что
   * рисует «Платежи» агентству; своей арифметики здесь нет намеренно.
   */
  function dateChangeSummary(res) {
    var days = TuronApi.FINAL_DAYS;
    var rows = (res.bookings || []).map(function (b) {
      var was = TuronApi.paymentPolicy(res.from, b.created_at);
      var now = TuronApi.paymentPolicy(res.to, b.created_at);
      // Самое опасное: бронь въезжает в зону, где платить надо всё сразу,
      // а отмена удерживает 100%. Агентство об этом не просило.
      var intoPenalty = !was.urgent && now.urgent;
      var lastWas = was.steps[was.steps.length - 1].due;
      var lastNow = now.steps[now.steps.length - 1].due;
      var wasIso = lastWas.toISOString().slice(0, 10);
      var nowIso = lastNow.toISOString().slice(0, 10);

      /*
       * Подпись пишем по факту, а не «сроки сдвигаются» на все случаи.
       * Когда обе даты уже внутри FINAL_DAYS, оплата считается от ДАТЫ
       * БРОНИ («всё сразу в течение суток») и от переноса не зависит —
       * срок honestly остаётся прежним, и говорить обратное нельзя.
       */
      var note;
      if (intoPenalty) {
        note = '<span class="tt-date-flag">до выезда меньше ' + days +
          " дней: платить всё сразу, отмена со 100% удержанием</span>";
      } else if (was.urgent && now.urgent) {
        note = '<span class="tt-muted-note">оплата и так требуется полностью — ' +
          "срок не меняется</span>";
      } else if (was.urgent && !now.urgent) {
        note = '<span class="tt-muted-note">выходит из штрафной зоны: ' +
          "снова рассрочка и отмена без удержания</span>";
      } else if (wasIso === nowIso) {
        note = '<span class="tt-muted-note">срок не меняется</span>';
      } else {
        note = '<span class="tt-muted-note">срок сдвигается</span>';
      }

      return '<tr' + (intoPenalty ? ' class="tt-date-warn"' : "") + ">" +
        "<td><strong>" + esc(b.code) + "</strong><br>" +
          '<span class="tt-muted-note">' + esc(b.agency_name || "") + "</span></td>" +
        '<td class="num">' + money(b.balance) + "</td>" +
        "<td>" + formatDate(wasIso) +
          (wasIso === nowIso ? "" : " → <strong>" + formatDate(nowIso) + "</strong>") +
        "</td>" +
        "<td>" + note + "</td>" +
      "</tr>";
    });
    var risky = (res.bookings || []).filter(function (b) {
      return !TuronApi.paymentPolicy(res.from, b.created_at).urgent &&
        TuronApi.paymentPolicy(res.to, b.created_at).urgent;
    }).length;

    return '<div class="tt-editor-preview tt-date-preview">' +
      "<h4>Перенос заезда " + esc(res.code) + ": " +
        formatDate(res.from) + " → " + formatDate(res.to) + "</h4>" +
      (rows.length
        ? '<p class="tt-editor-hint">Затронет проданных броней: <b>' + rows.length +
            "</b>" + (risky
              ? '. Из них <b class="tt-date-flag">' + risky +
                "</b> попадут в штрафную зону — агентство об этом не просило, " +
                "предупредите его."
              : ". В штрафную зону никто не попадает.") + "</p>" +
          '<div class="tt-table-wrap"><table class="tt-table tt-date-table">' +
            "<thead><tr><th>Бронь</th><th>Остаток</th>" +
            "<th>Срок полной оплаты</th><th></th></tr></thead>" +
            "<tbody>" + rows.join("") + "</tbody></table></div>"
        : '<p class="tt-editor-hint">Проданных броней нет — перенос никого не затронет.</p>') +
      '<div class="tt-price-actions">' +
        '<button type="button" class="tt-btn secondary tt-btn-sm" id="adm-date-cancel">Отмена</button>' +
        '<span class="tt-editor-msg" id="adm-date-msg"></span>' +
        '<button type="button" class="tt-btn tt-btn-sm" id="adm-date-apply">Перенести заезд</button>' +
      "</div>" +
    "</div>";
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
    // Без образца сервер не знает, к какому туру привязать заезд — спрашиваем.
    // Раньше поля не было вовсе, и такой заезд просто не создавался.
    $("nd-tour-field").hidden = !!src;
    refreshSuggestedCode();
  }

  // Подтверждённый шаг переноса: какой заезд и на какую дату. Живёт здесь,
  // а не в разметке — панель заезда перерисовывается.
  var dateChange = null;

  function dropDateChange() {
    dateChange = null;
    var box = document.querySelector(".tt-date-preview");
    if (box) box.remove();
  }

  // Список туров для формы «без образца». Тянем один раз при первом
  // открытии формы: он меняется куда реже, чем заезды.
  function fillTourOptions() {
    var sel = $("nd-tour");
    if (sel.options.length) return Promise.resolve();
    return TuronApi.tours().then(function (list) {
      sel.innerHTML = (list || []).map(function (t) {
        return '<option value="' + esc(t.code) + '">' + esc(t.name || t.code) + "</option>";
      }).join("");
    }).catch(function () {
      sel.innerHTML = '<option value="">не удалось загрузить туры</option>';
    });
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
    var groups = [];
    list.forEach(function (d) {
      var key = opWeekKey(d);
      var group = groups[groups.length - 1];
      if (!group || group.key !== key) {
        group = { key: key, items: [] };
        groups.push(group);
      }
      group.items.push(d);
    });
    return groups.map(function (group) {
      return '<section class="tt-op-week"><h3><span aria-hidden="true">▣</span>' +
        esc(opWeekLabel(group.items)) + '</h3><div class="tt-op-dep-grid">' +
        group.items.map(function (d) {
          return opDepCardHtml(d, d.code === state.selectedDeparture);
        }).join("") + "</div></section>";
    }).join("");
  }

  // Заездов за сезон десятки — стеной карточек прошедшие мешают найти
  // ближайший. По умолчанию видны только предстоящие, прошедшие сворачиваем
  // за кнопку; поиск ищет по всем без разбора, раз человек уже назвал дату.
  /* Список направлений в фильтре собирается ИЗ ЗАЕЗДОВ, а не задан в
   * разметке. В разметке было ровно два пункта — «Умра» и «Карадениз», —
   * и заезд тура, заведённого оператором, отфильтровать было нечем: он
   * попадал в «Карадениз» вместе со всем, что не умра. */
  function fillDirectionFilter() {
    var select = document.getElementById("adm-filter-direction");
    if (!select) return;
    var seen = {};
    state.departures.forEach(function (d) {
      if (d.destination) seen[d.destination] = true;
    });
    var was = state.departureDirection;
    select.innerHTML = '<option value="">Направление: Все</option>' +
      Object.keys(seen).sort().map(function (dest) {
        return '<option value="' + esc(dest) + '"' +
          (dest === was ? " selected" : "") + ">Направление: " + esc(dest) + "</option>";
      }).join("");
    // Направление могло исчезнуть (последний заезд уехал в прошлое) —
    // тогда фильтр надо снять, иначе список молча останется пустым.
    if (was && !seen[was]) state.departureDirection = "";
  }

  function renderDepartureCards() {
    var q = state.departureFilter.trim().toLowerCase();
    var today = new Date().toISOString().slice(0, 10);
    var inSeven = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    var inThirty = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    var filtered = state.departures.filter(function (d) {
      var identity = opDepIdentity(d);
      if (q) {
        var haystack = [d.code, formatDate(d.date_start), d.tour_name, d.tour_code,
          identity.badge, identity.route].filter(Boolean).join(" ").toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (state.departurePeriod === "upcoming" && d.date_start < today) return false;
      if (state.departurePeriod === "7" && (d.date_start < today || d.date_start > inSeven)) return false;
      if (state.departurePeriod === "30" && (d.date_start < today || d.date_start > inThirty)) return false;
      if (state.departurePeriod === "past" && d.date_start >= today) return false;
      // Фильтр по РЕАЛЬНОМУ направлению тура. Раньше здесь была развилка
      // «умра / не умра», и любой заезд нового тура попадал в «Карадениз».
      if (state.departureDirection && d.destination !== state.departureDirection) {
        return false;
      }
      if (state.departureRoute && String(d.transport || "").toUpperCase() !== state.departureRoute) return false;
      var closed = d.is_open === 0;
      if (state.departureSale === "open" && closed) return false;
      if (state.departureSale === "closed" && !closed) return false;
      var cap = Number(d.capacity || 0);
      var remaining = cap - Number(d.seats_taken || 0);
      if (state.departureLoad === "available" && !(cap > 0 && remaining > 0)) return false;
      if (state.departureLoad === "low" && !(cap > 0 && remaining > 0 && remaining <= 10)) return false;
      if (state.departureLoad === "full" && !(cap > 0 && remaining <= 0)) return false;
      return true;
    }).sort(function (a, b) {
      if (state.departurePeriod === "past") return a.date_start > b.date_start ? -1 : 1;
      return a.date_start < b.date_start ? -1 : 1;
    });

    document.querySelectorAll("[data-dep-period]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.depPeriod === state.departurePeriod);
    });
    $("adm-filter-count").textContent = "Найдено " + filtered.length + " " +
      plural(filtered.length, "заезд", "заезда", "заездов");

    var chips = [];
    if (state.departurePeriod !== "upcoming") {
      chips.push(["period", { "7": "7 дней", "30": "30 дней", past: "Прошедшие" }[state.departurePeriod]]);
    }
    if (state.departureDirection) chips.push(["direction", state.departureDirection]);
    if (state.departureRoute) chips.push(["route", OP_ARRIVAL[state.departureRoute] || state.departureRoute]);
    if (state.departureSale) chips.push(["sale", state.departureSale === "open" ? "Продажа открыта" : "Продажа закрыта"]);
    if (state.departureLoad) chips.push(["load", {
      available: "Есть места", low: "Мало мест", full: "Мест нет",
    }[state.departureLoad]]);
    $("adm-filter-chips").innerHTML = chips.map(function (chip) {
      return '<button type="button" data-clear-filter="' + chip[0] + '">' +
        esc(chip[1]) + ' <b aria-hidden="true">×</b></button>';
    }).join("");

    $("adm-departure-cards").innerHTML = filtered.length
      ? grid(filtered)
      : '<div class="tt-empty-state">Заезды по выбранным условиям не найдены.' +
          '<div class="tt-muted-note">Измените фильтры или нажмите «Сбросить».</div></div>';
  }

  function setSelectedDeparture(code) {
    state.departureListScroll = global.scrollY || 0;
    state.selectedDeparture = code;
    $("adm-departure-list").hidden = true;
    $("adm-departure-detail").hidden = false;
    renderDepartureControls();
    setDetailTab("passengers");
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
    var box = $("adm-departure-detail");
    if (!box || !box.scrollIntoView) return;
    global.requestAnimationFrame(function () {
      var smooth = !(global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches);
      box.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    });
  }

  function showDepartureList() {
    $("adm-departure-detail").hidden = true;
    $("adm-departure-list").hidden = false;
    priceEditor = null;
    renderDepartureCards();
    global.requestAnimationFrame(function () {
      global.scrollTo({ top: state.departureListScroll, behavior: "auto" });
    });
  }

  function setDetailTab(name) {
    state.detailTab = name;
    document.querySelectorAll("[data-detail-tab]").forEach(function (button) {
      var active = button.dataset.detailTab === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-detail-pane]").forEach(function (pane) {
      pane.hidden = pane.dataset.detailPane !== name;
    });
    if (name === "prices") {
      var d = state.departures.filter(function (x) {
        return x.code === state.selectedDeparture;
      })[0];
      priceEditor = d ? d.id : null;
      $("adm-detail-prices").innerHTML = d ? priceEditorHtml(d) : "";
    }
  }

  function renderDetailSecondary(data) {
    var grouped = {};
    data.passengers.forEach(function (p) {
      var key = p.booking_code || "—";
      if (!grouped[key]) grouped[key] = {
        code: key, bookedAt: p.booked_at, agency: p.agency_name, passengers: 0, total: 0,
      };
      grouped[key].passengers++;
      grouped[key].total += Number(p.price) || 0;
    });
    var bookings = Object.keys(grouped).map(function (key) { return grouped[key]; });
    $("adm-detail-bookings").innerHTML = bookings.length
      ? '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' +
          '<th>Бронь</th><th>Создана</th><th>Агентство</th><th>Пассажиров</th>' +
          '<th>Стоимость</th><th></th></tr></thead><tbody>' +
          bookings.map(function (b) {
            return '<tr><td><strong>' + esc(b.code) + '</strong></td><td>' +
              formatDate(b.bookedAt) + '</td><td>' + esc(b.agency) + '</td><td>' +
              b.passengers + '</td><td>' + money(b.total) + '</td><td>' +
              '<button type="button" class="tt-btn secondary tt-btn-sm" data-detail-booking="' +
                esc(b.code) + '">Открыть бронь</button></td></tr>';
          }).join("") + '</tbody></table></div>'
      : '<div class="tt-empty-state">Броней через кабинет пока нет.</div>';

    var bookingCodes = {};
    bookings.forEach(function (b) { bookingCodes[b.code] = true; });
    var events = state.activity.filter(function (ev) { return bookingCodes[ev.booking_code]; });
    $("adm-detail-history").innerHTML = events.length
      ? '<div class="tt-table-wrap"><table class="tt-table"><thead><tr>' +
          '<th>Время</th><th>Действие</th><th>Бронь</th><th>Агентство</th><th>Подробности</th>' +
          '</tr></thead><tbody>' + events.map(function (ev) {
            return '<tr><td>' + formatDateTime(ev.created_at) + '</td><td><strong>' +
              esc(ACTION_LABELS[ev.action] || ev.action) + '</strong></td><td>' +
              esc(ev.booking_code) + '</td><td>' + esc(ev.agency_name || ev.actor_name) +
              '</td><td>' + esc(ev.details || "—") + '</td></tr>';
          }).join("") + '</tbody></table></div>'
      : '<div class="tt-empty-state">Изменений по этому заезду пока нет.</div>';
  }


  function renderManifest(data) {
    state.current = data;
    var pax = data.passengers;
    var head = "";
    var sum = data.summary || {};
    var paxTab = document.querySelector('[data-detail-tab="passengers"]');
    var bookingsTab = document.querySelector('[data-detail-tab="bookings"]');
    if (paxTab) paxTab.textContent = "Пассажиры · " + pax.length;
    if (bookingsTab) bookingsTab.textContent = "Брони · " + (sum.bookings_count || 0);
    renderDetailSecondary(data);
    if (!pax.length) {
      $("adm-manifest").innerHTML = head +
        '<div class="tt-empty-state">На этот заезд ещё нет броней через кабинет.' +
        '<div class="tt-muted-note">Места, проданные до запуска системы, ' +
        "учтены в счётчике заезда, но пофамильно их здесь нет.</div></div>";
      if ($("adm-export")) $("adm-export").disabled = true;
      return;
    }
    if ($("adm-export")) $("adm-export").disabled = false;

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
      if ($("adm-export")) $("adm-export").disabled = true;
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
            '<span class="tt-ops-open">Открыть <b aria-hidden="true">→</b></span>' +
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

    $("ov-tab-departures-count").textContent = weekDeps.length;
    $("ov-tab-activity-count").textContent = state.activity.length;
    $("ov-tab-debtors-count").textContent = debtors.length;

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

  function setOverviewTab(name) {
    document.querySelectorAll("[data-overview-tab]").forEach(function (button) {
      var active = button.dataset.overviewTab === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-overview-pane]").forEach(function (pane) {
      pane.hidden = pane.dataset.overviewPane !== name;
    });
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
    document.querySelector(".tt-period-switch").addEventListener("click", function (e) {
      var button = e.target.closest("[data-dep-period]");
      if (!button) return;
      state.departurePeriod = button.dataset.depPeriod;
      renderDepartureCards();
    });
    [
      ["adm-filter-direction", "departureDirection"],
      ["adm-filter-route", "departureRoute"],
      ["adm-filter-sale", "departureSale"],
      ["adm-filter-load", "departureLoad"],
    ].forEach(function (pair) {
      $(pair[0]).addEventListener("change", function () {
        state[pair[1]] = this.value;
        renderDepartureCards();
      });
    });
    $("adm-filter-reset").addEventListener("click", function () {
      state.departureFilter = "";
      state.departurePeriod = "upcoming";
      state.departureDirection = "";
      state.departureRoute = "";
      state.departureSale = "";
      state.departureLoad = "";
      $("adm-departure-search").value = "";
      $("adm-filter-direction").value = "";
      $("adm-filter-route").value = "";
      $("adm-filter-sale").value = "";
      $("adm-filter-load").value = "";
      renderDepartureCards();
    });
    $("adm-filter-chips").addEventListener("click", function (e) {
      var chip = e.target.closest("[data-clear-filter]");
      if (!chip) return;
      var key = chip.dataset.clearFilter;
      if (key === "period") state.departurePeriod = "upcoming";
      if (key === "direction") { state.departureDirection = ""; $("adm-filter-direction").value = ""; }
      if (key === "route") { state.departureRoute = ""; $("adm-filter-route").value = ""; }
      if (key === "sale") { state.departureSale = ""; $("adm-filter-sale").value = ""; }
      if (key === "load") { state.departureLoad = ""; $("adm-filter-load").value = ""; }
      renderDepartureCards();
    });
    $("adm-departure-cards").addEventListener("click", function (e) {
      var card = e.target.closest("[data-departure]");
      if (card) { setSelectedDeparture(card.dataset.departure); return; }
    });
    /*
     * Редактор цен. Всё внутри #adm-dep-controls, поэтому один обработчик
     * на контейнер: сама панель перерисовывается целиком, и обработчики,
     * навешенные на её содержимое, терялись бы при каждой перерисовке.
     */
    $("panel-manifest").addEventListener("click", function (e) {
      if (e.target.id === "adm-export") {
        if (state.current) downloadCsv(state.current.departure.code, state.current.passengers);
        return;
      }
      var detailOpen = e.target.closest("[data-detail-open]");
      if (detailOpen) {
        setDetailTab(detailOpen.dataset.detailOpen);
        return;
      }
      /*
       * Смена даты. Первый шаг — спросить новую дату и ПОКАЗАТЬ, кого
       * перенос заденет; ничего при этом не пишется. Второй — применить.
       * Расчёт держим в переменной, а не в разметке: панель заезда
       * перерисовывается, и из неё он бы пропал.
       */
      var dateBtn = e.target.closest("[data-dep-date]");
      if (dateBtn) {
        var depDateId = Number(dateBtn.dataset.depDate);
        var asked = prompt(
          "Новая дата выезда (ГГГГ-ММ-ДД).\n\n" +
          "Сначала покажу, кого из уже проданных броней это заденет — " +
          "у них сдвинутся сроки оплаты.",
          dateBtn.dataset.current || "");
        if (asked === null) return;
        TuronApi.updateDepartureDate(depDateId, asked.trim()).then(function (res) {
          dateChange = { id: depDateId, date: asked.trim() };
          $("adm-dep-controls").insertAdjacentHTML("beforeend", dateChangeSummary(res));
        }).catch(function (err) {
          alert("Не получилось: " + err.message);
        });
        return;
      }

      if (e.target.id === "adm-date-cancel") {
        dropDateChange();
        return;
      }

      if (e.target.id === "adm-date-apply") {
        if (!dateChange) return;
        var dmsg = $("adm-date-msg"), dbtn = $("adm-date-apply");
        dmsg.className = "tt-editor-msg";
        dmsg.textContent = "Переношу…";
        dbtn.disabled = true;
        TuronApi.updateDepartureDate(dateChange.id, dateChange.date, { confirm: true })
          .then(function (res) {
            dateChange = null;
            return TuronApi.departures({ all: true }).then(function (list) {
              state.departures = list;
              renderDepartureCards();
              renderDepartureControls();
              loadManifest();
              alert("Заезд " + res.code + " перенесён на " + formatDate(res.to) +
                (res.bookings.length
                  ? ". Затронуто броней: " + res.bookings.length +
                    " — предупредите агентства."
                  : "."));
            });
          }).catch(function (err) {
            dbtn.disabled = false;
            dmsg.className = "tt-editor-msg is-err";
            dmsg.textContent = err.message;
          });
        return;
      }

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
          var text = res.changed.length
            ? "Сохранено. Изменено цен: " + res.changed.length +
              (res.sold_untouched ? "; проданные брони не тронуты" : "")
            : "Сохранено, цены не менялись.";
          // Перечитываем заезды: в state.departures лежит старый прайс, а
          // по нему считает и калькулятор, и форма брони.
          return TuronApi.departures({ all: true }).then(function (list) {
            state.departures = list;
            renderDepartureCards();
            renderDepartureControls();
            setDetailTab("prices");
            /*
             * Сообщение ставим ПОСЛЕ перерисовки, а не до неё.
             * setDetailTab("prices") собирает панель цен заново — вместе со
             * старой разметкой стиралось и «Сохранено», и оператор жал
             * кнопку, не получая никакого подтверждения. Узлы ищем заново
             * по той же причине: прежние уже выброшены из документа.
             */
            var freshMsg = $("adm-price-msg");
            if (freshMsg) {
              freshMsg.className = "tt-editor-msg is-ok";
              freshMsg.textContent = text;
            }
            var freshSave = $("adm-price-save");
            if (freshSave) freshSave.disabled = false;
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
        fillDirectionFilter();
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
    $("panel-manifest").addEventListener("change", function (e) {
      var sel = e.target.closest('[data-p="kind"]');
      if (!sel) return;
      var row = sel.closest(".tt-price-row");
      var child = sel.value === "child";
      row.querySelectorAll('[data-p="age_from"], [data-p="age_to"], [data-p="occupies_seat"]')
        .forEach(function (el) { el.disabled = !child; });
      var seat = row.querySelector(".tt-price-seat");
      if (seat) seat.classList.toggle("is-off", !child);
    });

    /* ---------------------------------------------------------- туры */
// Плитки направлений — свёрнуты по умолчанию: оформление правят редко,
    // а вкладка «Туры» и так плотная.
    $("od-toggle").addEventListener("click", function () {
      var box = $("od-box");
      box.hidden = !box.hidden;
      if (!box.hidden) loadDestinations();
    });

    $("od-list").addEventListener("submit", function (e) {
      var form = e.target.closest("[data-dest]");
      if (!form) return;
      e.preventDefault();
      var msg = form.querySelector("[data-dest-msg]");
      function v(name) {
        var el = form.querySelector('[data-f="' + name + '"]');
        return el ? el.value : "";
      }
      var image = form.querySelector('input[type="hidden"]');
      msg.className = "tt-editor-msg";
      msg.textContent = "Сохраняю…";
      TuronApi.saveDestination(form.dataset.dest, {
        title: v("title"), blurb: v("blurb"), sort: v("sort"),
        image: image ? image.value : "",
      }).then(function () {
        msg.className = "tt-editor-msg is-ok";
        msg.textContent = "Сохранено — плитка обновится в каталоге";
        form.classList.remove("is-plain");
      }).catch(function (err) {
        msg.className = "tt-editor-msg is-err";
        msg.textContent = err.message || "Не удалось сохранить";
      });
    });

    $("ot-new").addEventListener("click", function () {
      var form = $("ot-form");
      // Повторный клик по «+ Новый тур» при открытой ПРАВКЕ должен
      // переключить форму на создание, а не закрыть её молча.
      if (!form.hidden && tourEditing === null) { form.hidden = true; return; }
      $("ot-content").hidden = true;
      contentEditing = null;
      fillTourForm(null);
      $("ot-code").focus();
    });
    $("ot-cancel").addEventListener("click", function () {
      $("ot-form").hidden = true;
      tourEditing = null;
    });
    $("ot-list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tour-edit]");
      if (!btn) return;
      var t = state.tours.filter(function (x) {
        return x.id === Number(btn.dataset.tourEdit);
      })[0];
      if (t) {
        // Закрываем редактор карточки: иначе на экране висят ДВА редактора
        // разных туров — форма правки одного и карточка другого, и «Сохранить
        // карточку» пишет не туда, куда смотрит оператор.
        $("ot-content").hidden = true;
        contentEditing = null;
        fillTourForm(t);
        $("ot-name").focus();
      }
    });

    $("ot-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("ot-msg"), save = $("ot-save");
      var payload = {
        name: $("ot-name").value,
        destination: $("ot-destination").value,
        nights: $("ot-nights").value,
        agency_commission: $("ot-agency").value,
        operator_commission: $("ot-operator").value,
        from_price: $("ot-from").value,
        description: $("ot-description").value,
        hero_image: $("ot-hero") ? $("ot-hero").value : "",
        is_bookable: $("ot-bookable").checked ? 1 : 0,
      };
      if (!tourEditing) payload.code = $("ot-code").value;

      msg.className = "tt-editor-msg";
      msg.textContent = "Сохраняю…";
      save.disabled = true;
      var action = tourEditing
        ? TuronApi.updateTour(tourEditing, payload)
        : TuronApi.createTour(payload);
      action.then(function (res) {
        save.disabled = false;
        $("ot-form").hidden = true;
        var wasNew = !tourEditing;
        tourEditing = null;
        return loadTours().then(function () {
          alert(wasNew
            ? "Тур " + res.code + " создан. Теперь заведите ему заезд на вкладке " +
              "«Заезды и пассажиры» — цены берутся с заезда, не с тура."
            : "Тур " + res.code + " сохранён." +
              (res.hidden_upcoming
                ? " Снят с продажи вместе с предстоящими заездами: " +
                  res.hidden_upcoming + "."
                : ""));
        });
      }).catch(function (err) {
        save.disabled = false;
        msg.className = "tt-editor-msg is-err";
        msg.textContent = err.message;
      });
    });

    /* -------------------------------------- контент карточки тура */
    $("ot-list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tour-content]");
      if (!btn) return;
      var id = Number(btn.dataset.tourContent);
      TuronApi.tourContent(id).then(function (data) {
        contentEditing = id;
        renderContentEditor(data);
        $("ot-content").hidden = false;
        $("ot-form").hidden = true;
        $("ot-content").scrollIntoView({ behavior: "smooth", block: "start" });
      }).catch(function (err) {
        alert("Не удалось открыть карточку: " + err.message);
      });
    });

    $("oc-close").addEventListener("click", function () {
      $("ot-content").hidden = true;
      contentEditing = null;
    });

    $("ot-content").addEventListener("click", function (e) {
      var add = e.target.closest("[data-oc-add]");
      if (add) {
        var kind = add.dataset.ocAdd;
        var box = $(ocBoxId(kind));
        var html = kind === "variant" ? ocVariantRow({})
          : (kind === "day" ? ocDayRow({}) : ocLineRow(kind, {}));
        var tmp = document.createElement("div");
        tmp.innerHTML = html;
        box.appendChild(tmp.firstChild);
        if (kind === "variant") refreshDayVariants();
        return;
      }

      var row = e.target.closest(".tt-oc-row");
      if (!row) {
        if (e.target.id === "oc-save") saveContent();
        return;
      }
      if (e.target.closest("[data-oc-del]")) {
        var wasVariant = row.dataset.ocKind === "variant";
        row.remove();
        if (wasVariant) refreshDayVariants();
        return;
      }
      // Стрелки двигают строку по списку — порядок в разметке и есть
      // порядок в карточке, отдельных чисел сортировки нет.
      if (e.target.closest("[data-oc-up]")) {
        if (row.previousElementSibling) {
          row.parentNode.insertBefore(row, row.previousElementSibling);
        }
        return;
      }
      if (e.target.closest("[data-oc-down]")) {
        if (row.nextElementSibling) {
          row.parentNode.insertBefore(row.nextElementSibling, row);
        }
      }
    });

    // Код варианта правят руками — выпадающие поля дней должны за ним
    // успевать, иначе привязка «уедет» на несуществующий код.
    $("oc-variants").addEventListener("input", function (e) {
      if (e.target.matches('[data-f="code"]')) refreshDayVariants();
    });

    function saveContent() {
      if (!contentEditing) return;
      var msg = $("oc-msg"), btn = $("oc-save");
      msg.className = "tt-editor-msg";
      msg.textContent = "Сохраняю…";
      btn.disabled = true;
      TuronApi.updateTourContent(contentEditing, collectContent(), collectVariants())
        .then(function (res) {
          btn.disabled = false;
          msg.className = "tt-editor-msg is-ok";
          msg.textContent = "Сохранено: строк " + res.rows +
            (res.variants ? ", вариантов " + res.variants : "") + ".";
        }).catch(function (err) {
          btn.disabled = false;
          msg.className = "tt-editor-msg is-err";
          msg.textContent = err.message;
        });
    }

    /* --------------------------------------------------- новый заезд */
    $("adm-new-dep").addEventListener("click", function () {
      var form = $("adm-new-dep-form");
      form.hidden = !form.hidden;
      if (!form.hidden) { fillTourOptions(); fillNewDepForm(); $("nd-date").focus(); }
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
        // Тур нужен только когда образца нет: с образцом он берётся оттуда.
        tour_code: $("nd-source").value ? null : ($("nd-tour").value || null),
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
    $("adm-detail-back").addEventListener("click", showDepartureList);
    $("adm-detail-tabs").addEventListener("click", function (e) {
      var button = e.target.closest("[data-detail-tab]");
      if (button) setDetailTab(button.dataset.detailTab);
    });
    $("adm-departure-detail").addEventListener("click", function (e) {
      var booking = e.target.closest("[data-detail-booking]");
      if (booking) openBooking(booking.dataset.detailBooking);
    });
    $("ov-tabs").addEventListener("click", function (e) {
      var button = e.target.closest("[data-overview-tab]");
      if (button) setOverviewTab(button.dataset.overviewTab);
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
        return loadTours();
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
