/*
 * Turon Tour B2B — API кабинета агентства (Cloudflare Worker + D1).
 *
 * Маршруты:
 *   POST /api/login          вход по логину/паролю, отдаёт токен сессии
 *   POST /api/logout         погасить текущую сессию
 *   GET  /api/me             кто вошёл
 *   GET  /api/departures     заезды со свободными местами и прайсом
 *   POST /api/bookings       создать бронь (место занимается сразу)
 *   GET  /api/bookings       свои брони с оплачено/остаток
 *   POST /api/bookings/:id/cancel   отменить бронь и вернуть места
 *
 * Только для роли operator (сотрудник туроператора):
 *   GET  /api/admin/bookings     брони всех агентств
 *   GET  /api/admin/manifest     список пассажиров заезда (замена ведомости)
 *   POST /api/admin/payments     провести оплату по брони
 *   GET  /api/admin/agencies     список агентств
 *   POST /api/admin/agencies     завести агентство
 *
 * Агентство видит только свои брони: во всех запросах фильтр по agency_id
 * из сессии, идентификатор из тела запроса никогда не принимается.
 */

const SESSION_TTL_HOURS = 12;
const PBKDF2_ITERATIONS = 100000;

// ------------------------------------------------------------------ утилиты
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, cors()),
  });
}

function fail(message, status) {
  return json({ error: message }, status || 400);
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

  const agency = await env.DB.prepare(
    "SELECT * FROM agencies WHERE login = ? AND is_active = 1"
  ).bind(String(login).trim().toLowerCase()).first();

  // Один и тот же текст на неизвестный логин и на неверный пароль, чтобы
  // нельзя было перебором выяснить, какие агентства заведены.
  const invalid = () => fail("Неверный логин или пароль", 401);
  if (!agency) {
    // всё равно считаем хеш: иначе несуществующий логин отвечает заметно
    // быстрее и его видно по времени ответа
    await hashPassword(password, "00".repeat(16));
    return invalid();
  }
  const hash = await hashPassword(password, agency.password_salt);
  if (!safeEqual(hash, agency.password_hash)) return invalid();

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

// --------------------------------------------------------------- справочник
async function listDepartures(env) {
  const departures = await env.DB.prepare(
    `SELECT d.id, d.code, d.date_start, d.transport, d.is_info_tour,
            d.capacity, d.seats_taken, d.capacity - d.seats_taken AS seats_free,
            t.code AS tour_code, t.name AS tour_name, t.destination,
            t.agency_commission
       FROM departures d JOIN tours t ON t.id = d.tour_id
      WHERE d.is_open = 1 AND t.is_bookable = 1
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

// ---------------------------------------------------------------- брониро­вание
async function createBooking(request, env, agency) {
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

  const seatsNeeded = priced.filter((p) => p.tariff.occupies_seat).length;
  const total = priced.reduce((sum, p) => sum + p.tariff.price, 0);
  // Комиссия — за проданного туриста. Младенец на руках продажей не
  // считается: он не занимает места и идёт по символическому тарифу.
  const commission = (departure.agency_commission || 0) * seatsNeeded;

  /*
   * Ключевое место всей системы: места списываются одним UPDATE с проверкой
   * лимита прямо в WHERE. Если два агентства бронируют последние места
   * одновременно, второй UPDATE не найдёт подходящей строки и вернёт 0
   * изменений — вместо того чтобы продать одно место дважды.
   */
  const claim = await env.DB.prepare(
    `UPDATE departures SET seats_taken = seats_taken + ?
      WHERE id = ? AND seats_taken + ? <= capacity AND is_open = 1`
  ).bind(seatsNeeded, departure.id, seatsNeeded).run();

  if (!claim.meta.changes) {
    const fresh = await env.DB.prepare(
      "SELECT capacity - seats_taken AS seats_free FROM departures WHERE id = ?"
    ).bind(departure.id).first();
    return fail(
      `Не хватает мест: нужно ${seatsNeeded}, свободно ${fresh ? fresh.seats_free : 0}`, 409
    );
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
    await env.DB.batch(inserts);

    return json({
      booking_code: code,
      departure_code: departure.code,
      seats_taken: seatsNeeded,
      total_price: total,
      agency_commission: commission,
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

  return rows.results.map((b) => ({
    ...b,
    balance: Math.round((b.total_price - b.paid) * 100) / 100,
  }));
}

async function cancelBooking(env, agency, bookingId) {
  const booking = await env.DB.prepare(
    "SELECT * FROM bookings WHERE id = ? AND agency_id = ? AND status = 'confirmed'"
  ).bind(bookingId, agency.id).first();
  if (!booking) return fail("Бронь не найдена или уже отменена", 404);

  const seats = await env.DB.prepare(
    "SELECT COALESCE(SUM(occupies_seat), 0) AS n FROM passengers WHERE booking_id = ?"
  ).bind(booking.id).first();

  await env.DB.batch([
    env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").bind(booking.id),
    env.DB.prepare("UPDATE departures SET seats_taken = seats_taken - ? WHERE id = ?")
      .bind(seats.n, booking.departure_id),
  ]);
  return json({ booking_code: booking.code, released_seats: seats.n });
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

  return { departure, passengers: rows.results };
}

async function adminBookings(env, departureCode) {
  const where = departureCode ? "WHERE d.code = ?" : "";
  const stmt = env.DB.prepare(
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
      ORDER BY b.created_at DESC`
  );
  const rows = await (departureCode ? stmt.bind(departureCode) : stmt).all();
  return rows.results.map((b) => ({
    ...b, balance: Math.round((b.total_price - b.paid) * 100) / 100,
  }));
}

async function addPayment(request, env) {
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

  await env.DB.prepare(
    "INSERT INTO payments (booking_id, amount, note) VALUES (?, ?, ?)"
  ).bind(booking.id, value, note || null).run();

  const paid = paidRow.paid + value;
  return json({
    booking_code, paid,
    balance: Math.round((booking.total_price - paid) * 100) / 100,
  });
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
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });

    try {
      if (path === "/api/login" && request.method === "POST") {
        return await handleLogin(request, env);
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
        // operator_commission агентству не отдаём — это доля оператора
        const tours = await env.DB.prepare(
          `SELECT code, name, destination, agency_commission, is_bookable, note
             FROM tours ORDER BY destination, name`
        ).all();
        return json(tours.results);
      }

      if (path === "/api/departures" && request.method === "GET") {
        return json(await listDepartures(env));
      }

      if (path === "/api/bookings" && request.method === "POST") {
        return await createBooking(request, env, agency);
      }

      if (path === "/api/bookings" && request.method === "GET") {
        return json(await listBookings(env, agency));
      }

      const cancel = path.match(/^\/api\/bookings\/(\d+)\/cancel$/);
      if (cancel && request.method === "POST") {
        return await cancelBooking(env, agency, Number(cancel[1]));
      }

      // ------------------------------------------------- только оператор
      if (path.startsWith("/api/admin/")) {
        if (agency.role !== "operator") return fail("Недостаточно прав", 403);

        if (path === "/api/admin/bookings" && request.method === "GET") {
          return json(await adminBookings(env, url.searchParams.get("departure")));
        }
        if (path === "/api/admin/manifest" && request.method === "GET") {
          const data = await manifest(env, url.searchParams.get("departure"));
          if (!data) return fail("Заезд не найден", 404);
          return json(data);
        }
        if (path === "/api/admin/payments" && request.method === "POST") {
          return await addPayment(request, env);
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
        return fail("Not found", 404);
      }

      return fail("Not found", 404);
    } catch (err) {
      return fail(err.message, 500);
    }
  },
};
