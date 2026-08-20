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
  check("в автослайдере три главных направления",
        (await page.locator(".tt-destination-showcase .tt-showcase-slide").count()) === 3);
  check("Карадениз стоит первым и назван главным продуктом",
        await page.locator(".tt-showcase-slide").first().evaluate((el) =>
          el.classList.contains("is-karadeniz") &&
          el.classList.contains("is-active") &&
          el.textContent.includes("Загадочный Карадениз")));
  check("Умра и Япония собраны двумя следующими превью",
        await page.locator(".tt-showcase-previews").evaluate((el) =>
          [...el.children].filter((child) => !child.hidden).length === 2 &&
          getComputedStyle(el).position === "absolute"));
  check("первый кадр длится 6 секунд, остальные по 5",
        await page.locator(".tt-showcase-slide").evaluateAll((slides) =>
          slides.map((el) => Number(el.dataset.duration)).join(",") === "6000,5000,5000"));
  check("есть таймер, стрелки и три ручных переключателя",
        (await page.locator("[data-showcase-progress]").count()) === 1 &&
        (await page.locator("[data-showcase-prev], [data-showcase-next]").count()) === 2 &&
        (await page.locator(".tt-showcase-dots [data-showcase-goto]").count()) === 3);
  check("витрина занимает ровно ширину и высоту окна",
        await page.locator(".tt-public-catalogue").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return Math.abs(r.width - window.innerWidth) < 1 &&
            Math.abs(r.height - window.innerHeight) < 1;
        }));
  check("отдельный японский слайд удалён",
        (await page.locator(".tt-japan-sheet").count()) === 0);
  check("новый полноэкранный блок «О компании» отрисован",
        await page.locator("#about-company").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.classList.contains("tt-about-company") &&
            Math.abs(r.width - window.innerWidth) < 1 &&
            r.height >= window.innerHeight * 0.9;
        }));
  check("в блоке «О компании» есть командное фото и три показателя",
        (await page.locator("#about-company .tt-about-photo").count()) === 1 &&
        (await page.locator("#about-company .tt-about-stat").count()) === 3 &&
        await page.locator("#about-company .tt-about-photo").evaluate((img) =>
          img.complete && img.naturalWidth > 0));
  check("старый логотип-заглушка из блока «О компании» удалён",
        (await page.locator("#about-company .tt-about-emblem").count()) === 0);
  check("блок явно подписан как «О компании»",
        (await page.locator("#about-company .tt-about-kicker").textContent()).trim() === "О компании");
  check("показатели размечены как доступный список",
        await page.locator("#about-company .tt-about-stats").getAttribute("role") === "list" &&
        (await page.locator("#about-company .tt-about-stat[role='listitem']").count()) === 3);
  check("логотип не использует растровую надпись с белым ореолом",
        await page.locator("#about-company .tt-about-brand-lockup").evaluate((el) => {
          const mark = el.querySelector('img[src="img/etihad-mark.png"]');
          const word = el.querySelector(".tt-about-logo-word");
          return !!mark && !!word && word.textContent.trim() === "ETIHAD" &&
            !el.querySelector('img[src="img/etihad-logo.png"]');
        }).catch(() => false));
  check("заголовок «О компании» не зажат в узкой колонке",
        await page.locator("#about-company h2").evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width >= 600 &&
            parseFloat(style.lineHeight) / parseFloat(style.fontSize) >= 0.9;
        }));

  await page.locator('[data-showcase-card="1"]').click();
  await page.waitForTimeout(1100);
  check("превью Умры разворачивается в активный полноэкранный кадр",
        await page.locator('[data-showcase-slide="1"]').evaluate((el) =>
          el.classList.contains("is-active") && el.getAttribute("aria-hidden") === "false"));
  await page.locator('.tt-showcase-slide.is-active [data-dest="Умра"]').click();
  await page.waitForTimeout(500);
  check("Умра открывается как отдельное направление",
        (await page.evaluate(() => location.hash)).includes("%D0%A3%D0%BC%D1%80%D0%B0"));
  check("в Умре заполнены девять программ",
        (await page.locator(".tt-umrah-program").count()) === 9);
  check("в программе есть рейсы, отели, даты и цены",
        await page.locator(".tt-umrah-program").first().evaluate((el) => {
          el.open = true;
          const text = el.textContent;
          return text.includes("TAS–JED") && text.includes("Taj Park") &&
            text.includes("Даты вылетов 2026") && text.includes("QUAD $1200");
        }));
  await page.evaluate(() => { window.location.hash = "#/"; });
  await page.waitForTimeout(500);

  const nativeWheel = await page.locator("#public-catalog").evaluate((el) =>
    el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 240 })));
  check("колесо не перехватывается витриной направлений", nativeWheel);

  // Переход по hash не меняет screen, поэтому именно здесь раньше мог
  // сохраниться overflow:hidden от hero/fullscreen и «умереть» колесо на
  // внутренней странице. Имитируем зависшее состояние и проверяем не
  // только CSS, но и фактическое движение страницы колёсиком. Целимся в
  // Умру: она приходит тем же переходом по hash без смены screen, снимает
  // блокировку и достаточно высокая, чтобы колесо реально сдвинуло её от
  // верха (у короткой страницы направления хода почти нет, и проверка
  // ловила бы нехватку высоты, а не саму блокировку).
  await page.evaluate(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflowY = "hidden";
    window.location.hash = "#/d/%D0%A3%D0%BC%D1%80%D0%B0";
  });
  await page.waitForTimeout(700);
  check("внутренняя страница снимает зависшую блокировку прокрутки",
        await page.evaluate(() =>
          document.body.style.overflow === "" &&
          document.documentElement.style.overflowY === ""));
  // Оставшийся overflow:hidden сделал бы документ непрокручиваемым, и любой
  // scrollTo зажался бы в 0. Прокручиваем программно и убеждаемся, что позиция
  // прижилась — это и есть «живое» колесо, но без гонок headless-таймингов.
  const innerScrollY = await page.evaluate(() => {
    window.scrollTo(0, 400);
    return window.scrollY;
  });
  check("страница прокручивается после снятия блокировки",
        innerScrollY > 0, `scrollY=${innerScrollY}`);

  // Для остальных проверок титульной возвращаемся на главный маршрут.
  await page.evaluate(() => { window.location.hash = "#/"; });
  await page.waitForTimeout(700);

  // месяцы строятся из заездов, а не зашиты в разметку; количество человек —
  // фиксированные варианты 1..5+ (фильтр по остатку мест, не по данным)
  const months = await page.locator("#ts-month option").count();
  const people = await page.locator("#ts-people option").count();
  check("месяцы подставлены из заездов", months > 1, months + " вариантов");
  check("вариантов количества человек 6 (любое + 1..5)", people === 6, people + " вариантов");
  check("в списке месяцев нет мусорного «г.»",
        !(await page.locator("#ts-month").innerText()).includes(" г."));

  const hintAll = await page.textContent("[data-search-hint]");
  check("счётчик найденного заполнен", /\d/.test(hintAll || ""), hintAll);

  // Демо-заездам сейчас всем хватает мест (минимум 45 свободных), поэтому
  // фильтр 1..5 человек физически ничего не отсеет — не повод считать его
  // декоративным. Проверяем формулу напрямую: пересчитываем ожидаемое число
  // из тех же данных (seats_free >= N), что и форма, и сверяем с тем, что
  // показано — ловит и опечатку в сравнении, и подмену поля.
  await page.selectOption("#ts-people", "5");
  await page.waitForTimeout(200);
  const hintFive = await page.textContent("[data-search-hint]");
  const expectedFive = await page.evaluate(function () {
    return window.TuronApi.catalogDepartures().then(function (list) {
      return (list || []).filter(function (d) { return d.seats_free >= 5; }).length;
    });
  });
  check("фильтр по числу туристов считает по остатку мест (seats_free >= N)",
        hintFive.includes(String(expectedFive)),
        `ожидали ${expectedFive}, показано «${hintFive}»`);

  await page.click(".tt-hero-search-btn");
  await page.waitForTimeout(600);
  const rows = await page.locator("#tour-search-results .tt-search-row").count();
  check("выдача поиска отрисована", rows > 0, rows + " строк");

  // Выбор из поиска должен доехать до карточки: кнопка несёт дату и число
  // туристов, иначе фильтр «Количество человек» остаётся декоративным.
  const firstBtn = page.locator("#tour-search-results .tt-search-row .tt-btn").first();
  const carriedDeparture = await firstBtn.getAttribute("data-departure");
  const carriedPeople = await firstBtn.getAttribute("data-people");
  check("кнопка выдачи несёт выбранную дату", !!carriedDeparture, String(carriedDeparture));
  check("кнопка выдачи несёт число туристов", carriedPeople === "5", String(carriedPeople));

  await firstBtn.click();
  await page.waitForTimeout(700);
  check("из выдачи открывается карточка тура",
        (await page.evaluate(() => location.hash)).startsWith("#/t/"));

  // Расчёт открыт сразу на той дате, что нашли, и с набранными туристами.
  const calcOpen = await page.locator(".tt-cat-calc").count();
  check("расчёт открыт сразу на найденной дате", calcOpen === 1, calcOpen + " открытых");
  const adultCount = await page
    .locator('.tt-cat-calc .tt-calc-row:has([data-tariff="ADULT"]) output')
    .first().textContent().catch(() => null);
  check("число туристов из поиска подставлено в расчёт", adultCount === "5",
        `в счётчике «${adultCount}»`);

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// --------------------------------------- карточка тура: пропуск списка
console.log("\nКарточка тура Карадениз");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Турция всегда ровно с одним туром — промежуточный список пропускается,
  // адрес подменяется сразу на карточку.
  await page.evaluate(() => { window.location.hash = "#/d/%D0%A2%D1%83%D1%80%D1%86%D0%B8%D1%8F"; });
  await page.waitForTimeout(700);
  check("направление с одним туром сразу открывает карточку",
        (await page.evaluate(() => location.hash)) === "#/t/KARADENIZ");
  // Видео — закреплённый фон ПОЗАДИ всей страницы (.tt-tour-bg), а не
  // только внутри .tt-cat-hero: тот же приём, что и на странице Умры.
  check("видео-фон подключён",
        await page.locator(".tt-tour-bg video.tt-hero-video source[src='img/tour-karadeniz-hero.mp4']").count() === 1);
  check("фон закреплён (position:fixed), а не прокручивается вместе со страницей",
        await page.locator(".tt-tour-bg").evaluate((el) => getComputedStyle(el).position === "fixed"));

  /* Вариант маршрута привязан к аэропорту заезда: BUS — прилёт в Батуми,
   * TZX — прилёт в Трабзон. Маршруты зеркальные, поэтому показать не тот —
   * значит отправить группу в обратную сторону; проверяем оба направления. */
  const depCodes = await page.locator("[data-calc]").evaluateAll(
    (els) => els.map((e) => e.dataset.calc));
  const busDep = depCodes.find((c) => c.startsWith("BUS"));
  const tzxDep = depCodes.find((c) => c.startsWith("TZX"));
  const activeVariant = () => page.locator(".tt-cat-variant.is-active")
    .first().textContent().catch(() => "");
  check("в карточке есть заезды обоих аэропортов", !!busDep && !!tzxDep,
        JSON.stringify(depCodes.slice(0, 4)));

  await page.locator(`[data-calc="${tzxDep}"]`).first().click();
  await page.waitForTimeout(400);
  check("расчёт на заезде TZX переключает программу на прилёт в Трабзон",
        (await activeVariant()).includes("прилёт в Трабзон"), await activeVariant());

  await page.locator(`[data-calc="${tzxDep}"]`).first().click();   // закрыть
  await page.waitForTimeout(200);
  await page.locator(`[data-calc="${busDep}"]`).first().click();
  await page.waitForTimeout(400);
  check("расчёт на заезде BUS переключает программу на прилёт в Батуми",
        (await activeVariant()).includes("прилёт в Батуми"), await activeVariant());
  await page.locator(`[data-calc="${busDep}"]`).first().click();   // закрыть за собой
  await page.waitForTimeout(200);

  // Раскладка Умры: текст-герой идёт полосой сверху (не во весь экран —
   // иначе заголовок уезжал в самый низ и над ним зияла пустая «пропасть»),
   // а ощущение «видео на весь экран» держит ЗАКРЕПЛЁННЫЙ видеофон в
   // полную высоту окна позади всей страницы.
  const heroInfo = await page.evaluate(() => {
    const h = document.querySelector(".tt-cat-hero").getBoundingClientRect();
    const bg = document.querySelector(".tt-tour-bg").getBoundingClientRect();
    return { heroH: Math.round(h.height), bgH: Math.round(bg.height), winH: window.innerHeight };
  });
  check("герой-текст занимает читаемую полосу, а не весь экран",
        heroInfo.heroH >= 220 && heroInfo.heroH <= heroInfo.winH * 0.8,
        JSON.stringify(heroInfo));
  check("видеофон закреплён на всю высоту окна",
        heroInfo.bgH >= heroInfo.winH - 2, JSON.stringify(heroInfo));

  // Шапка над видео прозрачная — has-hero выставлен (видео от самого верха).
  check("над видео карточки тура шапка прозрачная (has-hero)",
        await page.evaluate(() =>
          document.querySelector("#screen-public").classList.contains("has-hero") &&
          document.querySelector("#screen-public").classList.contains("has-tourhero")));

  // Герой в стиле Умры: надзаголовок + плашки-факты (длительность/перелёт/цена).
  check("у публичного героя есть надзаголовок и плашки-факты",
        await page.evaluate(() => {
          const hero = document.querySelector("#screen-public .tt-cat-hero");
          if (!hero) return false;
          const facts = hero.querySelectorAll(".tt-tour-facts > span, .tt-tour-facts > strong");
          return !!hero.querySelector(".tt-tour-kicker") && facts.length >= 2;
        }));

  // Контент (крошки, герой, карточки) должен стоять НАД закреплённым видео,
  // а не потеряться позади него из-за неявного порядка стекинга.
  const stacking = await page.evaluate(() => {
    const bg = document.querySelector(".tt-tour-bg");
    const block = document.querySelector(".tt-cat-block");
    if (!bg || !block) return null;
    return {
      bgZ: getComputedStyle(bg).zIndex,
      blockZ: getComputedStyle(block).zIndex,
      blockVisible: block.getBoundingClientRect().width > 0,
    };
  });
  check("карточки контента стоят над закреплённым видео",
        stacking && Number(stacking.blockZ) > Number(stacking.bgZ),
        JSON.stringify(stacking));

  const noHorizScroll = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  check("нет горизонтальной прокрутки на публичной карточке тура", noHorizScroll);

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ------------------------------------------------ карточка тура Умры
console.log("\nКарточка тура Умры");
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.location.hash = "#/t/UMRA_TAJ13"; });
  await page.waitForTimeout(600);

  check("карточка программы Умры открывается",
        (await page.locator("#screen-public .tt-cat-hero h1").innerText()).includes("Умра"));
  // Своего видео у Умры нет — чужой ролик Карадениза показывать нельзя.
  check("на карточке Умры нет видеофона Карадениза",
        (await page.locator(".tt-tour-bg").count()) === 0);

  const calc = page.locator("#tour-departures [data-calc]").first();
  check("у программы Умры есть заезды", (await calc.count()) > 0);
  if (await calc.count()) {
    await calc.click();
    await page.waitForTimeout(250);
    // Умра считается по типу номера (QUAD/TRPL/DBL), а не по одному счётчику
    // «Взрослый» с выводом размещения (это модель Карадениза).
    const rooms = await page.$$eval(
      ".tt-cat-dep .tt-calc-row .tt-calc-what .tt-muted-note",
      (els) => els.map((e) => e.textContent));
    check("калькулятор Умры — по типу номера QUAD/TRPL/DBL",
          rooms.some((r) => /QUAD/.test(r)) && rooms.some((r) => /TRPL/.test(r)) &&
          rooms.some((r) => /DBL/.test(r)), JSON.stringify(rooms));
    const paxLabels = await page.$$eval(
      ".tt-cat-dep .tt-calc-row .tt-calc-what strong",
      (els) => els.map((e) => e.textContent));
    check("строки Умры подписаны «Паломник»",
          paxLabels.filter((l) => l === "Паломник").length >= 2, JSON.stringify(paxLabels));
  }
  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ------------------------------------------------------------- агентство
console.log("\nКабинет агентства");
{
  const { page, errors } = await session("umida");
  check("вход выполнен", await page.locator("#screen-app").isVisible());
  check("колесо в кабинете не перехватывается hero-слайдером",
        await page.locator("#screen-app").evaluate((app) => {
          const allowed = app.dispatchEvent(new WheelEvent("wheel", {
            bubbles: true, cancelable: true, deltaY: 240
          }));
          return allowed && document.body.style.overflow === "" &&
            document.documentElement.style.overflow === "";
        }));

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

  // «Новый тур» — витрина туров; в конструктор Карадениза заходим кликом
  // по его карточке (Умра/Япония открылись бы своей карточкой тура).
  await page.locator('.tt-tab[data-tab="builder"]').first().click({ force: true });
  await page.waitForTimeout(500);
  check("«Новый тур» открывается витриной туров",
        (await page.locator("#builder-showcase .tt-tourcard[data-product]").count()) === 3 &&
        (await page.locator("#builder-karadeniz").isHidden()));
  await page.locator('#builder-showcase .tt-tourcard[data-product="karadeniz"]').first().click();
  await page.waitForTimeout(700);
  check("клик по Караденизу открывает конструктор mir-jahon",
        await page.locator("#builder-karadeniz").isVisible());

  // «Путь к святыням» разбит на 9 карточек-программ той же сеткой, что и
  // витрина выше, с фильтром по длительности (по умолчанию — 13 дней).
  await page.locator("#builder-back").click();
  await page.waitForTimeout(400);
  await page.locator('#builder-showcase .tt-tourcard[data-product="Умра"]').first().click();
  await page.waitForTimeout(700);
  check("фильтр «13 дней» активен по умолчанию, программ — 5",
        (await page.locator('#builder-umra [data-umra-days="13"]').getAttribute("class") || "")
          .includes("is-active") &&
        (await page.locator("#builder-umra .tt-tourcard[data-program]").count()) === 5);
  await page.locator('#builder-umra [data-umra-days="10"]').click();
  await page.waitForTimeout(300);
  check("фильтр «10 дней» показывает 4 программы",
        (await page.locator("#builder-umra .tt-tourcard[data-program]").count()) === 4);
  await page.locator('#builder-umra [data-umra-days="13"]').click();
  await page.waitForTimeout(300);
  check("возврат на «13 дней» — снова 5 программ",
        (await page.locator("#builder-umra .tt-tourcard[data-program]").count()) === 5);
  await page.locator("#builder-umra .tt-tourcard[data-program]").first().click();
  await page.waitForTimeout(700);
  check("клик по программе Умры открывает конструктор mir-jahon",
        (await page.locator("#builder-karadeniz").isVisible()) &&
        (await page.locator("#builder-umra").isHidden()));
  check("в конструкторе Умры счётчики по типам номера (QUAD/TRPL/DBL)",
        (await page.locator('#builder-travellers [data-tariff="QUAD"]').count()) > 0 &&
        (await page.locator('#builder-travellers [data-tariff="DBL"]').count()) > 0);
  check("в конструкторе Умры нарисована таблица рейсов (Джидда/Медина)",
        (await page.locator("#builder-flights .tt-mj-fltable tbody tr").count()) === 2);
  check("в конструкторе Умры есть отели программы",
        (await page.locator("#builder-hotelfield strong").count()) >= 2);
  // «← Все туры» из конструктора Умры возвращает на сетку из 9 программ.
  await page.locator("#builder-back").click();
  await page.waitForTimeout(500);
  check("«← Все туры» из программы Умры возвращает на сетку программ",
        (await page.locator("#builder-umra .tt-tourcard[data-program]").count()) === 5 &&
        (await page.locator("#builder-karadeniz").isHidden()));

  // возвращаемся к верхней витрине и в конструктор Карадениза для след. блока
  await page.locator("#builder-catalog-back").click();
  await page.waitForTimeout(400);
  await page.locator('#builder-showcase .tt-tourcard[data-product="karadeniz"]').first().click();
  await page.waitForTimeout(700);

  // конструктор: рейсы, отели, тарифы
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

  // счёт и бронирование. Продажа открыта — по местам заезды не отсеиваем,
  // берём просто первый в списке периода.
  const roomy = await page.locator("#builder-departure option").first().getAttribute("value");
  check("в конструкторе есть заезд для брони", !!roomy);
  check("в дропдауне периода нет «свободно»",
        !(await page.locator("#builder-departure").innerText()).includes("свободно"));
  await page.selectOption("#builder-departure", roomy);
  await page.waitForTimeout(400);

  // Первая строка — единый счётчик «Взрослый» (размещение по числу взрослых:
  // 1 → одноместный, 2 → двухместный, 3+ → трёхместный).
  const plus = page.locator('#builder-travellers button[data-bstep="1"]');
  await plus.nth(0).click();
  await plus.nth(0).click();
  await page.waitForTimeout(300);
  const grand = await page.locator(".tt-mj-total-grand strong").innerText();
  check("сумма пересчитывается при выборе туристов", /\d/.test(grand), grand);
  check("взрослые — один счётчик, не по одному на размещение",
        (await page.locator("#builder-travellers .tt-mj-paxrow").filter({ hasText: "Взрослый" }).count()) === 1);

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
  // Первый «Забронировать» показывает условия, а не отправляет бронь.
  await page.locator("#bm-submit").click();
  await page.waitForTimeout(300);
  check("первый «Забронировать» показывает условия, бронь не уходит",
        !(await page.locator("#bm-agree").isHidden()) &&
        !(await page.locator("#booking-modal").isHidden()));
  await page.locator("#bm-agree-ok").click();
  await page.waitForTimeout(200);
  check("после «Я согласен» условия скрыты", await page.locator("#bm-agree").isHidden());
  // Повторный «Забронировать» проводит бронь.
  await page.locator("#bm-submit").click();
  await page.waitForTimeout(1000);
  check("бронь создана, окно закрылось",
        await page.locator("#booking-modal").isHidden());

  const bookings = await page.locator("#panel-bookings").innerText();
  check("бронь видна в разделе «Бронирования»", bookings.includes("TEST") || /\$/.test(bookings));

  // «← Все туры» из конструктора Карадениза возвращает на витрину.
  await page.locator('.tt-tab[data-tab="builder"]').first().click({ force: true });
  await page.waitForTimeout(400);
  if (await page.locator("#builder-karadeniz").isHidden()) {
    // если после брони показана витрина — зайдём в Карадениз, чтобы проверить возврат
    await page.locator('#builder-showcase .tt-tourcard[data-product="karadeniz"]').first().click();
    await page.waitForTimeout(600);
  }
  check("в конструкторе Карадениза есть кнопка «Все туры»",
        await page.locator("#builder-back").isVisible());
  await page.locator("#builder-back").click();
  await page.waitForTimeout(400);
  check("«Все туры» возвращает на витрину туров",
        (await page.locator("#builder-karadeniz").isHidden()) &&
        (await page.locator("#builder-showcase .tt-tourcard[data-product]").count()) === 3);

  // На витрине кнопки возврата нет; на странице Умры она появляется и
  // возвращает на витрину туров.
  check("на витрине кнопки «Все туры» нет",
        await page.locator("#builder-catalog-back").isHidden());
  await page.locator('#builder-showcase .tt-tourcard[data-product="Умра"]').first().click({ force: true });
  await page.waitForTimeout(700);
  check("на странице Умры есть кнопка «Все туры»",
        await page.locator("#builder-catalog-back").isVisible());
  await page.locator("#builder-catalog-back").click();
  await page.waitForTimeout(400);
  check("кнопка «Все туры» с Умры возвращает на витрину",
        (await page.locator("#builder-showcase .tt-tourcard[data-product]").count()) === 3 &&
        (await page.locator("#builder-catalog-back").isHidden()));

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
  check("после входа оператор попадает на «Обзор»",
        await page.locator("#panel-overview").isVisible());
  for (const tab of ["overview", "manifest", "admin-bookings", "agencies"]) {
    await page.locator(`.tt-tab[data-tab="${tab}"]`).first().click({ force: true });
    await page.waitForTimeout(500);
    const panel = page.locator("#panel-" + tab);
    check("операторская вкладка «" + tab + "»",
          await panel.isVisible() && (await panel.innerText()).trim().length > 10);
  }
  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

// ------------------------------------------------- новый обзор оператора
console.log("\nОператор — обзор, карточки заездов, агентства");
{
  const { page, errors } = await session("operator");
  await page.waitForTimeout(500);

  const statsText = await page.locator("#ov-stats").innerText();
  check("сводные цифры на «Обзоре» посчитаны", /\d/.test(statsText), statsText);
  check("блок «Кто должен» отрисован", await page.locator("#ov-debtors").isVisible());
  check("блок «Ближайшие заезды» отрисован", await page.locator("#ov-departures").isVisible());

  await page.locator('.tt-tab[data-tab="manifest"]').first().click({ force: true });
  await page.waitForTimeout(500);
  const depCards = page.locator("#adm-departure-cards [data-departure]");
  const depCount = await depCards.count();
  check("карточки заездов заменили select", depCount > 0, depCount + " карточек");
  if (depCount > 1) {
    await depCards.nth(1).click();
    await page.waitForTimeout(400);
    check("клик по карточке заезда переключает выбор",
          await depCards.nth(1).evaluate((el) => el.classList.contains("is-active")));
  }
  await page.fill("#adm-departure-search", "несуществующий-код-xyz");
  await page.waitForTimeout(400);
  check("поиск по заездам сужает список карточек",
        await page.locator("#adm-departure-cards .tt-empty-state").isVisible());

  await page.locator('.tt-tab[data-tab="agencies"]').first().click({ force: true });
  await page.waitForTimeout(400);
  const agencyText = await page.locator("#adm-agencies").innerText();
  check("статистика по агентствам считается (оборот)",
        agencyText.includes("оборот"), agencyText.slice(0, 160));
  check("форма нового агентства свёрнута по умолчанию",
        await page.locator("#adm-new-agency").isHidden());
  await page.click("#adm-new-agency-toggle");
  await page.waitForTimeout(200);
  check("кнопка разворачивает форму нового агентства",
        await page.locator("#adm-new-agency").isVisible());

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

// Кабинет темой не управляется — он кремовый при любом data-theme. Проверка
// не теоретическая: когда data-theme стал осмысленным, ожил давно мёртвый
// блок :root[data-theme="dark"] (специфичность выше обычного :root) и
// перекрасил ВЕСЬ сайт в старую коричневую палитру — в кабинете пропадал
// логотип перевозчика и терялись даты.
{
  const { page, errors } = await session("umida");
  const palette = () => page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById("screen-app"));
    return {
      bg: cs.getPropertyValue("--tt-bg").trim(),
      text: cs.getPropertyValue("--tt-text").trim(),
    };
  });
  const dark = await palette();
  check("кабинет остаётся светлым при тёмной теме",
        dark.bg === "#f4f1e9", JSON.stringify(dark));

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await page.waitForTimeout(200);
  const light = await palette();
  check("палитра кабинета не зависит от темы",
        light.bg === dark.bg && light.text === dark.text,
        JSON.stringify(light));

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
