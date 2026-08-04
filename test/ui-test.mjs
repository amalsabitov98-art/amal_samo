/*
 * Дымовые тесты интерфейса на preview.html (демо-режим, без бэкенда).
 *
 * Зачем: 102 теста в api-test.mjs проверяют только сервер. Интерфейс
 * ломался молча — например, переделали конструктор и осталась ссылка на
 * удалённый элемент. Здесь прогоняем то, что агент делает руками.
 *
 * Перед запуском собрать превью:  node tools/build-preview.js
 * Запуск:                          node test/ui-test.mjs
 * Нужен playwright и Chromium (в CI: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const PREVIEW = path.resolve("preview.html");
if (!fs.existsSync(PREVIEW)) {
  console.error("Нет preview.html — соберите: node tools/build-preview.js");
  process.exit(1);
}

let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  → " + detail : "")); }
}

const EXEC = process.env.CHROMIUM_PATH ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch(
  fs.existsSync(EXEC) ? { executablePath: EXEC } : {}
);

async function session(login) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // сетевые ошибки в офлайн-превью ожидаемы (курс ЦБ, шрифты)
    if (m.type() === "error" && !/net::|ERR_/.test(m.text())) errors.push(m.text());
  });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (await page.locator("#public-login-btn").count()) {
    try { await page.locator("#public-login-btn").click({ timeout: 1200 }); } catch {}
  }
  await page.waitForTimeout(200);
  await page.fill("#l-login", login);
  await page.fill("#l-password", "turon2026");
  await page.click("#login-btn");
  await page.waitForTimeout(800);
  return { page, errors };
}

// --------------------------------------------------- титульная (без входа)
// Гостевой экран: видео вместо прежней карусели и поиск по реальным заездам.
// Именно здесь ловится «панель есть, а фильтрует пустоту».
console.log("\nТитульная страница");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/net::|ERR_/.test(m.text())) errors.push(m.text());
  });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  check("на титульной есть видео-подложка",
        (await page.locator(".tt-hero-video").count()) === 1);
  check("каруселей с картинками больше нет",
        (await page.locator(".tt-hero-slide").count()) === 0);
  check("панель поиска на месте", await page.locator("#tour-search").isVisible());

  // выпадающие списки строятся из заездов, а не зашиты в разметку
  const months = await page.locator("#ts-month option").count();
  const airports = await page.locator("#ts-airport option").count();
  check("месяцы подставлены из заездов", months > 1, months + " вариантов");
  check("аэропорты подставлены из заездов", airports > 1, airports + " вариантов");
  check("в списке месяцев нет мусорного «г.»",
        !(await page.locator("#ts-month").innerText()).includes(" г."));

  const hintAll = await page.textContent("[data-search-hint]");
  check("счётчик найденного заполнен", /\d/.test(hintAll || ""), hintAll);

  // фильтр обязан сужать выдачу, иначе он декоративный
  await page.selectOption("#ts-airport", "BUS");
  await page.waitForTimeout(200);
  const hintBus = await page.textContent("[data-search-hint]");
  check("фильтр по аэропорту сужает выдачу", hintAll !== hintBus,
        `${hintAll} → ${hintBus}`);

  await page.click(".tt-hero-search-btn");
  await page.waitForTimeout(600);
  const rows = await page.locator("#tour-search-results .tt-search-row").count();
  check("выдача поиска отрисована", rows > 0, rows + " строк");

  await page.locator("#tour-search-results .tt-search-row .tt-btn").first().click();
  await page.waitForTimeout(700);
  check("из выдачи открывается карточка тура",
        (await page.evaluate(() => location.hash)).startsWith("#/t/"));

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ------------------------------------------------------------- агентство
console.log("\nКабинет агентства");
{
  const { page, errors } = await session("umida");
  check("вход выполнен", await page.locator("#screen-app").isVisible());

  // постоянная верхняя панель
  check("в шапке есть кнопка «Выход»", await page.locator("#logout-top").isVisible());
  check("в шапке есть табло курсов", await page.locator('[data-rate="usd"]').count() > 0);
  check("переключателя языка в кабинете нет (кабинет только на русском)",
        (await page.locator("#app-language").count()) === 0);

  // широкий режим: сайдбар сворачивается до иконок и возвращается обратно
  await page.click("#sidebar-collapse");
  await page.waitForTimeout(350);
  check("боковая панель сворачивается",
        await page.locator("#screen-app").evaluate((el) => el.classList.contains("is-sidebar-collapsed")));
  check("компактный режим запоминается",
        await page.evaluate(() => localStorage.getItem("turon.sidebar.compact")) === "1");
  await page.click("#sidebar-collapse");
  await page.waitForTimeout(350);

  // все вкладки открываются и наполняются
  for (const t of await page.locator(".tt-tab:not([hidden])").all()) {
    const name = await t.getAttribute("data-tab");
    if (!name) continue;
    await t.click({ force: true });
    await page.waitForTimeout(400);
    const panel = page.locator("#panel-" + name);
    const text = (await panel.innerText()).trim();
    check("вкладка «" + name + "» открывается с содержимым",
          await panel.isVisible() && text.length > 10, text.length + " симв.");
  }

  // конструктор: рейсы, отели, тарифы
  await page.locator('.tt-tab[data-tab="builder"]').first().click({ force: true });
  await page.waitForTimeout(500);
  check("в конструкторе есть заезды",
        (await page.locator("#builder-departure option").count()) > 0);
  check("нарисована таблица рейсов",
        (await page.locator(".tt-mj-fltable tbody tr").count()) === 2);
  check("логотип перевозчика на месте",
        (await page.locator(".tt-mj-airline-logo").count()) === 2);
  check("отели с ссылками на booking.com",
        (await page.locator("#builder-hotelfield a").count()) === 2);
  check("длительность посчитана, а не «уточняется»",
        !(await page.locator("#builder-paxhead").innerText()).includes("уточняется"));
  check("тарифы построены из прайса заезда",
        (await page.locator("#builder-travellers .tt-mj-paxrow").count()) > 0);
  check("кнопка программы ведёт на PDF",
        !!(await page.locator("#builder-program").getAttribute("data-url")));
  check("блок «включено» заполнен",
        (await page.locator("#builder-included li").count()) > 3);
  check("в слайдере четыре фотографии тура",
        (await page.locator("#builder-media [data-media-slide]").count()) === 4);
  const firstMedia = await page.locator("#builder-media .is-active img").getAttribute("src");
  await page.click("#builder-media-next");
  await page.waitForTimeout(850);
  const secondMedia = await page.locator("#builder-media .is-active img").getAttribute("src");
  check("слайдер переключает фотографии", firstMedia !== secondMedia,
        `${firstMedia} → ${secondMedia}`);

  // счёт и бронирование. Берём заезд с запасом мест: на ближайшем их может
  // остаться одно, и кнопка справедливо заблокируется по нехватке мест.
  let roomy = null;
  for (const opt of await page.locator("#builder-departure option").all()) {
    const label = await opt.innerText();
    const free = label.match(/свободно (\d+)/);
    if (free && Number(free[1]) >= 3) { roomy = await opt.getAttribute("value"); break; }
  }
  check("есть заезд со свободными местами", !!roomy);
  await page.selectOption("#builder-departure", roomy);
  await page.waitForTimeout(400);

  const plus = page.locator('#builder-travellers button[data-bstep="1"]');
  await plus.nth(1).click();
  await plus.nth(1).click();
  await page.waitForTimeout(300);
  const grand = await page.locator(".tt-mj-total-grand strong").innerText();
  check("сумма пересчитывается при выборе туристов", /\d/.test(grand), grand);

  await page.click("#builder-book");
  await page.waitForTimeout(600);
  check("окно брони открывается", await page.locator("#booking-modal").isVisible());
  const paxCount = await page.locator("#bm-passengers .tt-pax").count();
  check("состав перенесён из конструктора", paxCount === 2, paxCount + " строк");

  check("submit заблокирован, пока не заполнены паспорта",
        await page.locator("#bm-submit").isDisabled());

  for (let i = 0; i < paxCount; i++) {
    const c = page.locator("#bm-passengers .tt-pax").nth(i);
    await c.locator('[data-f="full_name"]').fill("TEST PASSENGER" + i);
    await c.locator('[data-f="birth_date"]').fill("1990-01-0" + (i + 1));
    await c.locator('[data-f="passport_number"]').fill("AA10000" + i);
    await c.locator('[data-f="passport_expiry"]').fill("2032-01-01");
  }
  await page.waitForTimeout(400);
  check("submit разблокирован после заполнения",
        !(await page.locator("#bm-submit").isDisabled()));
  await page.locator("#bm-submit").click();
  await page.waitForTimeout(1000);
  check("бронь создана, окно закрылось",
        await page.locator("#booking-modal").isHidden());

  const bookings = await page.locator("#panel-bookings").innerText();
  check("бронь видна в разделе «Бронирования»", bookings.includes("TEST") || /\$/.test(bookings));

  // уведомления
  await page.click("#notice-btn");
  await page.waitForTimeout(400);
  check("панель уведомлений открывается",
        await page.locator("#notice-panel").isVisible());
  check("уведомления построены по броням",
        (await page.locator("#notice-panel").innerText()).length > 20);

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// -------------------------------------------------------------- оператор
console.log("\nКабинет оператора");
{
  const { page, errors } = await session("operator");
  check("вход оператора выполнен", await page.locator("#screen-app").isVisible());
  for (const tab of ["manifest", "admin-bookings", "agencies"]) {
    await page.locator(`.tt-tab[data-tab="${tab}"]`).first().click({ force: true });
    await page.waitForTimeout(500);
    const panel = page.locator("#panel-" + tab);
    check("операторская вкладка «" + tab + "»",
          await panel.isVisible() && (await panel.innerText()).trim().length > 10);
  }
  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// --------------------------------------------------------- тема день/ночь
// Светлый вариант — это прежнее кремовое оформление: тёмные правила навешены
// через :root:not([data-theme="light"]), поэтому «день» просто перестаёт их
// применять. Проверяем, что переключается, запоминается и что раскладка
// подвала от темы не зависит (на этом уже поймались — заголовки уезжали
// в капс, а колонки разъезжались).
console.log("\nТема день/ночь");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const theme = () => page.evaluate(
    () => document.documentElement.getAttribute("data-theme"));
  const pageBg = () => page.evaluate(
    () => getComputedStyle(document.body).backgroundColor);
  const footDisplay = () => page.evaluate(
    () => getComputedStyle(document.querySelector(".tt-public-footer")).textTransform);

  check("по умолчанию тёмная тема", (await theme()) === "dark", await theme());
  const darkBg = await pageBg();
  check("кнопка темы есть в шапке", await page.locator("#theme-toggle").isVisible());
  check("подвал не в капсе на тёмной", (await footDisplay()) === "none", await footDisplay());

  await page.click("#theme-toggle");
  await page.waitForTimeout(500);
  check("клик переключает на светлую", (await theme()) === "light", await theme());
  const lightBg = await pageBg();
  check("фон страницы реально поменялся", darkBg !== lightBg, `${darkBg} → ${lightBg}`);
  check("подвал не в капсе и на светлой", (await footDisplay()) === "none", await footDisplay());
  check("в светлой теме контакты в подвале на месте",
        (await page.locator(".tt-foot-cols a").count()) >= 3);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  check("выбор темы переживает обновление", (await theme()) === "light", await theme());

  await page.click("#theme-toggle");
  await page.waitForTimeout(500);
  check("возврат к тёмной работает", (await theme()) === "dark", await theme());

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ------------------------------------------------------------ навигация
// Адрес — единственный источник правды: клик, «назад» и F5 обязаны давать
// один и тот же экран. Раньше экраны переключались напрямую, и обновление
// страницы в кабинете выкидывало на первую вкладку.
console.log("\nНавигация и адресная строка");
{
  const { page, errors } = await session("umida");
  const hash = () => page.evaluate(() => location.hash);
  const tab = () => page.evaluate(
    () => document.querySelector(".tt-tab.is-active")?.dataset.tab || "-");
  const shown = () => page.evaluate(
    () => ["public", "login", "app"]
      .find((n) => !document.getElementById("screen-" + n).hidden) || "none");

  check("после входа адрес указывает на кабинет",
        (await hash()).startsWith("#/app/"), await hash());

  await page.locator('.tt-tab[data-tab="payments"]').first().click({ force: true });
  await page.waitForTimeout(500);
  check("вкладка попадает в адрес", (await hash()) === "#/app/payments", await hash());

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  check("обновление страницы возвращает на ту же вкладку",
        (await hash()) === "#/app/payments" && (await tab()) === "payments",
        (await hash()) + " / " + (await tab()));

  await page.goBack();
  await page.waitForTimeout(600);
  check("«назад» листает вкладки кабинета", (await tab()) !== "payments", await tab());

  await page.click("#app-home-btn");
  await page.waitForTimeout(700);
  check("логотип кабинета ведёт на главную",
        (await shown()) === "public" && (await hash()) === "#/",
        (await shown()) + " " + (await hash()));
  check("в шапке появляется возврат в кабинет",
        (await page.textContent("#public-login-btn span")).trim() === "Кабинет");

  await page.click("#public-login-btn");
  await page.waitForTimeout(700);
  check("кнопка «Кабинет» возвращает на последнюю вкладку",
        (await shown()) === "app", await shown());

  await page.click("#logout-top");
  await page.waitForTimeout(700);
  check("после выхода — главная и кнопка «Войти»",
        (await shown()) === "public" &&
        (await page.textContent("#public-login-btn span")).trim() === "Войти");

  // адрес кабинета без сессии не должен пускать внутрь
  await page.goto("file://" + PREVIEW + "#/app/bookings", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  check("кабинет по ссылке без входа уводит на форму входа",
        (await shown()) === "login", await shown());

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// -------------------------------------------------------------- телефон
console.log("\nМобильная вёрстка");
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (await page.locator("#public-login-btn").count()) {
    try { await page.locator("#public-login-btn").click({ timeout: 1200 }); } catch {}
  }
  await page.waitForTimeout(200);
  await page.fill("#l-login", "umida");
  await page.fill("#l-password", "turon2026");
  await page.click("#login-btn");
  await page.waitForTimeout(800);
  const size = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  check("нет горизонтальной прокрутки на 390px",
        size.scroll <= size.client + 1, size.scroll + " > " + size.client);
  check("кнопка меню видна", await page.locator("#nav-toggle").isVisible());
  check("кнопка «Выход» видна", await page.locator("#logout-top").isVisible());
  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

await browser.close();
console.log(`\nИтого: ${passed} пройдено, ${failed} провалено`);
process.exit(failed ? 1 : 0);
