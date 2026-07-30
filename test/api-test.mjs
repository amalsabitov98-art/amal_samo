const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';
// База для тестов наполняется с TURON_SEED_PASSWORD=turon2026 (см. test/README.md)
const PW = process.env.TURON_SEED_PASSWORD || 'turon2026';
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
r = await call('/api/login', { method:'POST', body:{ login:'umida', password:PW } });
check('вход агентства', r.status === 200 && !!r.data.token);
const umida = r.data.token;
check('роль agency', r.data.agency.role === 'agency', r.data.agency.role);

r = await call('/api/login', { method:'POST', body:{ login:'operator', password:PW } });
const op = r.data.token;
check('вход оператора, роль operator', r.data.agency.role === 'operator');

console.log('\n--- справочники ---');
r = await call('/api/departures', { token: umida });
const allFuture = r.data.every(d => d.date_start >= new Date().toISOString().slice(0,10));
check('агентству отдаются только предстоящие заезды', allFuture,
      'есть прошедшие: ' + r.data.filter(d=>d.date_start < new Date().toISOString().slice(0,10)).map(d=>d.code).join(','));
const opDeps = await call('/api/departures?all=1', { token: op });
check('оператор видит все 34, включая прошедшие', opDeps.data.length === 34, 'получено ' + opDeps.data.length);
const agAll = await call('/api/departures?all=1', { token: umida });
check('агентство через ?all=1 прошедших не получает', agAll.data.length === r.data.length);
const dep = r.data.find(d => d.code === 'TZX2808');
check('у заезда есть прайс', dep && dep.prices.length > 0);
const freeBefore = dep.seats_free;
r = await call('/api/tours', { token: umida });
check('туров 5', r.data.length === 5);
check('операторская комиссия не отдаётся', !('operator_commission' in r.data[0]), JSON.stringify(r.data[0]));

console.log('\n--- бронирование ---');
r = await call('/api/bookings', { method:'POST', token: umida, body:{
  departure_code:'TZX2808',
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
const after = r.data.find(d => d.code === 'TZX2808');
check('места списались', after.seats_free === freeBefore - 2, `${freeBefore} → ${after.seats_free}`);

r = await call('/api/bookings', { method:'POST', token: umida, body:{
  departure_code:'TZX2808', passengers:[{ full_name:'X', birth_date:'1990-01-01', passport_number:'F', placement:'НЕТ' }]}});
check('несуществующее размещение → ошибка', r.status === 400, JSON.stringify(r.data));

console.log('\n--- изоляция агентств ---');
r = await call('/api/bookings', { token: umida });
check('umida видит свою бронь', r.data.length === 1);
check('остаток = полной сумме', r.data[0].balance === 1770, JSON.stringify(r.data[0]));
r = await call('/api/login', { method:'POST', body:{ login:'ofotour', password:PW } });
r = await call('/api/bookings', { token: r.data.token });
check('ofotour чужих броней не видит', r.data.length === 0, 'видит ' + r.data.length);

console.log('\n--- права оператора ---');
r = await call('/api/admin/bookings', { token: umida });
check('агентство в админку → 403', r.status === 403, JSON.stringify(r.data));
r = await call('/api/admin/bookings', { token: op });
check('оператор видит бронь', r.status === 200 && r.data.items.length === 1, JSON.stringify(r.data).slice(0,120));
check('отдаётся общее количество', r.data.total === 1, JSON.stringify(r.data.total));
check('видно имя агентства', r.data.items[0].agency_name === 'UMIDA', r.data.items[0].agency_name);

r = await call('/api/admin/manifest?departure=TZX2808', { token: op });
check('список пассажиров: 3 строки', r.data.passengers.length === 3, 'получено ' + (r.data.passengers||[]).length);
check('тариф ребёнка CHD_5_10', r.data.passengers[1].price_code === 'CHD_5_10', r.data.passengers[1].price_code);

console.log('\n--- фильтры и поиск у оператора ---');
r = await call('/api/admin/bookings?q=ADULT', { token: op });
check('поиск по фамилии пассажира', r.data.total === 1, JSON.stringify(r.data.total));
r = await call('/api/admin/bookings?q=' + encodeURIComponent('НЕТТАКОГО'), { token: op });
check('поиск без совпадений пуст', r.data.total === 0);
r = await call('/api/admin/bookings?q=TZX', { token: op });
check('поиск по номеру брони', r.data.total === 1, JSON.stringify(r.data.total));
r = await call('/api/admin/bookings?departure=BUS2509', { token: op });
check('фильтр по чужому заезду пуст', r.data.total === 0);
r = await call('/api/admin/bookings?status=cancelled', { token: op });
check('фильтр по отменённым пуст', r.data.total === 0);
r = await call('/api/admin/bookings?debt=1', { token: op });
check('фильтр по долгу находит неоплаченную', r.data.total === 1, JSON.stringify(r.data.total));
r = await call('/api/admin/bookings?limit=1&offset=0', { token: op });
check('порция ограничена', r.data.items.length <= 1 && r.data.limit === 1, JSON.stringify(r.data.limit));
r = await call("/api/admin/bookings?q=" + encodeURIComponent("' OR 1=1 --"), { token: op });
check('кавычка в поиске не ломает запрос', r.status === 200 && r.data.total === 0,
      JSON.stringify(r.data).slice(0,100));

console.log('\n--- оплаты ---');
r = await call('/api/admin/payments', { method:'POST', token: op, body:{ booking_code: bookingCode, amount: 1000 } });
check('оплата 1000 прошла', r.status === 200 && r.data.paid === 1000, JSON.stringify(r.data));
check('остаток 770', r.data.balance === 770, 'получено ' + r.data.balance);
r = await call('/api/admin/payments', { method:'POST', token: op, body:{ booking_code: bookingCode, amount: -5000 } });
check('возврат больше оплаченного отклонён', r.status === 400, JSON.stringify(r.data));
r = await call('/api/bookings', { token: umida });
check('агентство видит оплату', r.data[0].paid === 1000 && r.data[0].balance === 770, JSON.stringify(r.data[0]));

console.log('\n--- правка состава брони ---');
r = await call('/api/bookings', { token: umida });
const editId = r.data[0].id;
const editCode = r.data[0].code;
check('состав отдаётся вместе с бронью', (r.data[0].passengers||[]).length === 3,
      JSON.stringify((r.data[0].passengers||[]).length));
let freeNow = (await call('/api/departures', { token: umida })).data.find(d=>d.code==='TZX2808').seats_free;

// убираем ребёнка: пассажиров 2, мест 1 (взрослый + младенец без места)
r = await call('/api/bookings/' + editId + '/passengers', { method:'POST', token: umida, body:{
  passengers:[
    { full_name:'ADULT ONE', birth_date:'1985-03-12', passport_number:'FA1', passport_expiry:'2031-01-01', placement:'DBL' },
    { full_name:'BABY', birth_date:'2025-08-01', passport_number:'FA3', passport_expiry:'2031-01-01', placement:'DBL' },
  ]}});
check('состав изменён', r.status === 200, JSON.stringify(r.data));
check('номер брони сохранён', r.data.booking_code === editCode, r.data.booking_code);
check('цена пересчитана 970+100', r.data.total_price === 1070, 'получено ' + r.data.total_price);
check('мест стало 1', r.data.seats_taken === 1, 'получено ' + r.data.seats_taken);
let freeAfter = (await call('/api/departures', { token: umida })).data.find(d=>d.code==='TZX2808').seats_free;
check('освободившееся место вернулось', freeAfter === freeNow + 1, `${freeNow} → ${freeAfter}`);

// возвращаем ребёнка обратно
r = await call('/api/bookings/' + editId + '/passengers', { method:'POST', token: umida, body:{
  passengers:[
    { full_name:'ADULT ONE', birth_date:'1985-03-12', passport_number:'FA1', passport_expiry:'2031-01-01', placement:'DBL' },
    { full_name:'CHILD SEVEN', birth_date:'2019-01-20', passport_number:'FA2', passport_expiry:'2031-01-01', placement:'DBL' },
    { full_name:'BABY', birth_date:'2025-08-01', passport_number:'FA3', passport_expiry:'2031-01-01', placement:'DBL' },
  ]}});
check('состав вернули, цена снова 1770', r.data.total_price === 1770, 'получено ' + r.data.total_price);

r = await call('/api/bookings/' + editId + '/passengers', { method:'POST', token: umida, body:{ passengers: [] }});
check('пустой состав отклонён', r.status === 400);
const other = await call('/api/login', { method:'POST', body:{ login:'ofotour', password:PW } });
r = await call('/api/bookings/' + editId + '/passengers', { method:'POST', token: other.data.token, body:{
  passengers:[{ full_name:'X', birth_date:'1990-01-01', passport_number:'P', placement:'DBL' }]}});
check('чужую бронь править нельзя', r.status === 404, JSON.stringify(r.data));

console.log('\n--- сводка по заезду ---');
r = await call('/api/admin/manifest?departure=TZX2808', { token: op });
const sum = r.data.summary;
check('сводка отдаётся', !!sum, JSON.stringify(r.data).slice(0,120));
check('броней 1', sum.bookings_count === 1, JSON.stringify(sum));
check('пассажиров 3, мест 2', sum.passengers_count === 3 && sum.seats_used === 2, JSON.stringify(sum));
check('продано 1770', sum.revenue === 1770, JSON.stringify(sum));
check('оплачено 1000, долг 770', sum.paid === 1000 && sum.owed === 770, JSON.stringify(sum));

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
check('места вернулись', r.data.find(d=>d.code==='TZX2808').seats_free === freeBefore);
r = await call('/api/bookings/' + id + '/cancel', { method:'POST', token: umida });
check('повторная отмена отклонена', r.status === 404);

console.log('\n--- журнал действий ---');
r = await call('/api/admin/bookings/' + editId + '/history', { token: op });
const log = r.data;
check('журнал отдаётся', Array.isArray(log) && log.length > 0, JSON.stringify(log).slice(0,120));
check('есть запись о создании', log.some(e => e.action === 'created'), JSON.stringify(log.map(e=>e.action)));
check('есть записи о правке', log.filter(e => e.action === 'edited').length === 2,
      JSON.stringify(log.map(e=>e.action)));
check('есть оплата', log.some(e => e.action === 'payment'), JSON.stringify(log.map(e=>e.action)));
check('видно, кто создал', log.find(e => e.action === 'created').actor_name === 'UMIDA',
      log.find(e => e.action === 'created').actor_name);
check('оплату провёл оператор', log.find(e => e.action === 'payment').actor_role === 'operator',
      log.find(e => e.action === 'payment').actor_role);
r = await call('/api/admin/bookings/' + editId + '/history', { token: umida });
check('агентству журнал не отдаётся', r.status === 403, JSON.stringify(r.data));

console.log('\n--- управление агентствами ---');
r = await call('/api/admin/agencies', { token: op });
const target = r.data.find(a => a.login === 'newagency');
r = await call('/api/admin/agencies/' + target.id + '/deactivate', { method:'POST', token: op });
check('агентство отключено', r.status === 200 && r.data.is_active === 0, JSON.stringify(r.data));
r = await call('/api/login', { method:'POST', body:{ login:'newagency', password:'secret123' } });
check('отключённое не входит', r.status === 401, JSON.stringify(r.data));
r = await call('/api/admin/agencies/' + target.id + '/activate', { method:'POST', token: op });
check('включено обратно', r.data.is_active === 1);
r = await call('/api/admin/agencies/' + target.id + '/password', { method:'POST', token: op, body:{ password:'newpass123' } });
check('пароль сменён', r.status === 200, JSON.stringify(r.data));
r = await call('/api/login', { method:'POST', body:{ login:'newagency', password:'newpass123' } });
check('вход по новому паролю', r.status === 200);
r = await call('/api/login', { method:'POST', body:{ login:'newagency', password:'secret123' } });
check('старый пароль не работает', r.status === 401);
r = await call('/api/admin/agencies/' + target.id + '/password', { method:'POST', token: op, body:{ password:'123' } });
check('короткий пароль отклонён', r.status === 400);

console.log('\n--- срок действия паспорта ---');
r = await call('/api/bookings', { method:'POST', token: umida, body:{
  departure_code:'BUS2808',
  passengers:[
    { full_name:'EXPIRED SOON', birth_date:'1980-01-01', passport_number:'FE1',
      passport_expiry:'2026-09-01', placement:'DBL' },
    { full_name:'ALREADY EXPIRED', birth_date:'1980-01-01', passport_number:'FE2',
      passport_expiry:'2026-01-01', placement:'DBL' },
    { full_name:'ALL GOOD', birth_date:'1980-01-01', passport_number:'FE3',
      passport_expiry:'2031-01-01', placement:'DBL' },
  ]}});
check('бронь всё равно создаётся (это предупреждение, не запрет)', r.status === 200);
check('предупреждений ровно 2', (r.data.passport_warnings||[]).length === 2,
      JSON.stringify(r.data.passport_warnings));
check('истёкший паспорт назван', (r.data.passport_warnings||[]).some(w=>w.includes('ALREADY EXPIRED')));
check('чистый паспорт не помечен', !(r.data.passport_warnings||[]).some(w=>w.includes('ALL GOOD')));

console.log('\n--- публичный каталог (без входа) ---');
const today = new Date().toISOString().slice(0, 10);
r = await call('/api/public/destinations');
check('направления отдаются без токена', r.status === 200 && Array.isArray(r.data),
      JSON.stringify(r.data).slice(0, 120));
const turkey = r.data.find(d => d.name === 'Турция');
const japan = r.data.find(d => d.name === 'Япония');
check('Турция есть и в ней заезды', !!turkey && turkey.departures_count > 0,
      JSON.stringify(turkey));
check('у Турции название плитки из destinations', turkey && turkey.title === 'Турция и Грузия',
      turkey && turkey.title);
check('у Турции есть цена «от»', turkey && turkey.min_price > 0, turkey && turkey.min_price);
check('Япония есть, но без заездов', !!japan && japan.departures_count === 0,
      JSON.stringify(japan));
check('в направлениях нет комиссий',
      !JSON.stringify(r.data).includes('commission'), JSON.stringify(r.data).slice(0, 200));

r = await call('/api/public/tours');
check('туры отдаются без токена', r.status === 200 && r.data.length === 5, 'получено ' + r.data.length);
check('в списке туров нет комиссий',
      !JSON.stringify(r.data).includes('commission'));
r = await call('/api/public/tours?destination=Япония');
check('фильтр по направлению работает',
      r.data.length === 4 && r.data.every(t => t.destination === 'Япония'),
      'получено ' + r.data.length);

r = await call('/api/public/tours/KARADENIZ');
check('карточка тура отдаётся без токена', r.status === 200 && r.data.code === 'KARADENIZ');
const kd = r.data;
check('есть описание и длительность', !!kd.description && kd.nights === 7, kd.nights);
check('есть блок «включено»', kd.included.length > 0, kd.included.length);
check('есть блок «не включено»', kd.excluded.length > 0, kd.excluded.length);
check('есть «важно знать»', kd.info.length > 0, kd.info.length);
check('два варианта маршрута', kd.variants.length === 2,
      kd.variants.map(v => v.code).join(','));
check('у каждого варианта своя программа по дням',
      kd.variants.every(v => v.days.length === 7),
      kd.variants.map(v => v.code + ':' + v.days.length).join(' '));
check('программы вариантов различаются',
      kd.variants[0].days[0].text !== kd.variants[1].days[0].text);
check('в карточке только предстоящие заезды',
      kd.departures.length > 0 && kd.departures.every(d => d.date_start >= today),
      kd.departures.filter(d => d.date_start < today).map(d => d.code).join(','));
check('у заездов карточки есть прайс', kd.departures.every(d => d.prices.length > 0));
check('в карточке тура нет комиссий',
      !JSON.stringify(kd).includes('commission'));

r = await call('/api/public/tours/JP_TOKYO');
check('закрытый тур отдаётся, но без заездов',
      r.status === 200 && r.data.is_bookable === 0 && r.data.departures.length === 0,
      JSON.stringify({ b: r.data.is_bookable, d: r.data.departures.length }));
r = await call('/api/public/tours/NOSUCHTOUR');
check('несуществующий тур → 404', r.status === 404, JSON.stringify(r.data));
r = await call('/api/bookings');
check('бронь без входа по-прежнему закрыта', r.status === 401, JSON.stringify(r.data));

console.log('\n--- защита от перебора пароля ---');
// ofotour в тестах выше нигде не логинился успешно, поэтому его счётчик чист
let blocked = null;
for (let i = 1; i <= 12 && blocked === null; i++) {
  const a = await call('/api/login', { method:'POST', body:{ login:'ofotour', password:'wrong' + i } });
  if (a.status === 429) blocked = i;
}
check('вход блокируется после серии промахов', blocked !== null, 'не заблокировался');
check('блокировка не раньше 5-й попытки', blocked === null || blocked >= 5, 'на попытке ' + blocked);
r = await call('/api/login', { method:'POST', body:{ login:'umida', password:PW } });
check('другой логин при этом работает', r.status === 200, JSON.stringify(r.data));

console.log(`\nИТОГО: ${pass} пройдено, ${fail} провалено`);
process.exit(fail ? 1 : 0);
