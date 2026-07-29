const BASE = 'http://127.0.0.1:8787';
let pass = 0, fail = 0;

const call = async (path, opts = {}) => {
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json',
               ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};

console.log('--- вход ---');
let r = await call('/api/login', { method:'POST', body:{ login:'umida', password:'wrong' } });
check('неверный пароль → 401', r.status === 401, JSON.stringify(r.data));
r = await call('/api/login', { method:'POST', body:{ login:'нетакого', password:'x' } });
check('несуществующий логин → тот же текст', r.data.error === 'Неверный логин или пароль', r.data.error);
r = await call('/api/login', { method:'POST', body:{ login:'umida', password:'turon2026' } });
check('вход агентства', r.status === 200 && !!r.data.token);
const umida = r.data.token;
check('роль agency', r.data.agency.role === 'agency', r.data.agency.role);

r = await call('/api/login', { method:'POST', body:{ login:'operator', password:'turon2026' } });
const op = r.data.token;
check('вход оператора, роль operator', r.data.agency.role === 'operator');

console.log('\n--- справочники ---');
r = await call('/api/departures', { token: umida });
check('заездов 34', r.data.length === 34, 'получено ' + r.data.length);
const dep = r.data.find(d => d.code === 'TZX1707');
check('у заезда есть прайс', dep && dep.prices.length > 0);
const freeBefore = dep.seats_free;
r = await call('/api/tours', { token: umida });
check('туров 5', r.data.length === 5);
check('операторская комиссия не отдаётся', !('operator_commission' in r.data[0]), JSON.stringify(r.data[0]));

console.log('\n--- бронирование ---');
r = await call('/api/bookings', { method:'POST', token: umida, body:{
  departure_code:'TZX1707',
  passengers:[
    { full_name:'ADULT ONE', birth_date:'1985-03-12', passport_number:'FA1', passport_expiry:'2030-01-01', placement:'DBL' },
    { full_name:'CHILD SEVEN', birth_date:'2019-01-20', passport_number:'FA2', passport_expiry:'2030-01-01', placement:'DBL' },
    { full_name:'BABY', birth_date:'2025-08-01', passport_number:'FA3', passport_expiry:'2030-01-01', placement:'DBL' },
  ]}});
check('бронь создана', r.status === 200, JSON.stringify(r.data));
check('цена 970+700+100=1770', r.data.total_price === 1770, 'получено ' + r.data.total_price);
check('младенец места не занял (2, не 3)', r.data.seats_taken === 2, 'получено ' + r.data.seats_taken);
const bookingCode = r.data.booking_code;

r = await call('/api/departures', { token: umida });
const after = r.data.find(d => d.code === 'TZX1707');
check('места списались', after.seats_free === freeBefore - 2, `${freeBefore} → ${after.seats_free}`);

r = await call('/api/bookings', { method:'POST', token: umida, body:{
  departure_code:'TZX1707', passengers:[{ full_name:'X', birth_date:'1990-01-01', passport_number:'F', placement:'НЕТ' }]}});
check('несуществующее размещение → ошибка', r.status === 400, JSON.stringify(r.data));

console.log('\n--- изоляция агентств ---');
r = await call('/api/bookings', { token: umida });
check('umida видит свою бронь', r.data.length === 1);
check('остаток = полной сумме', r.data[0].balance === 1770, JSON.stringify(r.data[0]));
r = await call('/api/login', { method:'POST', body:{ login:'ofotour', password:'turon2026' } });
r = await call('/api/bookings', { token: r.data.token });
check('ofotour чужих броней не видит', r.data.length === 0, 'видит ' + r.data.length);

console.log('\n--- права оператора ---');
r = await call('/api/admin/bookings', { token: umida });
check('агентство в админку → 403', r.status === 403, JSON.stringify(r.data));
r = await call('/api/admin/bookings', { token: op });
check('оператор видит бронь', r.status === 200 && r.data.length === 1);
check('видно имя агентства', r.data[0].agency_name === 'UMIDA', r.data[0].agency_name);

r = await call('/api/admin/manifest?departure=TZX1707', { token: op });
check('список пассажиров: 3 строки', r.data.passengers.length === 3, 'получено ' + (r.data.passengers||[]).length);
check('тариф ребёнка CHD_5_10', r.data.passengers[1].price_code === 'CHD_5_10', r.data.passengers[1].price_code);

console.log('\n--- оплаты ---');
r = await call('/api/admin/payments', { method:'POST', token: op, body:{ booking_code: bookingCode, amount: 1000 } });
check('оплата 1000 прошла', r.status === 200 && r.data.paid === 1000, JSON.stringify(r.data));
check('остаток 770', r.data.balance === 770, 'получено ' + r.data.balance);
r = await call('/api/admin/payments', { method:'POST', token: op, body:{ booking_code: bookingCode, amount: -5000 } });
check('возврат больше оплаченного отклонён', r.status === 400, JSON.stringify(r.data));
r = await call('/api/bookings', { token: umida });
check('агентство видит оплату', r.data[0].paid === 1000 && r.data[0].balance === 770, JSON.stringify(r.data[0]));

console.log('\n--- заведение агентства ---');
r = await call('/api/admin/agencies', { method:'POST', token: op, body:{ login:'newagency', name:'NEW AGENCY', password:'secret123' } });
check('агентство заведено', r.status === 200, JSON.stringify(r.data));
r = await call('/api/login', { method:'POST', body:{ login:'newagency', password:'secret123' } });
check('новое агентство входит', r.status === 200 && !!r.data.token);
r = await call('/api/admin/agencies', { method:'POST', token: op, body:{ login:'newagency', name:'X', password:'secret123' } });
check('дубль логина отклонён', r.status === 400);
r = await call('/api/admin/agencies', { method:'POST', token: op, body:{ login:'short', name:'X', password:'123' } });
check('короткий пароль отклонён', r.status === 400);

console.log('\n--- отмена ---');
r = await call('/api/bookings', { token: umida });
const id = r.data[0].id;
r = await call('/api/bookings/' + id + '/cancel', { method:'POST', token: umida });
check('бронь отменена', r.status === 200 && r.data.released_seats === 2, JSON.stringify(r.data));
r = await call('/api/departures', { token: umida });
check('места вернулись', r.data.find(d=>d.code==='TZX1707').seats_free === freeBefore);
r = await call('/api/bookings/' + id + '/cancel', { method:'POST', token: umida });
check('повторная отмена отклонена', r.status === 404);

console.log(`\nИТОГО: ${pass} пройдено, ${fail} провалено`);
process.exit(fail ? 1 : 0);
