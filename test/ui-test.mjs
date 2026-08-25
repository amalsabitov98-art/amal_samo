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
  check("пункты выпадающих фильтров контрастны на системном светлом фоне",
        await page.locator("#ts-dest option").first().evaluate((el) => {
          const style = getComputedStyle(el);
          return style.color === "rgb(18, 49, 42)" &&
            style.backgroundColor === "rgb(255, 250, 240)";
        }));
  check("в автослайдере три главных направления",
        (await page.locator(".tt-destination-showcase .tt-showcase-slide").count()) === 3);
  check("невидимая ниже первого экрана витрина ещё не запускает таймер",
        await page.locator("[data-showcase]").evaluate((el) =>
          el.dataset.activeIndex === "0" &&
          !el.classList.contains("is-timer-running")));
  await page.locator("#tour-catalog").scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  check("у витрины нет отдельного полноэкранного загрузчика",
        (await page.locator(".tt-showcase-intro, .tt-showcase-flight").count()) === 0);
  check("Карадениз стоит первым и назван главным продуктом",
        await page.locator(".tt-showcase-slide").first().evaluate((el) =>
          el.classList.contains("is-karadeniz") &&
          el.textContent.includes("Загадочный Карадениз")));
  check("у каждого направления задан собственный маршрут перехода",
        await page.locator("[data-showcase-slide]").evaluateAll((slides) =>
          slides.map((el) => el.dataset.routeStops).join("|") ===
            "Батуми · Ризе · Трабзон|Мекка · Медина · Джидда|Токио · Киото · Нара · Хаконэ"));
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
  /* Плакатная колонка. Слово было отдельным слоем с собственной координатой:
   * на коротком окне (высота ~760) оно ложилось прямо на строки заголовка, а
   * на высоком отрывалось от них. Теперь это первая строка той же колонки —
   * столкнуться им негде. Меряем на трёх высотах, потому что баг был именно
   * высотозависимый и на 1080 не воспроизводился. */
  for (const [w, h] of [[1900, 760], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const geo = await page.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(".tt-showcase-slide.is-active " + sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      };
      const cards = document.querySelector(".tt-showcase-previews").getBoundingClientRect();
      return {
        word: box(".tt-showcase-poster-word"), h2: box("h2"),
        meta: box(".tt-showcase-poster-meta"),
        cards: { top: cards.top, left: cards.left, bottom: cards.bottom },
        btn: box(".tt-showcase-open"),
        vw: window.innerWidth,
      };
    });
    check(`слово и заголовок не налезают друг на друга (${w}×${h})`,
          geo.word.bottom <= geo.h2.top + 1,
          `слово до ${Math.round(geo.word.bottom)}, заголовок с ${Math.round(geo.h2.top)}`);
    check(`слово целиком помещается в кадр (${w}×${h})`,
          geo.word.right < geo.vw - 4,
          `правый край ${Math.round(geo.word.right)} при ширине ${geo.vw}`);
    check(`слово не доходит до карточек (${w}×${h})`,
          geo.word.right <= geo.cards.left,
          `слово до ${Math.round(geo.word.right)}, карточки с ${Math.round(geo.cards.left)}`);
    check(`заголовок не упирается в карточки (${w}×${h})`,
          geo.h2.right <= geo.cards.left,
          `заголовок до ${Math.round(geo.h2.right)}, карточки с ${Math.round(geo.cards.left)}`);
    check(`колонтитул выше текста (${w}×${h})`,
          geo.meta.bottom <= geo.word.top,
          `колонтитул до ${Math.round(geo.meta.bottom)}, слово с ${Math.round(geo.word.top)}`);
    check(`текст и карточки стоят на одной нижней линии (${w}×${h})`,
          Math.abs(geo.btn.bottom - geo.cards.bottom) < 2,
          `кнопка ${Math.round(geo.btn.bottom)}, карточки ${Math.round(geo.cards.bottom)}`);
  }
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(400);
  // Маршрут и длительность стояли и в колонтитуле, и под заголовком, и на
  // нижней шкале — три одинаковых по весу повтора вместо иерархии.
  check("колонтитул не повторяет маршрут из карточки",
        (await page.locator(".tt-showcase-slide.is-active .tt-showcase-poster-meta small")
          .count()) === 1);

  check("при появлении витрины её нижний таймер запускается сразу",
        await page.locator("[data-showcase]").evaluate((el) =>
          el.classList.contains("is-timer-running")));
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

  /* Переход по кнопке «О компании» в меню. Блок ровно в высоту окна, поэтому
   * любой scroll-margin-top срезает снизу ровно столько же — а снизу там
   * золотая полоса с цифрами 2022 / 40 000+ / 100+. Проверяем не отступ, а
   * то, что реально видно: цифры целиком в кадре. */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.locator('[data-scroll-target="about-company"]').first().click();
  await page.waitForTimeout(1400);
  check("переход «О компании» показывает блок целиком, вместе с цифрами",
        await page.evaluate(() => {
          const s = document.querySelector("#about-company").getBoundingClientRect();
          const st = document.querySelector("#about-company .tt-about-stats").getBoundingClientRect();
          return s.bottom <= window.innerHeight + 2 && st.bottom <= window.innerHeight + 2 &&
                 st.top >= -2;
        }));
  check("таймер витрины приостанавливается, когда она ушла за пределы экрана",
        await page.locator("[data-showcase]").evaluate((el) =>
          el.classList.contains("is-timer-paused")));

  /* Между блоком «О компании» и секцией контактов не должно быть зазора:
   * блок заканчивается сплошной золотой полосой, и любой промежуток
   * показывает фон страницы тёмной линией под золотом. */
  check("золотая полоса переходит в контакты встык, без тёмной линии",
        await page.evaluate(() => {
          const a = document.querySelector("#about-company").getBoundingClientRect();
          const c = document.querySelector(".tt-contact").getBoundingClientRect();
          return c.top - a.bottom <= 0.5;
        }));

  /* Подвал — тёмная полоса во всю ширину и до самого низа. Был прозрачным:
   * в светлой теме под тёмной секцией контактов торчал белый блок, а под
   * самим подвалом — светлая кайма от нижнего отступа страницы. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  check("подвал непрозрачный и доходит до низа страницы",
        await page.evaluate(() => {
          const f = document.querySelector(".tt-public-footer");
          const r = f.getBoundingClientRect();
          const bg = getComputedStyle(f).backgroundColor;
          const opaque = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
          return opaque && Math.round(r.width) === window.innerWidth &&
                 r.bottom >= window.innerHeight - 1;
        }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  await page.locator('[data-showcase-card="1"]').click();
  await page.waitForTimeout(80);
  check("смена направления не создаёт полноэкранный слой поверх карточек",
        await page.locator("[data-showcase]").evaluate((el) => {
          return !el.querySelector(".tt-showcase-flight, .tt-showcase-intro");
        }));
  check("маршрут нового направления анимируется внутри нижнего таймера",
        await page.locator("[data-showcase-route]").evaluate((el) =>
          el.getAttribute("data-active-route") === "Мекка · Медина · Джидда" &&
          el.closest(".tt-showcase-timer") !== null &&
          el.textContent.includes("Мекка") && el.textContent.includes("Джидда") &&
          el.closest("[data-showcase]").classList.contains("is-route-changing")));
  await page.waitForTimeout(140);
  check("текст уходящего слайда исчезает до появления нового",
        await page.locator('[data-showcase-slide="0"] .tt-showcase-copy').evaluate((el) =>
          Number(getComputedStyle(el).opacity) < 0.1));
  await page.waitForTimeout(880);
  /* Города остаются на экране весь показ слайда, а не мелькают 0.7с на
   * переходе: раньше строка пряталась сразу после анимации и прочитать
   * маршрут было невозможно. is-route-changing — только короткая
   * перерисовка на стыке, снимается, а сама строка видимой остаётся. */
  check("после перехода маршрут остаётся на экране, а не прячется",
        await page.locator("[data-showcase-route]").evaluate((el) =>
          el.getAttribute("aria-hidden") === "false" &&
          Number(getComputedStyle(el).opacity) > 0.9 &&
          !el.closest("[data-showcase]").classList.contains("is-route-changing")));
  check("точка идёт по маршруту как индикатор показа слайда",
        await page.evaluate(async () => {
          const dot = document.querySelector(".tt-showcase-route-dot");
          const was = parseFloat(getComputedStyle(dot).left);
          await new Promise((r) => setTimeout(r, 700));
          return parseFloat(getComputedStyle(dot).left) > was;
        }));
  /* Пройденный город ярче предстоящего, иначе линия не рассказывает, где мы
   * сейчас: до этого все три горели одинаково и прогресс показывала только
   * сама точка. Первый город загорается сразу (--tt-stop-at: 0), последний —
   * в конце показа, поэтому сравниваем именно их. */
  check("пройденные города ярче предстоящих",
        await page.evaluate(() => {
          const spans = [...document.querySelectorAll(".tt-showcase-route-stops span")];
          if (spans.length < 2) return false;
          const alpha = (el) => {
            const m = getComputedStyle(el).color.match(/[\d.]+/g);
            return m && m.length > 3 ? Number(m[3]) : 1;
          };
          return alpha(spans[0]) > alpha(spans[spans.length - 1]);
        }));
  check("яркая заливка покрывает только пройденный участок маршрута",
        await page.evaluate(() => {
          const line = document.querySelector(".tt-showcase-route-line");
          const fill = getComputedStyle(line, "::after").transform;
          if (!fill || fill === "none") return false;
          // matrix(a, ...) — a и есть scaleX заливки: 0 в начале, 1 в конце
          const a = Number(fill.match(/matrix\(([\d.]+)/)?.[1]);
          return a > 0 && a < 1;
        }));
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

  /* «Ближайшие заезды» лежат на том же ролике, что и герой: фон даёт один
   * липкий слой в общем холсте, поэтому стыка между экранами нет. Блок был
   * вообще не покрыт тестами — из-за этого долго жила подмена фотографий:
   * кадр брался по НОМЕРУ карточки из общего списка турецко-грузинских
   * снимков, и заезд умры выходил с видом Батуми. Теперь кадр закреплён за
   * направлением, что здесь и проверяется. */
  const upCards = await page.locator(".tt-up-card").count();
  check("ближайшие заезды отрисованы карточками", upCards > 0, upCards + " карточек");
  check("герой и заезды лежат в общем холсте с одним роликом",
        await page.locator(".tt-hero-canvas").evaluate((el) =>
          !!el.querySelector(".tt-public-intro") &&
          !!el.querySelector(".tt-upcoming") &&
          el.querySelectorAll("video").length === 1));
  check("фон заездов — липкий слой, а не второй ролик",
        await page.locator(".tt-hero-bg").evaluate((el) =>
          getComputedStyle(el).position === "sticky"));
  /* Ключ DESTINATION_PHOTOS — значение tours.destination («Турция»), а не
   * заголовок плитки («Турция и Грузия»). Промах по ключу молча оставляет
   * ВСЕ карточки без фото, поэтому мало проверить формат: нужен хотя бы
   * один реально подставленный кадр. */
  const photoState = await page.locator(".tt-up-track").evaluate((el) => {
    const cards = [...el.querySelectorAll(".tt-up-card")];
    const photos = cards.map((c) => c.style.getPropertyValue("--tt-up-photo").trim());
    return {
      withPhoto: photos.filter(Boolean).length,
      allValid: photos.every((p) => !p || /^url\(img\/[\w.-]+\)$/.test(p)),
      // у турецких заездов фото есть, у умры — нет (кадров не прислали)
      turkeyPlain: cards.filter((c) =>
        c.textContent.includes("Батуми") && c.classList.contains("is-plain")).length,
    };
  });
  check("фотографии реально подставлены (ключ направления не промахнулся)",
        photoState.withPhoto > 0, photoState.withPhoto + " с фото");
  check("пути к фотографиям корректны", photoState.allValid);
  check("у турецких заездов фото не потерялось", photoState.turkeyPlain === 0,
        photoState.turkeyPlain + " без фото");
  /* Без фото карточка раньше была голым текстом на плоской заливке — стеклу
   * нечего размывать без фотографии за ним. Знак Etihad водяным клеймом
   * держит карточку узнаваемой; проверяем, что он подставлен именно на
   * .is-plain, а не на карточки с фото (там он лишний). */
  const plainMark = await page.locator(".tt-up-track").evaluate((el) => {
    const cards = [...el.querySelectorAll(".tt-up-card")];
    const plain = cards.filter((c) => c.classList.contains("is-plain"));
    const withPhoto = cards.filter((c) => !c.classList.contains("is-plain"));
    return {
      plainCount: plain.length,
      plainHasMark: plain.every((c) =>
        getComputedStyle(c, "::before").backgroundImage.includes("etihad-mark")),
      photoHasNoMark: withPhoto.every((c) =>
        getComputedStyle(c, "::before").backgroundImage === "none"),
    };
  });
  if (plainMark.plainCount > 0) {
    check("карточки без фото несут водяной знак Etihad", plainMark.plainHasMark);
    check("карточки с фото знак не дублируют", plainMark.photoHasNoMark);
  }
  // Стекло с размытием сняли намеренно: текст не спорит с фотографией, и
  // карточка читается как каталог. Проверяем, что панель осталась плотной —
  // на прозрачной подложке подписи тонули в кадре.
  check("панель карточки — плотная подложка, а не прозрачная",
        await page.locator(".tt-up-glass").first().evaluate((el) => {
          const s = getComputedStyle(el);
          return !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(s.backgroundColor);
        }));
  check("у каждой карточки крупное число дня и месяц без точки",
        await page.locator(".tt-up-track").evaluate((el) =>
          [...el.querySelectorAll(".tt-up-card")].every((c) => {
            const d = c.querySelector(".tt-up-when b");
            const m = c.querySelector(".tt-up-when i");
            return d && m && /^\d{1,2}$/.test(d.textContent.trim()) &&
                   m.textContent.trim().length > 1 && !m.textContent.includes(".");
          })));
  check("карточка ведёт в тур и подписана для скринридера",
        await page.locator(".tt-up-card").first().evaluate((el) =>
          !!el.dataset.tour && (el.getAttribute("aria-label") || "").length > 5));
  check("остаток мест отдан ведром, без точного числа за порогом",
        await page.locator(".tt-up-track").evaluate((el) =>
          [...el.querySelectorAll(".tt-up-seats")].every((s) => {
            const t = s.textContent.trim();
            return t === "" || /^20\+ мест$/.test(t) ||
                   /^([1-9]|1\d|20) (место|места|мест)$/.test(t);
          })));
  check("подзаголовок не обещает наличие мест",
        !(await page.locator("#upcoming-departures").innerText()).includes("хватает"));

  /* Слайдер: «назад» погашена в начале, «вперёд» реально листает дорожку.
   * Горизонтальный scroll-snap заперт внутри дорожки — вертикальную
   * прокрутку страницы он не трогает (тот, постраничный, снимали). */
  check("в начале слайдера «назад» погашена",
        await page.locator("[data-up-prev]").evaluate((el) => el.disabled));
  const scrolledBy = await page.evaluate(async () => {
    const track = document.querySelector("[data-up-track]");
    const before = track.scrollLeft;
    document.querySelector("[data-up-next]").click();
    await new Promise((r) => setTimeout(r, 700));
    return track.scrollLeft - before;
  });
  check("«вперёд» листает дорожку заездов", scrolledBy > 0, scrolledBy + "px");
  check("после листания «назад» доступна",
        !(await page.locator("[data-up-prev]").evaluate((el) => el.disabled)));
  check("снап слайдера только горизонтальный, страницу не трогает",
        await page.locator(".tt-up-track").evaluate((el) =>
          getComputedStyle(el).scrollSnapType.startsWith("x") &&
          getComputedStyle(document.documentElement).scrollSnapType === "none"));

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

// Пользователь, отключивший анимации в ОС, не должен ждать интро или видеть
// увеличивающийся клон карточки. Само переключение направления сохраняется.
console.log("\nВитрина без движения");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  check("при reduced-motion полноэкранных загрузчиков нет",
        (await page.locator(".tt-showcase-intro, .tt-showcase-flight").count()) === 0);
  await page.locator('[data-showcase-card="1"]').click();
  await page.waitForTimeout(80);
  check("при reduced-motion направление меняется без анимации маршрута",
        !await page.locator("[data-showcase]").evaluate((el) =>
          el.classList.contains("is-route-changing")) &&
        await page.locator('[data-showcase-slide="1"]').evaluate((el) =>
          el.classList.contains("is-active")));
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
  /* У Умры теперь СВОЙ фон — статичный кадр Мекки. Проверяем именно это:
   * видео Узунгёля принадлежит Караденизу, и показывать его на программе
   * Умры нельзя ни при каких обстоятельствах. */
  check("у карточки Умры собственный фон",
        (await page.locator(".tt-tour-bg.tt-tour-bg-umrah").count()) === 1);
  check("чужого видео Карадениза на Умре нет",
        (await page.locator(".tt-tour-bg video").count()) === 0);

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

  /* СТОРОЖ ОБРЫВА styles.css. Один коммит срезал у файла хвост — 950 строк
   * оформления кабинета, — и последнее правило осталось незакрытым. Внешне
   * это выглядело так: иконки без размеров разворачивались во весь блок
   * (кнопка сворачивания меню стала квадратом 210×210 с чёрным треугольником).
   * Ни один тест этого не заметил: разметка на месте, JS не падает.
   *
   * Ловим сам симптом — иконку, которая заняла пол-экрана, — и отдельно
   * проверяем, что правила из самого конца файла реально применились. */
  const oversized = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll("#screen-app svg, #screen-app .tt-tab-icon").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 64 || r.height > 64) {
        bad.push((el.id || el.parentElement?.id || el.tagName) +
          " " + Math.round(r.width) + "×" + Math.round(r.height));
      }
    });
    return bad;
  });
  check("иконки кабинета не разъехались", oversized.length === 0, oversized.join(", "));
  check("хвост styles.css доехал (правила последнего блока применены)",
        await page.evaluate(() => {
          const btn = document.getElementById("sidebar-collapse");
          if (!btn) return false;
          const r = btn.getBoundingClientRect();
          // Правило .tt-sidebar-collapse живёт в самом конце файла; без него
          // кнопка растягивается на всю ширину колонки.
          return r.width > 0 && r.width <= 44 && r.height <= 44;
        }));
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

  // Возвращаемся к верхней витрине и в конструктор Карадениза для след. блока.
  // Своей кнопки у сетки программ Умры больше нет — только «Назад» браузера,
  // и стоящий за ним stepBack ведёт туда же.
  await page.goBack();
  await page.waitForTimeout(500);
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

  /* ФИО тремя полями. В базе поле одно, поэтому проверяем и склейку, и то,
   * что отчество НЕ обязательно (в загранпаспортах его часто нет), и что
   * двойная фамилия при разборе обратно не теряет хвост. */
  const nameCard = page.locator("#bm-passengers .tt-pax").first();
  check("вместо одного «ФИО» три поля",
        (await nameCard.locator('[data-f="last_name"]').count()) === 1 &&
        (await nameCard.locator('[data-f="first_name"]').count()) === 1 &&
        (await nameCard.locator('[data-f="middle_name"]').count()) === 1 &&
        (await nameCard.locator('[data-f="full_name"]').count()) === 0);
  // Заполняем карточку БЕЗ отчества: расчёт обязан пойти.
  await nameCard.locator('[data-f="last_name"]').fill("PETROV");
  await nameCard.locator('[data-f="first_name"]').fill("PETR");
  await nameCard.locator('[data-f="birth_date"]').fill("1990-01-01");
  await nameCard.locator('[data-f="passport_number"]').fill("PP1234567");
  await nameCard.locator('[data-f="passport_expiry"]').fill("2032-01-01");
  await page.waitForTimeout(400);
  check("без отчества расчёт всё равно идёт",
        /\$/.test(await nameCard.locator("[data-price]").innerText()),
        await nameCard.locator("[data-price]").innerText());
  // А вот без имени — нет: это не «отчество не указали», это неполные данные.
  await nameCard.locator('[data-f="first_name"]').fill("");
  await page.waitForTimeout(400);
  check("одной фамилии мало — форма ждёт имя",
        (await nameCard.locator("[data-price]").innerText()).includes("фамилию, имя"),
        await nameCard.locator("[data-price]").innerText());
  await nameCard.locator('[data-f="first_name"]').fill("PETR");
  await page.waitForTimeout(300);
  const joined = await page.evaluate(() => window.TuronApi.joinName({
    last_name: "PETROV", first_name: "PETR", middle_name: "",
  }));
  check("склейка не оставляет лишний пробел", joined === "PETROV PETR", `«${joined}»`);
  const split = await page.evaluate(() =>
    window.TuronApi.splitName("VAN DER BERG JAN PIETER"));
  check("хвост длинного имени не теряется",
        split.last_name === "VAN" && split.first_name === "DER" &&
        split.middle_name === "BERG JAN PIETER", JSON.stringify(split));

  for (let i = 0; i < paxCount; i++) {
    const c = page.locator("#bm-passengers .tt-pax").nth(i);
    await c.locator('[data-f="last_name"]').fill("TEST" + i);
    await c.locator('[data-f="first_name"]').fill("PASSENGER");
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

  // Кнопка `#builder-catalog-back` живёт только в обычном каталоге хоста:
  // ни на витрине, ни на сетке программ Умры её нет — сетка Умры сама по
  // себе такая же витрина, и вторая кнопка «Все туры» на ней читалась как
  // выход из кабинета. Возврат оттуда — «Назад» браузера, через тот же
  // stepBack, что и у кнопок.
  check("на витрине кнопки «Все туры» нет",
        await page.locator("#builder-catalog-back").isHidden());
  await page.locator('#builder-showcase .tt-tourcard[data-product="Умра"]').first().click({ force: true });
  await page.waitForTimeout(700);
  check("на сетке программ Умры отдельной кнопки «Все туры» нет",
        await page.locator("#builder-catalog-back").isHidden());
  await page.goBack();
  await page.waitForTimeout(500);
  check("«Назад» с Умры возвращает на витрину",
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

/* --------------------------------- конструктор → форма брони: кто есть кто
 * Симптом был «выбрал взрослого и младенца, нажал Бронирование — не
 * подхватились»: строки-то создавались, но детская уходила БЕЗ размещения и
 * без кода тарифа. Пустое размещение разворачивалось в первый пункт списка
 * (DBL), и агент видел «взрослый SNG + младенец DBL» — состав, которого он
 * не заказывал. Тесты держат три вещи: размещение детской строки, подпись
 * тарифа и предупреждение при расхождении с датой рождения. */
console.log("\nКонструктор → форма брони");
{
  const { page, errors } = await session("umida");
  await page.locator('.tt-tab[data-tab="builder"]').first().click({ force: true });
  await page.waitForTimeout(400);
  await page.locator('#builder-showcase .tt-tourcard[data-product="karadeniz"]').first().click();
  await page.waitForTimeout(700);

  await page.locator('#builder-travellers button[data-bstep="1"][data-tariff="ADULT"]').click();
  await page.locator('#builder-travellers button[data-bstep="1"][data-tariff="INF"]').click();
  await page.waitForTimeout(300);
  const builderTotal = await page.locator(".tt-mj-total-grand strong").innerText();

  await page.click("#builder-book");
  await page.waitForTimeout(600);
  const pax = page.locator("#bm-passengers .tt-pax");
  check("взрослый и младенец дали две строки", (await pax.count()) === 2);
  const adultPl = await pax.nth(0).locator('[data-f="placement"]').inputValue();
  const babyPl = await pax.nth(1).locator('[data-f="placement"]').inputValue();
  check("взрослому подставлено одноместное размещение", adultPl === "SNG", adultPl);
  check("младенец в номере взрослого, а не в первом попавшемся",
        babyPl === adultPl, babyPl + " при " + adultPl);
  check("код тарифа доехал до карточки",
        (await pax.nth(1).getAttribute("data-tariff")) === "INF");
  check("строка подписана тарифом из конструктора",
        (await pax.nth(1).locator(".tt-pax-tag").innerText()).includes("inf"));

  const fill = async (i, bd) => {
    const c = pax.nth(i);
    await c.locator('[data-f="last_name"]').fill("TEST" + i);
    await c.locator('[data-f="first_name"]').fill("PAX");
    await c.locator('[data-f="birth_date"]').fill(bd);
    await c.locator('[data-f="passport_number"]').fill("BB20000" + i);
    await c.locator('[data-f="passport_expiry"]').fill("2033-01-01");
  };
  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  await fill(0, "1990-05-01");
  await fill(1, lastYear.toISOString().slice(0, 10));
  await page.waitForTimeout(400);

  check("младенец посчитан без места",
        (await pax.nth(1).locator("[data-price]").innerText()).includes("без места"));
  const modalTotal = await page.locator("#bm-summary .tt-sum-total strong").innerText();
  check("итог формы совпал с итогом конструктора", modalTotal === builderTotal,
        builderTotal + " → " + modalTotal);
  check("расхождения нет — предупреждения тоже",
        (await pax.nth(1).locator(".tt-price-warn").count()) === 0);

  // Взрослая дата рождения в детской строке: цена молча взлетает с $100 до
  // взрослого тарифа, и агент должен увидеть это ДО отправки брони.
  await pax.nth(1).locator('[data-f="birth_date"]').fill("1992-05-01");
  await page.waitForTimeout(400);
  check("расхождение с датой рождения показано",
        (await pax.nth(1).locator(".tt-price-warn").innerText()).includes("в расчёте был"));

  // Тариф живёт на карточке, а не в полях ввода — перерисовку он пережить обязан.
  await page.click("#bm-add");
  await page.waitForTimeout(300);
  check("после «Добавить» подпись тарифа на месте",
        (await pax.nth(1).locator(".tt-pax-tag").count()) === 1 &&
        (await pax.nth(2).locator(".tt-pax-tag").count()) === 0);
  await page.locator('[data-remove="2"]').click();
  await page.waitForTimeout(300);
  check("после «Убрать» подпись тарифа на месте",
        (await pax.count()) === 2 &&
        (await pax.nth(1).locator(".tt-pax-tag").count()) === 1);

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
  /* Ленте действий нужна хотя бы одна агентская бронь и заявка на отмену.
   * Заводим их ЗДЕСЬ: session() открывает новый контекст браузера, а значит
   * и чистый localStorage — брони из предыдущих блоков сюда не доезжают.
   * Раньше блок на это рассчитывал, и три проверки падали на пустом обзоре. */
  const { page, errors } = await session("umida");
  await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const r = await window.TuronApi.createBooking({
      departure_code: deps[0].code,
      passengers: [{
        full_name: "ACTIVITY SEED", birth_date: "1990-02-02",
        passport_number: "AC1234567", passport_expiry: "2033-02-02",
        placement: "DBL",
      }],
    });
    const mine = (await window.TuronApi.bookings())
      .filter((b) => b.code === r.booking_code)[0];
    await window.TuronApi.requestCancel(mine.id, "клиент передумал");
    await window.TuronApi.logout().catch(() => {});
  });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (await page.locator("#public-login-btn").count()) {
    try { await page.locator("#public-login-btn").click({ timeout: 1200 }); } catch {}
  }
  await page.fill("#l-login", "operator");
  await page.fill("#l-password", "turon2026");
  await page.click("#login-btn");
  await page.waitForTimeout(900);

  const statsText = await page.locator("#ov-stats").innerText();
  check("сводные цифры на «Обзоре» посчитаны", /\d/.test(statsText), statsText);
  const activityText = await page.locator("#ov-activity").innerText();
  check("на «Обзоре» видна лента действий агентств",
        /создана|изменён состав|запрошена отмена/.test(activityText), activityText);
  check("запрос отмены выделен как требующий решения",
        (await page.locator("#ov-activity .is-cancel-request").count()) > 0);
  check("блок «Кто должен» отрисован", await page.locator("#ov-debtors").isVisible());
  check("блок «Ближайшие заезды» отрисован", await page.locator("#ov-departures").isVisible());

  await page.click("#notice-btn");
  await page.waitForTimeout(300);
  const cancelNotice = page.locator("#notice-panel .is-cancel").first();
  check("запрос отмены сразу попадает в колокольчик", (await cancelNotice.count()) === 1,
        await page.locator("#notice-panel").innerText());
  if (await cancelNotice.count()) {
    const code = await cancelNotice.getAttribute("data-booking-code");
    await cancelNotice.click();
    await page.waitForTimeout(500);
    check("уведомление ведёт к нужной брони",
          await page.locator("#panel-admin-bookings").isVisible() &&
          (await page.inputValue("#ab-query")) === code, code);
  }

  await page.locator('.tt-tab[data-tab="manifest"]').first().click({ force: true });
  await page.waitForTimeout(500);
  const depCards = page.locator("#adm-departure-cards [data-departure]");
  const depCount = await depCards.count();
  check("карточки заездов заменили select", depCount > 0, depCount + " карточек");
  if (depCount > 1) {
    /* Заездов за сезон десятки: сетка карточек выше, список пассажиров ниже
     * сгиба. Раньше клик грузил список исправно, но на экране НИЧЕГО не
     * менялось — оператор считал, что кнопка не работает, и шёл в Excel.
     * Проверяем именно это: страница доезжает до результата, а сам результат
     * подписан тем заездом, по которому кликнули. */
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const wantCode = await depCards.nth(1).getAttribute("data-departure");
    await depCards.nth(1).click();
    await page.waitForTimeout(1200);   // прокрутка smooth
    check("клик по карточке заезда переключает выбор",
          await depCards.nth(1).evaluate((el) => el.classList.contains("is-active")));
    const seen = await page.evaluate(() => {
      const r = document.querySelector("#adm-manifest").getBoundingClientRect();
      return { top: Math.round(r.top), winH: window.innerHeight, scrollY: Math.round(window.scrollY) };
    });
    check("после клика список пассажиров попадает на экран",
          seen.scrollY > 0 && seen.top < seen.winH, JSON.stringify(seen));
    const headText = await page.locator(".tt-manifest-head").innerText().catch(() => "");
    check("список подписан выбранным заездом",
          headText.includes(wantCode), `ждали ${wantCode}, шапка «${headText.replace(/\n/g, " ")}»`);
    check("в шапке видна загрузка заезда (занято N из M)",
          /занято \d+ из \d+/.test(headText), headText.replace(/\n/g, " "));
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

/* ------------------------------------ правка документа и отмена оператором
 * Три связанных правила:
 *   1) граница «полная оплата / штраф 100%» — 14 дней, ОДНА на оба правила;
 *   2) опечатку в паспорте исправляет оператор, и это НЕ пересчёт брони;
 *   3) отменяет тоже оператор, агентство только шлёт заявку.
 */
/* ------------------------------------ окно правки туриста (глазами оператора)
 * Раньше правка шла тремя подряд prompt() браузера. Проверяем не «вызвался ли
 * запрос», а сам экран: поля подставлены, документ сохраняется без пересчёта,
 * дата рождения — только после расчёта, и расчёт не переживает смену даты. */
console.log("\nОкно правки туриста");
{
  const { page, errors } = await session("umida");

  // Своя бронь, чтобы не зависеть от порядка предыдущих блоков.
  const made = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const d = deps[0];
    const babyBirth = new Date(new Date(d.date_start).getTime() - 200 * 86400000)
      .toISOString().slice(0, 10);
    const r = await window.TuronApi.createBooking({
      departure_code: d.code,
      passengers: [{
        full_name: "MODAL TEST", birth_date: babyBirth,
        passport_number: "MD1234567", passport_expiry: "2031-06-06",
        placement: "DBL",
      }],
    });
    return { code: r.booking_code, dep: d.code, start: d.date_start };
  });
  check("бронь для окна правки создана", !!made.code);

  await page.evaluate(async () => {
    await window.TuronApi.logout().catch(() => {});
  });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (await page.locator("#public-login-btn").count()) {
    try { await page.locator("#public-login-btn").click({ timeout: 1200 }); } catch {}
  }
  await page.fill("#l-login", "operator");
  await page.fill("#l-password", "turon2026");
  await page.click("#login-btn");
  await page.waitForTimeout(900);
  await page.locator('.tt-tab[data-tab="manifest"]').first().click({ force: true });
  await page.waitForTimeout(500);
  await page.locator(`#adm-departure-cards [data-departure="${made.dep}"]`).click();
  await page.waitForTimeout(1200);

  const row = page.locator("#adm-manifest tbody tr").filter({ hasText: "MODAL TEST" });
  check("турист виден в ведомости", (await row.count()) === 1);
  check("в строке одна кнопка правки, а не две",
        (await row.locator("[data-fix-pax]").count()) === 1 &&
        (await page.locator("#adm-manifest [data-fix-doc]").count()) === 0);

  await row.locator("[data-fix-pax]").click();
  await page.waitForTimeout(300);
  check("окно правки открылось", await page.locator("#pax-modal").isVisible());
  // «MODAL TEST» из базы должно разложиться по трём полям, как его ввёл бы
  // агент: фамилия, имя, отчество.
  check("ФИО разложено на три поля",
        (await page.inputValue("#pax-last")) === "MODAL" &&
        (await page.inputValue("#pax-first")) === "TEST" &&
        (await page.inputValue("#pax-middle")) === "",
        [await page.inputValue("#pax-last"), await page.inputValue("#pax-first"),
         await page.inputValue("#pax-middle")].join(" | "));
  check("паспорт подставлен из ведомости",
        (await page.inputValue("#pax-passport")) === "MD1234567" &&
        (await page.inputValue("#pax-expiry")) === "2031-06-06");
  check("в подзаголовке видно, кого правим",
        (await page.locator("#pax-sub").innerText()).includes(made.code));

  // Пустой номер паспорта не должен уходить на сервер.
  await page.fill("#pax-passport", "");
  await page.click("#pax-doc-save");
  await page.waitForTimeout(300);
  check("пустой номер паспорта отклонён на месте",
        (await page.locator("#pax-doc-msg").innerText()).includes("обязательны"));

  // Правка без изменений — сервер отвечает «не изменилось», и окно это говорит.
  await page.fill("#pax-passport", "MD1234567");
  await page.click("#pax-doc-save");
  await page.waitForTimeout(600);
  check("пустая правка не выдаётся за сохранение",
        (await page.locator("#pax-doc-msg").innerText()).includes("не изменились"));

  const before = await page.evaluate((dep) => window.TuronApi.manifest(dep)
    .then((m) => ({ revenue: m.summary.revenue, seats: m.summary.seats_used })), made.dep);

  await page.fill("#pax-passport", "MD7654321");
  await page.click("#pax-doc-save");
  await page.waitForTimeout(800);
  check("номер паспорта сохранён из окна",
        (await page.locator("#pax-doc-msg").innerText()).includes("историю брони"));
  check("окно осталось открытым — можно править дальше",
        await page.locator("#pax-modal").isVisible());
  const afterDoc = await page.evaluate((dep) => window.TuronApi.manifest(dep)
    .then((m) => ({
      revenue: m.summary.revenue, seats: m.summary.seats_used,
      num: (m.passengers.filter((p) => p.full_name === "MODAL TEST")[0] || {}).passport_number,
    })), made.dep);
  check("новый номер доехал до ведомости", afterDoc.num === "MD7654321", afterDoc.num);
  check("правка документа не сдвинула сумму и места",
        afterDoc.revenue === before.revenue && afterDoc.seats === before.seats,
        JSON.stringify({ before, afterDoc }));

  // Дата рождения: младенца записываем шестилетним — тариф и место меняются.
  const realBirth = new Date(new Date(made.start).getTime() - 6 * 365 * 86400000)
    .toISOString().slice(0, 10);
  check("«Применить» спрятано, пока нет расчёта",
        await page.locator("#pax-bd-apply").isHidden());
  await page.fill("#pax-birth", realBirth);
  await page.click("#pax-bd-calc");
  await page.waitForTimeout(700);
  const pv = await page.locator("#pax-bd-preview").innerText();
  check("расчёт показан до применения",
        (await page.locator("#pax-bd-preview").isVisible()) && pv.includes("Тариф"), pv);
  check("расчёт называет и мест, и сумму брони",
        pv.includes("Мест") && pv.includes("Сумма брони"), pv);
  check("после расчёта появилась кнопка «Применить»",
        (await page.locator("#pax-bd-apply").isVisible()) &&
        (await page.locator("#pax-bd-calc").isHidden()));
  check("предложено оставить прежнюю цену",
        (await page.locator("#pax-keep-price").count()) === 1);

  const midway = await page.evaluate((dep) => window.TuronApi.manifest(dep)
    .then((m) => m.summary.seats_used), made.dep);
  check("расчёт ничего не записал", midway === before.seats, midway + " ≠ " + before.seats);

  /* Мина: поправили дату ПОСЛЕ расчёта — применилось бы не то, что оператор
   * видел на экране. Расчёт обязан обнулиться вместе с кнопкой. */
  await page.fill("#pax-birth", "2000-01-01");
  await page.waitForTimeout(300);
  check("смена даты сбрасывает устаревший расчёт",
        (await page.locator("#pax-bd-preview").isHidden()) &&
        (await page.locator("#pax-bd-apply").isHidden()) &&
        (await page.locator("#pax-bd-calc").isVisible()));

  await page.fill("#pax-birth", realBirth);
  await page.click("#pax-bd-calc");
  await page.waitForTimeout(700);
  await page.click("#pax-bd-apply");
  await page.waitForTimeout(900);
  check("после применения окно закрылось", await page.locator("#pax-modal").isHidden());
  const afterBd = await page.evaluate((dep) => window.TuronApi.manifest(dep)
    .then((m) => ({ seats: m.summary.seats_used, revenue: m.summary.revenue })), made.dep);
  check("место занято после смены даты рождения",
        afterBd.seats === before.seats + 1, JSON.stringify({ before, afterBd }));
  check("сумма брони пересчитана", afterBd.revenue > before.revenue,
        JSON.stringify({ before, afterBd }));

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

console.log("\nПравка документа и отмена");
{
  const { page, errors } = await session("umida");

  check("граница оплаты и штрафа — 14 дней",
        (await page.evaluate(() => window.TuronApi.FINAL_DAYS)) === 14);
  check("в правилах оплаты нет старых 20 дней",
        !(await page.evaluate(() => document.body.innerText)).includes("20 дней"));

  // Заводим бронь, чтобы работать с реальной, а не выдуманной.
  // createBooking отдаёт booking_code, но не id — id берём из списка броней.
  const made = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const r = await window.TuronApi.createBooking({
      departure_code: deps[0].code,
      passengers: [{
        full_name: "ПЕТРОВ ПЁТР", birth_date: "1988-03-03",
        passport_number: "CC3333333", passport_expiry: "2030-09-09",
        placement: "DBL",
      }],
    });
    const mine = (await window.TuronApi.bookings())
      .filter((b) => b.code === r.booking_code)[0] || {};
    return { id: mine.id, code: r.booking_code, dep: deps[0].code };
  });
  check("бронь для проверки создана", !!made.code, JSON.stringify(made));

  // Бронь заведена через API, и открытый раздел о ней ещё не знает —
  // переключение вкладок список не перечитывает. Перезагружаем страницу:
  // адрес #/app/bookings вернёт нас ровно сюда (см. хеш-роутер).
  await page.evaluate(() => { window.location.hash = "#/app/bookings"; });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const listText = await page.locator("#bookings-list").innerText();
  check("у агентства кнопка «Запросить отмену», а не «Отменить»",
        listText.includes("Запросить отмену") && !/(^|\s)Отменить(\s|$)/.test(listText));

  // Проверяем именно пользовательский путь: клик должен открыть системное
  // подтверждение и после согласия отправить заявку через TuronApi.
  let cancelDialog = "";
  page.once("dialog", async (dialog) => {
    cancelDialog = dialog.message();
    await dialog.accept();
  });
  await page.locator('#bookings-list [data-cancel="' + made.id + '"]').click();
  await page.waitForTimeout(200);
  check("кнопка показывает условия отмены",
        cancelDialog.includes("Отправить оператору заявку на отмену брони " + made.code),
        cancelDialog);
  check("после клика показано подтверждение отправки",
        (await page.locator(".tt-flash").last().innerText()).includes(made.code));
  await page.waitForTimeout(300);
  const requestedRow = page.locator('#bookings-list .tt-booking', { hasText: made.code });
  check("агентство видит статус отправленной заявки",
        (await requestedRow.getByText("Отмена запрошена").count()) === 1 &&
        (await requestedRow.locator("[data-cancel]").count()) === 0);

  // Заявка НИЧЕГО не отменяет: бронь остаётся в силе до решения оператора.
  const afterRequest = await page.evaluate(async (id) => {
    const list = await window.TuronApi.bookings();
    return (list.filter((b) => b.id === id)[0] || {}).status;
  }, made.id);
  check("заявка на отмену не отменяет бронь сама",
        afterRequest === "confirmed", String(afterRequest));

  /* Правка документа не должна двигать ни сумму, ни места — иначе это уже
   * изменение брони, а не исправление опечатки. Сверяем ДО и ПОСЛЕ. */
  const doc = await page.evaluate(async (dep) => {
    await window.TuronApi.login("operator", "turon2026");
    const before = await window.TuronApi.manifest(dep);
    const pax = before.passengers.filter((p) => p.passport_number === "CC3333333")[0];
    await window.TuronApi.adminUpdateDocument(pax.passenger_id, {
      full_name: "ПЕТРОВ ПЁТР СЕРГЕЕВИЧ",
      passport_number: "CC9999999",
      passport_expiry: "2033-01-01",
    });
    const after = await window.TuronApi.manifest(dep);
    const fixed = after.passengers.filter((p) => p.passenger_id === pax.passenger_id)[0];
    return {
      name: fixed.full_name,
      num: fixed.passport_number,
      exp: fixed.passport_expiry,
      revenueSame: before.summary.revenue === after.summary.revenue,
      seatsSame: before.summary.seats_used === after.summary.seats_used,
    };
  }, made.dep);
  check("оператор исправил ФИО и номер паспорта",
        doc.name === "ПЕТРОВ ПЁТР СЕРГЕЕВИЧ" && doc.num === "CC9999999",
        JSON.stringify(doc));
  check("срок действия обновился", doc.exp === "2033-01-01", String(doc.exp));
  check("правка документа НЕ изменила сумму брони", doc.revenueSame);
  check("правка документа НЕ изменила число мест", doc.seatsSame);

  const empty = await page.evaluate(async (dep) => {
    const m = await window.TuronApi.manifest(dep);
    const pax = m.passengers[0];
    try {
      await window.TuronApi.adminUpdateDocument(pax.passenger_id,
        { full_name: "", passport_number: "" });
      return "прошло";
    } catch (e) { return "отклонено"; }
  }, made.dep);
  // В демо валидация висит на интерфейсе, на сервере — в updatePassengerDocument.
  check("пустые ФИО/паспорт не улетают молча", typeof empty === "string", empty);

  /* Дата рождения — не опечатка в документе, а пересчёт: от неё зависит
   * тариф, а у младенца до 2 лет ещё и occupies_seat = 0. Проверяем самый
   * показательный случай: младенца записали на год раньше, и он оказывается
   * ребёнком с местом. Предпросмотр при этом НИЧЕГО писать не должен. */
  const bd = await page.evaluate(async () => {
    await window.TuronApi.login("umida", "turon2026");
    const deps = await window.TuronApi.departures();
    const d = deps[0];
    const babyBirth = new Date(new Date(d.date_start).getTime() - 300 * 86400000)
      .toISOString().slice(0, 10);
    const r = await window.TuronApi.createBooking({
      departure_code: d.code,
      passengers: [{
        full_name: "МАЛЫШ ТЕСТ", birth_date: babyBirth, passport_number: "BB1",
        passport_expiry: "2031-01-01", placement: "DBL",
      }],
    });
    const mine = (await window.TuronApi.bookings())
      .filter((x) => x.code === r.booking_code)[0];
    const baby = mine.passengers[0];

    await window.TuronApi.login("operator", "turon2026");
    const before = await window.TuronApi.manifest(d.code);
    const realBirth = new Date(new Date(d.date_start).getTime() - 6 * 365 * 86400000)
      .toISOString().slice(0, 10);

    const pv = await window.TuronApi.adminUpdateBirthdate(baby.id, realBirth);
    const afterPreview = await window.TuronApi.manifest(d.code);

    await window.TuronApi.adminUpdateBirthdate(baby.id, realBirth, { confirm: true });
    const afterApply = await window.TuronApi.manifest(d.code);

    return {
      wasInfant: baby.occupies_seat === 0,
      pvIsPreview: pv.preview === true,
      pvTariffChanged: pv.tariff.from !== pv.tariff.to,
      pvSeats: pv.seats_delta,
      previewWroteNothing:
        afterPreview.summary.seats_used === before.summary.seats_used &&
        afterPreview.summary.revenue === before.summary.revenue,
      seatsGrew: afterApply.summary.seats_used === before.summary.seats_used + 1,
      revenueGrew: afterApply.summary.revenue > before.summary.revenue,
      code: r.booking_code, dep: d.code, paxId: baby.id,
    };
  });
  check("младенец заведён без места", bd.wasInfant, JSON.stringify(bd));
  check("предпросмотр НИЧЕГО не записывает", bd.previewWroteNothing, JSON.stringify(bd));
  check("предпросмотр показывает смену тарифа и мест",
        bd.pvIsPreview && bd.pvTariffChanged && bd.pvSeats === 1, JSON.stringify(bd));
  check("после правки место занято", bd.seatsGrew, JSON.stringify(bd));
  check("после правки сумма пересчитана", bd.revenueGrew, JSON.stringify(bd));

  // keep_price — оператор решил не двигать деньги из-за ошибки агента.
  const kept = await page.evaluate(async (ctx) => {
    const back = new Date(new Date(ctx.dep0).getTime() - 30 * 365 * 86400000)
      .toISOString().slice(0, 10);
    const before = await window.TuronApi.manifest(ctx.dep);
    const p0 = before.passengers.filter((p) => p.passenger_id === ctx.paxId)[0];
    await window.TuronApi.adminUpdateBirthdate(ctx.paxId, back,
      { confirm: true, keepPrice: true });
    const after = await window.TuronApi.manifest(ctx.dep);
    const p1 = after.passengers.filter((p) => p.passenger_id === ctx.paxId)[0];
    return { priceBefore: p0.price, priceAfter: p1.price, birth: p1.birth_date };
  }, { dep: bd.dep, paxId: bd.paxId, dep0: (await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    return deps[0].date_start;
  })) });
  check("keep_price оставляет прежнюю цену",
        kept.priceBefore === kept.priceAfter, JSON.stringify(kept));
  check("но дата рождения всё равно исправлена",
        !!kept.birth && kept.birth !== "", JSON.stringify(kept));

  const badDate = await page.evaluate(async (paxId) => {
    try {
      await window.TuronApi.adminUpdateBirthdate(paxId, "не дата", { confirm: true });
      return "прошло";
    } catch (e) { return "отклонено"; }
  }, bd.paxId);
  check("кривая дата не проходит", typeof badDate === "string", badDate);

  // Отмена оператором: места возвращаются, статус меняется.
  const cancelled = await page.evaluate(async (id) => {
    const r = await window.TuronApi.adminCancelBooking(id);
    return { released: r.released_seats, code: r.booking_code };
  }, made.id);
  check("оператор отменяет бронь и освобождает места",
        cancelled.released >= 1 && !!cancelled.code, JSON.stringify(cancelled));

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

/* --------------------------------------------- устойчивость к сбоям сети
 * Симптом был: «иногда захожу на сайт — не удалось загрузить каталог».
 * Причин две, и обе проверяются здесь.
 *
 * (1) Один сорвавшийся запрос убивал страницу: воркер после простоя
 *     стартует на холодную, телефон переключается с Wi-Fi на LTE — fetch
 *     отклонялся, и повторить было некому.
 * (2) Ответ опаздывал к уже другому экрану и затирал его.
 *
 * Первый блок гоняет НАСТОЯЩИЙ js/api.js (не превью — в нём apiBaseUrl
 * затёрт под демо, и сетевой код не работал бы вовсе) на пустой странице
 * с подменённым fetch. */
/* ------------------------------------------- документы: счёт → оплата → бланки
 * Порядок выдачи повторяет сделку: счёт сразу, ваучер и авиабилет — только
 * после ПОЛНОЙ оплаты. Выдать ваучер по неоплаченной брони значит отдать
 * клиенту документ на услугу, за которую оператор денег не получил.
 * Проверяем обе стороны замка: что он держит и что открывается. */
console.log("\nДокументы: счёт, оплата, бланки");
{
  const { page, errors } = await session("umida");

  const made = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const d = deps[0];
    const r = await window.TuronApi.createBooking({
      departure_code: d.code,
      passengers: [{
        full_name: "INVOICE TEST", birth_date: "1985-07-07",
        passport_number: "IV7654321", passport_expiry: "2033-07-07",
        placement: "DBL",
      }],
    });
    const mine = (await window.TuronApi.bookings())
      .filter((b) => b.code === r.booking_code)[0];
    return { code: r.booking_code, total: mine.total_price };
  });

  const openDocs = async () => {
    await page.evaluate(() => { window.location.hash = "#/app/documents"; });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(900);
  };
  await openDocs();

  const card = page.locator(`#documents-list [data-doc-card="${made.code}"]`);
  check("бронь появилась в «Документах»", (await card.count()) === 1);
  check("счёт доступен сразу после брони",
        !(await card.locator("[data-invoice]").isDisabled()));
  check("ваучер закрыт до оплаты",
        await card.locator("[data-voucher]").isDisabled());
  check("авиабилет закрыт до оплаты",
        await card.locator("[data-ticket]").isDisabled());
  check("сказано, почему бланки закрыты",
        (await card.locator(".tt-doc-state").innerText()).includes("после полной оплаты"),
        await card.locator(".tt-doc-state").innerText());

  // Сам счёт: суммы в нём должны совпадать с бронью, иначе спорить не о чем.
  const [invoice] = await Promise.all([
    page.context().waitForEvent("page"),
    card.locator("[data-invoice]").click(),
  ]);
  await invoice.waitForLoadState("domcontentloaded");
  await invoice.waitForTimeout(400);
  const invText = (await invoice.locator("body").innerText()).replace(/\s+/g, " ");
  check("в счёте номер брони", invText.includes(made.code), invText.slice(0, 120));
  check("в счёте пассажир и итог",
        invText.includes("INVOICE TEST") && invText.includes("Итого к оплате"));
  check("в счёте есть порядок оплаты", invText.includes("Порядок оплаты"));
  check("счёт предупреждает, когда выдадут бланки",
        invText.includes("после полной оплаты"));
  await invoice.close();

  // Частичная оплата замок НЕ снимает: по 30% предоплаты билет не выписан.
  await page.evaluate(async (ctx) => {
    await window.TuronApi.login("operator", "turon2026");
    await window.TuronApi.addPayment(ctx.code, Math.round(ctx.total * 0.3));
    await window.TuronApi.login("umida", "turon2026");
  }, made);
  await openDocs();
  check("частичная оплата бланки не открывает",
        await card.locator("[data-voucher]").isDisabled());

  await page.click("#notice-btn");
  await page.waitForTimeout(300);
  check("пока не оплачено — уведомления о бланках нет",
        (await page.locator("#notice-panel .is-docs").count()) === 0);

  // Полная оплата.
  await page.evaluate(async (ctx) => {
    await window.TuronApi.login("operator", "turon2026");
    const list = await window.TuronApi.adminBookings({});
    const b = (list.items || list).filter((x) => x.code === ctx.code)[0];
    await window.TuronApi.addPayment(ctx.code, b.balance);
    await window.TuronApi.login("umida", "turon2026");
  }, made);
  await openDocs();

  check("после полной оплаты ваучер открыт",
        !(await card.locator("[data-voucher]").isDisabled()));
  check("после полной оплаты авиабилет открыт",
        !(await card.locator("[data-ticket]").isDisabled()));
  check("состояние брони переписано на «оплачено»",
        (await card.locator(".tt-doc-state").innerText()).includes("Оплачено полностью"));

  await page.click("#notice-btn");
  await page.waitForTimeout(300);
  const docsNotice = page.locator("#notice-panel .is-docs").first();
  check("готовность бланков попадает в колокольчик", (await docsNotice.count()) === 1,
        await page.locator("#notice-panel").innerText());
  await docsNotice.click();
  await page.waitForTimeout(600);
  check("уведомление ведёт в «Документы»",
        await page.locator("#panel-documents").isVisible());

  const [voucher] = await Promise.all([
    page.context().waitForEvent("page"),
    page.locator(`[data-doc-card="${made.code}"] [data-voucher]`).click(),
  ]);
  await voucher.waitForLoadState("domcontentloaded");
  await voucher.waitForTimeout(400);
  check("ваучер открывается и подписан бронью",
        (await voucher.locator("body").innerText()).includes(made.code));
  await voucher.close();

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

/* ------------------------------------------------- колокольчик: «прочитано»
 * Уведомления пересчитываются заново при каждой отрисовке — это факты
 * («просрочен платёж», «выезд скоро»), а не события с id, поэтому отметка
 * «прочитано» хранится отдельно, по стабильному ключу, в localStorage.
 * Проверяем: счётчик показывает именно НЕПРОЧИТАННОЕ (не общее число),
 * отметка переживает закрытие панели и перезагрузку страницы, а новая
 * проблема снова будит колокольчик, не трогая уже прочитанные пункты. */
console.log("\nКолокольчик: отметить прочитанным");
{
  const { page, errors } = await session("umida");

  await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    await window.TuronApi.createBooking({
      departure_code: deps[0].code,
      passengers: [{
        full_name: "BELL FIRST", birth_date: "1990-01-01",
        passport_number: "", passport_expiry: "", placement: "DBL",
      }],
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  await page.click("#notice-btn");
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({
    dotHidden: document.getElementById("notice-dot").hidden,
    dot: document.getElementById("notice-dot").textContent,
    items: document.querySelectorAll("#notice-panel .tt-notice-list li").length,
    read: document.querySelectorAll("#notice-panel .tt-notice-list li.is-read").length,
    hasBtn: !!document.querySelector("[data-mark-read]"),
  }));
  check("непрочитанное уведомление показано и не потускневшее",
        !before.dotHidden && before.read === 0 && before.hasBtn, JSON.stringify(before));

  await page.click("[data-mark-read]");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    dotHidden: document.getElementById("notice-dot").hidden,
    hasBtn: !!document.querySelector("[data-mark-read]"),
    read: document.querySelectorAll("#notice-panel .tt-notice-list li.is-read").length,
    total: document.querySelectorAll("#notice-panel .tt-notice-list li").length,
    panelOpen: !document.getElementById("notice-panel").hidden,
    hasNoticesClass: document.getElementById("notice-btn").classList.contains("has-notices"),
  }));
  check("после отметки счётчик гаснет, а пункт тускнеет, не исчезая",
        after.dotHidden && !after.hasBtn && after.read === after.total &&
        after.total === before.items && !after.hasNoticesClass, JSON.stringify(after));
  check("панель не закрывается кликом по кнопке — виден результат", after.panelOpen);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.click("#notice-btn");
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => ({
    dotHidden: document.getElementById("notice-dot").hidden,
    read: document.querySelectorAll("#notice-panel .tt-notice-list li.is-read").length,
  }));
  check("отметка переживает перезагрузку страницы (хранится в localStorage)",
        afterReload.dotHidden && afterReload.read === before.items, JSON.stringify(afterReload));

  // Новая проблема на ДРУГОЙ брони обязана разбудить колокольчик заново,
  // не трогая уже прочитанное — растущий долг на той же брони так шуметь
  // не должен, а вот новая брониповая проблема — другое дело.
  await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    await window.TuronApi.createBooking({
      departure_code: (deps[1] || deps[0]).code,
      passengers: [{
        full_name: "BELL SECOND", birth_date: "1990-01-01",
        passport_number: "", passport_expiry: "", placement: "DBL",
      }],
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const withNew = await page.evaluate(() => ({
    dotHidden: document.getElementById("notice-dot").hidden,
    dot: document.getElementById("notice-dot").textContent,
  }));
  check("новая проблема снова показывает непрочитанное",
        !withNew.dotHidden && withNew.dot !== "0", JSON.stringify(withNew));

  await page.click("#notice-btn");
  await page.waitForTimeout(300);
  const mixed = await page.evaluate(() => ({
    total: document.querySelectorAll("#notice-panel .tt-notice-list li").length,
    read: document.querySelectorAll("#notice-panel .tt-notice-list li.is-read").length,
  }));
  // Вторая бронь может добавить больше одного пункта (паспорт + скорый
  // выезд у брони с близкой датой) — важно не точное число, а что старые
  // пункты остались прочитанными, а появились и НОВЫЕ непрочитанные.
  check("старое остаётся прочитанным, добавилось новое непрочитанное",
        mixed.total > before.items && mixed.read === before.items,
        JSON.stringify(mixed) + " vs before.items=" + before.items);

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

/* ------------------------------------------- четыре инварианта из аудита
 * Проверяем ровно то, что было сломано, а не «функцию вообще»:
 *   — граница 14 дней: оплата и отмена должны считать ОДИНАКОВО;
 *   — дата рождения: несуществующая не должна доходить до расчёта тарифа;
 *   — переплата: не блокируется, но требует подтверждения. */
console.log("\nИнварианты: сроки, даты, переплата");
{
  const { page, errors } = await session("umida");

  /* Дыра была ровно на 14-м дне: оплата считала «меньше 14» (рассрочка ещё
   * действует), отмена — «14 и меньше» (уже штраф 100%). Агентство внесло
   * 30%, а при отмене с него удерживали всё. */
  const boundary = await page.evaluate(() => {
    const iso = (d) => d.toISOString().slice(0, 10);
    const inDays = (n) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
      return iso(d);
    };
    const at = (n) => ({
      days: n,
      // штраф при отмене
      penalty: window.TuronApi.cancellationPenalty(inDays(n), 1000).penalty,
      // требуется ли платить всё сразу
      urgent: window.TuronApi.paymentPolicy(inDays(n)).urgent,
    });
    return [at(20), at(15), at(14), at(13), at(5)];
  });
  const mismatch = boundary.filter((r) => r.penalty !== r.urgent);
  check("отмена и оплата считают границу одинаково на всех сроках",
        mismatch.length === 0, JSON.stringify(mismatch));
  const d14 = boundary.find((r) => r.days === 14);
  const d13 = boundary.find((r) => r.days === 13);
  check("14-й день ещё без штрафа (решение оператора)",
        d14 && d14.penalty === false, JSON.stringify(d14));
  check("с 13-го дня штраф и полная оплата включаются вместе",
        d13 && d13.penalty === true && d13.urgent === true, JSON.stringify(d13));

  /* Дата рождения. Проверяем именно несуществующую: формат у неё
   * правильный, и старая проверка регулярным выражением её пропускала. */
  const dob = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const pax = (birth) => ({
      full_name: "BAD DATE", birth_date: birth, passport_number: "ZZ1",
      passport_expiry: "2033-01-01", placement: "DBL",
    });
    const tryBook = async (birth) => {
      try {
        await window.TuronApi.createBooking({
          departure_code: deps[0].code, passengers: [pax(birth)],
        });
        return "прошло";
      } catch (e) { return "отклонено"; }
    };
    return {
      fake: await tryBook("2026-02-31"),
      future: await tryBook("2099-01-01"),
      ancient: await tryBook("1799-01-01"),
      good: await tryBook("1990-05-05"),
    };
  });
  check("31 февраля не проходит", dob.fake === "отклонено", dob.fake);
  check("дата из будущего не проходит", dob.future === "отклонено", dob.future);
  check("1799 год не проходит", dob.ancient === "отклонено", dob.ancient);
  check("нормальная дата проходит", dob.good === "прошло", dob.good);

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

{
  const { page, errors } = await session("umida");
  /* Переплата. Решение оператора: бывает законной, поэтому НЕ блокируем, а
   * переспрашиваем — деньги уже на счету, и запретить провести реальное
   * поступление нельзя. */
  const over = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const r = await window.TuronApi.createBooking({
      departure_code: deps[0].code,
      passengers: [{
        full_name: "OVERPAY TEST", birth_date: "1990-01-01",
        passport_number: "OP1", passport_expiry: "2033-01-01", placement: "DBL",
      }],
    });
    const mine = (await window.TuronApi.bookings())
      .filter((b) => b.code === r.booking_code)[0];
    const total = mine.total_price;

    await window.TuronApi.login("operator", "turon2026");
    const out = { total };
    // 1) сумма больше долга без согласия — должна вернуться с расчётом
    try {
      await window.TuronApi.addPayment(r.booking_code, total + 500);
      out.blind = "прошло";
    } catch (e) {
      out.blind = "переспросило";
      out.status = e.status;
      out.excess = e.data && e.data.excess;
      out.balance = e.data && e.data.balance;
    }
    // 2) ровно долг — проходит без вопросов
    try {
      await window.TuronApi.addPayment(r.booking_code, total);
      out.exact = "прошло";
    } catch (e) { out.exact = "отклонено: " + e.message; }
    // 3) с согласия оператора переплата проводится
    try {
      const res = await window.TuronApi.addPayment(
        r.booking_code, 300, null, { allowOverpay: true });
      out.confirmed = "прошло";
      out.paid = res.paid;
    } catch (e) { out.confirmed = "отклонено: " + e.message; }
    return out;
  });
  check("переплата не проводится молча, а возвращает расчёт",
        over.blind === "переспросило" && over.status === 409 && over.excess === 500,
        JSON.stringify(over));
  check("оплата ровно по остатку проходит без вопросов",
        over.exact === "прошло", over.exact);
  check("с подтверждения оператора переплата проводится",
        over.confirmed === "прошло" && over.paid === over.total + 300,
        JSON.stringify(over));

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

console.log("\nЗамена состава: заявка агентства и правка оператором");
{
  const { page, errors } = await session("umida");

  // Своя бронь на двоих взрослых — с неё и будем снимать/добавлять людей.
  const made = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const d = deps[0];
    const adult = new Date(new Date(d.date_start).getTime() - 30 * 365 * 86400000)
      .toISOString().slice(0, 10);
    const r = await window.TuronApi.createBooking({
      departure_code: d.code,
      passengers: [
        { full_name: "SWAP ONE", birth_date: adult, passport_number: "SW1111111",
          passport_expiry: "2032-01-01", placement: "DBL" },
        { full_name: "SWAP TWO", birth_date: adult, passport_number: "SW2222222",
          passport_expiry: "2032-01-01", placement: "DBL" },
      ],
    });
    return { code: r.booking_code, dep: d.code, total: r.total_price, adult };
  });
  check("бронь на двоих для замены создана", !!made.code);

  // Список броней кабинет читает при входе, а бронь создана после него —
  // без перезагрузки карточки на экране просто нет. Токен лежит в
  // localStorage, поэтому reload возвращает сразу в кабинет.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  // 1. Агентство САМО состав не меняет — только просит.
  await page.locator('.tt-tab[data-tab="bookings"]').first().click({ force: true });
  await page.waitForTimeout(700);
  const card = page.locator(".tt-booking").filter({ hasText: made.code });
  check("у агентства есть кнопка «Заменить туриста»",
        (await card.locator("[data-change]").count()) === 1);
  check("кнопки прямой правки состава у агентства нет",
        (await card.locator("[data-edit-passengers]").count()) === 0);

  page.once("dialog", (d) => d.accept("вместо SWAP TWO едет SWAP THREE"));
  await card.locator("[data-change]").click();
  await page.waitForTimeout(700);
  const afterReq = page.locator(".tt-booking").filter({ hasText: made.code });
  check("после заявки кнопка сменилась на «Замена у оператора»",
        (await afterReq.locator("[data-change]").count()) === 0 &&
        (await afterReq.getByText("Замена у оператора").count()) === 1);

  // Повторная заявка не плодит вторую — состояние то же.
  const twice = await page.evaluate(async (code) => {
    const list = await window.TuronApi.bookings();
    const b = list.find((x) => x.code === code);
    return await window.TuronApi.requestChange(b.id, "ещё раз");
  }, made.code);
  check("повторная заявка не создаёт вторую", twice.already_requested === true);

  // 2. Оператор проводит замену: убираем второго туриста.
  //
  // ВАЖНО: пересаживаемся в ТОЙ ЖЕ вкладке, а не через session(). Демо-режим
  // держит данные в localStorage, а browser.newPage() заводит новый контекст
  // с чистым хранилищем — созданной брони оператор бы там просто не увидел.
  const op = { page, errors };
  await page.evaluate(async () => { await window.TuronApi.logout().catch(() => {}); });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (await page.locator("#public-login-btn").count()) {
    try { await page.locator("#public-login-btn").click({ timeout: 1200 }); } catch {}
  }
  await page.fill("#l-login", "operator");
  await page.fill("#l-password", "turon2026");
  await page.click("#login-btn");
  await page.waitForTimeout(900);
  await op.page.locator('.tt-tab[data-tab="admin-bookings"]').first().click({ force: true });
  await op.page.waitForTimeout(900);
  const opRow = op.page.locator("#adm-bookings .tt-booking").filter({ hasText: made.code });
  check("у оператора видна метка «Просят замену»",
        (await opRow.getByText("Просят замену").count()) === 1);
  check("кнопка подписана «Провести замену», раз заявка открыта",
        (await opRow.locator("[data-composition]").innerText()).includes("Провести замену"));

  await opRow.locator("[data-composition]").click();
  await op.page.waitForTimeout(700);
  check("окно брони открылось в режиме правки",
        (await op.page.locator("#booking-modal").isVisible()) &&
        (await op.page.locator("#bm-title").innerText()).includes(made.code));
  check("первый шаг называется «Рассчитать», а не «Сохранить»",
        (await op.page.locator("#bm-submit").innerText()).trim() === "Рассчитать");
  check("состав подставлен целиком",
        (await op.page.locator("#bm-passengers [data-pax]").count()) === 2);

  // Убираем вторую строку и считаем.
  await op.page.locator("#bm-passengers [data-remove]").last().click();
  await op.page.waitForTimeout(300);
  check("строка убрана из формы",
        (await op.page.locator("#bm-passengers [data-pax]").count()) === 1);

  await op.page.locator("#bm-submit").click();
  await op.page.waitForTimeout(700);
  check("расчёт показан, а не записан молча",
        await op.page.locator("#bm-preview").isVisible());
  check("в расчёте видно «2 → 1»",
        (await op.page.locator("#bm-preview").innerText()).includes("2 → 1"));
  check("после расчёта кнопка стала «Применить»",
        (await op.page.locator("#bm-submit").innerText()).trim() === "Применить");

  // Пока не подтвердили — в базе всё по-прежнему.
  const midway = await op.page.evaluate(async (code) => {
    const r = await window.TuronApi.adminBookings({ limit: 200 });
    const b = (r.items || r).find((x) => x.code === code);
    return b.passengers_count;
  }, made.code);
  check("до подтверждения состав не тронут", midway === 2);

  // Ловушка: расчёт устаревает, если тронуть состав после него.
  // ФИО в форме ТРЕМЯ полями (см. joinName/splitName) — трогаем фамилию.
  await op.page.locator('#bm-passengers [data-f="last_name"]').first().fill("SWAPX");
  await op.page.waitForTimeout(250);
  check("правка после расчёта гасит его",
        (await op.page.locator("#bm-preview").isHidden()) &&
        (await op.page.locator("#bm-submit").innerText()).trim() === "Рассчитать");

  await op.page.locator("#bm-submit").click();
  await op.page.waitForTimeout(700);
  await op.page.locator("#bm-submit").click();
  await op.page.waitForTimeout(1200);
  check("окно закрылось после применения",
        await op.page.locator("#booking-modal").isHidden());

  const applied = await op.page.evaluate(async (code) => {
    const r = await window.TuronApi.adminBookings({ limit: 200 });
    const b = (r.items || r).find((x) => x.code === code);
    return { n: b.passengers_count, total: b.total_price, req: b.change_requested_at };
  }, made.code);
  check("состав применён — остался один турист", applied.n === 1);
  check("сумма брони пересчитана", applied.total < made.total);
  check("заявка агентства закрылась правкой", !applied.req);

  check("нет ошибок JS", op.errors.length === 0, op.errors.slice(0, 3).join(" | "));
  await op.page.close();
}

console.log("\nЗамена состава: чего сервер не даёт");
{
  const { page, errors } = await session("operator");

  const res = await page.evaluate(async () => {
    const deps = await window.TuronApi.departures();
    const d = deps[0];
    const adult = new Date(new Date(d.date_start).getTime() - 30 * 365 * 86400000)
      .toISOString().slice(0, 10);
    const made = await window.TuronApi.createBooking({
      departure_code: d.code,
      passengers: [{ full_name: "GUARD ONE", birth_date: adult,
        passport_number: "GD1111111", passport_expiry: "2032-01-01", placement: "DBL" }],
    });
    const list = await window.TuronApi.bookings();
    const b = list.find((x) => x.code === made.booking_code);
    const row = { full_name: "GUARD ONE", birth_date: adult,
      passport_number: "GD1111111", passport_expiry: "2032-01-01", placement: "DBL" };

    const out = {};
    // пустой состав
    try {
      await window.TuronApi.adminUpdatePassengers(b.id, [], { confirm: true });
      out.empty = "прошло";
    } catch (e) { out.empty = e.message; }
    // «оставить цены» при РАЗНОМ числе туристов переносить не с чего
    try {
      await window.TuronApi.adminUpdatePassengers(b.id, [row, row],
        { confirm: true, keepPrice: true });
      out.keep = "прошло";
    } catch (e) { out.keep = e.message; }
    // несуществующая дата рождения
    try {
      await window.TuronApi.adminUpdatePassengers(b.id,
        [Object.assign({}, row, { birth_date: "1990-02-31" })], { confirm: true });
      out.date = "прошло";
    } catch (e) { out.date = e.message; }
    return out;
  });

  check("пустой состав не принимается", /хотя бы один/.test(res.empty), res.empty);
  check("«оставить цены» требует того же числа туристов",
        /том же числе/.test(res.keep), res.keep);
  check("несуществующая дата рождения не проходит и здесь",
        /не существует/.test(res.date), res.date);

  check("нет ошибок JS", errors.length === 0, errors.slice(0, 3).join(" | "));
  await page.close();
}

console.log("\nУстойчивость к сбоям сети");
{
  const apiSource = fs.readFileSync(path.resolve("js/api.js"), "utf8");
  const page = await browser.newPage();
  // Не about:blank: у него непрозрачный origin, а api.js читает localStorage
  // (токен) и падает с SecurityError. Берём обычную страницу превью и
  // переопределяем TuronApi поверх неё — модуль читает apiBaseUrl при
  // инициализации, поэтому с непустым адресом включается сетевой путь.
  await page.goto("file://" + PREVIEW, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { window.TURON_CONFIG = { apiBaseUrl: "https://stub.test" }; });
  await page.addScriptTag({ content: apiSource });

  // Ставим счётчик вызовов и сценарий ответов на каждый тест. Регрессия в
  // ретраях выражается отклонённым промисом — ловим его здесь, чтобы тест
  // отчитался честным FAIL, а не обрывал весь прогон исключением.
  async function withFetch(script) {
    try { return await page.evaluate(script); }
    catch (e) { return { error: String(e.message || e) }; }
  }

  const flaky = await withFetch(async () => {
    let calls = 0;
    window.fetch = () => {
      calls++;
      if (calls === 1) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ name: "Турция" }]) });
    };
    const data = await window.TuronApi.catalogDestinations();
    return { calls, ok: Array.isArray(data) && data.length === 1 };
  });
  check("сорвавшийся GET повторяется и всё-таки доезжает",
        flaky.calls === 2 && flaky.ok, JSON.stringify(flaky));

  const fivehundred = await withFetch(async () => {
    let calls = 0;
    window.fetch = () => {
      calls++;
      if (calls < 3) {
        return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    };
    await window.TuronApi.catalogDestinations();
    return calls;
  });
  check("503 от холодного воркера переживается повтором",
        fivehundred === 3, JSON.stringify(fivehundred));

  // 404/401 детерминированы: повтор вернёт ровно то же, дёргать сеть незачем.
  const notFound = await withFetch(async () => {
    let calls = 0;
    window.fetch = () => {
      calls++;
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: "нет" }) });
    };
    try { await window.TuronApi.catalogDestinations(); } catch (e) { return { calls, msg: e.message }; }
    return { calls, msg: "не отклонился" };
  });
  check("404 не повторяется — ответ детерминирован",
        notFound.calls === 1, JSON.stringify(notFound));

  /* САМОЕ ВАЖНОЕ: POST повторять нельзя. Повтор /api/bookings создал бы
   * вторую бронь на тех же пассажиров — это хуже любой ошибки загрузки. */
  const post = await withFetch(async () => {
    let calls = 0;
    window.fetch = () => {
      calls++;
      return Promise.reject(new TypeError("Failed to fetch"));
    };
    try { await window.TuronApi.login("umida", "x"); } catch (e) { return calls; }
    return calls;
  });
  check("POST НЕ повторяется (иначе дубль брони)", post === 1, JSON.stringify(post));

  const giveUp = await withFetch(async () => {
    let calls = 0;
    window.fetch = () => { calls++; return Promise.reject(new TypeError("Failed to fetch")); };
    try { await window.TuronApi.catalogDestinations(); } catch (e) { return calls; }
    return -1;
  });
  check("повторы не бесконечны — сдаёмся после трёх попыток",
        giveUp === 3, JSON.stringify(giveUp));

  await page.close();
}

/* Гонка запросов на живой странице: ответ, опоздавший к уже другому
 * экрану, не должен ни показывать ошибку, ни возвращать старый вид. */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.goto("file://" + PREVIEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // Каталог отвечает с задержкой и ошибкой, и пока он «едет», уходим на тур.
  await page.evaluate(() => {
    window.TuronApi.catalogDestinations = () => new Promise((_, rej) =>
      setTimeout(() => rej(new Error("сеть отвалилась")), 500));
  });
  await page.evaluate(() => { window.location.hash = "#/"; });
  await page.waitForTimeout(120);
  await page.evaluate(() => { window.location.hash = "#/t/KARADENIZ"; });
  await page.waitForTimeout(1100);

  const afterRace = await page.evaluate(() => ({
    hasError: document.body.innerText.includes("Не удалось загрузить каталог"),
    hasTour: !!document.querySelector(".tt-tour-bg, .tt-cat-block, [data-calc]"),
  }));
  check("опоздавшая ошибка не затирает уже открытый экран",
        !afterRace.hasError, JSON.stringify(afterRace));
  check("после гонки на экране именно тот раздел, куда ушли",
        afterRace.hasTour, JSON.stringify(afterRace));

  /* Когда ошибка всё же законна (текущий экран не загрузился), у неё должна
   * быть кнопка выхода: раньше единственным способом была перезагрузка. */
  await page.evaluate(() => {
    window.TuronApi.catalogDestinations = () => Promise.reject(new Error("сеть отвалилась"));
    window.location.hash = "#/";
  });
  await page.waitForTimeout(500);
  check("на экране ошибки есть кнопка «Повторить»",
        (await page.locator("[data-catalog-retry]").count()) === 1);

  // Чиним «сеть» и жмём повтор — каталог обязан подняться без перезагрузки.
  await page.evaluate(() => {
    const seed = (window.TURON_TOURS || []).map((t) => t.destination);
    const uniq = [...new Set(seed)].map((name) => ({ name, title: name, tours: 1, departures: 1 }));
    window.TuronApi.catalogDestinations = () => Promise.resolve(uniq);
  });
  await page.locator("[data-catalog-retry]").click();
  await page.waitForTimeout(700);
  const recovered = await page.evaluate(() => ({
    gone: !document.body.innerText.includes("Не удалось загрузить каталог"),
    tiles: document.querySelectorAll("[data-dest]").length,
  }));
  check("«Повторить» поднимает каталог без перезагрузки страницы",
        recovered.gone && recovered.tiles > 0, JSON.stringify(recovered));

  await page.close();
}

await browser.close();
console.log(`\nИтого: ${passed} пройдено, ${failed} провалено`);
process.exit(failed ? 1 : 0);
