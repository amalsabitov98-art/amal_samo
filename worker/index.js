/*
 * Turon Tour B2B — API кабинета агентства (Cloudflare Worker + D1).
 *
 * Маршруты:
 *   POST /api/login          вход по логину/паролю, отдаёт токен сессии
 *   POST /api/logout         погасить текущую сессию
 *   POST /api/public/contact-request  заявка с формы «Свяжитесь с нами»
 *                             (без входа) — уходит в Telegram шефу, СВОИМ
 *                             ботом (CONTACT_TELEGRAM_*), отдельным от бота
 *                             с бронями (TELEGRAM_*)
 *   GET  /api/me             кто вошёл
 *   GET  /api/departures     заезды со свободными местами и прайсом
 *   POST /api/bookings       создать бронь (место занимается сразу)
 *   GET  /api/bookings       свои брони с оплачено/остаток
 *   POST /api/bookings/:id/passengers       заменить состав брони
 *   POST /api/bookings/:id/cancel-request   попросить оператора отменить
 *
 * Отмену агентство НЕ проводит: /api/bookings/:id/cancel отвечает 403 —
 * см. requestCancel и adminCancelBooking ниже.
 *
 * Только для роли operator (сотрудник туроператора):
 *   GET  /api/admin/bookings     брони всех агентств
 *   GET  /api/admin/manifest     список пассажиров заезда (замена ведомости)
 *   POST /api/admin/payments     провести оплату по брони
 *   POST /api/admin/bookings/:id/cancel          отменить бронь
 *   POST /api/admin/passengers/:id/document      исправить ФИО/паспорт
 *   POST /api/admin/passengers/:id/birthdate     исправить дату рождения
 *                                                (с пересчётом, в два шага)
 *   GET  /api/admin/bookings/:id/history   история изменений брони
 *   GET  /api/admin/agencies     список агентств
 *   POST /api/admin/agencies     завести агентство
 *   POST /api/admin/agencies/:id/activate|deactivate   включить/отключить
 *   POST /api/admin/agencies/:id/password              сменить пароль
 *
 * Агентство видит только свои брони: во всех запросах фильтр по agency_id
 * из сессии, идентификатор из тела запроса никогда не принимается.
 */

const SESSION_TTL_HOURS = 12;
const PBKDF2_ITERATIONS = 100000;

// Порог перебора паролей. По логину строже, чем по адресу: за одним
// адресом может сидеть целое агентство через общий интернет.
const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILS_PER_LOGIN = 8;
const MAX_FAILS_PER_IP = 25;

// ------------------------------------------------------------------ утилиты
/*
 * Источник кабинета задаётся переменной ALLOWED_ORIGIN (в wrangler.toml).
 * Пока она не задана, отвечаем «*» — удобно при разработке, но на бою
 * обязательно указать адрес кабинета, иначе к API сможет обратиться
 * любая сторонняя страница от имени залогиненного пользователя.
 */
function cors(env, request) {
  const allowed = env && env.ALLOWED_ORIGIN;
  const origin = request && request.headers.get("Origin");
  let value = "*";
  if (allowed) {
    const list = allowed.split(",").map((s) => s.trim()).filter(Boolean);
    value = origin && list.includes(origin) ? origin : list[0];
  }
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    // Ответы API — только JSON: nosniff не даёт браузеру угадать тип и
    // исполнить ответ как скрипт. Referrer-Policy прячет адрес кабинета
    // при переходах наружу.
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    // Ответы под токеном содержат брони и паспорта — их нельзя оставлять
    // в общих кэшах. Публичный каталог кэшировать по-прежнему можно.
    ...(request && request.headers.get("Authorization")
      ? { "Cache-Control": "no-store" }
      : {}),
  };
}

// Заголовки CORS зависят от запроса, поэтому их подставляет роутер —
// json() отдаёт тело, роутер добавляет заголовки.
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

function fail(message, status) {
  return json({ error: message }, status || 400);
}

function withCors(response, env, request) {
  const headers = new Headers(response.headers);
  const extra = cors(env, request);
  Object.keys(extra).forEach((k) => headers.set(k, extra[k]));
  return new Response(response.body, { status: response.status, headers });
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key, 256
  );
  return toHex(bits);
}

// Сравнение за постоянное время: обычное === на секретах даёт утечку по
// времени ответа, по которой пароль подбирается посимвольно.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ------------------------------------------------------------------- сессии
async function authenticate(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT a.id, a.login, a.name, a.channel, a.role
       FROM sessions s JOIN agencies a ON a.id = s.agency_id
      WHERE s.token = ? AND s.expires_at > datetime('now') AND a.is_active = 1`
  ).bind(token).first();
  return row || null;
}

async function handleLogin(request, env) {
  const { login, password } = await request.json();
  if (!login || !password) return fail("Введите логин и пароль");

  const clean = String(login).trim().toLowerCase();
  const ip = request.headers.get("CF-Connecting-IP") ||
             request.headers.get("X-Forwarded-For") || "unknown";
  const since = `-${LOGIN_WINDOW_MINUTES} minutes`;

  const fails = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN login = ? THEN 1 ELSE 0 END) AS by_login,
       SUM(CASE WHEN ip = ? THEN 1 ELSE 0 END) AS by_ip
     FROM login_attempts WHERE attempted_at > datetime('now', ?)`
  ).bind(clean, ip, since).first();

  if ((fails.by_login || 0) >= MAX_FAILS_PER_LOGIN ||
      (fails.by_ip || 0) >= MAX_FAILS_PER_IP) {
    return fail(
      `Слишком много попыток входа. Попробуйте через ${LOGIN_WINDOW_MINUTES} минут.`, 429
    );
  }

  const noteFailure = () => env.DB.prepare(
    "INSERT INTO login_attempts (login, ip) VALUES (?, ?)"
  ).bind(clean, ip).run();

  const agency = await env.DB.prepare(
    "SELECT * FROM agencies WHERE login = ? AND is_active = 1"
  ).bind(clean).first();

  // Один и тот же текст на неизвестный логин и на неверный пароль, чтобы
  // нельзя было перебором выяснить, какие агентства заведены.
  const invalid = async () => { await noteFailure(); return fail("Неверный логин или пароль", 401); };
  if (!agency) {
    // всё равно считаем хеш: иначе несуществующий логин отвечает заметно
    // быстрее и его видно по времени ответа
    await hashPassword(password, "00".repeat(16));
    return await invalid();
  }
  const hash = await hashPassword(password, agency.password_salt);
  if (!safeEqual(hash, agency.password_hash)) return await invalid();

  // вход удался — снимаем накопленные промахи и подчищаем старые записи
  await env.DB.batch([
    env.DB.prepare("DELETE FROM login_attempts WHERE login = ?").bind(clean),
    env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-1 day')"),
  ]);

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare(
    `INSERT INTO sessions (token, agency_id, expires_at)
     VALUES (?, ?, datetime('now', ?))`
  ).bind(token, agency.id, `+${SESSION_TTL_HOURS} hours`).run();

  return json({
    token,
    agency: {
      id: agency.id, login: agency.login, name: agency.name,
      channel: agency.channel, role: agency.role,
    },
  });
}

// -------------------------------------------------------------------- курсы
/*
 * Курс ЦБ РУз. Браузер не может дёрнуть cbu.uz напрямую — сайт ЦБ не отдаёт
 * CORS-заголовки, поэтому запрос с чужого домена блокируется, и кабинет
 * показывал бы замороженную заглушку. Тянем на стороне воркера (server-to-
 * server, без CORS) и кэшируем на час, чтобы не долбить ЦБ на каждый заход.
 */
let ratesCache = null;
async function cbuRates() {
  const now = Date.now();
  if (ratesCache && now - ratesCache.at < 3600000) return ratesCache.data;
  try {
    const resp = await fetch("https://cbu.uz/ru/arkhiv-kursov-valyut/json/", {
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!resp.ok) throw new Error("CBU " + resp.status);
    const rows = await resp.json();
    const out = {};
    for (const row of rows) {
      if (row.Ccy === "USD" || row.Ccy === "EUR") {
        out[row.Ccy] = row.Rate;
        out.date = row.Date;
      }
    }
    if (!out.USD || !out.EUR) throw new Error("CBU data incomplete");
    ratesCache = { at: now, data: out };
    return out;
  } catch (_) {
    // если ЦБ недоступен — отдаём последнее, что было (или пусто)
    return ratesCache ? ratesCache.data : {};
  }
}

// --------------------------------------------------------------- справочник
/*
 * По умолчанию отдаём только предстоящие заезды: продавать место в рейс,
 * который уже улетел, нельзя. Оператору нужны и прошедшие — по ним он
 * выгружает списки пассажиров, поэтому для него includePast.
 */
async function listDepartures(env, includePast) {
  const dateFilter = includePast ? "" : "AND d.date_start >= date('now')";
  const departures = await env.DB.prepare(
    `SELECT d.id, d.code, d.date_start, d.transport, d.is_info_tour,
            d.capacity, d.seats_taken, d.capacity - d.seats_taken AS seats_free,
            t.code AS tour_code, t.name AS tour_name, t.destination,
            t.agency_commission, t.nights
       FROM departures d JOIN tours t ON t.id = d.tour_id
      WHERE d.is_open = 1 AND t.is_bookable = 1 ${dateFilter}
      ORDER BY d.date_start, d.transport`
  ).all();

  const prices = await env.DB.prepare(
    `SELECT departure_id, code, label, kind, price, age_from, age_to, occupies_seat
       FROM departure_prices`
  ).all();

  const byDeparture = {};
  for (const p of prices.results) {
    (byDeparture[p.departure_id] = byDeparture[p.departure_id] || []).push(p);
  }
  return departures.results.map((d) => ({ ...d, prices: byDeparture[d.id] || [] }));
}

/*
 * ------------------------------------------------------------- каталог
 * Публичная часть: гость видит направления, туры и цены без входа —
 * агент показывает тур клиенту по ссылке, не заводя ему учётку.
 * Бронировать без входа нельзя, и комиссий здесь нет ни агентской, ни
 * операторской: это внутренние B2B-цифры.
 */
async function catalogTours(env) {
  const tours = await env.DB.prepare(
    `SELECT t.code, t.name, t.destination, t.note, t.description, t.nights,
            t.is_bookable,
            COUNT(DISTINCT d.id) AS departures_count,
            MIN(CASE WHEN p.kind = 'placement' THEN p.price END) AS min_price,
            MIN(d.date_start) AS next_date
       FROM tours t
       LEFT JOIN departures d ON d.tour_id = t.id AND d.is_open = 1
                             AND d.date_start >= date('now')
       LEFT JOIN departure_prices p ON p.departure_id = d.id
      GROUP BY t.id
      ORDER BY t.destination, t.name`
  ).all();
  return tours.results;
}

// Направления собираем из туров, а оформление плитки подмешиваем из
// destinations. Направления без строки в destinations не теряются —
// показываются просто по названию.
async function catalogDestinations(env) {
  const tours = await catalogTours(env);
  const meta = await env.DB.prepare(
    "SELECT name, title, blurb, image, sort FROM destinations"
  ).all();

  const byName = {};
  for (const m of meta.results) byName[m.name] = m;

  const grouped = new Map();
  for (const t of tours) {
    let g = grouped.get(t.destination);
    if (!g) {
      const m = byName[t.destination] || {};
      g = {
        name: t.destination,
        title: m.title || t.destination,
        blurb: m.blurb || null,
        image: m.image || null,
        sort: m.sort == null ? 999 : m.sort,
        tours_count: 0,
        departures_count: 0,
        min_price: null,
        next_date: null,
      };
      grouped.set(t.destination, g);
    }
    g.tours_count++;
    g.departures_count += t.departures_count;
    if (t.min_price != null && (g.min_price == null || t.min_price < g.min_price)) {
      g.min_price = t.min_price;
    }
    if (t.next_date && (!g.next_date || t.next_date < g.next_date)) {
      g.next_date = t.next_date;
    }
  }
  return [...grouped.values()]
    .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
}

async function catalogTour(env, code) {
  const tour = await env.DB.prepare(
    `SELECT code, name, destination, note, description, nights, is_bookable
       FROM tours WHERE code = ?`
  ).bind(code).first();
  if (!tour) return null;

  const content = await env.DB.prepare(
    `SELECT c.kind, c.variant, c.sort, c.title, c.text, c.url
       FROM tour_content c JOIN tours t ON t.id = c.tour_id
      WHERE t.code = ? ORDER BY c.kind, c.sort`
  ).bind(code).all();

  const variants = await env.DB.prepare(
    `SELECT v.code, v.title FROM tour_variants v JOIN tours t ON t.id = v.tour_id
      WHERE t.code = ? ORDER BY v.sort`
  ).bind(code).all();

  // Закрытый тур заездов не отдаёт даже если они завелись: продавать его
  // нельзя, и предлагать бронь в карточке тоже не нужно.
  const departures = await env.DB.prepare(
    `SELECT d.id, d.code, d.date_start, d.transport, d.is_info_tour,
            d.capacity, d.seats_taken, d.capacity - d.seats_taken AS seats_free
       FROM departures d JOIN tours t ON t.id = d.tour_id
      WHERE t.code = ? AND d.is_open = 1 AND t.is_bookable = 1
        AND d.date_start >= date('now')
      ORDER BY d.date_start, d.transport`
  ).bind(code).all();

  const prices = await env.DB.prepare(
    `SELECT p.departure_id, p.code, p.label, p.kind, p.price,
            p.age_from, p.age_to, p.occupies_seat
       FROM departure_prices p
       JOIN departures d ON d.id = p.departure_id
       JOIN tours t ON t.id = d.tour_id
      WHERE t.code = ? AND d.is_open = 1 AND t.is_bookable = 1
        AND d.date_start >= date('now')`
  ).bind(code).all();

  const byDeparture = {};
  for (const p of prices.results) {
    (byDeparture[p.departure_id] = byDeparture[p.departure_id] || []).push(p);
  }

  const pick = (kind) => content.results.filter((c) => c.kind === kind);
  return {
    ...tour,
    included: pick("included").map((c) => c.text),
    excluded: pick("excluded").map((c) => c.text),
    info: pick("info").map((c) => ({ text: c.text, url: c.url })),
    gallery: pick("gallery").map((c) => ({ text: c.text, url: c.url })),
    variants: variants.results.map((v) => ({
      code: v.code,
      title: v.title,
      days: content.results
        .filter((c) => c.kind === "day" && c.variant === v.code)
        .map((c) => ({ title: c.title, text: c.text })),
    })),
    // Публичный ответ: точную загрузку заезда наружу не отдаём. capacity и
    // seats_taken — это «сколько мы продали», коммерческая информация, а
    // раньше они уходили любому гостю (ведро «20+ мест» рисовалось только
    // на клиенте). Оставляем остаток и обрезаем его на 21: каталогу хватает
    // (≤10 — точно, ≤20 — «10+», выше — «20+»), а объём продаж не виден.
    departures: departures.results.map((d) => {
      const { capacity, seats_taken, seats_free, ...open } = d;
      return {
        ...open,
        seats_free: Math.max(0, Math.min(seats_free, 21)),
        prices: byDeparture[d.id] || [],
      };
    }),
  };
}

/*
 * Плоский список предстоящих заездов для поиска на титульной странице.
 * Нужен именно отдельным маршрутом: catalogTours отдаёт только MIN(date) по
 * туру, и фильтр «сентябрь» по нему врал бы — тур с ближайшим заездом в
 * августе выпал бы из выдачи, хотя сентябрьские заезды у него есть.
 *
 * Правила публичности те же, что в catalogTour: ни комиссий, ни capacity /
 * seats_taken — только остаток, обрезанный на 21, чтобы объём продаж не
 * читался снаружи.
 */
async function catalogDepartures(env) {
  const rows = await env.DB.prepare(
    `SELECT d.code, d.date_start, d.transport, d.is_info_tour,
            MIN(d.capacity - d.seats_taken) AS seats_free,
            t.code AS tour_code, t.name AS tour_name, t.destination, t.nights,
            MIN(CASE WHEN p.kind = 'placement' THEN p.price END) AS min_price
       FROM departures d
       JOIN tours t ON t.id = d.tour_id
       LEFT JOIN departure_prices p ON p.departure_id = d.id
      WHERE d.is_open = 1 AND t.is_bookable = 1 AND d.date_start >= date('now')
      GROUP BY d.id
      ORDER BY d.date_start, d.transport`
  ).all();
  return rows.results.map((d) => ({
    ...d,
    seats_free: Math.max(0, Math.min(d.seats_free, 21)),
  }));
}

// Возраст на дату выезда — именно так тариф и определяется у оператора.
function ageOn(birthDate, onDate) {
  const b = new Date(birthDate), o = new Date(onDate);
  let age = o.getFullYear() - b.getFullYear();
  const m = o.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && o.getDate() < b.getDate())) age--;
  return age;
}

/*
 * Цена пассажира: если возраст попадает в детский тариф — берём его,
 * иначе взрослую цену по типу размещения. Возрастные диапазоны в прайсе
 * стыкуются встык (2-5 и 5-11), поэтому верхняя граница трактуется как
 * «строго меньше»: пятилетний попадает в 5-11, а не в 2-5.
 */
function priceFor(passenger, departure) {
  const age = ageOn(passenger.birth_date, departure.date_start);
  // При пересечении диапазонов (ошибка в прайсе) берём самый узкий, а не
  // самый дешёвый: иначе кривые данные молча режут выручку оператора.
  const child = departure.prices
    .filter((p) => p.kind === "child" && age >= p.age_from && age < p.age_to)
    .sort((a, b) => (a.age_to - a.age_from) - (b.age_to - b.age_from))[0];
  if (child) {
    return { code: child.code, label: child.label, price: child.price, occupies_seat: child.occupies_seat };
  }
  const placement = departure.prices.find(
    (p) => p.kind === "placement" && p.code === passenger.placement
  );
  if (!placement) return null;
  return { code: placement.code, label: placement.label, price: placement.price, occupies_seat: 1 };
}

/*
 * Проверка паспорта. Многие страны, в т.ч. Турция, требуют
 * запас в 6 месяцев после окончания поездки, поэтому предупреждаем не
 * только об уже истёкшем документе.
 *
 * Это предупреждение, а не запрет: правило зависит от направления, и
 * решать должен менеджер, а не форма.
 */
function passportIssue(expiry, departureDate) {
  if (!expiry) return null;
  const exp = new Date(expiry), dep = new Date(departureDate);
  if (isNaN(exp.getTime())) return null;
  if (exp <= dep) return "паспорт истекает до поездки";
  const sixMonths = new Date(dep);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  if (exp < sixMonths) return "до конца действия паспорта меньше 6 месяцев после поездки";
  return null;
}

// Запись в журнал. Имя исполнителя копируем строкой: учётку могут
// переименовать или отключить, а история должна остаться читаемой.
function logEvent(env, bookingId, actor, action, details) {
  return env.DB.prepare(
    `INSERT INTO booking_events (booking_id, actor_id, actor_name, action, details)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(bookingId, actor.id, actor.name, action, details || null);
}

// ---------------------------------------------------------------- брониро­вание
/*
 * Уведомление оператору в Telegram о новой брони.
 *
 * НЕ ДЕЛАЕТ НИЧЕГО, пока не заданы два значения в окружении воркера:
 *   TELEGRAM_BOT_TOKEN — токен бота от @BotFather (СЕКРЕТ, не в git):
 *       cd worker && wrangler secret put TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID   — куда слать (личка оператора или id группы, куда
 *       добавлен бот); можно как обычная переменная в wrangler.toml [vars].
 *
 * Комиссия в сообщение НЕ идёт — это внутренняя цифра оператора, а бот
 * может быть в общей группе. Ошибки глушим: уведомление не критично, бронь
 * уже сохранена. Вызывается через ctx.waitUntil, поэтому клиент ответа не ждёт.
 */
function tgEscape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function notifyTelegram(env, b) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const dir = b.departure.transport === "TZX" ? "Трабзон"
            : b.departure.transport === "BUS" ? "Батуми" : b.departure.transport;
  const names = b.passengers.map((p) => "• " + tgEscape(p.full_name)).join("\n");
  const text =
    "🧳 <b>Новая бронь</b>\n" +
    "Агентство: <b>" + tgEscape(b.agency_name) + "</b>\n" +
    "Заказ: <b>" + tgEscape(b.code) + "</b>\n" +
    "Заезд: " + tgEscape(b.departure.date_start) + " · " + dir +
      " (" + tgEscape(b.departure.code) + ")\n" +
    "Туристов: " + b.passengers.length + "\n" +
    "Сумма: $" + b.total + "\n" + names;

  try {
    await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (_) {
    // сеть/Telegram недоступны — молча, бронь это не затрагивает
  }
}

/*
 * Заявка с публичной формы «Свяжитесь с нами» (гость хочет тур под себя,
 * не выбирая из готовых программ). СВОИ переменные окружения —
 * CONTACT_TELEGRAM_BOT_TOKEN / CONTACT_TELEGRAM_CHAT_ID, отдельные от
 * TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID у брони: это разные адресаты
 * (заявки на индивидуальный тур ушли бы не туда, куда броням) и не
 * обязательно один и тот же бот/чат. Настраиваются независимо; можно
 * включить только одно уведомление, оставив второе выключенным. Пока
 * переменные не заданы, молча ничего не отправляет (как и notifyTelegram),
 * и это не ошибка запроса: фронтенд в этом случае откатывается на mailto.
 *
 * CONTACT_TELEGRAM_CHAT_ID может быть НЕСКОЛЬКИМИ id через запятую (та же
 * схема, что у ALLOWED_ORIGIN выше в файле) — удобно на время проверки:
 * свой личный id рядом с id шефа, оба получат сообщение, потом свой можно
 * убрать. delivered в ответе — true, если ушло хотя бы одному.
 */
async function notifyContactRequest(env, body) {
  const token = env.CONTACT_TELEGRAM_BOT_TOKEN;
  const raw = env.CONTACT_TELEGRAM_CHAT_ID;
  if (!token || !raw) return false;
  const chatIds = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
  if (!chatIds.length) return false;

  const text =
    "📩 <b>Заявка с сайта</b>\n" +
    "Имя: <b>" + tgEscape(body.name) + "</b>\n" +
    "Контакт: " + tgEscape(body.contact) + "\n\n" +
    tgEscape(body.message);

  const results = await Promise.all(chatIds.map(async (chatId) => {
    try {
      const res = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  }));
  return results.some(Boolean);
}

// Простое ограничение частоты — переиспользует таблицу login_attempts
// (та же защита от перебора, что и у входа) с фиктивным «логином»
// CONTACT_RATE_KEY: своей таблицы под один маленький маршрут заводить
// незачем, а колонки (ip, attempted_at) подходят как есть.
const CONTACT_RATE_KEY = "__contact_form__";
const CONTACT_WINDOW_MINUTES = 15;
const CONTACT_MAX_PER_IP = 5;

async function handleContactRequest(request, env) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 120);
  const contact = String(body.contact || "").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 2000);
  if (!name || !contact || !message) return fail("Заполните имя, контакт и сообщение");

  const ip = request.headers.get("CF-Connecting-IP") ||
             request.headers.get("X-Forwarded-For") || "unknown";
  const since = `-${CONTACT_WINDOW_MINUTES} minutes`;
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE login = ? AND ip = ? AND attempted_at > datetime('now', ?)`
  ).bind(CONTACT_RATE_KEY, ip, since).first();
  if ((recent.n || 0) >= CONTACT_MAX_PER_IP) {
    return fail(`Слишком много заявок. Попробуйте через ${CONTACT_WINDOW_MINUTES} минут.`, 429);
  }
  await env.DB.prepare("INSERT INTO login_attempts (login, ip) VALUES (?, ?)")
    .bind(CONTACT_RATE_KEY, ip).run();

  const sent = await notifyContactRequest(env, { name, contact, message });
  return json({ ok: true, delivered: sent });
}

async function createBooking(request, env, agency, ctx) {
  const body = await request.json();
  const passengers = Array.isArray(body.passengers) ? body.passengers : [];
  if (!body.departure_code) return fail("Не указан заезд");
  if (!passengers.length) return fail("Добавьте хотя бы одного пассажира");

  for (const p of passengers) {
    if (!p.full_name || !p.birth_date || !p.passport_number || !p.placement) {
      return fail("У каждого пассажира нужны ФИО, дата рождения, паспорт и размещение");
    }
  }

  const all = await listDepartures(env);
  const departure = all.find((d) => d.code === body.departure_code);
  if (!departure) return fail("Заезд не найден или закрыт", 404);

  const priced = [];
  for (const p of passengers) {
    const tariff = priceFor(p, departure);
    if (!tariff) {
      return fail(`Для заезда ${departure.code} нет цены на размещение ${p.placement}`);
    }
    priced.push({ ...p, tariff });
  }

  const passportWarnings = [];
  for (const p of priced) {
    const issue = passportIssue(p.passport_expiry, departure.date_start);
    if (issue) passportWarnings.push(`${p.full_name}: ${issue}`);
  }

  const seatsNeeded = priced.filter((p) => p.tariff.occupies_seat).length;
  const total = priced.reduce((sum, p) => sum + p.tariff.price, 0);
  // Комиссия — за проданного туриста. Младенец на руках продажей не
  // считается: он не занимает места и идёт по символическому тарифу.
  const commission = (departure.agency_commission || 0) * seatsNeeded;

  /*
   * Продажа открыта: ограничения по вместимости больше нет (оператор управляет
   * ей сам, счётчик мест с реальностью не сверяется). Места по-прежнему
   * списываем одним UPDATE — seats_taken ведём для сводок, — но потолок
   * capacity из WHERE убран. Единственное условие — заезд открыт (is_open = 1):
   * закрытый оператором заезд бронировать нельзя.
   */
  const claim = await env.DB.prepare(
    `UPDATE departures SET seats_taken = seats_taken + ?
      WHERE id = ? AND is_open = 1`
  ).bind(seatsNeeded, departure.id).run();

  if (!claim.meta.changes) {
    return fail("Заезд закрыт для продажи. Уточните у оператора.", 409);
  }

  try {
    const seq = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM bookings WHERE departure_id = ?"
    ).bind(departure.id).first();
    const code = `${departure.code}-${String((seq.n || 0) + 1).padStart(2, "0")}`;

    const booking = await env.DB.prepare(
      `INSERT INTO bookings (code, agency_id, departure_id, total_price,
                             agency_commission, note)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(code, agency.id, departure.id, total, commission, body.note || null).first();

    const inserts = priced.map((p) =>
      env.DB.prepare(
        `INSERT INTO passengers (booking_id, full_name, birth_date, passport_number,
                                 passport_expiry, placement, price_code, price, occupies_seat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        booking.id, p.full_name.trim(), p.birth_date, p.passport_number.trim(),
        p.passport_expiry || null, p.placement, p.tariff.code, p.tariff.price,
        p.tariff.occupies_seat
      )
    );
    await env.DB.batch(inserts.concat([
      logEvent(env, booking.id, agency, "created",
               `${priced.length} чел., ${total} USD`),
    ]));

    // Уведомление в Telegram оператору — фоном, чтобы ответ клиенту не ждал
    // Telegram, а его сбой не ронял уже сохранённую бронь. Само по себе не
    // делает ничего, пока не заданы секреты (см. notifyTelegram).
    const notify = notifyTelegram(env, {
      code, agency_name: agency.name, departure, passengers: priced, total,
    });
    if (ctx && ctx.waitUntil) ctx.waitUntil(notify);

    return json({
      booking_code: code,
      departure_code: departure.code,
      seats_taken: seatsNeeded,
      total_price: total,
      agency_commission: commission,
      passport_warnings: passportWarnings,
      passengers: priced.map((p) => ({
        full_name: p.full_name, tariff: p.tariff.label, price: p.tariff.price,
      })),
    });
  } catch (err) {
    // бронь не сохранилась — возвращаем места, иначе они зависнут занятыми
    await env.DB.prepare(
      "UPDATE departures SET seats_taken = seats_taken - ? WHERE id = ?"
    ).bind(seatsNeeded, departure.id).run();
    throw err;
  }
}

/*
 * Замена состава брони. Номер брони сохраняется — в нём смысл: он уже
 * назван клиенту и стоит в переписке. Меняется только состав, цена и,
 * если нужно, количество занятых мест.
 */
async function updateBookingPassengers(request, env, agency, bookingId) {
  const body = await request.json();
  const passengers = Array.isArray(body.passengers) ? body.passengers : [];
  if (!passengers.length) return fail("В брони должен остаться хотя бы один пассажир");
  for (const p of passengers) {
    if (!p.full_name || !p.birth_date || !p.passport_number || !p.placement) {
      return fail("У каждого пассажира нужны ФИО, дата рождения, паспорт и размещение");
    }
  }

  const booking = await env.DB.prepare(
    `SELECT b.*, d.code AS departure_code, d.date_start
       FROM bookings b JOIN departures d ON d.id = b.departure_id
      WHERE b.id = ? AND b.agency_id = ? AND b.status = 'confirmed'`
  ).bind(bookingId, agency.id).first();
  if (!booking) return fail("Бронь не найдена или отменена", 404);

  const today = new Date().toISOString().slice(0, 10);
  if (booking.date_start <= today) return fail("Заезд уже начался — состав не меняется");

  const departure = (await listDepartures(env, true)).find((d) => d.code === booking.departure_code);
  if (!departure) return fail("Заезд закрыт", 409);

  const priced = [];
  for (const p of passengers) {
    const tariff = priceFor(p, departure);
    if (!tariff) return fail(`Нет цены на размещение ${p.placement} для этого заезда`);
    priced.push({ ...p, tariff });
  }

  const oldSeatsRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(occupies_seat), 0) AS n FROM passengers WHERE booking_id = ?"
  ).bind(bookingId).first();
  const oldSeats = oldSeatsRow.n;
  const newSeats = priced.filter((p) => p.tariff.occupies_seat).length;
  const delta = newSeats - oldSeats;

  // Мест нужно больше — занимаем их так же, как при новой брони. Продажа
  // открыта: потолок capacity убран, проверяем только что заезд открыт.
  if (delta > 0) {
    const claim = await env.DB.prepare(
      `UPDATE departures SET seats_taken = seats_taken + ?
        WHERE id = ? AND is_open = 1`
    ).bind(delta, booking.departure_id).run();
    if (!claim.meta.changes) {
      return fail("Заезд закрыт для продажи. Уточните у оператора.", 409);
    }
  } else if (delta < 0) {
    await env.DB.prepare("UPDATE departures SET seats_taken = seats_taken + ? WHERE id = ?")
      .bind(delta, booking.departure_id).run();
  }

  const total = priced.reduce((sum, p) => sum + p.tariff.price, 0);
  const commission = (departure.agency_commission || 0) * newSeats;

  try {
    const statements = [
      env.DB.prepare("DELETE FROM passengers WHERE booking_id = ?").bind(bookingId),
      ...priced.map((p) => env.DB.prepare(
        `INSERT INTO passengers (booking_id, full_name, birth_date, passport_number,
                                 passport_expiry, placement, price_code, price, occupies_seat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(bookingId, p.full_name.trim(), p.birth_date, p.passport_number.trim(),
             p.passport_expiry || null, p.placement, p.tariff.code, p.tariff.price,
             p.tariff.occupies_seat)),
      env.DB.prepare("UPDATE bookings SET total_price = ?, agency_commission = ? WHERE id = ?")
        .bind(total, commission, bookingId),
      logEvent(env, bookingId, agency, "edited",
               `стало ${priced.length} чел., ${total} USD`),
    ];
    await env.DB.batch(statements);
  } catch (err) {
    // состав не сохранился — возвращаем места в прежнее состояние
    if (delta !== 0) {
      await env.DB.prepare("UPDATE departures SET seats_taken = seats_taken - ? WHERE id = ?")
        .bind(delta, booking.departure_id).run();
    }
    throw err;
  }

  const passportWarnings = [];
  for (const p of priced) {
    const issue = passportIssue(p.passport_expiry, departure.date_start);
    if (issue) passportWarnings.push(`${p.full_name}: ${issue}`);
  }

  return json({
    booking_code: booking.code,
    passengers_count: priced.length,
    seats_taken: newSeats,
    total_price: total,
    agency_commission: commission,
    passport_warnings: passportWarnings,
  });
}

async function listBookings(env, agency) {
  const rows = await env.DB.prepare(
    `SELECT b.id, b.code, b.status, b.total_price, b.agency_commission,
            b.created_at, b.note,
            d.code AS departure_code, d.date_start, d.transport,
            (SELECT COUNT(*) FROM passengers p WHERE p.booking_id = b.id) AS passengers_count,
            COALESCE((SELECT SUM(amount) FROM payments pay WHERE pay.booking_id = b.id), 0) AS paid
       FROM bookings b JOIN departures d ON d.id = b.departure_id
      WHERE b.agency_id = ?
      ORDER BY b.created_at DESC`
  ).bind(agency.id).all();

  const ids = rows.results.map((b) => b.id);
  let byBooking = {};
  if (ids.length) {
    const pax = await env.DB.prepare(
      `SELECT booking_id, full_name, birth_date, passport_number, passport_expiry,
              placement, price_code, price, occupies_seat
         FROM passengers WHERE booking_id IN (${ids.map(() => "?").join(",")})
        ORDER BY id`
    ).bind(...ids).all();
    for (const p of pax.results) {
      (byBooking[p.booking_id] = byBooking[p.booking_id] || []).push(p);
    }
  }

  return rows.results.map((b) => ({
    ...b,
    passengers: byBooking[b.id] || [],
    balance: Math.round((b.total_price - b.paid) * 100) / 100,
  }));
}

/*
 * Отмену выполняет ТОЛЬКО оператор. Агентство своей бронью распорядиться
 * само не может: отмена — деньги (после FINAL_DAYS удерживается 100%), и
 * решение принимает туроператор. Поэтому здесь нет фильтра по agency_id —
 * функция доступна лишь из ветки /api/admin/, где роль уже проверена.
 */
async function adminCancelBooking(env, actor, bookingId) {
  const booking = await env.DB.prepare(
    "SELECT * FROM bookings WHERE id = ? AND status = 'confirmed'"
  ).bind(bookingId).first();
  if (!booking) return fail("Бронь не найдена или уже отменена", 404);

  const seats = await env.DB.prepare(
    "SELECT COALESCE(SUM(occupies_seat), 0) AS n FROM passengers WHERE booking_id = ?"
  ).bind(booking.id).first();

  await env.DB.batch([
    env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").bind(booking.id),
    env.DB.prepare("UPDATE departures SET seats_taken = seats_taken - ? WHERE id = ?")
      .bind(seats.n, booking.departure_id),
    logEvent(env, booking.id, actor, "cancelled", `освобождено мест: ${seats.n}`),
  ]);
  return json({ booking_code: booking.code, released_seats: seats.n });
}

/*
 * Заявка агентства на отмену. Ничего не отменяет и мест не возвращает —
 * только фиксирует просьбу в журнале брони и зовёт оператора в Telegram.
 * Так у отмены остаётся один исполнитель, но просьба не теряется в звонках.
 */
async function requestCancel(request, env, agency, bookingId, ctx) {
  const booking = await env.DB.prepare(
    `SELECT b.*, d.date_start, d.code AS departure_code
       FROM bookings b JOIN departures d ON d.id = b.departure_id
      WHERE b.id = ? AND b.agency_id = ? AND b.status = 'confirmed'`
  ).bind(bookingId, agency.id).first();
  if (!booking) return fail("Бронь не найдена или уже отменена", 404);

  // Причина необязательна — агент может просто нажать кнопку. Пустое или
  // битое тело запроса не должно ронять заявку, поэтому читаем мягко.
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim().slice(0, 500) || null;

  await logEvent(env, booking.id, agency, "cancel_requested",
    reason || "агентство просит отменить бронь").run();

  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(notifyCancelRequest(env, {
      agency_name: agency.name,
      code: booking.code,
      departure_code: booking.departure_code,
      date_start: booking.date_start,
      total: booking.total_price,
      reason,
    }));
  }
  return json({ booking_code: booking.code, requested: true });
}

async function notifyCancelRequest(env, r) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const text =
    "⚠️ <b>Запрос на отмену</b>\n" +
    "Агентство: <b>" + tgEscape(r.agency_name) + "</b>\n" +
    "Заказ: <b>" + tgEscape(r.code) + "</b>\n" +
    "Заезд: " + tgEscape(r.date_start) + " (" + tgEscape(r.departure_code) + ")\n" +
    "Сумма: $" + r.total +
    (r.reason ? "\nПричина: " + tgEscape(r.reason) : "");
  try {
    await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (_) {
    // Telegram недоступен — заявка всё равно записана в журнал брони
  }
}

/*
 * Исправление ДАННЫХ ДОКУМЕНТА одного пассажира: ФИО, номер и срок паспорта.
 *
 * Намеренно отдельно от updateBookingPassengers: тот заменяет состав целиком
 * и ПЕРЕСЧИТЫВАЕТ цену и места. Опечатка в фамилии не должна ходить через
 * пересчёт брони — здесь не трогаются ни placement, ни birth_date, ни цена,
 * поэтому сумма и число мест измениться не могут в принципе.
 *
 * Только оператор: агент ошибку внёс, исправляет её туроператор (по нему же
 * выписан билет). В журнал пишем «было → стало», иначе спор «я так не писал»
 * не разрешить.
 */
/*
 * Исправление ДАТЫ РОЖДЕНИЯ. Отдельно от документа, потому что это по своей
 * природе пересчёт: от даты зависит тариф (детский/взрослый по возрасту на
 * дату ВЫЕЗДА), а у младенца до 2 лет ещё и occupies_seat = 0 — то есть
 * меняются цена, число занятых мест и комиссия агентства.
 *
 * Работает в два шага, чтобы оператор не подписывался вслепую:
 *   без confirm — только СЧИТАЕТ и возвращает, что изменится (ничего не пишет);
 *   с confirm   — применяет. keep_price оставляет прежнюю цену пассажира,
 *                 когда оператор не хочет двигать деньги из-за ошибки агента.
 *
 * Логика тарифа не дублируется в интерфейсе: предпросмотр считает тот же
 * priceFor, что и запись, — показанное и сделанное разойтись не могут.
 */
async function updatePassengerBirthdate(request, env, actor, passengerId) {
  const body = await request.json().catch(() => ({}));
  const birth = String(body.birth_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    return fail("Дата рождения нужна в формате ГГГГ-ММ-ДД");
  }

  const pax = await env.DB.prepare(
    `SELECT p.*, b.code AS booking_code, b.status, b.departure_id, b.total_price,
            d.code AS departure_code, d.date_start
       FROM passengers p
       JOIN bookings b ON b.id = p.booking_id
       JOIN departures d ON d.id = b.departure_id
      WHERE p.id = ?`
  ).bind(passengerId).first();
  if (!pax) return fail("Пассажир не найден", 404);
  if (pax.status !== "confirmed") return fail("Бронь отменена — правка не имеет смысла", 409);

  const today = new Date().toISOString().slice(0, 10);
  if (pax.date_start <= today) return fail("Заезд уже начался — состав не меняется");

  const departure = (await listDepartures(env, true)).find((d) => d.code === pax.departure_code);
  if (!departure) return fail("Заезд не найден", 404);

  const tariff = priceFor({ birth_date: birth, placement: pax.placement }, departure);
  if (!tariff) return fail(`Нет цены на размещение ${pax.placement} для этого заезда`);

  const keepPrice = body.keep_price === true;
  const newPrice = keepPrice ? pax.price : tariff.price;
  const seatDelta = tariff.occupies_seat - pax.occupies_seat;
  const newTotal = pax.total_price - pax.price + newPrice;

  const preview = {
    passenger_id: pax.id,
    booking_code: pax.booking_code,
    full_name: pax.full_name,
    birth_date: { from: pax.birth_date, to: birth },
    tariff: { from: pax.price_code, to: tariff.code, label: tariff.label },
    price: { from: pax.price, to: newPrice },
    seats_delta: seatDelta,
    total_price: { from: pax.total_price, to: newTotal },
  };
  // Без подтверждения НИЧЕГО не пишем — это предпросмотр последствий.
  if (body.confirm !== true) return json({ preview: true, ...preview });

  // Места двигаем тем же способом, что и правка состава: сначала занимаем
  // (с проверкой, что заезд открыт), и только потом пишем пассажира.
  if (seatDelta > 0) {
    const claim = await env.DB.prepare(
      `UPDATE departures SET seats_taken = seats_taken + ?
        WHERE id = ? AND is_open = 1`
    ).bind(seatDelta, pax.departure_id).run();
    if (!claim.meta.changes) return fail("Заезд закрыт для продажи. Уточните у оператора.", 409);
  } else if (seatDelta < 0) {
    await env.DB.prepare("UPDATE departures SET seats_taken = seats_taken + ? WHERE id = ?")
      .bind(seatDelta, pax.departure_id).run();
  }

  const seatsRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(occupies_seat), 0) AS n FROM passengers WHERE booking_id = ?"
  ).bind(pax.booking_id).first();
  const newSeats = seatsRow.n + seatDelta;
  const commission = (departure.agency_commission || 0) * newSeats;

  const details =
    `дата рождения: ${pax.birth_date} → ${birth}` +
    (tariff.code !== pax.price_code ? `; тариф: ${pax.price_code} → ${tariff.code}` : "") +
    (newPrice !== pax.price ? `; цена: ${pax.price} → ${newPrice}` : "") +
    (keepPrice && tariff.price !== pax.price ? " (цена оставлена прежней)" : "") +
    (seatDelta !== 0 ? `; мест: ${seatDelta > 0 ? "+" : ""}${seatDelta}` : "");

  try {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE passengers SET birth_date = ?, price_code = ?, price = ?, occupies_seat = ?
          WHERE id = ?`
      ).bind(birth, tariff.code, newPrice, tariff.occupies_seat, pax.id),
      env.DB.prepare("UPDATE bookings SET total_price = ?, agency_commission = ? WHERE id = ?")
        .bind(newTotal, commission, pax.booking_id),
      logEvent(env, pax.booking_id, actor, "birthdate", details),
    ]);
  } catch (err) {
    // запись не прошла — возвращаем места, иначе счётчик заезда «уедет»
    if (seatDelta !== 0) {
      await env.DB.prepare("UPDATE departures SET seats_taken = seats_taken - ? WHERE id = ?")
        .bind(seatDelta, pax.departure_id).run();
    }
    throw err;
  }

  return json({ preview: false, changed: true, ...preview, agency_commission: commission });
}

async function updatePassengerDocument(request, env, actor, passengerId) {
  const body = await request.json().catch(() => ({}));
  const name = (body.full_name || "").trim();
  const passport = (body.passport_number || "").trim();
  const expiry = (body.passport_expiry || "").trim() || null;

  if (!name || !passport) return fail("Нужны ФИО и номер паспорта");

  const pax = await env.DB.prepare(
    `SELECT p.id, p.booking_id, p.full_name, p.passport_number, p.passport_expiry,
            b.code AS booking_code, b.status
       FROM passengers p JOIN bookings b ON b.id = p.booking_id
      WHERE p.id = ?`
  ).bind(passengerId).first();
  if (!pax) return fail("Пассажир не найден", 404);
  if (pax.status !== "confirmed") return fail("Бронь отменена — правка не имеет смысла", 409);

  const changes = [];
  if (pax.full_name !== name) changes.push(`ФИО: ${pax.full_name} → ${name}`);
  if (pax.passport_number !== passport) {
    changes.push(`паспорт: ${pax.passport_number} → ${passport}`);
  }
  if ((pax.passport_expiry || "") !== (expiry || "")) {
    changes.push(`срок: ${pax.passport_expiry || "—"} → ${expiry || "—"}`);
  }
  if (!changes.length) return json({ changed: false, passenger_id: pax.id });

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE passengers SET full_name = ?, passport_number = ?, passport_expiry = ? WHERE id = ?"
    ).bind(name, passport, expiry, pax.id),
    logEvent(env, pax.booking_id, actor, "passport", changes.join("; ")),
  ]);

  return json({
    changed: true,
    passenger_id: pax.id,
    booking_code: pax.booking_code,
    full_name: name,
    passport_number: passport,
    passport_expiry: expiry,
  });
}


// ------------------------------------------------------- сторона оператора
// Список пассажиров заезда — то, ради чего и велась ведомость. Колонки
// повторяют её порядок, чтобы менеджеру не пришлось переучиваться.
async function manifest(env, departureCode) {
  const departure = await env.DB.prepare(
    `SELECT d.id, d.code, d.date_start, d.transport, d.capacity, d.seats_taken
       FROM departures d WHERE d.code = ?`
  ).bind(departureCode).first();
  if (!departure) return null;

  const rows = await env.DB.prepare(
    `SELECT b.code AS booking_code, b.created_at AS booked_at, b.status,
            b.note, a.name AS agency_name, a.channel,
            p.id AS passenger_id,
            p.full_name, p.birth_date, p.passport_number, p.passport_expiry,
            p.placement, p.price_code, p.price, p.occupies_seat,
            b.total_price,
            COALESCE((SELECT SUM(amount) FROM payments pay
                       WHERE pay.booking_id = b.id), 0) AS booking_paid
       FROM passengers p
       JOIN bookings b ON b.id = p.booking_id
       JOIN agencies a ON a.id = b.agency_id
      WHERE b.departure_id = ? AND b.status = 'confirmed'
      ORDER BY b.created_at, p.id`
  ).bind(departure.id).all();

  // Сводка по заезду: сколько продано, получено и сколько ещё должны.
  // Считаем по броням, а не по строкам пассажиров, иначе сумма брони
  // умножилась бы на число человек в ней.
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS bookings_count,
            COALESCE(SUM(b.total_price), 0) AS revenue,
            COALESCE(SUM((SELECT COALESCE(SUM(amount), 0) FROM payments pay
                           WHERE pay.booking_id = b.id)), 0) AS paid
       FROM bookings b
      WHERE b.departure_id = ? AND b.status = 'confirmed'`
  ).bind(departure.id).first();

  const summary = {
    bookings_count: totals.bookings_count,
    passengers_count: rows.results.length,
    seats_used: rows.results.filter((p) => p.occupies_seat).length,
    revenue: totals.revenue,
    paid: totals.paid,
    owed: Math.round((totals.revenue - totals.paid) * 100) / 100,
  };

  return { departure, summary, passengers: rows.results };
}

const ADMIN_PAGE_SIZE = 50;

/*
 * Брони всех агентств с отбором. За сезон их набегают сотни, поэтому
 * список отдаётся порциями и с фильтрами — иначе оператору нечем найти
 * конкретную бронь, а выборка целиком тянет всю таблицу.
 *
 * Условия собираются в массив, а значения — в параллельный массив
 * параметров: конкатенировать значения в SQL нельзя, это открытая дверь
 * для инъекции через строку поиска.
 */
async function adminBookings(env, params) {
  const conditions = [];
  const values = [];

  if (params.departure) { conditions.push("d.code = ?"); values.push(params.departure); }
  if (params.agencyId) { conditions.push("a.id = ?"); values.push(Number(params.agencyId)); }
  if (params.status === "confirmed" || params.status === "cancelled") {
    conditions.push("b.status = ?");
    values.push(params.status);
  }
  if (params.debtOnly) {
    conditions.push(`b.status = 'confirmed' AND b.total_price >
      COALESCE((SELECT SUM(amount) FROM payments pay WHERE pay.booking_id = b.id), 0)`);
  }
  if (params.query) {
    // ищем и по номеру брони, и по фамилии пассажира — оператору обычно
    // называют одно из двух
    conditions.push(`(b.code LIKE ? OR EXISTS (
      SELECT 1 FROM passengers p WHERE p.booking_id = b.id AND p.full_name LIKE ?))`);
    const like = `%${params.query}%`;
    values.push(like, like);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const limit = Math.min(Number(params.limit) || ADMIN_PAGE_SIZE, 200);
  const offset = Math.max(Number(params.offset) || 0, 0);

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS total
       FROM bookings b
       JOIN agencies a ON a.id = b.agency_id
       JOIN departures d ON d.id = b.departure_id
       ${where}`
  ).bind(...values).first();

  const rows = await env.DB.prepare(
    `SELECT b.id, b.code, b.status, b.total_price, b.agency_commission,
            b.created_at, b.note,
            a.name AS agency_name,
            d.code AS departure_code, d.date_start, d.transport,
            (SELECT COUNT(*) FROM passengers p WHERE p.booking_id = b.id) AS passengers_count,
            COALESCE((SELECT SUM(amount) FROM payments pay
                       WHERE pay.booking_id = b.id), 0) AS paid
       FROM bookings b
       JOIN agencies a ON a.id = b.agency_id
       JOIN departures d ON d.id = b.departure_id
       ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`
  ).bind(...values, limit, offset).all();

  return {
    total: totals.total,
    limit,
    offset,
    items: rows.results.map((b) => ({
      ...b, balance: Math.round((b.total_price - b.paid) * 100) / 100,
    })),
  };
}

async function addPayment(request, env, actor) {
  const { booking_code, amount, note } = await request.json();
  const value = Number(amount);
  if (!booking_code) return fail("Не указана бронь");
  if (!isFinite(value) || value === 0) return fail("Сумма должна быть числом, не равным нулю");

  const booking = await env.DB.prepare(
    "SELECT id, total_price FROM bookings WHERE code = ? AND status = 'confirmed'"
  ).bind(booking_code).first();
  if (!booking) return fail("Бронь не найдена или отменена", 404);

  const paidRow = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE booking_id = ?"
  ).bind(booking.id).first();

  // Отрицательная сумма — это возврат; в минус по брони не уходим.
  if (paidRow.paid + value < 0) {
    return fail(`Возврат больше оплаченного: оплачено ${paidRow.paid}`);
  }

  await env.DB.batch([
    env.DB.prepare("INSERT INTO payments (booking_id, amount, note) VALUES (?, ?, ?)")
      .bind(booking.id, value, note || null),
    logEvent(env, booking.id, actor,
             value >= 0 ? "payment" : "refund", `${value} USD`),
  ]);

  const paid = paidRow.paid + value;
  return json({
    booking_code, paid,
    balance: Math.round((booking.total_price - paid) * 100) / 100,
  });
}

async function setAgencyActive(env, agencyId, isActive) {
  const row = await env.DB.prepare(
    "SELECT id, name FROM agencies WHERE id = ? AND role = 'agency'"
  ).bind(agencyId).first();
  if (!row) return fail("Агентство не найдено", 404);

  await env.DB.batch([
    env.DB.prepare("UPDATE agencies SET is_active = ? WHERE id = ?").bind(isActive ? 1 : 0, agencyId),
    // отключаем — сразу гасим открытые сессии, иначе агентство продолжит
    // работать до истечения токена
    env.DB.prepare("DELETE FROM sessions WHERE agency_id = ? AND ? = 0").bind(agencyId, isActive ? 1 : 0),
  ]);
  return json({ id: agencyId, name: row.name, is_active: isActive ? 1 : 0 });
}

async function setAgencyPassword(request, env, agencyId) {
  const { password } = await request.json();
  if (!password || String(password).length < 8) return fail("Пароль короче 8 символов");

  const row = await env.DB.prepare(
    "SELECT id, login FROM agencies WHERE id = ? AND role = 'agency'"
  ).bind(agencyId).first();
  if (!row) return fail("Агентство не найдено", 404);

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  await env.DB.batch([
    env.DB.prepare("UPDATE agencies SET password_hash = ?, password_salt = ? WHERE id = ?")
      .bind(hash, salt, agencyId),
    // старые сессии больше не действуют — смысл смены пароля в этом
    env.DB.prepare("DELETE FROM sessions WHERE agency_id = ?").bind(agencyId),
    env.DB.prepare("DELETE FROM login_attempts WHERE login = ?").bind(row.login),
  ]);
  return json({ id: agencyId, login: row.login });
}

async function createAgency(request, env) {
  const { login, name, password } = await request.json();
  if (!login || !name || !password) return fail("Нужны логин, название и пароль");
  if (String(password).length < 8) return fail("Пароль короче 8 символов");

  const clean = String(login).trim().toLowerCase();
  const exists = await env.DB.prepare("SELECT id FROM agencies WHERE login = ?")
    .bind(clean).first();
  if (exists) return fail("Такой логин уже занят");

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  await env.DB.prepare(
    `INSERT INTO agencies (login, password_hash, password_salt, name, role)
     VALUES (?, ?, ?, ?, 'agency')`
  ).bind(clean, hash, salt, name).run();
  return json({ login: clean, name });
}

// ------------------------------------------------------------------- роутер
// Разбор запроса вынесен из fetch(), чтобы заголовки CORS навешивались
// один раз на любой ответ — включая ошибки. Иначе легко забыть обернуть
// какую-нибудь ветку, и браузер молча отвергнет ответ.
async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === "/api/login" && request.method === "POST") {
        return await handleLogin(request, env);
    }

    // ------------------------------------------------- публичный каталог
    // Доступен без входа: гость смотрит направления, туры, программу и
    // цены. Бронь остаётся за логином — она ниже, после authenticate().
    if (path === "/api/public/rates" && request.method === "GET") {
      return json(await cbuRates());
    }

    if (path === "/api/public/destinations" && request.method === "GET") {
      return json(await catalogDestinations(env));
    }

    if (path === "/api/public/departures" && request.method === "GET") {
      return json(await catalogDepartures(env));
    }

    if (path === "/api/public/tours" && request.method === "GET") {
      const dest = url.searchParams.get("destination");
      const list = await catalogTours(env);
      return json(dest ? list.filter((t) => t.destination === dest) : list);
    }

    const pubTour = path.match(/^\/api\/public\/tours\/([A-Za-z0-9_-]+)$/);
    if (pubTour && request.method === "GET") {
      const tour = await catalogTour(env, pubTour[1]);
      if (!tour) return fail("Тур не найден", 404);
      return json(tour);
    }

    if (path === "/api/public/contact-request" && request.method === "POST") {
      return await handleContactRequest(request, env);
    }

    // всё ниже — только для вошедшего агентства
    const agency = await authenticate(request, env);
    if (!agency) return fail("Требуется вход", 401);

    if (path === "/api/me") return json({ agency });

    if (path === "/api/logout" && request.method === "POST") {
        const token = (request.headers.get("Authorization") || "").slice(7);
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
        return json({ ok: true });
    }

    if (path === "/api/tours" && request.method === "GET") {
        // operator_commission агентству не отдаём — это доля оператора.
        // nights нужен сетке программ Умры (фильтр «10/13 дней» в «Новый тур»
        // считает по нему длительность) — раньше поле не выбиралось совсем.
        // from_price — минимальная цена программы, известная даже без единого
        // будущего заезда (см. db/migrations/013-tours-from-price.sql).
        const tours = await env.DB.prepare(
          `SELECT code, name, destination, agency_commission, is_bookable, note, nights, from_price
             FROM tours ORDER BY destination, name`
        ).all();
        return json(tours.results);
    }

    if (path === "/api/departures" && request.method === "GET") {
      // прошедшие заезды показываем только оператору — ему они нужны для
      // выгрузки списков, агентству продавать их уже нельзя
      const includePast = url.searchParams.get("all") === "1" && agency.role === "operator";
      return json(await listDepartures(env, includePast));
    }

    if (path === "/api/bookings" && request.method === "POST") {
        return await createBooking(request, env, agency, ctx);
    }

    if (path === "/api/bookings" && request.method === "GET") {
        return json(await listBookings(env, agency));
    }

    const edit = path.match(/^\/api\/bookings\/(\d+)\/passengers$/);
    if (edit && request.method === "POST") {
      return await updateBookingPassengers(request, env, agency, Number(edit[1]));
    }

    // Отмена агентству закрыта НА СЕРВЕРЕ, а не только кнопкой в интерфейсе:
    // токен у агентства есть, и убранная кнопка сама по себе ничего не
    // защищает. Вместо отмены — заявка оператору.
    const cancelReq = path.match(/^\/api\/bookings\/(\d+)\/cancel-request$/);
    if (cancelReq && request.method === "POST") {
      return await requestCancel(request, env, agency, Number(cancelReq[1]), ctx);
    }

    const cancel = path.match(/^\/api\/bookings\/(\d+)\/cancel$/);
    if (cancel && request.method === "POST") {
      return fail("Отмену проводит оператор. Отправьте заявку на отмену.", 403);
    }

    // ------------------------------------------------- только оператор
    if (path.startsWith("/api/admin/")) {
        if (agency.role !== "operator") return fail("Недостаточно прав", 403);

        if (path === "/api/admin/bookings" && request.method === "GET") {
          const q = url.searchParams;
          return json(await adminBookings(env, {
            departure: q.get("departure"),
            agencyId: q.get("agency_id"),
            status: q.get("status"),
            debtOnly: q.get("debt") === "1",
            query: (q.get("q") || "").trim(),
            limit: q.get("limit"),
            offset: q.get("offset"),
          }));
        }
        if (path === "/api/admin/manifest" && request.method === "GET") {
          const data = await manifest(env, url.searchParams.get("departure"));
          if (!data) return fail("Заезд не найден", 404);
          return json(data);
        }
        if (path === "/api/admin/payments" && request.method === "POST") {
          return await addPayment(request, env, agency);
        }
        if (path === "/api/admin/agencies" && request.method === "GET") {
          const rows = await env.DB.prepare(
            `SELECT a.id, a.login, a.name, a.is_active, a.created_at,
                    (SELECT COUNT(*) FROM bookings b
                      WHERE b.agency_id = a.id AND b.status = 'confirmed') AS bookings_count
               FROM agencies a WHERE a.role = 'agency' ORDER BY a.name`
          ).all();
          return json(rows.results);
        }
        if (path === "/api/admin/agencies" && request.method === "POST") {
          return await createAgency(request, env);
        }

        const history = path.match(/^\/api\/admin\/bookings\/(\d+)\/history$/);
        if (history && request.method === "GET") {
          const rows = await env.DB.prepare(
            `SELECT e.actor_name, e.action, e.details, e.created_at,
                    a.role AS actor_role
               FROM booking_events e
               LEFT JOIN agencies a ON a.id = e.actor_id
              WHERE e.booking_id = ? ORDER BY e.created_at, e.id`
          ).bind(Number(history[1])).all();
          return json(rows.results);
        }

        const toggle = path.match(/^\/api\/admin\/agencies\/(\d+)\/(activate|deactivate)$/);
        if (toggle && request.method === "POST") {
          return await setAgencyActive(env, Number(toggle[1]), toggle[2] === "activate");
        }

        const pwd = path.match(/^\/api\/admin\/agencies\/(\d+)\/password$/);
        if (pwd && request.method === "POST") {
          return await setAgencyPassword(request, env, Number(pwd[1]));
        }

        // Исправление опечатки в документе. НЕ пересчитывает бронь —
        // см. updatePassengerDocument.
        const doc = path.match(/^\/api\/admin\/passengers\/(\d+)\/document$/);
        if (doc && request.method === "POST") {
          return await updatePassengerDocument(request, env, agency, Number(doc[1]));
        }

        // Дата рождения — отдельно от документа: она двигает тариф, цену и
        // места, поэтому идёт через предпросмотр (см. updatePassengerBirthdate).
        const bd = path.match(/^\/api\/admin\/passengers\/(\d+)\/birthdate$/);
        if (bd && request.method === "POST") {
          return await updatePassengerBirthdate(request, env, agency, Number(bd[1]));
        }

        const adminCancel = path.match(/^\/api\/admin\/bookings\/(\d+)\/cancel$/);
        if (adminCancel && request.method === "POST") {
          return await adminCancelBooking(env, agency, Number(adminCancel[1]));
        }
        return fail("Not found", 404);
    }

    return fail("Not found", 404);
  } catch (err) {
    // Наружу текст внутренней ошибки не отдаём: в сообщениях SQLite видны
    // имена таблиц и ограничений, а это подсказка для атакующего. Подробности
    // остаются в логах воркера (wrangler tail).
    console.error("route error:", err && err.stack ? err.stack : err);
    return fail("Внутренняя ошибка сервера", 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors(env, request) });
    }
    // ctx нужен для ctx.waitUntil — фоновой отправки уведомления в Telegram
    // после ответа клиенту (см. notifyTelegram). Без него бронь ждала бы
    // ответа Telegram, а сбой мессенджера ронял бы саму бронь.
    return withCors(await route(request, env, ctx), env, request);
  },
};
