/*
 * Turon Tour API — Cloudflare Worker
 *
 * Читает туры/экскурсии/страховки из Google Sheet (сервис-аккаунт,
 * ключ хранится только тут, в секретах воркера) и отдаёт их фронту в
 * формате js/data.js. Заявки на бронирование дописывает в лист "Заявки".
 *
 * Структура листов Google Sheet — см. worker/README.md.
 *
 * Секреты/переменные окружения (wrangler secret put ...):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY   (весь PEM-ключ, включая BEGIN/END строки)
 *   SHEET_ID             (ID таблицы из её URL)
 */

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const CACHE_TTL_SECONDS = 300;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders()),
  });
}

// --------------------------------------------------------------------
// Auth: подпись JWT сервис-аккаунта (RS256) и обмен на access_token
// --------------------------------------------------------------------
function base64url(input) {
  var base64;
  if (typeof input === "string") {
    base64 = btoa(input);
  } else {
    base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(input)));
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  var b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPrivateKey(pem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getAccessToken(env) {
  var header = { alg: "RS256", typ: "JWT" };
  var now = Math.floor(Date.now() / 1000);
  var claim = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SHEETS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  var unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claim));
  var key = await importPrivateKey(env.GOOGLE_PRIVATE_KEY);
  var signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  var jwt = unsigned + "." + base64url(signature);

  var resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
      "&assertion=" + jwt,
  });
  var data = await resp.json();
  if (!resp.ok) throw new Error("Ошибка получения токена Google: " + JSON.stringify(data));
  return data.access_token;
}

// --------------------------------------------------------------------
// Sheets API helpers
// --------------------------------------------------------------------
async function getSheetValues(env, token, range) {
  var url =
    "https://sheets.googleapis.com/v4/spreadsheets/" + env.SHEET_ID +
    "/values/" + encodeURIComponent(range);
  var resp = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  var data = await resp.json();
  if (!resp.ok) throw new Error("Ошибка чтения листа " + range + ": " + JSON.stringify(data));
  return data.values || [];
}

async function appendRow(env, token, sheetName, row) {
  var url =
    "https://sheets.googleapis.com/v4/spreadsheets/" + env.SHEET_ID +
    "/values/" + encodeURIComponent(sheetName + "!A1") +
    ":append?valueInputOption=RAW";
  var resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [row] }),
  });
  var data = await resp.json();
  if (!resp.ok) throw new Error("Ошибка записи в лист " + sheetName + ": " + JSON.stringify(data));
  return data;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  var headers = rows[0];
  return rows.slice(1).filter(function (r) { return r.length; }).map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i] !== undefined ? row[i] : ""; });
    return obj;
  });
}

function splitList(value, sep) {
  if (!value) return [];
  return String(value).split(sep).map(function (s) { return s.trim(); }).filter(Boolean);
}

function toBool(value) {
  return String(value).trim().toUpperCase() === "TRUE";
}

function toNumber(value) {
  var n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// --------------------------------------------------------------------
// Сборка туров из нескольких листов в структуру js/data.js
// --------------------------------------------------------------------
async function buildTours(env, token) {
  var toursRows = rowsToObjects(await getSheetValues(env, token, "Tours!A1:Z1000"));
  var departuresRows = rowsToObjects(await getSheetValues(env, token, "TourDepartures!A1:Z1000"));
  var programRows = rowsToObjects(await getSheetValues(env, token, "TourProgram!A1:Z1000"));
  var hotelsRows = rowsToObjects(await getSheetValues(env, token, "TourHotels!A1:Z1000"));
  var priceRows = rowsToObjects(await getSheetValues(env, token, "TourPriceMatrix!A1:Z1000"));
  var modulesRows = rowsToObjects(await getSheetValues(env, token, "TourModules!A1:Z1000"));

  function byTour(rows) {
    var map = {};
    rows.forEach(function (r) {
      if (!map[r.tour_id]) map[r.tour_id] = [];
      map[r.tour_id].push(r);
    });
    return map;
  }

  var departuresByTour = byTour(departuresRows);
  var programByTour = byTour(programRows);
  var hotelsByTour = byTour(hotelsRows);
  var priceByTour = byTour(priceRows);
  var modulesByTour = byTour(modulesRows);

  return toursRows.map(function (t) {
    var priceMatrix = {};
    (priceByTour[t.id] || []).forEach(function (p) {
      if (!priceMatrix[p.hotel_category]) priceMatrix[p.hotel_category] = {};
      if (!priceMatrix[p.hotel_category][p.room_type]) priceMatrix[p.hotel_category][p.room_type] = {};
      priceMatrix[p.hotel_category][p.room_type][p.season_code] = toNumber(p.price_per_person);
    });

    var program = (programByTour[t.id] || [])
      .map(function (p) { return { day: toNumber(p.day), title: p.title, description: p.description }; })
      .sort(function (a, b) { return a.day - b.day; });

    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      country: t.country,
      cities: splitList(t.cities, ","),
      duration_days: toNumber(t.duration_days),
      duration_nights: toNumber(t.duration_nights),
      cover_image: t.cover_image || "",
      short_description: t.short_description || "",
      is_constructor: toBool(t.is_constructor),
      departures: (departuresByTour[t.id] || []).map(function (d) {
        return { date_start: d.date_start, date_end: d.date_end, season_code: d.season_code };
      }),
      hotels: (hotelsByTour[t.id] || []).map(function (h) {
        return { category: h.category, name: h.name };
      }),
      price_matrix: priceMatrix,
      program: program,
      included: splitList(t.included, "|"),
      excluded: splitList(t.excluded, "|"),
      visa_documents: splitList(t.visa_documents, "|"),
      excursion_ids: splitList(t.excursion_ids, ","),
      optional_modules: (modulesByTour[t.id] || []).map(function (m) {
        return {
          id: m.module_id,
          title: m.title,
          price_per_person: toNumber(m.price_per_person),
          min_group: toNumber(m.min_group),
        };
      }),
    };
  });
}

async function buildExcursions(env, token) {
  var rows = rowsToObjects(await getSheetValues(env, token, "Excursions!A1:Z1000"));
  return rows.map(function (e) {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      price_per_person: toNumber(e.price_per_person),
      min_group: toNumber(e.min_group),
      duration_hours: toNumber(e.duration_hours),
    };
  });
}

async function buildInsurancePlans(env, token) {
  var rows = rowsToObjects(await getSheetValues(env, token, "InsurancePlans!A1:Z1000"));
  return rows.map(function (p) {
    return {
      id: p.id,
      title: p.title,
      price_per_person_per_day: toNumber(p.price_per_person_per_day),
      coverage: p.coverage,
    };
  });
}

// --------------------------------------------------------------------
// Кэш через встроенный Cache API воркера (по URL запроса)
// --------------------------------------------------------------------
async function cachedJson(request, buildFn) {
  var cache = caches.default;
  var cached = await cache.match(request);
  if (cached) return cached;

  var data = await buildFn();
  var response = jsonResponse(data);
  response.headers.set("Cache-Control", "public, max-age=" + CACHE_TTL_SECONDS);
  // put a clone since the response body can only be read once
  await cache.put(request, response.clone());
  return response;
}

async function handleBooking(request, env) {
  var booking = await request.json();
  var bookingId = "TT-" + Date.now().toString(36).toUpperCase();
  var createdAt = new Date().toISOString();

  var token = await getAccessToken(env);
  await appendRow(env, token, "Заявки", [
    bookingId,
    createdAt,
    booking.tour_id || "",
    booking.tour_title || "",
    booking.departure && booking.departure.date_start || "",
    booking.departure && booking.departure.date_end || "",
    booking.hotel_category || "",
    booking.room_type || "",
    JSON.stringify(booking.travelers || []),
    (booking.selected_excursion_ids || []).join(","),
    (booking.selected_module_ids || []).join(","),
    booking.insurance_plan_id || "",
    booking.total_price || 0,
    (booking.warnings || []).join(" | "),
    booking.contact_name || "",
    booking.contact_phone || "",
    booking.contact_email || "",
  ]);

  booking.booking_id = bookingId;
  booking.created_at = createdAt;
  return jsonResponse(booking);
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/tours" && request.method === "GET") {
        return await cachedJson(request, async function () {
          var token = await getAccessToken(env);
          return buildTours(env, token);
        });
      }

      if (url.pathname === "/api/excursions" && request.method === "GET") {
        return await cachedJson(request, async function () {
          var token = await getAccessToken(env);
          return buildExcursions(env, token);
        });
      }

      if (url.pathname === "/api/insurance" && request.method === "GET") {
        return await cachedJson(request, async function () {
          var token = await getAccessToken(env);
          return buildInsurancePlans(env, token);
        });
      }

      if (url.pathname === "/api/bookings" && request.method === "POST") {
        return await handleBooking(request, env);
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};
