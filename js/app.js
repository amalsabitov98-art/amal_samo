(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    departures: [], current: null, passengers: [], editing: null,
    // выбранный в конструкторе заезд и счётчики по тарифам
    builder: { code: null, counts: {} },
    // брони агентства: их читают разделы «Туристы», «Платежи», «Документы»
    bookings: [],
    // каталог туров — читает и вкладка «Туры», и витрина «Новый тур» (карточки
    // программ Умры строятся из него, а не из выдуманного списка)
    tours: [],
    mediaIndex: 0,
  };

  // Каталоги: гостевой (на публичном экране) и кабинетный (вкладка).
  // Экземпляры независимы, создаются по одному разу.
  var publicCatalog = null, builderCatalog = null;
  // Заезд, который гость выбрал до входа: откроем бронь сразу после логина.
  var pendingBooking = null;
  // Согласие с условиями бронирования: сбрасывается при открытии окна брони,
  // ставится по «Я согласен». Пока false — первый «Забронировать» показывает
  // условия, а не отправляет бронь. На правку состава (замена туриста) не
  // распространяется — она бесплатна и идёт напрямую.
  var bookingAgreed = false;

  // Полных дней от сегодня до даты выезда — для показа сроков в интерфейсе.
  // САМО правило отмены здесь НЕ считается: оно одно на оба кабинета и живёт
  // в TuronApi.cancellationPenalty, иначе сравнения снова разъедутся.
  function daysUntil(dateStr) {
    if (!dateStr) return Infinity;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var dep = new Date(dateStr + "T00:00:00");
    return Math.round((dep - today) / 86400000);
  }
  // Промис загрузки каталога туров — сетка программ Умры ждёт его перед
  // отрисовкой, иначе на первом же клике попадёт в ещё пустой state.tours.
  var toursReady = null;
  // Фильтр сетки программ Умры по длительности — переживает перерисовку
  // (toursReady) и повторные заходы на вкладку.
  var umraFilter = "13";

  var TRANSPORT = { TZX: "Авиа · Трабзон", BUS: "Авиа · Батуми" };

  function money(v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return "$" + v.toLocaleString("ru-RU", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    });
  }

  // Даты в базе без времени — форматируем в UTC, иначе местный часовой
  // пояс сдвигает день назад.
  function formatDate(iso) {
    return new Date(iso + "T00:00:00Z").toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", timeZone: "UTC",
    });
  }

  // «31 июля — 7 августа», когда у тура известна длительность.
  function formatRange(iso, nights) {
    var end = TuronApi.departureEnd(iso, nights);
    return end ? formatDate(iso) + " — " + formatDate(end) : formatDate(iso);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ================================================================ маршруты
   * Один хеш-роутер на все экраны. Раньше экраны переключались прямыми
   * вызовами show*(), и адрес про это ничего не знал — отсюда три жалобы
   * сразу: «назад» некуда нажимать, обновление страницы в кабинете теряло
   * вкладку, а логотип никуда не вёл.
   *
   *   #/                — каталог (главная)
   *   #/d/X, #/t/Y      — направление и карточка тура (ведёт catalog.js)
   *   #/login           — вход
   *   #/app/<вкладка>   — кабинет на конкретной вкладке
   *
   * Адрес — единственный источник правды: и клик, и «назад», и F5 проходят
   * через applyRoute(), поэтому расходиться им негде.
   */
  var session = null;          // агентство текущей сессии
  var cabinetReady = false;    // тяжёлая инициализация кабинета уже прошла
  var currentScreen = null;
  var pendingRoute = null;     // куда вернуть после входа
  var loginReturn = null;      // откуда пришли на экран входа

  /* Шаги внутри кабинета в истории браузера. Вкладки уже адресуются хешем
   * (#/app/<вкладка>), но переходы ВНУТРИ вкладки — витрина «Новый тур» →
   * сетка Умры → конструктор программы, а также окно брони — раньше в историю
   * не попадали, и кнопка «Назад» браузера уводила со страницы вместо
   * предыдущего шага. Теперь каждый заход глубже добавляет запись истории тем
   * же адресом (pushState без смены хеша), а closer описывает, как откатить
   * шаг назад. Хеш при этом не меняется, поэтому хеш-роутер (он слушает
   * hashchange) эти шаги не трогает — их ведёт отдельный popstate ниже. */
  var stepStack = [];          // [{ id, close }] — открытые шаги, глубже — в конце
  var stepSeq = 0;             // сквозной номер шага (кладём в history.state)
  var appliedHash = null;      // хеш, который сейчас показывает роутер

  function pushStep(closer) {
    stepSeq++;
    stepStack.push({ id: stepSeq, close: closer });
    window.history.pushState({ ttStep: stepSeq }, "");
  }
  // Смена вкладки/экрана обнуляет шаги: их вид уже сменил роутер, а записи в
  // истории остаются безвредными «фантомами» (лишний Назад просто перерисует
  // тот же экран).
  function clearSteps() { stepStack = []; }
  // Откатить один шаг по кнопке в интерфейсе — тем же путём, что и «Назад»
  // браузера, чтобы поведение совпадало: history.back поднимет popstate,
  // а он вызовет closer.
  function stepBack(fallback) {
    if (stepStack.length) window.history.back();
    else if (fallback) fallback();
  }
  var lastAppRoute = null;     // последняя вкладка кабинета — чтобы кнопка
                               // «Кабинет» возвращала туда, где человек был

  function parseRoute() {
    var h = (window.location.hash || "").replace(/^#/, "");
    if (h === "/login") return { screen: "login" };
    var m = h.match(/^\/app(?:\/([\w-]+))?$/);
    if (m) return { screen: "app", tab: m[1] || null };
    return { screen: "public" };
  }

  function defaultTab() {
    return session && TuronAdmin.isOperator(session) ? "overview" : "builder";
  }

  function appRoute(tab) { return "#/app/" + (tab || defaultTab()); }

  // replace — не оставлять след в истории (редиректы и вход/выход):
  // иначе «назад» возвращал бы на экран, с которого нас только что увели.
  function navigate(hash, replace) {
    if (window.location.hash === hash) { applyRoute(); return; }
    if (replace) {
      window.history.replaceState(null, "", hash);
      applyRoute();
    } else {
      window.location.hash = hash;   // hashchange сам поднимет applyRoute
    }
  }

  function goTab(name) { navigate(appRoute(name)); }

  /* Разбор адреса. Редиректы (кабинет без сессии → вход, вход с сессией →
   * кабинет) делаются циклом, а не рекурсией: resolveRoute возвращает адрес,
   * куда надо переехать, либо null, если экран уже показан. Счётчик — чтобы
   * пара взаимных редиректов не закрутилась навсегда. */
  function applyRoute() {
    for (var guard = 0; guard < 5; guard++) {
      var redirect = resolveRoute();
      if (!redirect) { appliedHash = window.location.hash; return; }   // экран показан
      if (window.location.hash === redirect) { appliedHash = window.location.hash; return; }
      window.history.replaceState(null, "", redirect);
    }
  }

  function resolveRoute() {
    var r = parseRoute();

    if (r.screen === "app") {
      // Просят кабинет без сессии — запоминаем куда и уводим на вход.
      if (!session) {
        pendingRoute = window.location.hash;
        return "#/login";
      }
      // Проверку «а можно ли роли эту вкладку» делает showApp: флаги
      // видимости вкладок выставляет ensureCabinet, и до него спрашивать
      // tabAllowed бесполезно — у свежей сессии они ещё от прошлой роли.
      showApp(r.tab);
      return null;
    }

    if (r.screen === "login") {
      if (session) return lastAppRoute || appRoute();
      showLogin();
      return null;
    }

    showPublic();
    return null;
  }

  function tabAllowed(name) {
    var tab = document.querySelector('.tt-tab[data-tab="' + name + '"]');
    return !!tab && !tab.hidden;
  }

  function reducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* Плавное появление экрана. Анимируем ТОЛЬКО прозрачность: transform на
   * контейнере создал бы новый containing block, и position:fixed внутри
   * (окно брони, затемнение меню) начал бы считаться от него, а не от окна. */
  function fadeIn(id) {
    var el = $(id);
    if (!el || reducedMotion()) return;
    el.classList.add("tt-screen-enter");
    // Двойной rAF: если снять класс в том же кадре, браузер схлопнет обе
    // правки в один стиль и перехода не случится.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        el.classList.remove("tt-screen-enter");
      });
    });
  }

  /* Смена экрана. Возвращает true, если экран действительно поменялся —
   * по этому признаку решаем, перерисовывать ли каталог: внутри публичной
   * части хеш ведёт сам catalog.js, и второй render() был бы лишним. */
  function setScreen(name) {
    if (currentScreen === name) return false;
    currentScreen = name;
    $("screen-public").hidden = name !== "public";
    $("screen-login").hidden = name !== "login";
    $("screen-app").hidden = name !== "app";
    $("offline-screen").hidden = true;
    fadeIn(name === "public" ? "screen-public"
         : name === "login" ? "screen-login" : "screen-app");
    // Полноэкранная галерея временно запрещает прокрутку body. Если экран
    // сменили в момент закрытия/сворачивания fullscreen, событие выхода
    // иногда не успевало вернуть overflow — и кабинет оставался без колеса.
    if (name === "app" && !document.fullscreenElement) {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    window.scrollTo(0, 0);
    return true;
  }

  // ------------------------------------------------------------------ вход
  // Гостя встречает каталог, а не форма входа: тур можно показать клиенту
  // по ссылке, логин нужен только чтобы забронировать.
  function ensurePublicCatalog() {
    if (publicCatalog) return;
    publicCatalog = TuronCatalog.create({
      root: $("public-catalog"),
      canBook: false,
      useHash: true,
      onLogin: function (code) {
        pendingBooking = code;
        loginReturn = window.location.hash || "#/";
        navigate("#/login");
      },
    });
  }

  function showPublic() {
    var changed = setScreen("public");
    ensurePublicCatalog();
    syncPublicAccount();
    if (changed) publicCatalog.render();
  }

  function showLogin() {
    setScreen("login");
  }

  /* Кабинет. Тяжёлая часть (загрузка заездов, броней, каталога) выполняется
   * один раз: showApp зовётся на каждое переключение вкладки, и грузить всё
   * заново на каждый клик было бы расточительно. */
  function ensureCabinet() {
    if (cabinetReady) return;
    cabinetReady = true;

    // Нижняя карточка агентства из бокового меню удалена — осталось только
    // имя в верхней панели.
    var topAgencyName = $("top-agency-name");
    if (topAgencyName) topAgencyName.textContent = session.name;

    // Оператору показываем его вкладки и прячем агентские: он не бронирует
    // и своих комиссий не имеет.
    var isOperator = TuronAdmin.isOperator(session);
    document.querySelectorAll(".tt-tab-op").forEach(function (t) { t.hidden = !isOperator; });
    document.querySelectorAll(".tt-tab-ag").forEach(function (t) { t.hidden = isOperator; });

    if (isOperator) {
      TuronAdmin.start();
      startOperatorNoticePolling();
      return;
    }

    // «Новый тур» — витрина туров: этот каталог рисует мозаику направлений и
    // карточки Умры/Японии с бронью. Карадениз он НЕ рисует сам — отдаёт хосту
    // через onTour, и мы показываем привычный конструктор mir-jahon.
    if (!builderCatalog) {
      builderCatalog = TuronCatalog.create({
        root: $("builder-catalog"),
        canBook: true,
        onBook: bookFromCatalog,
        onTour: function (code) {
          if (code !== "KARADENIZ") return false;   // Умра/Япония — обычной карточкой
          viewKaradeniz();                           // внутренняя навигация каталога
          return true;                               // карточку Карадениза каталог не рисует
        },
        // Умра — не мозаика и не видео-лендинг, а те же 9 карточек-программ,
        // что и витрина выше. Корень каталога (клик по крошке «Каталог» из
        // карточки программы) отбиваем обратно на витрину туров.
        onDestination: function (name) {
          if (name === "Умра") { viewUmra(); return true; }
          if (name == null) { showBuilderShowcase(); return true; }
          return false;   // Япония и прочие — обычный каталог хоста
        },
        // На витрине кнопку возврата прячем; она нужна только внутри обычного
        // каталога. У сетки программ Умры отдельной кнопки больше нет.
        onView: function (view) {
          var back = $("builder-catalog-back");
          if (back) back.hidden = !view || view.kind === "destinations";
        },
      });
    }

    var ready = loadDepartures();
    loadBookings();
    toursReady = loadTours();

    // Гость выбрал заезд, потом вошёл — доводим его до брони, а не
    // оставляем разбираться заново.
    if (pendingBooking) {
      var code = pendingBooking;
      pendingBooking = null;
      ready.then(function () { bookFromCatalog(code); });
    }
  }

  function showApp(tab) {
    // Кабинет всегда должен использовать обычную прокрутку страницы. Если
    // пользователь ушёл с полноэкранной галереи нестандартным путём (history,
    // смена hash/экрана, сворачивание вкладки), её fallback-класс и inline
    // overflow могли остаться активными и полностью «убить» колесо мыши.
    // Сбрасываем это при КАЖДОМ открытии вкладки, даже когда screen уже app.
    if (media && media.classList.contains("is-fullscreen")) {
      setMediaFullscreen(false);
    }
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    setScreen("app");
    ensureCabinet();   // здесь же выставляются флаги видимости вкладок по роли
    var name = tab && tabAllowed(tab) ? tab : defaultTab();
    var want = appRoute(name);
    /* Адрес мог просить вкладку, которой у этой роли нет (ссылка из чужой
     * истории). Правим его напрямую replaceState, а НЕ через navigate:
     * navigate снова позвал бы applyRoute, тот — showApp, и так по кругу.
     * Ровно на этом уже поймались: оператор входил, manifest ещё числился
     * скрытым, и редирект уходил в бесконечную рекурсию. */
    if (window.location.hash !== want) window.history.replaceState(null, "", want);
    lastAppRoute = want;
    // Уход на вкладку по адресу закрывает окно брони, если оно осталось
    // открытым, и обнуляет шаги внутри прежней вкладки: их запись в истории
    // безвредна, а вид уже сменил роутер.
    if ($("booking-modal") && !$("booking-modal").hidden) closeBooking();
    clearSteps();
    switchTab(name);
    refreshTab(name);
  }

  /* Разделы, которые строятся на клиенте из уже загруженных броней.
   * Вызывается и по клику, и по «назад», и после F5 — иначе вкладка,
   * открытая по адресу, оставалась бы пустой. */
  function refreshTab(name) {
    if (name === "travellers") renderTravellers();
    else if (name === "payments") renderPayments();
    else if (name === "documents") renderDocuments();
    else if (name === "messages") renderMessages();
    // «Новый тур» при входе на вкладку по адресу/клику всегда открывается
    // витриной — так и задумано, а шаги вглубь начинаются от чистого корня.
    // (Внутренние переходы билдера идут без смены адреса, refreshTab их не
    // трогает.)
    else if (name === "builder") showBuilderShowcase();
  }

  /* В публичной шапке вошедшему показываем «Кабинет» вместо «Войти» —
   * иначе из каталога в кабинет можно было вернуться только через адрес. */
  function syncPublicAccount() {
    var btn = $("public-login-btn");
    if (!btn) return;
    var label = btn.querySelector("span");
    if (label) {
      // Меняем сам ключ, а не текст: снятие data-i18n оставляло подпись
      // русской при переключении языка в публичной шапке.
      var key = session ? "header.cabinet" : "header.login";
      label.setAttribute("data-i18n", key);
      label.textContent = window.TuronPublicUi ? window.TuronPublicUi.t(key)
                                               : (session ? "Кабинет" : "Войти");
    }
    btn.setAttribute("aria-label", session ? "Вернуться в кабинет" : "Войти");
  }

  // Бронь из каталога: карточка тура отдаёт код заезда, а окно брони
  // работает с доской заездов. Если списки разошлись — говорим об этом,
  // а не открываем пустое окно.
  //
  // prefill — строки от калькулятора: сколько туристов и с каким
  // размещением. Цену форма всё равно считает сама по датам рождения.
  function bookFromCatalog(code, prefill) {
    var known = state.departures.some(function (d) { return d.code === code; });
    if (!known) {
      flash("Заезд " + code + " недоступен для брони — обновите страницу.");
      return;
    }
    openBooking(code, null, prefill);
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("login-btn");
    btn.disabled = true;
    $("login-error").innerHTML = "";
    TuronApi.login($("l-login").value, $("l-password").value)
      .then(function (res) {
        session = res.agency;
        cabinetReady = false;
        syncPublicAccount();
        var back = pendingRoute;
        pendingRoute = null;
        // replace: экран входа не должен остаться в истории позади кабинета
        navigate(back || appRoute(), true);
      })
      .catch(function (err) {
        $("login-error").innerHTML = '<div class="tt-error-box">' + esc(err.message) + "</div>";
      })
      .then(function () { btn.disabled = false; });
  });

  function doLogout() {
    TuronApi.logout().then(function () {
      $("l-password").value = "";
      session = null;
      // кабинет придётся собрать заново: следующий вход может быть под
      // другой ролью, а вкладки и загруженные данные остались от прежней
      cabinetReady = false;
      lastAppRoute = null;
      state.bookings = [];
      operatorNotices = null;
      if (operatorNoticeTimer) window.clearInterval(operatorNoticeTimer);
      operatorNoticeTimer = null;
      syncPublicAccount();
      navigate("#/", true);
    });
  }
  $("logout-top").addEventListener("click", doLogout);

  /* Тема кабинета — своя, отдельно от публичной (data-app-theme на <html>,
   * ключ turon.app-theme). По умолчанию кремовая; тёмная включается этой
   * кнопкой. Начальное значение уже проставил инлайн-скрипт в <head>, здесь
   * только переключение по клику. */
  var appThemeBtn = document.getElementById("app-theme-toggle");
  if (appThemeBtn) {
    appThemeBtn.addEventListener("click", function () {
      var root = document.documentElement;
      var dark = root.getAttribute("data-app-theme") === "dark";
      if (dark) {
        root.removeAttribute("data-app-theme");
        try { window.localStorage.setItem("turon.app-theme", "light"); } catch (_) {}
      } else {
        root.setAttribute("data-app-theme", "dark");
        try { window.localStorage.setItem("turon.app-theme", "dark"); } catch (_) {}
      }
    });
  }

  /* Колокольчик: открытие панели, закрытие по клику вне и по Esc.
   * Содержимое собирает renderNotices() из загруженных броней. */
  function setNotices(open) {
    $("notice-panel").hidden = !open;
    $("notice-btn").setAttribute("aria-expanded", open ? "true" : "false");
  }
  $("notice-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    var willOpen = $("notice-panel").hidden;
    if (willOpen && session && TuronAdmin.isOperator(session)) loadOperatorNotices();
    else if (willOpen) renderNotices();
    setNotices(willOpen);
  });
  $("notice-panel").addEventListener("click", function (e) {
    e.stopPropagation();
    // Панель НЕ закрываем: агент должен увидеть, как список тускнеет и
    // счётчик у колокольчика гаснет — это и есть подтверждение «отмечено».
    if (e.target.closest("[data-mark-read]")) {
      markNoticesSeen(collectNotices());
      renderNotices();
      return;
    }
    var booking = e.target.closest("[data-booking-code]");
    if (booking && window.TuronAdmin) {
      setNotices(false);
      TuronAdmin.openBooking(booking.dataset.bookingCode);
      return;
    }
    var go = e.target.closest("[data-goto]");
    if (!go) return;
    setNotices(false);
    goTab(go.dataset.goto);
  });
  document.addEventListener("click", function () { setNotices(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNotices(false);
  });

  $("public-login-btn").addEventListener("click", function () {
    if (session) return navigate(lastAppRoute || appRoute());
    loginReturn = window.location.hash || "#/";
    navigate("#/login");
  });

  // Логотип в кабинете ведёт на главную страницу сайта, сессия при этом
  // сохраняется — вернуться можно кнопкой «Кабинет» в публичной шапке.
  $("app-home-btn").addEventListener("click", function () { navigate("#/"); });

  $("public-home-btn").addEventListener("click", function () {
    navigate("#/");
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  });

  window.addEventListener("turon:language", function () {
    syncPublicAccount();
    if (publicCatalog && !$("screen-public").hidden) publicCatalog.render();
  });

  $("login-back").addEventListener("click", function () {
    pendingBooking = null;
    pendingRoute = null;
    $("login-error").innerHTML = "";
    // Возвращаем на карточку тура, с которой человек нажал «войти и
    // забронировать», а не в корень каталога — иначе он теряет своё место.
    var back = loginReturn || "#/";
    loginReturn = null;
    navigate(back);
  });

  function loadDepartures() {
    return TuronApi.departures().then(function (list) {
      // Заезды НЕ фильтруем по полётной программе: если оператор заведёт
      // заезд на новый сезон или не на пятницу, он всё равно должен
      // продаваться. От расписания зависит только блок рейсов — там, где
      // рейс неизвестен, честно пишем об этом.
      state.departures = list.map(function (d) {
        // Подстраховка: если в базе у тура не проставлена длительность
        // (старый seed без nights), берём её из отелей (4 + 3 = 7),
        // чтобы заезд не показывал «длительность уточняется».
        if (!d.nights) {
          var hn = TuronProvisional.hotelsFor(d).reduce(function (s, h) {
            return s + (h.nights || 0);
          }, 0);
          if (hn) d.nights = hn;
        }
        return d;
      });
      // «Новый тур» открывается витриной. Если агент уже в конструкторе
      // (Карадениз или программа Умры) — при перезагрузке данных не выкидываем
      // его оттуда, а перерисовываем; если в сетке программ Умры — её.
      if ($("builder-karadeniz") && !$("builder-karadeniz").hidden) {
        renderBuilder();
      } else if ($("builder-umra") && !$("builder-umra").hidden) {
        renderUmraShowcase();
      } else {
        showBuilderShowcase();
      }
    }).catch(function (err) {
      $("builder-showcase").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить заезды.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  /* ------------------------------------------------------------- билдер
   * «Новый тур» — тот же расчёт, что и калькулятор в каталоге, только в
   * оформлении конструктора. Все цифры берутся из выбранного заезда:
   * выдуманных пассажиров, рейсов и сумм здесь быть не должно — агент
   * называет клиенту то, что видит.
   */
  // Продукты витрины «Новый тур». Три карточки в фирменном стиле; клик ведёт
  // в бронирование. Карадениз — свой конструктор; Умра/Япония — их каталог.
  var BUILDER_PRODUCTS = [
    {
      key: "karadeniz", title: "Загадочный Карадениз",
      route: "Батуми · Ризе · Трабзон",
      facts: [{ label: "Длительность", value: "8 дней" }],
      image: "img/hero-rize-batumi.webp", kicker: "Авторский тур · сезон 2026",
      price: function () { return builderMinPrice(function (d) {
        return (d.tour_code || "KARADENIZ") === "KARADENIZ"; }); },
    },
    {
      key: "Умра", title: "Путь к святыням",
      route: "Мекка · Медина · Джидда",
      facts: [
        { label: "Программы", value: "9 вариантов" },
        { label: "Длительность", value: "10 / 13 дней" },
      ],
      image: "img/umrah-showcase.webp", kicker: "Умра · 2026",
      price: function () {
        var fromTours = umraMinFromPrice();
        return fromTours != null ? fromTours : builderMinPrice(function (d) {
          return /^UMRA_/.test(d.tour_code || ""); });
      },
    },
    {
      key: "Япония", title: "Япония",
      route: "Токио · Киото · Нара · Хаконэ",
      facts: [{ label: "Программы", value: "4 маршрута" }],
      tailFact: { label: "Сезон", value: "март — ноябрь" },
      image: "img/japan-programs-bg.webp", kicker: "Авторские программы · 2026",
      price: function () { return null; },
    },
  ];

  // Минимальная взрослая цена по продукту из загруженных заездов.
  function builderMinPrice(pred) {
    var m = null;
    state.departures.forEach(function (d) {
      if (!pred(d)) return;
      (d.prices || []).forEach(function (p) {
        if (p.kind === "placement" && (m == null || p.price < m)) m = p.price;
      });
    });
    return m;
  }

  // Минимальная цена по всем программам Умры из tours.from_price — известна
  // даже если ни у одной программы ещё нет будущего заезда (в отличие от
  // builderMinPrice, который смотрит только на заезды).
  function umraMinFromPrice() {
    var m = null;
    state.tours.forEach(function (t) {
      if (t.destination !== "Умра" || t.from_price == null) return;
      if (m == null || t.from_price < m) m = t.from_price;
    });
    return m;
  }

  function renderBuilderShowcase() {
    var host = $("builder-showcase");
    if (!host) return;
    host.innerHTML =
      '<div class="tt-workspace-lead">' +
        '<span class="tt-eyebrow">Каталог направлений</span>' +
        "<h2>Выберите тур</h2>" +
      "</div>" +
      '<div class="tt-tourgrid">' + BUILDER_PRODUCTS.map(function (p) {
        var price = p.price();
        var facts = p.facts.slice();
        if (price != null) facts.push({ label: "Стоимость", value: "от " + money(price), accent: true });
        else if (p.tailFact) facts.push(p.tailFact);
        return '<article class="tt-tourcard" data-product="' + esc(p.key) + '" tabindex="0" role="button">' +
          '<div class="tt-tourcard-photo"><img src="' + esc(p.image) + '" alt="' +
            esc(p.title) + '" loading="lazy" />' +
            '<span class="tt-tourcard-kicker">' + esc(p.kicker) + "</span></div>" +
          '<div class="tt-tourcard-body">' +
            "<h3>" + esc(p.title) + "</h3>" +
            '<p class="tt-tourcard-route"><svg aria-hidden="true" viewBox="0 0 24 24">' +
              '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>' +
              '<circle cx="12" cy="10" r="2.5"/></svg>' + esc(p.route) + "</p>" +
            '<div class="tt-tourcard-facts tt-tourcard-facts-' + facts.length + '">' +
              facts.map(function (f) {
                return '<div class="tt-tourcard-fact' + (f.accent ? ' is-accent' : '') + '">' +
                  '<span>' + esc(f.label) + '</span><strong>' + esc(f.value) + '</strong></div>';
              }).join("") +
            "</div>" +
            '<span class="tt-tourcard-open">Подробнее <b aria-hidden="true">→</b></span>' +
          "</div>" +
        "</article>";
      }).join("") + "</div>";
  }

  // Переключение между видами экрана «Новый тур».
  function showBuilderView(which) {
    if ($("builder-showcase")) $("builder-showcase").hidden = which !== "showcase";
    if ($("builder-umra")) $("builder-umra").hidden = which !== "umra";
    if ($("builder-catalog")) $("builder-catalog").hidden = which !== "catalog";
    if ($("builder-karadeniz")) $("builder-karadeniz").hidden = which !== "karadeniz";
    if ($("builder-catalog-back")) {
      $("builder-catalog-back").hidden = which !== "catalog";
    }
  }

  function showBuilderShowcase() {
    renderBuilderShowcase();
    showBuilderView("showcase");
  }

  /* Ниже — «виды» конструктора (низкоуровневая отрисовка, без истории) и
   * «заходы» (enterX — те же виды, но с записью шага в историю браузера,
   * чтобы «Назад» вернул на предыдущий вид). Кнопки «← Все туры» и «Назад»
   * браузера ведут через один stepBack, поэтому поведение совпадает. */

  // ВИД: конструктор Карадениза.
  function viewKaradeniz() {
    state.builder = { tour: "KARADENIZ", code: null, counts: {} };
    showBuilderView("karadeniz");
    renderBuilder();
  }
  // ВИД: конструктор конкретной программы Умры.
  function viewProgram(code) {
    state.builder = { tour: code, code: null, counts: {} };
    showBuilderView("karadeniz");
    renderBuilder();
  }
  // ВИД: сетка из 9 программ Умры.
  function viewUmra() {
    showBuilderView("umra");
    renderUmraShowcase();
    // Программы могли ещё не загрузиться (loadTours асинхронный) — как только
    // придут, перерисуем ту же сетку уже с данными.
    if (toursReady) toursReady.then(renderUmraShowcase);
  }
  // ВИД: каталог направления (Япония — пока не разбита на программы).
  function viewCatalogDest(name) {
    showBuilderView("catalog");
    if (builderCatalog) builderCatalog.openDestination(name);
  }

  // ЗАХОДЫ с витрины (шаг назад — витрина).
  function openKaradenizBuilder() { pushStep(showBuilderShowcase); viewKaradeniz(); }
  function openBuilderDestination(name) { pushStep(showBuilderShowcase); viewCatalogDest(name); }
  function openUmraShowcase() { pushStep(showBuilderShowcase); viewUmra(); }
  // ЗАХОД в программу с сетки Умры (шаг назад — сетка Умры).
  function openUmraProgram(code) { pushStep(viewUmra); viewProgram(code); }

  // Клик по Умре → сетка из 9 карточек-программ (та же логика, что и витрина
  // выше), клик по программе — её каталог (карточка → калькулятор → бронь).
  function renderUmraShowcase() {
    var host = $("builder-umra");
    if (!host) return;
    var all = state.tours.filter(function (t) { return t.destination === "Умра"; });
    if (!all.length) {
      host.innerHTML = '<div class="tt-workspace-lead">' +
        '<span class="tt-eyebrow">Умра · 2026</span><h2>Путь к святыням</h2></div>' +
        '<div class="tt-empty-state">Загружаем программы…</div>';
      return;
    }
    var programs = all.filter(function (t) { return String((t.nights || 0) + 1) === umraFilter; });
    host.innerHTML =
      '<div class="tt-workspace-lead">' +
        '<span class="tt-eyebrow">Умра · 2026</span>' +
        "<h2>Путь к святыням</h2>" +
      "</div>" +
      '<div class="tt-umra-filter" role="tablist" aria-label="Длительность программы">' +
        ["13", "10"].map(function (d) {
          var active = d === umraFilter;
          return '<button type="button" class="' + (active ? "is-active" : "") +
            '" data-umra-days="' + d + '" role="tab" aria-selected="' + active + '">' +
            d + " дней</button>";
        }).join("") +
      "</div>" +
      (programs.length
        ? '<div class="tt-tourgrid">' + programs.map(function (t) {
            // Сначала цена заезда (может быть свежее from_price при сезонной
            // разбивке), иначе from_price — минимум прайса программы, даже
            // если у неё пока нет ни одного будущего заезда.
            var price = builderMinPrice(function (d) { return (d.tour_code || "") === t.code; });
            if (price == null) price = t.from_price;
            var detail = umraProgramCard(t);
            return '<article class="tt-tourcard" data-program="' + esc(t.code) + '" tabindex="0" role="button">' +
              '<div class="tt-tourcard-photo"><img src="' + esc(detail.image) + '" alt="' +
                esc(detail.title) + ' — программа Умры" loading="lazy" />' +
                '<span class="tt-tourcard-kicker">Программа ' + esc(detail.code) + "</span></div>" +
              '<div class="tt-tourcard-body">' +
                "<h3>" + esc(detail.title) + "</h3>" +
                '<div class="tt-umra-stays">' +
                  umraCardMiddle(detail) +
                "</div>" +
                '<div class="tt-umra-card-foot">' +
                  '<div><span>' + esc((t.nights || 0) + " ночей") + '</span>' +
                    (price != null ? '<strong>от ' + esc(money(price)) + "</strong>" : "") +
                  "</div>" +
                  '<span class="tt-tourcard-open">Подробнее <b aria-hidden="true">→</b></span>' +
                "</div>" +
              "</div>" +
            "</article>";
          }).join("") + "</div>"
        : '<div class="tt-empty-state">Программ с таким сроком пока нет.</div>');
  }

  // У каждого отеля — собственный hospitality-кадр. Это оригинальные
  // атмосферные изображения пакета, а не фотографическое обещание конкретного
  // номера: фактическое размещение и расстояния явно указаны ниже.
  var UMRA_PROGRAM_CARDS = {
    UMRA_TAJ13:      { title: "Taj Park", code: "TAJ-13", image: "img/umra-hotel-taj-park.webp" },
    UMRA_TAJ13P:     { title: "Taj Park Plus", code: "TAJ-13+", image: "img/umra-hotel-taj-park.webp" },
    UMRA_ANJUM13:    { title: "Anjum Makkah", code: "ANJUM-13", image: "img/umra-hotel-anjum.webp" },
    UMRA_SHOHADA13:  { title: "Al Shohada", code: "SHOHADA-13", image: "img/umra-hotel-shohada.webp" },
    UMRA_JUMEIRAH13: { title: "Jumeirah Jabal Omar", code: "JUMEIRAH-13", image: "img/umra-hotel-jumeirah.webp" },
    UMRA_SAJA10:     { title: "Saja Al-Madinah", code: "SAJA-10", image: "img/umra-hotel-saja.webp" },
    UMRA_SWISS10:    { title: "Swissotel Makkah", code: "SWISSOTEL-10", image: "img/umra-hotel-swissotel.webp" },
    UMRA_ANJUM10:    { title: "Anjum Makkah", code: "ANJUM-10", image: "img/umra-hotel-anjum.webp" },
    UMRA_JUMEIRAH10: { title: "Jumeirah Jabal Omar", code: "JUMEIRAH-10", image: "img/umra-hotel-jumeirah.webp" },
  };

  function umraStay(description, city, shrine) {
    var re = new RegExp(city + "\\s*·\\s*([^·;]+?)\\s*·\\s*(\\d+\\s*м\\s*до\\s*" + shrine + ")", "i");
    var m = String(description || "").match(re);
    return m ? { hotel: m[1].trim(), distance: m[2].trim() } : null;
  }

  function umraProgramCard(t) {
    var fallbackCode = String(t.name || t.code).replace(/^Умра\s*·\s*/, "");
    var base = UMRA_PROGRAM_CARDS[t.code] || {
      title: fallbackCode, code: fallbackCode, image: "img/umrah-showcase.webp",
    };
    return {
      title: base.title,
      code: base.code,
      image: base.image,
      makkah: umraStay(t.description, "Мекка", "Харама"),
      medina: umraStay(t.description, "Медина", "мечети Пророка"),
    };
  }

  function umraStayHtml(city, stay) {
    if (!stay) return "";
    return '<div class="tt-umra-stay"><span>' + esc(city) + '</span><div>' +
      '<strong>' + esc(stay.hotel) + '</strong><small>' + esc(stay.distance) + "</small>" +
      "</div></div>";
  }

  // В старых данных API description может отсутствовать. Вместо пустой
  // середины показываем нейтральный состав программы; точные отели всегда
  // имеют приоритет, когда API их прислал.
  function umraCardMiddle(detail) {
    var stays = umraStayHtml("Мекка", detail.makkah) +
      umraStayHtml("Медина", detail.medina);
    if (stays) return stays;
    return '<div class="tt-umra-fallback">' +
      '<div class="tt-umra-route"><span>Мекка</span><b aria-hidden="true">→</b><span>Медина</span></div>' +
      '<p>Отели <i>·</i> трансферы <i>·</i> сопровождение</p>' +
    '</div>';
  }

  // Конструктор работает по выбранному туру (state.builder.tour): Карадениз или
  // одна из программ Умры. Заезды берём только этого тура — иначе в период
  // попали бы чужие даты.
  function builderDepartures() {
    var code = state.builder.tour || "KARADENIZ";
    return state.departures.filter(function (d) {
      return (d.tour_code || "KARADENIZ") === code;
    });
  }

  // Модель размещения определяем по самому туру, а не по наличию SNG.
  // У части заездов Карадениза одноместный тариф не опубликован (например,
  // 4 и 11 сентября), поэтому проверка только прайса ошибочно превращала их
  // в Умру: менялись бейдж, отели, счётчики туристов и расчёт.
  function usesOccupancy(d) {
    if (d && d.tour_code) return d.tour_code === "KARADENIZ";
    // Совместимость со старым ответом API без tour_code: аэропорты однозначно
    // разделяют Карадениз (BUS/TZX) и Умру (JED/MED).
    if (d && (d.transport === "BUS" || d.transport === "TZX")) return true;
    if (d && (d.transport === "JED" || d.transport === "MED")) return false;
    return (d && d.prices || []).some(function (p) {
      return p.kind === "placement" && p.code === "SNG";
    });
  }
  function builderPlacements(d) {
    return (d.prices || []).filter(function (p) { return p.kind === "placement"; })
      .slice().sort(function (a, b) { return a.price - b.price; });
  }

  // Отели программы Умры разбираем из контента карточки (catalogTour.included):
  // строки-отели несут число ночей, а рейс и услуги — нет. Отели у Умры свои
  // на каждую программу, поэтому в provisional их не держим (там только рейсы).
  function umraHotelsFromContent(content) {
    var inc = (content && content.included) || [];
    return inc.filter(function (line) {
      return /\d+\s*ноч/.test(line) && line.indexOf("·") !== -1 &&
        line.indexOf("Centrum Air") === -1;
    }).map(function (line) {
      var parts = line.split("·").map(function (s) { return s.trim(); });
      var m = (parts[parts.length - 1] || "").match(/(\d+)\s*ноч/);
      return {
        city: parts[0] || "",
        name: parts[1] || "",
        detail: parts.slice(2, parts.length - 1).join(" · "),
        nights: m ? Number(m[1]) : null,
      };
    });
  }

  function builderDeparture() {
    var list = builderDepartures();
    if (!list.length) return null;
    var chosen = list.filter(function (d) {
      return d.code === state.builder.code;
    })[0];
    if (chosen) return chosen;
    // по умолчанию — ближайший заезд (продажа открыта, по местам не отсеиваем)
    return list[0];
  }

  // Размещение и цена ОДНОГО взрослого выводятся из числа взрослых
  // (1 → одноместный, 2 → двухместный, 3+ → трёхместный) — так же, как в
  // карточке тура. Цену берём из прайса заезда по ценовым уровням (одноместный
  // дороже всех за человека, трёхместный дешевле), без захардкоженных кодов.
  // Для брони нужен код размещения — берём предпочтительный (SNG/DBL/TRPL),
  // иначе первый с нужной ценой.
  function adultPlacement(d, n) {
    var places = (d.prices || []).filter(function (p) { return p.kind === "placement"; })
      .slice().sort(function (a, b) { return a.price - b.price; });
    if (!places.length) return { code: null, price: 0, label: "Взрослый" };
    var prefer;
    if (n <= 1) prefer = ["SNG"];
    else if (n === 2) prefer = ["DBL", "TWIN"];
    else prefer = ["TRPL", "DBLX"];
    for (var i = 0; i < prefer.length; i++) {
      var byCode = places.filter(function (p) { return p.code === prefer[i]; })[0];
      if (byCode) return byCode;
    }
    if (n <= 1) return places[places.length - 1];
    if (n === 2) return places[Math.floor((places.length - 1) / 2)];
    return places[0];
  }

  // Детские тарифы заезда (взрослый — отдельной строкой, см. adultPlacement).
  // Строим из прайса самого заезда, чтобы счётчики не разошлись с сервером.
  function builderTariffs(d) {
    var kids = d.prices.filter(function (p) { return p.kind === "child"; })
      .sort(function (a, b) { return a.age_from - b.age_from; })
      .map(function (p) {
        // верхняя граница не включается: тариф 5-10 — это 5–9 лет
        var top = p.age_to - 1;
        return {
          code: p.code, price: p.price, seat: p.occupies_seat, title: p.label,
          note: p.occupies_seat ? p.age_from + "–" + top + " лет"
                                : "младше " + p.age_to + " лет, без места",
        };
      });
    return kids;
  }

  function builderTotals(d) {
    var counts = state.builder.counts, total = 0, people = 0, seats = 0;
    if (!usesOccupancy(d)) {
      // Умра — по типам номера: каждый паломник занимает место.
      builderPlacements(d).forEach(function (p) {
        var n = counts[p.code] || 0;
        total += n * p.price; people += n; seats += n;
      });
      return { total: total, people: people, seats: seats };
    }
    // Карадениз — взрослые одной группой, размещение и цена по их числу.
    var adultN = counts.ADULT || 0;
    if (adultN > 0) {
      total += adultN * adultPlacement(d, adultN).price;
      people += adultN;
      seats += adultN;                 // взрослый всегда занимает место
    }
    builderTariffs(d).forEach(function (t) {
      var n = counts[t.code] || 0;
      total += n * t.price;
      people += n;
      seats += n * (t.seat ? 1 : 0);
    });
    return { total: total, people: people, seats: seats };
  }

  // Один ряд таблицы «Авиабилеты» — раскладка как в привычном агентствам
  // кабинете: перевозчик, багаж, отправление, прибытие, длительность.
  function flightRow(f) {
    // У Умры номера рейса и длительности нет — показываем прочерк, не выдумываем.
    return "<tr>" +
      '<td class="tt-mj-fl-check"><span class="tt-mj-tick" aria-hidden="true">✓</span></td>' +
      '<td class="tt-mj-fl-carrier">' +
        '<img class="tt-mj-airline-logo" src="img/centrum-air.svg" alt="' +
          esc(f.carrier) + '" />' + (f.code ? "<small>" + esc(f.code) + "</small>" : "") + "</td>" +
      '<td class="tt-mj-fl-bag"><span aria-hidden="true">🧳</span> ' + esc(f.baggage || "—") + "</td>" +
      '<td class="tt-mj-fl-time"><strong>' + esc(f.from_city) + "</strong><small>" +
        (f.date ? formatDate(f.date) + " · " : "") + esc(f.dep) + "</small></td>" +
      '<td class="tt-mj-fl-time"><strong>' + esc(f.to_city) + "</strong><small>" +
        (f.date ? formatDate(f.date) + " · " : "") + esc(f.arr) + "</small></td>" +
      '<td class="tt-mj-fl-dur"><span aria-hidden="true">🕐</span> ' + esc(f.duration || "—") + "</td>" +
    "</tr>";
  }

  // Поле «Отель» конструктора: для Карадениза отели из provisional (со звёздами
  // и ссылкой на booking), для Умры — разобранные из контента программы.
  function renderBuilderHotels(d) {
    var field = $("builder-hotelfield");
    if (!field) return;
    if (usesOccupancy(d)) {
      var hotels = TuronProvisional.hotelsFor(d);
      field.innerHTML = hotels.length
        ? hotels.map(function (h) {
            var name = esc(h.name) + ' <span class="tt-mj-stars">' + "★".repeat(h.stars) + "</span>";
            var title = h.url
              ? '<a href="' + esc(h.url) + '" target="_blank" rel="noopener">' + name + "</a>"
              : name;
            return "<div><strong>" + title + "</strong><small>" + esc(h.city) +
              " · " + h.nights + " ноч. · " + esc(h.board) + "</small></div>";
          }).join('<i class="tt-mj-plus" aria-hidden="true">+</i>')
        : "<div><small>Отель уточняется</small></div>";
      return;
    }
    // Умра: контент карточки уже кэширует fillBuilderContent — рисуем из кэша,
    // а если ещё не пришёл, покажем заглушку (fillBuilderContent перерисует).
    var c = builderContentCache[d.tour_code];
    if (!c) { field.innerHTML = "<div><small>Загрузка отелей…</small></div>"; return; }
    var uh = umraHotelsFromContent(c);
    field.innerHTML = uh.length
      ? uh.map(function (h) {
          var url = TuronProvisional.umraHotelUrl(h.name);
          var name = url
            ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(h.name) + "</a>"
            : esc(h.name);
          return "<div><strong>" + name + "</strong><small>" + esc(h.city) +
            (h.nights ? " · " + h.nights + " ноч." : "") +
            (h.detail ? " · " + esc(h.detail) : "") + "</small></div>";
        }).join('<i class="tt-mj-plus" aria-hidden="true">+</i>')
      : "<div><small>Отель уточняется</small></div>";
  }

  // Контент карточки (включено / доп. расходы / информация) грузим один раз
  // на тур и кэшируем — это подтверждённые данные из каталога, не выдуманные.
  var builderContentCache = {};
  function fillBuilderContent(code) {
    function li(items, map) {
      return (items && items.length
        ? items.map(map).join("")
        : "<li class=\"tt-mj-muted\">—</li>");
    }
    function render(c) {
      $("builder-included").innerHTML = li(c.included, function (x) {
        return "<li>" + esc(x) + "</li>";
      });
      $("builder-excluded").innerHTML = li(c.excluded, function (x) {
        return "<li>" + esc(x) + "</li>";
      });
      $("builder-notes").innerHTML = li(c.info, function (x) {
        var text = typeof x === "string" ? x : x.text;
        var url = typeof x === "string" ? null : x.url;
        return "<li>" + (url
          ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' +
            esc(text) + "</a>"
          : esc(text)) + "</li>";
      });
      // Отели Умры живут в этом же контенте — как только он пришёл, дорисуем
      // поле «Отель» текущего заезда (если конструктор всё ещё на этом туре).
      var cur = builderDeparture();
      if (cur && cur.tour_code === code) renderBuilderHotels(cur);
    }
    if (builderContentCache[code]) { render(builderContentCache[code]); return; }
    TuronApi.catalogTour(code)
      .then(function (c) { builderContentCache[code] = c || {}; render(c || {}); })
      .catch(function () { render({}); });
  }

  function renderBuilder() {
    var d = builderDeparture();
    if (!d) {
      // Заездов нет вообще (все закрыты или сезон кончился) — раньше экран
      // навсегда замирал на «Загрузка…», агент не понимал, что случилось.
      $("builder-title").textContent = "Нет доступных заездов";
      $("builder-route").innerHTML = "";
      $("builder-flights").innerHTML =
        '<p class="tt-mj-empty">Оператор пока не открыл заезды для продажи. ' +
        "Уточните расписание у менеджера.</p>";
      $("builder-departure").innerHTML = "";
      $("builder-hotelfield").innerHTML = "<div><small>—</small></div>";
      $("builder-travellers").innerHTML = "";
      $("builder-paxhead").innerHTML = "";
      $("builder-book").disabled = true;
      return;
    }
    state.builder.code = d.code;

    var t = builderTotals(d);
    var nights = d.nights || 0;

    var occ = usesOccupancy(d);

    // ----------------------------------------------- заголовок + маршрут
    // У Умры имя тура «Умра · TAJ-13» — префикс убираем, он и так в бейдже года.
    var titleName = occ ? (d.tour_name || "Заезд")
      : String(d.tour_name || "Программа").replace(/^Умра\s*·\s*/, "");
    $("builder-title").innerHTML = esc(titleName) +
      ' <span class="tt-mj-year">' + (occ ? "Турция · 2026" : "Умра · 2026") + "</span>";
    if (occ) {
      $("builder-route").innerHTML =
        "<span>Батуми</span><i>→</i><span>Ризе</span><i>→</i><span>Трабзон</span>";
    } else {
      var rl = TuronProvisional.umraRouteLabel(d.transport) || "";
      $("builder-route").innerHTML = rl.split("→").map(function (c) {
        return "<span>" + esc(c.trim()) + "</span>";
      }).join('<i>→</i>');
    }

    // ---------------------------------------------- селектор «Период»
    // Только заезды текущего тура (см. builderDepartures) — чужие даты сюда
    // не подмешиваем.
    $("builder-departure").innerHTML = builderDepartures().map(function (x) {
      return '<option value="' + esc(x.code) + '"' +
        (x.code === d.code ? " selected" : "") + ">" +
        formatRange(x.date_start, x.nights) +
        (x.nights ? " · " + x.nights + " ночей" : "") +
      "</option>";
    }).join("");

    // ------------------------------------------- поле «Отель» (пакет)
    renderBuilderHotels(d);

    // -------------------------------------------------- авиабилеты
    var fl = TuronProvisional.flightsFor(d);
    $("builder-flights").innerHTML = fl
      ? '<table class="tt-mj-fltable"><thead><tr>' +
          "<th>Выбрать</th><th>Перевозчик</th><th>Багаж</th>" +
          "<th>Отправление</th><th>Прибытие</th><th>Длительность</th>" +
        "</tr></thead><tbody>" + flightRow(fl.out) + flightRow(fl.back) +
        "</tbody></table>"
      : '<p class="tt-mj-empty">Рейсы на этот заезд ещё не опубликованы. ' +
        "Уточните рейсы у оператора.</p>";

    // -------------------------------------- шапка карточки туристов
    $("builder-paxhead").innerHTML = "<strong>" + formatRange(d.date_start, nights) +
      "</strong>" + (nights ? "<small>" + nights + " ночей / " + (nights + 1) + " дней</small>" : "");

    // --------------------------------------------- счётчики туристов
    function paxRow(code, title, note, price, n) {
      return '<div class="tt-mj-paxrow">' +
        '<div class="tt-mj-paxlabel"><strong>' + esc(title) + "</strong><small>" +
          esc(note) + "</small></div>" +
        '<div class="tt-mj-qty">' +
          '<button type="button" data-bstep="-1" data-tariff="' + esc(code) + '"' +
            (n === 0 ? " disabled" : "") + ">−</button>" +
          "<b>" + n + "</b>" +
          '<button type="button" data-bstep="1" data-tariff="' + esc(code) + '">+</button>' +
        "</div>" +
        '<div class="tt-mj-paxprice">' +
          (n ? "<strong>" + n + " × " + money(price) + "</strong><small>" +
                money(n * price) + "</small>"
             : "<small>" + money(price) + "</small>") +
        "</div>" +
      "</div>";
    }
    // Карадениз — одна строка «Взрослый»: размещение и цена по числу взрослых
    // (1 → одноместный, 2 → двухместный, 3+ → трёхместный). Умра — по строке на
    // тип номера (QUAD/TRPL/DBL): размещение там выбор, а не следствие числа.
    var bAdultN = state.builder.counts.ADULT || 0;
    var bAdultPl = adultPlacement(d, bAdultN || 1);
    $("builder-travellers").innerHTML = occ
      ? paxRow("ADULT", "Взрослый", bAdultPl.label || "", bAdultPl.price, bAdultN) +
        builderTariffs(d).map(function (r) {
          return paxRow(r.code, r.title, r.note, r.price, state.builder.counts[r.code] || 0);
        }).join("")
      : builderPlacements(d).map(function (p) {
          return paxRow(p.code, "Паломник", p.label, p.price, state.builder.counts[p.code] || 0);
        }).join("");

    // ------------------------------------------------- правила оплаты
    var pol = TuronApi.paymentPolicy(d.date_start);
    $("builder-payplan").innerHTML =
      '<ul class="tt-mj-rules">' +
        "<li><b>30%</b> стоимости — в течение <b>3 дней</b> с брони, оставшиеся " +
          "<b>70%</b> — не позднее чем за <b>" + TuronApi.FINAL_DAYS +
          " дней</b> до выезда.</li>" +
        "<li>Если до выезда меньше <b>" + TuronApi.FINAL_DAYS +
          " дней</b> — <b>100%</b> в течение <b>суток</b>.</li>" +
      "</ul>" +
      (t.total > 0
        ? '<div class="tt-mj-schedule">' + pol.steps.map(function (s) {
            return "<div><span>" + Math.round(s.share * 100) + "% · до " +
              formatDate(s.due.toISOString().slice(0, 10)) + "</span><b>" +
              money(Math.round(t.total * s.share * 100) / 100) + "</b></div>";
          }).join("") + "</div>"
        : "");

    // --------------------------------------------- с билетом / без
    $("builder-ticket").innerHTML =
      '<div class="tt-mj-ticket-opts">' +
        '<label class="is-on"><input type="radio" name="tk" checked disabled /> С билетом</label>' +
        '<label class="is-off"><input type="radio" name="tk" disabled /> Без билетов</label>' +
      "</div>" +
      "<small>" + (occ
        ? "Авиаперелёт Ташкент — Трабзон / Батуми включён в цену."
        : "Авиаперелёт Ташкент — Джидда / Медина включён в цену.") + "</small>";

    // ----------------------------------------- питание / вид / номер
    var placements = d.prices.filter(function (p) { return p.kind === "placement"; })
      .map(function (p) { return p.label; }).join(" · ");
    $("builder-room").innerHTML = occ
      ? '<div class="tt-mj-roomrow"><span>Виды еды</span><b>BB · завтраки</b></div>' +
        '<div class="tt-mj-roomrow"><span>Вид из комнаты</span><b>без гарантии вида</b></div>' +
        '<div class="tt-mj-roomrow"><span>Типы номеров</span><b>' + esc(placements) + "</b></div>"
      : '<div class="tt-mj-roomrow"><span>Питание</span><b>по программе</b></div>' +
        '<div class="tt-mj-roomrow"><span>Типы номеров</span><b>' + esc(placements) + "</b></div>";

    // --------------------------------------------------- «Общий»
    var commission = (d.agency_commission || 0) * t.seats;
    var lines = "";
    if (occ) {
      if (bAdultN > 0) {
        lines += "<div><span>Взрослый · " + esc(bAdultPl.label || "") + " × " + bAdultN +
          "</span><b>" + money(bAdultN * bAdultPl.price) + "</b></div>";
      }
      lines += builderTariffs(d).filter(function (r) {
        return (state.builder.counts[r.code] || 0) > 0;
      }).map(function (r) {
        var n = state.builder.counts[r.code];
        return "<div><span>" + esc(r.title) + " · " + esc(r.note) + " × " + n +
          "</span><b>" + money(n * r.price) + "</b></div>";
      }).join("");
    } else {
      lines += builderPlacements(d).filter(function (p) {
        return (state.builder.counts[p.code] || 0) > 0;
      }).map(function (p) {
        var n = state.builder.counts[p.code];
        return "<div><span>Паломник · " + esc(p.label) + " × " + n +
          "</span><b>" + money(n * p.price) + "</b></div>";
      }).join("");
    }
    $("builder-summary").innerHTML =
      '<div class="tt-mj-total-lines">' + lines + "</div>" +
      '<div class="tt-mj-total-grand"><span>Общий</span><strong>' + money(t.total) +
        "</strong></div>";

    var cbox = $("builder-commission");
    cbox.hidden = commission <= 0;
    if (commission > 0) {
      cbox.innerHTML = "<span>Комиссия агентства</span><b>" + money(commission) + "</b>";
    }

    // ---------------------------------------------------- фото справа
    // У Карадениза свой слайдер из 4 фото. Фотографий туров Умры нет —
    // показываем один узнаваемый кадр (тот же, что на карточках), а слайдер
    // и его автопрокрутку гасим, чтобы не подсовывать черноморские фото.
    var mediaEl = $("builder-media");
    if (mediaEl) {
      mediaEl.classList.toggle("is-umra", !occ);
      if (!occ) {
        stopMediaAuto();
        $("builder-media-caption").innerHTML =
          "<small>Мекка и Медина</small><strong>Путь к святыням</strong>";
      } else {
        $("builder-media-caption").innerHTML = "<small>Ризе</small><strong>Чайные долины</strong>";
        startMediaAuto();
      }
    }

    // --------------------------------------------- кнопки и контент
    var prog = TuronProvisional.programFor(d);
    var progBtn = $("builder-program");
    progBtn.textContent = prog
      ? "⤓ Скачать программу · " + prog.title
      : "Программа тура · " + (nights + 1) + " дней";
    progBtn.dataset.url = prog ? prog.url : "";
    $("builder-book").disabled = t.people === 0;
    fillBuilderContent(d.tour_code || "KARADENIZ");
  }

  // смена заезда и счётчиков — тур конструктора сохраняем (Карадениз/Умра).
  $("panel-builder").addEventListener("change", function (e) {
    if (e.target.id !== "builder-departure") return;
    state.builder = { tour: state.builder.tour || "KARADENIZ", code: e.target.value, counts: {} };
    renderBuilder();
  });

  // Клик по карточке витрины «Новый тур» → её продукт. Делегируем на стабильном
  // контейнере, потому что витрина перерисовывается через innerHTML.
  function openBuilderProduct(key) {
    var p = BUILDER_PRODUCTS.filter(function (x) { return x.key === key; })[0];
    if (!p) return;
    if (p.key === "karadeniz") openKaradenizBuilder();
    else if (p.key === "Умра") openUmraShowcase();
    else openBuilderDestination(p.key);   // Япония пока не разбита — её каталог
  }
  $("builder-showcase").addEventListener("click", function (e) {
    var card = e.target.closest("[data-product]");
    if (card) openBuilderProduct(card.dataset.product);
  });
  $("builder-showcase").addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest("[data-product]");
    if (!card) return;
    e.preventDefault();
    openBuilderProduct(card.dataset.product);
  });

  // Клик по карточке программы Умры — той же сеткой, что и витрина выше.
  // Клик по фильтру длительности перерисовывает сетку без похода на сервер.
  $("builder-umra").addEventListener("click", function (e) {
    var tab = e.target.closest("[data-umra-days]");
    if (tab) { umraFilter = tab.dataset.umraDays; renderUmraShowcase(); return; }
    var card = e.target.closest("[data-program]");
    if (card) openUmraProgram(card.dataset.program);
  });
  $("builder-umra").addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest("[data-program]");
    if (!card) return;
    e.preventDefault();
    openUmraProgram(card.dataset.program);
  });

  // «← Все туры» из конструктора и из сетки программ Умры/каталога — тот же
  // откат на шаг назад, что и кнопка «Назад» браузера (stepBack → history.back
  // → popstate вызовет closer шага). Если шагов почему-то нет — на витрину.
  $("builder-back").addEventListener("click", function () { stepBack(showBuilderShowcase); });
  $("builder-catalog-back").addEventListener("click", function () { stepBack(showBuilderShowcase); });

  // Кнопка «Программа тура»: если есть PDF под направление — качаем его.
  // У Умры PDF пока нет — честно сообщаем, а не уводим на публичный каталог.
  $("builder-program").addEventListener("click", function () {
    var url = $("builder-program").dataset.url;
    if (url) { window.open(url, "_blank", "noopener"); return; }
    flash("PDF-программа этого тура появится позже — уточните у оператора.");
  });

  $("panel-builder").addEventListener("click", function (e) {
    var step = e.target.closest("[data-bstep]");
    if (!step) return;
    var code = step.dataset.tariff;
    var next = (state.builder.counts[code] || 0) + Number(step.dataset.bstep);
    state.builder.counts[code] = Math.max(0, next);
    renderBuilder();
  });

  // --------------------------------------------------------- бронирование
  // Подпись тарифа, выбранного в конструкторе или калькуляторе. Форма должна
  // называть того же туриста, что агент только что посчитал клиенту, иначе
  // строка «Пассажир 2» с размещением по умолчанию читается как чужая.
  function tariffHint(d, code) {
    if (!code) return null;
    if (code === "ADULT") return { title: "Взрослый", note: "" };
    var t = builderTariffs(d).filter(function (r) { return r.code === code; })[0];
    if (t) return { title: t.title, note: t.note };
    var pl = (d.prices || []).filter(function (p) {
      return p.kind === "placement" && p.code === code;
    })[0];
    return pl ? { title: pl.label, note: "" } : null;
  }

  function passengerRowHtml(i, placements, tariff) {
    var hint = tariffHint(state.current, tariff);
    return (
      '<div class="tt-pax" data-pax="' + i + '"' +
        (tariff ? ' data-tariff="' + esc(tariff) + '"' : "") + ">" +
        '<div class="tt-pax-head"><strong>Пассажир ' + (i + 1) + "</strong>" +
          (hint
            ? '<span class="tt-pax-tag">' + esc(hint.title) +
              (hint.note ? " · " + esc(hint.note) : "") + "</span>"
            : "") +
          (i > 0 ? '<button class="tt-icon-btn" data-remove="' + i + '" aria-label="Убрать">&times;</button>' : "") +
        "</div>" +
        '<div class="tt-pax-grid">' +
          // Три поля вместо одного «ФИО»: агент вводит по паспорту и не
          // гадает, в каком порядке писать. В базу по-прежнему уходит одна
          // строка full_name — её собирает collectPassengers, а splitName
          // разбирает обратно при правке брони.
          '<div class="tt-col-2 tt-pax-name">' +
            '<div><label>Фамилия латиницей</label>' +
              '<input type="text" data-f="last_name" placeholder="IVANOV" autocomplete="off" /></div>' +
            '<div><label>Имя латиницей</label>' +
              '<input type="text" data-f="first_name" placeholder="IVAN" autocomplete="off" /></div>' +
            '<div><label>Отчество <span class="tt-opt">если есть в паспорте</span></label>' +
              '<input type="text" data-f="middle_name" placeholder="IVANOVICH" autocomplete="off" /></div>' +
          "</div>" +
          "<div><label>Дата рождения</label><input type=\"date\" data-f=\"birth_date\" /></div>" +
          '<div><label>Размещение</label><select data-f="placement">' +
            placements.map(function (p) {
              return '<option value="' + esc(p.code) + '">' + esc(p.label) + "</option>";
            }).join("") +
          "</select></div>" +
          '<div><label>Номер паспорта</label><input type="text" data-f="passport_number" /></div>' +
          '<div><label>Действителен до</label><input type="date" data-f="passport_expiry" /></div>' +
        "</div>" +
        '<div class="tt-pax-price" data-price></div>' +
      "</div>"
    );
  }

  // Склейка и разбор ФИО общие с операторским окном правки — живут в
  // TuronApi, чтобы порядок «фамилия имя отчество» был один на оба кабинета.
  function collectPassengers() {
    return [].map.call(document.querySelectorAll("#bm-passengers .tt-pax"), function (card) {
      var p = {};
      card.querySelectorAll("[data-f]").forEach(function (input) {
        p[input.dataset.f] = input.value.trim();
      });
      // Сервер и расчёт цены знают только full_name — собираем его здесь,
      // чтобы ниже по коду ничего не менялось.
      p.full_name = TuronApi.joinName(p);
      // Тариф из конструктора хранится на самой карточке: полей ввода у него
      // нет, а пережить перерисовку (добавили/убрали пассажира) он должен.
      if (card.dataset.tariff) p.tariff = card.dataset.tariff;
      return p;
    });
  }

  // Живой расчёт: те же правила, что применит сервер при сохранении.
  function updateSummary() {
    var d = state.current;
    var rows = collectPassengers();
    var total = 0, seats = 0, ready = rows.length > 0;

    rows.forEach(function (p, i) {
      var box = document.querySelector('[data-pax="' + i + '"] [data-price]');
      // Отчество не требуем: в загранпаспортах его часто просто нет.
      if (!p.last_name || !p.first_name || !p.birth_date || !p.passport_number) {
        ready = false;
        box.innerHTML = '<span class="tt-muted-note">заполните фамилию, имя, ' +
          "дату рождения и паспорт</span>";
        return;
      }
      var t = TuronApi.priceFor(p, d);
      if (!t) {
        ready = false;
        box.innerHTML = '<span class="tt-price-warn">нет цены на «' + esc(p.placement) + '» для этого заезда</span>';
        return;
      }
      total += t.price;
      if (t.occupies_seat) seats++;
      var age = TuronApi.ageOn(p.birth_date, d.date_start);

      // Ребёнку достался взрослый тариф — обычно значит, что для этого
      // заезда детские цены в прайсе не заданы (так в ведомости у инфотура).
      // Не блокируем, но и молча по взрослой цене не проводим.
      var childByAge = age < 12;
      var gotAdultTariff = d.prices.some(function (pr) {
        return pr.kind === "placement" && pr.code === t.code;
      });
      var needsCheck = childByAge && gotAdultTariff;

      // Тариф из конструктора против тарифа по дате рождения. Молча брать
      // второй нельзя: агент назвал клиенту сумму по первому, и расхождение
      // должно быть видно ДО отправки брони, а не всплыть в счёте.
      var mismatch = "";
      if (p.tariff === "ADULT" && !gotAdultTariff) {
        mismatch = "в расчёте был взрослый, а по дате рождения выходит «" + t.label + "»";
      } else if (p.tariff && p.tariff !== "ADULT" && p.tariff !== t.code) {
        var chose = tariffHint(d, p.tariff);
        mismatch = "в расчёте был «" + (chose ? chose.title : p.tariff) +
          "», а по дате рождения выходит «" + t.label + "»";
      }

      var passport = TuronApi.passportIssue(p.passport_expiry, d.date_start);

      box.innerHTML = '<span class="tt-pax-tariff">' + age + " лет · " + esc(t.label) + "</span>" +
        "<strong>" + money(t.price) + "</strong>" +
        (t.occupies_seat ? "" : '<span class="tt-muted-note"> · без места</span>') +
        (mismatch ? '<span class="tt-price-warn"> · ' + esc(mismatch) + "</span>" : "") +
        (needsCheck
          ? '<span class="tt-price-warn"> · детский тариф на этот заезд не задан, ' +
            "посчитано по взрослому — менеджер уточнит</span>"
          : "") +
        (passport ? '<span class="tt-price-warn"> · ' + esc(passport) + "</span>" : "");
    });

    // Продажа открыта: остаток мест не показываем и по нему не блокируем.
    var commission = (d.agency_commission || 0) * seats;
    $("bm-summary").innerHTML =
      '<div class="tt-sum-line"><span>Пассажиров</span><strong>' + rows.length + "</strong></div>" +
      '<div class="tt-sum-line"><span>Занимают мест</span><strong>' + seats + "</strong></div>" +
      (commission > 0
        ? '<div class="tt-sum-line tt-earn"><span>Ваша комиссия</span><strong>' +
          money(commission) + "</strong></div>"
        : "") +
      '<div class="tt-sum-total"><span>Итого к оплате</span><strong>' + money(total) + "</strong></div>" +
      (total > 0 ? TuronCatalog.policyHtml(d.date_start, total) : "");

    $("bm-submit").disabled = !ready;
  }

  function prefillPassengers(list) {
    list.forEach(function (p, i) {
      var card = document.querySelector('[data-pax="' + i + '"]');
      if (!card) return;
      // Правка брони приходит одним full_name из базы — раскладываем его по
      // трём полям. Если строка уже разобрана (перерисовка формы), берём как
      // есть: повторный splitName склеенного отчества ничего не испортит,
      // но лишний раз гонять его незачем.
      var name = p.last_name || p.first_name ? p : TuronApi.splitName(p.full_name);
      var row = Object.assign({}, p, name);
      ["last_name", "first_name", "middle_name",
       "birth_date", "passport_number", "passport_expiry", "placement"]
        .forEach(function (f) {
          var input = card.querySelector('[data-f="' + f + '"]');
          if (input && row[f]) input.value = row[f];
        });
    });
    updateSummary();
  }

  function renderPassengers() {
    var placements = state.current.prices.filter(function (p) { return p.kind === "placement"; });
    var saved = collectPassengers();
    $("bm-passengers").innerHTML = state.passengers
      .map(function (row, i) {
        // Тариф берём из DOM, если строка уже нарисована, иначе из состава,
        // которым окно открыли: после «Убрать» разметка стёрта и жив только он.
        var src = saved[i] || row || {};
        return passengerRowHtml(i, placements, src.tariff || (row && row.tariff));
      }).join("");
    saved.forEach(function (p, i) {
      var card = document.querySelector('[data-pax="' + i + '"]');
      if (!card) return;
      Object.keys(p).forEach(function (f) {
        var input = card.querySelector('[data-f="' + f + '"]');
        if (input && p[f]) input.value = p[f];
      });
    });
    updateSummary();
  }

  // Окно одно на два случая: новая бронь и правка состава существующей.
  // Различие только в том, чем заполняем форму и куда отправляем.
  function openBooking(code, booking, prefill) {
    var d = state.departures.filter(function (x) { return x.code === code; })[0];
    if (!d) return;
    state.current = d;
    state.editing = booking || null;
    state.passengers = booking && booking.passengers && booking.passengers.length
      ? booking.passengers.slice()
      : (prefill && prefill.length ? prefill.slice() : [{}]);
    $("bm-title").textContent = booking
      ? "Правка брони " + booking.code
      : "Заезд " + formatDate(d.date_start);
    $("bm-sub").textContent = (TRANSPORT[d.transport] || d.transport) + " · " + d.code;
    $("bm-note").value = (booking && booking.note) || "";
    // В режиме правки первый клик СЧИТАЕТ, а не сохраняет — отсюда
    // «Рассчитать». На «Применить» кнопку переводит уже сам расчёт.
    $("bm-submit").textContent = booking ? "Рассчитать" : "Забронировать";
    dropCompPreview();
    // Новое окно — согласие ещё не дано; прячем экран условий, если остался.
    bookingAgreed = false;
    if ($("bm-agree")) $("bm-agree").hidden = true;
    $("booking-modal").hidden = false;
    // Шаг в истории: «Назад» браузера (и × / клик по фону) закроет окно брони,
    // а не уведёт со страницы.
    pushStep(closeBooking);
    // Чистим форму перед отрисовкой: renderPassengers переносит в новые
    // строки то, что осталось в старых, и без этого данные прошлой брони
    // всплывали бы в следующей.
    $("bm-passengers").innerHTML = "";
    renderPassengers();
    prefillPassengers(state.passengers);
  }

  function closeBooking() {
    $("booking-modal").hidden = true;
    state.current = null;
  }

  // × и клик по затемнению закрывают окно тем же откатом шага, что и «Назад».
  $("bm-close").addEventListener("click", function () { stepBack(closeBooking); });
  $("booking-modal").addEventListener("click", function (e) {
    if (e.target === $("booking-modal")) stepBack(closeBooking);
  });

  $("bm-add").addEventListener("click", function () {
    state.passengers.push({});
    renderPassengers();
  });

  $("bm-passengers").addEventListener("click", function (e) {
    var rm = e.target.closest("[data-remove]");
    if (!rm) return;
    var rows = collectPassengers();
    rows.splice(Number(rm.dataset.remove), 1);
    state.passengers = rows;
    $("bm-passengers").innerHTML = "";
    renderPassengers();
    rows.forEach(function (p, i) {
      var card = document.querySelector('[data-pax="' + i + '"]');
      Object.keys(p).forEach(function (f) {
        var input = card && card.querySelector('[data-f="' + f + '"]');
        if (input && p[f]) input.value = p[f];
      });
    });
    updateSummary();
  });

  $("bm-passengers").addEventListener("input", updateSummary);
  $("bm-passengers").addEventListener("change", updateSummary);

  // «Я согласен» — подтверждение условий; после него повторный «Забронировать»
  // проводит бронь. «Назад» просто закрывает условия, оставляя форму.
  $("bm-agree-ok").addEventListener("click", function () {
    bookingAgreed = true;
    $("bm-agree").hidden = true;
  });
  $("bm-agree-cancel").addEventListener("click", function () {
    $("bm-agree").hidden = true;
  });

  /*
   * Расчёт замены состава живёт ЗДЕСЬ, а не в поле ввода: любая перерисовка
   * формы («Добавить»/«Убрать») стёрла бы его вместе с разметкой. Та же
   * ловушка, что была в окне правки даты рождения — расчёт устаревает, если
   * поправить состав уже после него, поэтому dropCompPreview() гасит его на
   * каждый ввод, и «Применить» снова превращается в «Рассчитать».
   */
  var compPreview = null;

  function dropCompPreview() {
    if (!compPreview) return;
    compPreview = null;
    $("bm-preview").hidden = true;
    $("bm-preview").innerHTML = "";
    if (state.editing) $("bm-submit").textContent = "Рассчитать";
  }

  function renderCompPreview(res) {
    var d = function (a, b) {
      return a === b ? "" : ' <b class="tt-comp-delta">' +
        (b > a ? "+" : "−") + Math.abs(Math.round((b - a) * 100) / 100) + "</b>";
    };
    // Своё склонение, а не plural() из admin.js: тот живёт в чужом модуле
    // и отсюда не виден — на этом уже спотыкались.
    var seatWord = function (n) {
      var t = Math.abs(n) % 100, o = t % 10;
      var w = (t > 10 && t < 20) || o > 4 || o === 0 ? "мест"
            : (o === 1 ? "место" : "места");
      return n + " " + w;
    };
    $("bm-preview").innerHTML =
      '<h4>Что изменится в брони ' + esc(res.booking_code) + "</h4>" +
      '<div class="tt-comp-rows">' +
        '<div><span>Туристов</span><b>' + res.from.passengers_count + " → " +
          res.to.passengers_count + "</b></div>" +
        '<div><span>Занято мест</span><b>' + seatWord(res.from.seats) + " → " +
          seatWord(res.to.seats) + "</b></div>" +
        '<div><span>Сумма брони</span><b>' + money(res.from.total_price) + " → " +
          money(res.to.total_price) + d(res.from.total_price, res.to.total_price) + "</b></div>" +
        '<div><span>Комиссия агентства</span><b>' + money(res.from.agency_commission) +
          " → " + money(res.to.agency_commission) + "</b></div>" +
      "</div>" +
      // Заморозить цену можно только при том же числе туристов: цены
      // переносятся по позициям, и при разном количестве переносить их
      // не с чего (сервер такой запрос отклонит).
      (res.from.passengers_count === res.to.passengers_count &&
       res.from.total_price !== res.to.total_price
        ? '<label class="tt-comp-keep"><input type="checkbox" id="bm-keep-price" />' +
          " Не менять сумму — ошибку внесло агентство, деньги не двигаем</label>"
        : "") +
      '<p class="tt-muted-note">Нажмите «Применить», чтобы записать. ' +
        "Правка попадёт в журнал брони.</p>";
    $("bm-preview").hidden = false;
    $("bm-submit").textContent = "Применить";
  }

  $("bm-passengers").addEventListener("input", dropCompPreview);
  $("bm-passengers").addEventListener("change", dropCompPreview);

  $("bm-submit").addEventListener("click", function () {
    var btn = $("bm-submit");
    var editing = state.editing;
    // Новая бронь: первый клик показывает условия, а не отправляет. Только
    // после «Я согласен» (bookingAgreed) клик проводит бронь. Правка состава
    // условий не требует — там уже согласились при бронировании.
    if (!editing && !bookingAgreed) {
      $("bm-agree").hidden = false;
      return;
    }
    btn.disabled = true;

    var action;
    if (editing) {
      /*
       * Замену состава проводит ТОЛЬКО оператор (маршрут в ветке /api/admin/),
       * и в два шага: первый клик считает, второй применяет. Так оператор
       * видит новую сумму брони до того, как её подпишет.
       *
       * Флажок читаем из ЖИВОГО расчёта, а не из формы: если оператор
       * тронул состав после расчёта, dropCompPreview уже погасил и то и
       * другое, и мы снова окажемся на шаге «Рассчитать».
       */
      var keep = compPreview && $("bm-keep-price") && $("bm-keep-price").checked;
      action = TuronApi.adminUpdatePassengers(editing.id, collectPassengers(), {
        confirm: !!compPreview,
        keepPrice: !!keep,
      });
    } else {
      action = TuronApi.createBooking({
        departure_code: state.current.code,
        passengers: collectPassengers(),
        note: $("bm-note").value.trim() || null,
      });
    }

    action.then(function (res) {
      // Шаг первый: сервер только посчитал — показываем и ждём подтверждения.
      if (res && res.preview) {
        compPreview = res;
        renderCompPreview(res);
        btn.disabled = false;
        return;
      }
      closeBooking();
      return Promise.all([loadDepartures(), loadBookings()]).then(function () {
        // Правку состава делает оператор — обновляем и его экраны
        // (ведомость, список броней, сводку), иначе он увидел бы прежние
        // цифры до перезагрузки страницы.
        if (editing && window.TuronAdmin && TuronAdmin.isOperator(session)) {
          TuronAdmin.reload();
        }
        goTab("bookings");
        flash(editing
          ? "Бронь " + res.booking_code + " обновлена: " + res.passengers_count +
            " чел., " + money(res.total_price)
          : "Бронь " + res.booking_code + " создана на " + money(res.total_price) +
            ", занято мест: " + res.seats_taken);
      });
    }).catch(function (err) {
      $("bm-summary").innerHTML += '<div class="tt-error-box">' + esc(err.message) + "</div>";
      btn.disabled = false;
    });
  });

  /*
   * Точка входа оператора в замену состава.
   *
   * Окно брони живёт ЗДЕСЬ, а операторские экраны — в admin.js, поэтому
   * admin.js получает открывалку через колбэк, а не тянет форму к себе:
   * форма брони одна на всех, и разъезжаться двум её копиям нельзя (тарифы,
   * подсказки, размещения и расчёт суммы считаются в одном месте).
   * Направление вызова именно такое, потому что admin.js грузится РАНЬШЕ
   * app.js и о нём ничего не знает — обратная связь возможна только так.
   */
  if (window.TuronAdmin && TuronAdmin.setCompositionOpener) {
    TuronAdmin.setCompositionOpener(function (booking) {
      function has() {
        return state.departures.some(function (x) {
          return x.code === booking.departure_code;
        });
      }
      function open() {
        if (!has()) {
          // Заезд не в продаже: либо уже начался, либо закрыт. Сервер такую
          // правку и так отклонит — говорим словами, а не молчаливым
          // «кнопка не работает».
          alert("Заезд " + booking.departure_code +
                " уже начался или закрыт — состав по нему не меняется.");
          return;
        }
        openBooking(booking.departure_code, booking);
      }
      /*
       * У ОПЕРАТОРА state.departures пуст: его кабинет рисует admin.js со
       * своим списком заездов, а форма брони читает список отсюда. Поэтому
       * перед открытием подгружаем — иначе окно молча не открывалось бы
       * (на этом уже поймались: кнопка нажималась, а ничего не происходило).
       */
      if (has()) return open();
      loadDepartures().then(open);
    });
  }

  // ------------------------------------------------------------ мои брони
  function bookingRowHtml(b) {
    var cancelled = b.status === "cancelled";
    var paidPart = b.paid > 0 && b.balance > 0;
    return (
      '<article class="tt-booking' + (cancelled ? " is-cancelled" : "") + '">' +
        '<div class="tt-booking-main">' +
          '<div><strong>' + esc(b.code) + "</strong>" +
            '<div class="tt-muted-note">' + formatDate(b.date_start) + " · " +
              (TRANSPORT[b.transport] || b.transport) + " · " + b.passengers_count + " чел.</div>" +
          "</div>" +
          (cancelled ? '<span class="tt-badge tt-badge-off">Отменена</span>' :
            (b.cancel_requested_at
              ? '<span class="tt-badge tt-badge-cancel">Отмена запрошена</span>' : "")) +
        "</div>" +
        '<div class="tt-booking-money">' +
          '<div class="tt-sum-line"><span>Стоимость</span><strong>' + money(b.total_price) + "</strong></div>" +
          '<div class="tt-sum-line"><span>Оплачено</span><strong>' + money(b.paid) + "</strong></div>" +
          '<div class="tt-sum-line' + (b.balance > 0 ? " tt-owed" : "") + '"><span>Остаток</span><strong>' +
            money(b.balance) + "</strong></div>" +
          (b.agency_commission > 0
            ? '<div class="tt-sum-line tt-earn"><span>Комиссия</span><strong>' +
              money(b.agency_commission) + "</strong></div>"
            : "") +
          (paidPart ? '<div class="tt-muted-note">частичная оплата</div>' : "") +
        "</div>" +
        '<div class="tt-booking-action">' +
          // Замена состава — тоже заявка, а не действие: турист, которого
          // меняют, может быть уже вписан в билет, и тариф у замены бывает
          // другой. Проводит замену оператор, кнопка только зовёт его.
          (cancelled || b.change_requested_at ? "" :
            '<button class="tt-btn secondary tt-btn-sm" data-change="' + b.id +
              '">Заменить туриста</button>') +
          (!cancelled && b.change_requested_at
            ? '<span class="tt-muted-note">Замена у оператора</span>' : "") +
          (cancelled || b.cancel_requested_at ? "" :
            // «Запросить», а не «Отменить»: саму отмену проводит оператор.
            '<button class="tt-btn secondary tt-btn-sm" data-cancel="' + b.id +
              '">Запросить отмену</button>') +
          (!cancelled && b.cancel_requested_at
            ? '<span class="tt-muted-note">Ожидает решения оператора</span>' : "") +
        "</div>" +
      "</article>"
    );
  }

  function loadBookings() {
    return TuronApi.bookings().then(function (list) {
      state.bookings = list;
      var active = list.filter(function (b) { return b.status !== "cancelled"; });
      var earned = active.reduce(function (s, b) { return s + (b.agency_commission || 0); }, 0);
      var owed = active.reduce(function (s, b) { return s + (b.balance || 0); }, 0);
      $("earnings-summary").innerHTML = active.length
        ? '<div class="tt-earnings">' +
            '<div><span>Активных броней</span><strong>' + active.length + "</strong></div>" +
            '<div><span>Заработано комиссии</span><strong class="tt-earn-value">' + money(earned) + "</strong></div>" +
            '<div><span>К доплате оператору</span><strong' + (owed > 0 ? ' class="tt-owed-value"' : "") + ">" +
              money(owed) + "</strong></div>" +
          "</div>"
        : "";
      $("bookings-list").innerHTML = list.length
        ? list.map(bookingRowHtml).join("")
        : '<div class="tt-empty-state">Броней пока нет. Выберите заезд на вкладке «Туры».</div>';
      renderTravellers();
      renderPayments();
      renderDocuments();
      renderNotices();   // колокольчик считается по тем же броням
    }).catch(function (err) {
      $("bookings-list").innerHTML =
        '<div class="tt-empty-state">Не удалось загрузить брони.<div class="tt-muted-note">' +
        esc(err.message) + "</div></div>";
    });
  }

  /*
   * Заявка на ЗАМЕНУ состава. Как и отмена, ничего не меняет — зовёт
   * оператора. Причина спрашивается свободным текстом, потому что вариантов
   * много (турист не смог, добавляем ребёнка, меняем номер), и заранее их
   * не перечислить; главное, чтобы просьба осталась в журнале брони.
   */
  $("bookings-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-change]");
    if (!btn) return;
    var id = Number(btn.dataset.change);
    var b = state.bookings.filter(function (x) { return x.id === id; })[0];
    var what = prompt(
      "Что изменить в брони " + (b ? b.code : "") + "?\n\n" +
      "Например: «вместо Иванова И.И. едет Петров П.П.» или\n" +
      "«добавить ребёнка 5 лет к номеру Ивановых».\n\n" +
      "Оператор внесёт правку и пересчитает сумму.", "");
    if (what === null) return;                 // передумал
    btn.disabled = true;
    TuronApi.requestChange(id, what.trim()).then(function (res) {
      flash("Заявка на замену по брони " + res.booking_code +
        " отправлена — оператор внесёт правку.");
      loadBookings();
    }).catch(function (err) {
      btn.disabled = false;
      alert("Не удалось отправить заявку: " + err.message);
    });
  });

  $("bookings-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    var id = Number(btn.dataset.cancel);
    var b = state.bookings.filter(function (x) { return x.id === id; })[0];
    /*
     * Агентство отмену НЕ проводит — только просит оператора. Отмена это
     * деньги: за FINAL_DAYS до выезда и ближе удерживается 100% стоимости,
     * и решение принимает туроператор. Размер удержания показываем ЗДЕСЬ,
     * до отправки заявки, чтобы агент звонил клиенту уже понимая цену
     * вопроса, а не узнавал о ней от оператора постфактум.
     *
     * Замена туриста — не отмена: она идёт через правку состава.
     */
    var days = TuronApi.FINAL_DAYS;
    var contact = "";
    if (window.TuronProvisional && window.TuronProvisional.OPERATOR) {
      contact = (TuronProvisional.OPERATOR.managers || [])
        .map(function (m) { return m.name + " " + m.phone; }).join("\n");
    }
    var msg;
    // Правило одно на оба кабинета — TuronApi.cancellationPenalty. Раньше
    // здесь стояло своё сравнение `<= days`, у оплаты `< days`, и на 14-м
    // дне они противоречили друг другу.
    var pen = b ? TuronApi.cancellationPenalty(b.date_start, b.total_price) : null;
    if (pen && pen.penalty) {
      msg = "⚠️ До выезда меньше " + days + " дней.\n\n" +
        "При отмене удерживается 100% стоимости — " + money(pen.amount) +
        ", возврата нет.\n\nОтправить оператору заявку на отмену брони " +
        b.code + "?";
    } else if (b) {
      msg = "До выезда " + days + " дней или больше — отмена без удержания.\n\n" +
        "Отправить оператору заявку на отмену брони " + b.code + "?";
    } else {
      msg = "Отправить оператору заявку на отмену брони?";
    }
    if (contact) msg += "\n\nСрочно — свяжитесь напрямую:\n" + contact;
    if (!confirm(msg)) return;
    btn.disabled = true;
    TuronApi.requestCancel(id).then(function (res) {
      flash("Заявка по брони " + res.booking_code +
        " отправлена — оператор свяжется с вами.");
      loadBookings();
    }).catch(function (err) {
      alert(err.message);
      btn.disabled = false;
    });
  });

  // ---------------------------------------------------------------- прочее
  function tourRowHtml(t) {
    return (
      '<article class="tt-tour' + (t.is_bookable ? "" : " is-pending") + '">' +
        "<div>" +
          "<strong>" + esc(t.name) + "</strong>" +
          '<div class="tt-muted-note">' + esc(t.destination) +
            (t.note ? " · " + esc(t.note) : "") + "</div>" +
        "</div>" +
        '<div class="tt-tour-commission">' +
          (t.agency_commission > 0
            ? '<span class="tt-earn-value">' + money(t.agency_commission) + "</span>" +
              '<span class="tt-muted-note">с туриста</span>'
            : '<span class="tt-muted-note">без комиссии</span>') +
        "</div>" +
        "<div>" +
          (t.is_bookable
            ? '<span class="tt-badge">Открыт</span>'
            : '<span class="tt-badge tt-badge-off">Скоро</span>') +
        "</div>" +
      "</article>"
    );
  }

  function loadTours() {
    return TuronApi.tours().then(function (list) {
      state.tours = list;
      $("tours-list").innerHTML = list.map(tourRowHtml).join("") +
        '<p class="tt-muted-note" style="margin-top:16px">' +
        "Комиссия начисляется за каждого проданного туриста. Младенцы до 2 лет " +
        "не занимают место и продажей не считаются.</p>";
    }).catch(function () {
      $("tours-list").innerHTML = '<div class="tt-empty-state">Не удалось загрузить туры.</div>';
    });
  }

  /* ------------------------------------------------- туристы агентства
   * Отдельного API не нужно: /api/bookings уже отдаёт состав каждой
   * брони. Собираем плоский список по всем броням агентства.
   */
  function allTravellers() {
    var rows = [];
    state.bookings.forEach(function (b) {
      (b.passengers || []).forEach(function (p) {
        rows.push({
          name: p.full_name, birth: p.birth_date,
          passport: p.passport_number, expiry: p.passport_expiry,
          tariff: p.tariff || p.price_code, price: p.price,
          booking: b.code, status: b.status,
          date_start: b.date_start, transport: b.transport,
        });
      });
    });
    return rows;
  }

  function renderTravellers() {
    var q = ($("tv-query").value || "").trim().toLowerCase();
    var rows = allTravellers().filter(function (r) {
      if (!q) return true;
      return (r.name || "").toLowerCase().indexOf(q) !== -1 ||
             (r.passport || "").toLowerCase().indexOf(q) !== -1 ||
             (r.booking || "").toLowerCase().indexOf(q) !== -1;
    });

    $("travellers-list").innerHTML = rows.length
      ? '<div class="tt-muted-note" style="margin-bottom:12px">Всего туристов: ' +
        rows.length + "</div>" +
        rows.map(function (r) {
          var issue = TuronApi.passportIssue(r.expiry, r.date_start);
          return '<article class="tt-row-card' +
              (r.status === "cancelled" ? " is-cancelled" : "") + '">' +
            "<div><strong>" + esc(r.name) + "</strong>" +
              '<div class="tt-muted-note">' + esc(r.birth || "—") +
              " · паспорт " + esc(r.passport || "—") + "</div></div>" +
            "<div><span>Заезд</span><strong>" + formatDate(r.date_start) + "</strong>" +
              '<div class="tt-muted-note">' + esc(TRANSPORT[r.transport] || r.transport) +
              "</div></div>" +
            "<div><span>Бронь</span><strong>" + esc(r.booking) + "</strong>" +
              (r.status === "cancelled"
                ? '<div class="tt-muted-note">отменена</div>' : "") + "</div>" +
            "<div><span>Тариф</span><strong>" + esc(r.tariff || "—") + "</strong>" +
              '<div class="tt-muted-note">' + money(r.price || 0) + "</div></div>" +
            (issue ? '<div class="tt-row-warn">' + esc(issue) + "</div>" : "") +
          "</article>";
        }).join("")
      : '<div class="tt-empty-state">' +
        (q ? "Никто не найден по запросу." : "Туристов пока нет — они появятся после первой брони.") +
        "</div>";
  }

  /* ----------------------------------------------------------- платежи
   * Сроки считает TuronApi.paymentPolicy от даты брони и даты выезда —
   * та же логика, что в карточке тура и в окне брони.
   */
  /* ------------------------------------------------------- уведомления
   * Колокольчик раньше был просто иконкой. Теперь собирает то, что
   * агенту важно не пропустить, из уже загруженных броней. Для оператора
   * дополнительно читается общая лента действий агентств: новые брони,
   * изменения состава и запросы отмены.
   */
  // Уведомления оператора считаются по всем броням и /api/admin/activity,
  // а не по личным — у оператора своих броней нет. Пока не загружены — null,
  // тогда работает агентский режим ниже.
  var operatorNotices = null;
  var operatorNoticeTimer = null;

  /* ---------------------------------------------------- «прочитано»
   * Уведомления считаются заново при каждой отрисовке (это факты, а не
   * события с id: «просрочен платёж», «выезд скоро» и т.п. появляются и
   * пропадают сами по себе). Отметку «прочитано» поэтому храним отдельно —
   * по СТАБИЛЬНОМУ ключу каждого уведомления, в localStorage, за свой
   * ключ на каждый аккаунт (иначе на одном компьютере агентства делили бы
   * чужие отметки). Ключ не включает сумму долга и т.п.: просрочка на той
   * же брони — это то же самое уведомление, растущий долг заново дёргать
   * колокольчик не должен, а вот новая просрочка на ДРУГОЙ брони — уже
   * новый ключ, значит непрочитанная.
   */
  function noticeStorageKey() {
    var uid = session ? (session.id != null ? session.id : session.login) : "anon";
    return "turon.notices.seen." + uid;
  }
  function loadSeenNotices() {
    try {
      var arr = JSON.parse(localStorage.getItem(noticeStorageKey()) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function markNoticesSeen(list) {
    var seen = loadSeenNotices();
    var known = {};
    seen.forEach(function (k) { known[k] = true; });
    list.forEach(function (n) {
      if (n.key && !known[n.key]) { seen.push(n.key); known[n.key] = true; }
    });
    try {
      // Старые ключи больше никогда не понадобятся, но localStorage не
      // резиновый — подрезаем хвост на всякий случай.
      localStorage.setItem(noticeStorageKey(), JSON.stringify(seen.slice(-500)));
    } catch (e) {}
  }

  function startOperatorNoticePolling() {
    if (operatorNoticeTimer) window.clearInterval(operatorNoticeTimer);
    loadOperatorNotices();
    // Заявка на отмену не должна ждать обновления страницы. Раз в 30 секунд
    // перечитываем входящие действия агентств и актуальные риски по броням.
    operatorNoticeTimer = window.setInterval(loadOperatorNotices, 30000);
  }

  function operatorActivityText(ev) {
    var agency = ev.agency_name || ev.actor_name || "Агентство";
    var code = ev.booking_code || "—";
    if (ev.action === "created") {
      return agency + " создало бронь " + code + (ev.details ? " · " + ev.details : "");
    }
    if (ev.action === "edited") {
      return agency + " изменило состав брони " + code +
        (ev.details ? " · " + ev.details : "");
    }
    if (ev.action === "cancel_requested") {
      return agency + " запросило отмену брони " + code +
        (ev.details && ev.details !== "агентство просит отменить бронь"
          ? " · " + ev.details : "");
    }
    if (ev.action === "change_requested") {
      return agency + " просит заменить туриста в брони " + code +
        (ev.details && ev.details !== "агентство просит изменить состав"
          ? " · " + ev.details : "");
    }
    return agency + " · " + code + " · " + (ev.details || ev.action);
  }

  function loadOperatorNotices() {
    return Promise.all([
      TuronApi.adminBookings({ status: "confirmed", limit: 200 }),
      TuronApi.adminActivity(50).catch(function () { return []; }),
    ]).then(function (res) {
        var today = new Date().toISOString().slice(0, 10);
        var soon = new Date();
        soon.setDate(soon.getDate() + 7);
        var soonIso = soon.toISOString().slice(0, 10);
        var activity = res[1] || [];
        if (window.TuronAdmin) TuronAdmin.setActivity(activity);
        var out = activity.slice(0, 20).map(function (ev) {
          var pendingCancel = ev.action === "cancel_requested" &&
            ev.booking_status === "confirmed";
          // Заявка на замену закрывается ПРАВКОЙ, а не сменой статуса —
          // бронь так и остаётся confirmed. Открытой её считает сервер
          // (change_requested новее последнего edited), здесь мы лишь
          // поднимаем такую строку наверх ленты.
          var pendingChange = ev.action === "change_requested" &&
            ev.booking_status === "confirmed" && ev.is_open !== false;
          return {
            kind: pendingCancel ? "cancel" : (pendingChange ? "change" : "activity"),
            // Ключ на id самого события, а не на его текущий вид: когда
            // оператор проведёт отмену, эта же запись перестанет быть
            // «cancel» и станет обычной «activity», но повторно дёргать
            // непрочитанным уже решённое незачем — id не меняется.
            key: "ev:" + ev.id,
            bookingCode: ev.booking_code,
            text: operatorActivityText(ev),
          };
        });
        (res[0].items || []).forEach(function (b) {
          if (b.status === "cancelled") return;
          var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
          var lateSum = 0;
          pol.steps.forEach(function (s) {
            var due = s.due.toISOString().slice(0, 10);
            var need = Math.round(b.total_price * s.share * 100) / 100;
            if (b.paid < need - 0.01 && due < today) lateSum = Math.max(lateSum, need - b.paid);
          });
          if (lateSum > 0) {
            out.push({ kind: "late", key: "late:" + b.code, bookingCode: b.code,
              text: "Просрочен платёж: " +
              (b.agency_name || "агентство") + " · " + b.code + " — " + money(lateSum) });
          }
          if (b.date_start >= today && b.date_start <= soonIso) {
            out.push({ kind: "soon", key: "soon:" + b.code, bookingCode: b.code,
              text: "Выезд " + formatDate(b.date_start) + " · " +
              (b.agency_name || "") + " · " + b.code +
              (b.balance > 0 ? " · остаток " + money(b.balance) : "") });
          }
        });
        // Необработанные отмены всегда наверху, затем остальные свежие
        // действия агентств и уже после них расчётные предупреждения.
        var order = { cancel: 0, change: 1, activity: 2, late: 3, soon: 4 };
        out.sort(function (a, b) { return order[a.kind] - order[b.kind]; });
        operatorNotices = out;
        renderNotices();
      })
      .catch(function () { operatorNotices = []; renderNotices(); });
  }

  function collectNotices() {
    if (operatorNotices) return operatorNotices;
    var out = [];
    var today = new Date().toISOString().slice(0, 10);
    var soon = new Date();
    soon.setDate(soon.getDate() + 7);
    var soonIso = soon.toISOString().slice(0, 10);

    state.bookings.filter(function (b) { return b.status !== "cancelled"; })
      .forEach(function (b) {
        // 1. просроченные этапы оплаты
        var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
        var lateSum = 0;
        pol.steps.forEach(function (s) {
          var due = s.due.toISOString().slice(0, 10);
          var need = Math.round(b.total_price * s.share * 100) / 100;
          if (b.paid < need - 0.01 && due < today) lateSum = Math.max(lateSum, need - b.paid);
        });
        if (lateSum > 0) {
          out.push({ kind: "late", key: "late:" + b.code, code: b.code,
            text: "Просрочен платёж по брони " + b.code + " — " + money(lateSum) });
        }

        // 2. оплата закрыта — открылись ваучер и билет. Оператор проводит
        // оплату у себя, и без этой строки агентство узнавало бы об этом,
        // только случайно заглянув в «Документы».
        if (docsUnlocked(b)) {
          out.push({ kind: "docs", key: "docs:" + b.code, code: b.code,
            text: "Бронь " + b.code + " оплачена полностью — ваучер и авиабилет готовы" });
        }

        // 3. выезд на этой неделе
        if (b.date_start >= today && b.date_start <= soonIso) {
          out.push({ kind: "soon", key: "soon:" + b.code, code: b.code,
            text: "Выезд " + formatDate(b.date_start) + " · бронь " + b.code +
                  (b.balance > 0 ? " · остаток " + money(b.balance) : "") });
        }

        // 4. паспорта: истекающие и незаполненные. Ключ по индексу пассажира
        // в брони — своего id у пассажира в списке агентства нет, а порядок
        // стабилен (сервер отдаёт по id), пока состав брони не меняли.
        (b.passengers || []).forEach(function (p, idx) {
          var key = "pass:" + b.code + ":" + idx;
          if (!p.passport_number || !p.passport_expiry) {
            out.push({ kind: "pass", key: key,  code: b.code,
              text: "Не заполнен паспорт: " + (p.full_name || "пассажир") +
                    " · бронь " + b.code });
            return;
          }
          var issue = TuronApi.passportIssue(p.passport_expiry, b.date_start);
          if (issue) {
            out.push({ kind: "pass", key: key, code: b.code,
              text: (p.full_name || "Пассажир") + " — " + issue + " · бронь " + b.code });
          }
        });
      });

    // Сначала то, что требует денег или действия, потом хорошая новость о
    // готовых документах, потом выезды и паспорта.
    var order = { late: 0, docs: 1, soon: 2, pass: 3 };
    return out.sort(function (a, b) { return order[a.kind] - order[b.kind]; });
  }

  function renderNotices() {
    var list = collectNotices();
    var seenKeys = {};
    loadSeenNotices().forEach(function (k) { seenKeys[k] = true; });
    // У уведомления без ключа (не должно случаться, но на всякий случай)
    // «прочитанным» его считать нельзя — иначе оно тихо потерялось бы.
    var unread = list.filter(function (n) { return !n.key || !seenKeys[n.key]; }).length;

    var dot = $("notice-dot");
    var button = $("notice-btn");
    if (dot) {
      dot.hidden = unread === 0;
      dot.textContent = unread > 9 ? "9+" : String(unread);
    }
    if (button) {
      button.classList.toggle("has-notices", unread > 0);
      button.setAttribute("aria-label", unread
        ? "Уведомления: непрочитанных " + unread
        : (list.length ? "Уведомления: всё прочитано" : "Уведомлений нет"));
    }

    var icons = { cancel: "×", change: "⇄", activity: "↗", late: "!", docs: "✓", soon: "✈", pass: "▣" };
    $("notice-panel").innerHTML = list.length
      ? '<div class="tt-notice-head">' +
          '<span class="tt-notice-headline">Уведомления' +
            '<b class="tt-notice-count">' + list.length + "</b></span>" +
          // Кнопка видна, только пока есть непрочитанные — отметили,
          // и она сама исчезает вместе со счётчиком нового у колокольчика.
          (unread > 0
            ? '<button type="button" class="tt-notice-mark-read" data-mark-read>' +
              "Отметить прочитанным</button>"
            : "") +
        "</div>" +
        '<ul class="tt-notice-list">' + list.map(function (n) {
          var isRead = n.key && seenKeys[n.key];
          return '<li class="is-' + n.kind + (isRead ? " is-read" : "") + '"' +
            (n.bookingCode ? ' data-booking-code="' + esc(n.bookingCode) + '"' : "") +
            // «Документы готовы» — единственное уведомление, из которого есть
            // куда пойти прямо сейчас: за бланками.
            (n.kind === "docs" ? ' data-goto="documents"' : "") +
            '><b>' + icons[n.kind] + "</b>" +
            esc(n.text) + "</li>";
        }).join("") + "</ul>" +
        (operatorNotices
          ? '<button type="button" class="tt-notice-go" data-goto="overview">Открыть ленту действий</button>'
          : '<button type="button" class="tt-notice-go" data-goto="payments">Перейти к платежам</button>')
      : '<div class="tt-notice-head">Уведомления</div>' +
        '<p class="tt-notice-empty">Новых действий и предупреждений нет.</p>';
  }

  function renderPayments() {
    var active = state.bookings.filter(function (b) { return b.status !== "cancelled"; });
    var total = active.reduce(function (s, b) { return s + b.total_price; }, 0);
    var paid = active.reduce(function (s, b) { return s + b.paid; }, 0);
    var owed = active.reduce(function (s, b) { return s + b.balance; }, 0);
    var today = new Date().toISOString().slice(0, 10);

    var overdue = 0;
    var cards = active.map(function (b) {
      var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
      var steps = pol.steps.map(function (s) {
        var due = s.due.toISOString().slice(0, 10);
        var need = Math.round(b.total_price * s.share * 100) / 100;
        // шаг закрыт, если оплачено уже не меньше, чем требует этот этап
        var covered = b.paid >= need - 0.01;
        var late = !covered && due < today;
        if (late) overdue++;
        return '<li class="' + (covered ? "is-done" : late ? "is-late" : "") + '">' +
          "<strong>" + money(need) + "</strong> — " + esc(s.label) +
          '<span class="tt-muted-note"> до ' + formatDate(due) + "</span>" +
          (covered ? "<em>внесено</em>" : late ? "<em>просрочено</em>" : "") +
        "</li>";
      }).join("");

      return '<article class="tt-pay-card' + (b.balance > 0 ? "" : " is-paid") + '">' +
        "<header><strong>" + esc(b.code) + "</strong>" +
          '<span class="tt-muted-note">' + formatDate(b.date_start) + " · " +
          esc(TRANSPORT[b.transport] || b.transport) + " · " +
          b.passengers_count + " чел.</span></header>" +
        '<div class="tt-pay-money">' +
          "<div><span>Стоимость</span><strong>" + money(b.total_price) + "</strong></div>" +
          "<div><span>Оплачено</span><strong>" + money(b.paid) + "</strong></div>" +
          '<div><span>Остаток</span><strong' + (b.balance > 0 ? ' class="tt-owed-value"' : "") +
            ">" + money(b.balance) + "</strong></div>" +
        "</div>" +
        '<ul class="tt-pay-steps">' + steps + "</ul>" +
      "</article>";
    }).join("");

    $("payments-summary").innerHTML = active.length
      ? '<div class="tt-earnings">' +
          "<div><span>К оплате всего</span><strong>" + money(total) + "</strong></div>" +
          "<div><span>Внесено</span><strong>" + money(paid) + "</strong></div>" +
          '<div><span>Остаток</span><strong' + (owed > 0 ? ' class="tt-owed-value"' : "") +
            ">" + money(owed) + "</strong></div>" +
          "<div><span>Просроченных этапов</span><strong" +
            (overdue > 0 ? ' class="tt-owed-value"' : "") + ">" + overdue + "</strong></div>" +
        "</div>"
      : "";
    $("payments-list").innerHTML = cards ||
      '<div class="tt-empty-state">Оплачивать пока нечего — броней нет.</div>';
  }

  /* --------------------------------------------------------- документы
   * Бланки собираются на клиенте из данных брони и открываются в новом
   * окне на печать. Отдельного хранилища документов нет.
   *
   * Порядок выдачи повторяет реальную сделку: сразу после брони агентство
   * получает СЧЁТ — по нему платит клиент. Ваучер и маршрут-квитанция
   * подтверждают уже оплаченную услугу, поэтому открываются только когда
   * оператор провёл оплату целиком. Выдать ваучер по неоплаченной брони —
   * значит отдать клиенту документ на услугу, за которую оператор денег
   * не получил.
   *
   * Порог — ПОЛНАЯ оплата, а не первый взнос: по 30% предоплаты билет ещё
   * не выписан, и подтверждать перелёт нечем.
   */
  function docsUnlocked(b) {
    return b.status !== "cancelled" && (b.balance || 0) <= 0.01;
  }

  function renderDocuments() {
    var active = state.bookings.filter(function (b) { return b.status !== "cancelled"; });
    $("documents-list").innerHTML = active.length
      ? active.map(function (b) {
          var open = docsUnlocked(b);
          return '<article class="tt-row-card' + (open ? " is-docs-open" : "") + '"' +
            ' data-doc-card="' + esc(b.code) + '">' +
            "<div><strong>Бронь " + esc(b.code) + "</strong>" +
              '<div class="tt-muted-note">' + formatDate(b.date_start) + " · " +
              b.passengers_count + " чел. · " + money(b.total_price) + "</div>" +
              (open
                ? '<div class="tt-doc-state is-ready">Оплачено полностью — ' +
                  "ваучер и авиабилет доступны</div>"
                : '<div class="tt-doc-state">Остаток ' + money(b.balance || 0) +
                  " · ваучер и авиабилет откроются после полной оплаты</div>") +
            "</div>" +
            '<div class="tt-row-actions">' +
              '<button class="tt-btn secondary tt-btn-sm" data-invoice="' +
                esc(b.code) + '">Счёт на оплату</button>' +
              // Кнопки не прячем, а гасим: агент должен видеть, ЧТО он
              // получит после оплаты, иначе раздел выглядит поломанным.
              '<button class="tt-btn secondary tt-btn-sm" data-voucher="' +
                esc(b.code) + '"' + (open ? "" : " disabled") +
                ' title="' + (open ? "Ваучер" : "Доступен после полной оплаты") +
                '">Ваучер</button>' +
              '<button class="tt-btn secondary tt-btn-sm" data-ticket="' +
                esc(b.code) + '"' + (open ? "" : " disabled") +
                ' title="' + (open ? "Авиабилет" : "Доступен после полной оплаты") +
                '">Авиабилет</button>' +
            "</div>" +
          "</article>";
        }).join("") + TuronProvisional.noteHtml("бланки счёта, ваучера и билета")
      : '<div class="tt-empty-state">Документы появятся после первой брони.</div>';
  }

  /* ------------------------------------------------------------ ваучер
   * Бланк повторяет ваучер, который оператор уже выдаёт клиентам
   * (генератор в репозитории etihad-voucher): шапка с номером заказа,
   * карточки пассажиров, перелёт двумя плечами со стрелкой, блок услуг
   * справа, отели, список трансферов и экскурсий.
   *
   * Логотип в шапке — фирменный знак Etihad (зелёно-золотой изгиб, свой,
   * НЕ авиакомпании Etihad Airways: у той золотая арабская вязь и своя
   * угловатая гарнитура). Компания называется так же, как авиакомпания, —
   * это совпадение имени, а не заимствование знака.
   *
   * Стили инлайном: окно открывается через document.write, styles.css
   * туда не подключён, а тащить весь файл ради одного бланка незачем.
   * Цветовые токены — те же, что в образце.
   */
  var V = {
    forest: "#14432c", forestDeep: "#0f2c1e", forestSoft: "#1f5c3d",
    gold: "#b6912f", goldSoft: "#cbab52",
    ivory: "#f7f4ec", paper: "#fffefb",
    line: "#e6dfcd", ink: "#16241c", muted: "#6d7d72",
  };

  function voucherCss() {
    return (
      "@page{size:A4;margin:10mm}" +
      "*{box-sizing:border-box}" +
      "body{margin:0;background:" + V.ivory + ";color:" + V.ink + ";" +
        "font:13px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}" +
      ".sheet{max-width:800px;margin:20px auto;background:#fff;" +
        "border:1px solid " + V.line + ";border-radius:14px;padding:26px 30px 24px;" +
        "box-shadow:0 24px 60px -24px rgba(12,36,24,.28)}" +
      /* Шапка: знак по центру листа, номер заказа справа. Три колонки, а не
         flex со space-between, — иначе знак съезжал бы от длины номера. */
      ".vh{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;margin-bottom:18px}" +
      ".vh-brand{grid-column:2;justify-self:center}" +
      ".vh-brand img{height:62px;display:block}" +
      ".vh-order{grid-column:3;justify-self:end;text-align:right;white-space:nowrap}" +
      ".vh-order span{display:block;font-size:12px;font-weight:700;color:" + V.forestDeep + "}" +
      ".vh-order strong{display:block;font-size:27px;font-weight:800;color:" + V.forestDeep + ";line-height:1.15}" +
      "h2{font-size:15px;font-weight:800;color:" + V.forestDeep + ";margin:16px 0 8px}" +
      "h2:first-of-type{margin-top:0}" +
      /* Рамки зелёные, как в образце: на кремовом листе бежевая рамка почти
         не читалась и карточки сливались в одно пятно. */
      ".card{border:1.4px solid " + V.forest + ";border-radius:9px;background:#fff;padding:8px 12px}" +
      ".lbl{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:" + V.muted + "}" +
      ".val{font-size:14px;font-weight:800;color:" + V.forestDeep + "}" +
      ".pax{display:grid;grid-template-columns:1fr 190px 170px;gap:8px;margin-bottom:7px}" +
      ".pax-name{display:flex;align-items:center;gap:10px}" +
      ".pax-name .val{font-size:15px;text-transform:uppercase;letter-spacing:.02em}" +
      ".pax-ico{width:22px;height:22px;flex:none;fill:" + V.forestDeep + "}" +
      ".pax-type{font-size:9px;font-weight:700;letter-spacing:.07em;color:" + V.gold + "}" +
      ".route{display:grid;grid-template-columns:1fr 250px;gap:9px;align-items:stretch}" +
      ".legs{display:grid;gap:8px;align-content:start}" +
      /* Плечи стыкуются вплотную, самолёт сидит на шве и перекрывает обе
         карточки — в образце именно так, с зазором пара читалась как два
         независимых блока, а не как один перелёт. */
      /* Карточки плеча РАЗДЕЛЬНЫЕ, между ними зазор, самолёт висит над ним и
         перекрывает обе. Сросшиеся борта (как было) в образце не так: там у
         каждого города своя замкнутая рамка. */
      ".leg{display:flex;align-items:center;gap:18px;position:relative}" +
      ".leg .card{flex:1;text-align:center;padding:7px 10px}" +
      ".leg-date{font-size:11px}" +
      ".leg-time{font-size:11px;margin-bottom:1px}" +
      ".leg-city{font-size:15px;font-weight:800;color:" + V.forestDeep + "}" +
      ".leg-code{font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:" + V.muted + ";margin-top:1px}" +
      ".leg-dot{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
        "width:28px;height:28px;border-radius:50%;background:" + V.forestSoft + ";" +
        "display:flex;align-items:center;justify-content:center;z-index:2;" +
        "box-shadow:0 0 0 3px #fff}" +
      ".leg-dot svg{width:15px;height:15px;fill:#fff}" +
      ".facts{display:grid;grid-template-columns:1fr 1fr;gap:16px 10px;align-content:center}" +
      ".facts .val{font-size:15px;color:" + V.forestSoft + "}" +
      ".facts-wide{grid-column:1 / -1}" +
      ".hotels{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}" +
      ".hotel .val{font-size:14px;text-transform:uppercase}" +
      ".hotel-dates{font-size:10.5px;color:" + V.muted + ";margin-top:1px}" +
      ".svc{display:grid;gap:4px}" +
      ".svc div{border:1.4px solid " + V.forest + ";border-radius:7px;padding:5px 12px;font-size:12px}" +
      /* Реквизиты внизу — такими же карточками, а не подвалом мелким шрифтом:
         в образце это часть бланка, её читают наравне с остальным. */
      /* Подпись и значение в ОДНУ строку: в образце реквизиты идут строчкой
         «АГЕНТСТВО: B2 MANAGEMENT…», а не подписью над значением. */
      ".req{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}" +
      ".req .card{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}" +
      ".req .lbl{font-size:11px;color:" + V.forestDeep + "}" +
      ".req .val{font-size:11.5px;text-transform:uppercase;font-weight:700}" +
      ".req-sm .lbl,.req-sm .val{font-size:8.5px}" +
      ".req-wide{grid-column:1 / -1}" +
      ".vrule{margin-top:14px;border-top:1px solid " + V.line + "}" +
      ".actions{max-width:800px;margin:0 auto 28px;display:flex;gap:10px}" +
      ".actions button{font:inherit;font-weight:600;font-size:14px;padding:10px 18px;border-radius:10px;" +
        "border:1px solid " + V.line + ";background:" + V.forest + ";color:#fff;cursor:pointer}" +
      "@media print{body{background:#fff}.sheet{margin:0;border:0;border-radius:0;box-shadow:none;max-width:none}" +
        ".no-print{display:none}}"
    );
  }

  // Билет добавляет к общим стилям только своё: подпись под знаком,
  // таблицу пассажиров и сегменты перелёта. Остальное — те же карточки.
  function ticketCss() {
    return (
      ".vh-sub{margin-top:5px;text-align:center;font-size:9.5px;letter-spacing:.22em;" +
        "text-transform:uppercase;color:" + V.muted + "}" +
      "table.tk{width:100%;border-collapse:collapse;margin:0 0 4px}" +
      "table.tk th{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;" +
        "color:" + V.muted + ";text-align:left;padding:0 10px 6px;border-bottom:1.4px solid " + V.forest + "}" +
      "table.tk td{padding:8px 10px;border-bottom:1px solid " + V.line + ";font-size:13px}" +
      "table.tk td strong{color:" + V.forestDeep + ";font-size:14px;text-transform:uppercase}" +
      "table.tk tr:last-child td{border-bottom:0}" +
      ".seg{border:1.4px solid " + V.forest + ";border-radius:9px;background:#fff;margin-bottom:9px;overflow:hidden}" +
      ".seg-head{display:flex;justify-content:space-between;gap:14px;padding:7px 14px;" +
        "background:" + V.ivory + ";border-bottom:1.4px solid " + V.forest + ";" +
        "font-size:11px;font-weight:700;color:" + V.forestDeep + "}" +
      ".seg-head span:last-child{font-weight:600;color:" + V.muted + "}" +
      ".seg-body{display:grid;grid-template-columns:1fr 120px 1fr;align-items:center;padding:12px 15px;gap:10px}" +
      ".seg-body .val{font-size:21px;line-height:1.1}" +
      ".seg-city{font-size:12.5px;font-weight:700;color:" + V.forestDeep + ";margin-top:3px}" +
      ".seg-date{font-size:11px;color:" + V.muted + ";margin-top:1px}" +
      ".seg-mid{display:flex;flex-direction:column;align-items:center;gap:5px}" +
      ".seg-mid .leg-dot{position:static;transform:none;box-shadow:none}" +
      ".seg-dur{font-size:10.5px;color:" + V.muted + ";white-space:nowrap}"
    );
  }

  /* Счёт на оплату. Единственный документ, доступный СРАЗУ после брони:
   * ваучер и билет — подтверждение уже оказанной услуги, а до денег
   * подтверждать нечего. Бланк намеренно в той же палитре, что ваучер, —
   * агентство пересылает его клиенту, и три документа одной сделки должны
   * выглядеть одной серией. */
  function invoiceCss() {
    return (
      ".inv-meta{display:flex;justify-content:space-between;gap:16px;margin:0 0 16px;" +
        "padding-bottom:12px;border-bottom:1.4px solid " + V.forest + "}" +
      ".inv-meta .lbl{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:" + V.muted + "}" +
      ".inv-meta .val{font-size:13px;font-weight:600;color:" + V.forestDeep + ";margin-top:2px}" +
      "table.inv{width:100%;border-collapse:collapse;margin:0 0 6px}" +
      "table.inv th{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;" +
        "color:" + V.muted + ";text-align:left;padding:0 10px 6px;border-bottom:1.4px solid " + V.forest + "}" +
      "table.inv th.num,table.inv td.num{text-align:right}" +
      "table.inv td{padding:8px 10px;border-bottom:1px solid " + V.line + ";font-size:13px}" +
      "table.inv td strong{color:" + V.forestDeep + ";text-transform:uppercase}" +
      "table.inv tr.total td{border-bottom:0;border-top:1.4px solid " + V.forest + ";" +
        "font-size:15px;font-weight:700;color:" + V.forestDeep + ";padding-top:11px}" +
      ".inv-pay{border:1.4px solid " + V.forest + ";border-radius:9px;overflow:hidden;margin:0 0 14px}" +
      ".inv-pay-head{padding:7px 14px;background:" + V.ivory + ";border-bottom:1.4px solid " + V.forest + ";" +
        "font-size:11px;font-weight:700;color:" + V.forestDeep + "}" +
      ".inv-step{display:flex;justify-content:space-between;gap:14px;padding:9px 14px;" +
        "border-bottom:1px solid " + V.line + ";font-size:12.5px}" +
      ".inv-step:last-child{border-bottom:0}" +
      ".inv-step .due{color:" + V.muted + ";font-size:11.5px}" +
      ".inv-step.is-done .amt{color:" + V.forestSoft + "}" +
      ".inv-step.is-late .amt{color:#a8321f}" +
      ".inv-state{display:flex;gap:10px;margin:0 0 14px}" +
      // Только ПРЯМЫЕ потомки: .lbl и .val внутри — тоже div, и рамка
      // с отступами доставалась им, из-за чего в каждой плашке было три
      // вложенных прямоугольника.
      ".inv-state > div{flex:1;border:1px solid " + V.line + ";border-radius:9px;padding:9px 12px;" +
        "background:" + V.paper + "}" +
      ".inv-state .lbl{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:" + V.muted + "}" +
      ".inv-state .val{font-size:16px;font-weight:700;color:" + V.forestDeep + ";margin-top:2px}" +
      ".inv-note{font-size:11px;line-height:1.5;color:" + V.muted + ";margin:0 0 16px}"
    );
  }

  /* Окно бланка открывается пустым (about:blank), относительный путь в нём
   * не разрешается — собираем абсолютный от адреса кабинета. */
  function brandLogoUrl() {
    return location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "") +
      "img/etihad-logo.png";
  }

  // Иконка «flight» рисуется носом вверх; поворачиваем на 90° по часовой,
  // чтобы самолёт смотрел ВПРАВО — вдоль маршрута (город слева → город
  // справа). Раньше он висел по диагонали, оператор просил горизонтально.
  var PLANE_SVG = '<svg viewBox="0 0 24 24"><g transform="rotate(90 12 12)">' +
    '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/>' +
    "</g></svg>";
  var PERSON_SVG = '<svg class="pax-ico" viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5Z"/></svg>';

  // «07.08.2026» — в бланке даты только в таком виде, без словесных месяцев.
  function vDate(iso) {
    if (!iso) return "—";
    var p = String(iso).slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso;
  }

  // «4 ночи» — в app.js своего склонения нет, а тащить его из каталога
  // ради одной строки бланка незачем.
  function vNights(n) {
    var m10 = n % 10, m100 = n % 100;
    var w = (m10 === 1 && m100 !== 11) ? "ночь"
          : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? "ночи" : "ночей";
    return n + " " + w;
  }

  function paxType(birthDate, dateStart) {
    var age = TuronApi.ageOn(birthDate, dateStart);
    if (age == null || isNaN(age)) return "";
    return age < 2 ? "INFANT" : age < 12 ? "CHILD" : "ADULT";
  }

  function legHtml(leg, date) {
    return (
      '<div class="leg">' +
        '<div class="card">' +
          '<div class="leg-date">' + esc(vDate(date)) + "</div>" +
          '<div class="leg-time">' + esc(leg.dep) + "</div>" +
          '<div class="leg-city">' + esc(leg.from_city.toUpperCase()) + "</div>" +
          '<div class="leg-code">' + esc(leg.from_city) + " (" + esc(leg.from) + ")</div>" +
        "</div>" +
        '<span class="leg-dot">' + PLANE_SVG + "</span>" +
        '<div class="card">' +
          '<div class="leg-date">' + esc(vDate(date)) + "</div>" +
          '<div class="leg-time">' + esc(leg.arr) + "</div>" +
          '<div class="leg-city">' + esc(leg.to_city.toUpperCase()) + "</div>" +
          '<div class="leg-code">' + esc(leg.to_city) + " (" + esc(leg.to) + ")</div>" +
        "</div>" +
      "</div>"
    );
  }

  function openVoucher(code) {
    var b = state.bookings.filter(function (x) { return x.code === code; })[0];
    if (!b) return;
    // Кнопка при неоплаченной брони и так disabled, но проверка нужна и
    // здесь: список мог устареть между отрисовкой и кликом.
    if (!docsUnlocked(b)) {
      flash("Ваучер выдаётся после полной оплаты брони. Остаток " + money(b.balance || 0) + ".");
      return;
    }
    var op = TuronProvisional.OPERATOR;
    // у брони нет длительности — берём её у заезда, иначе в ваучере
    // окажется только дата вылета без даты возврата
    var dep = state.departures.filter(function (x) {
      return x.code === b.departure_code;
    })[0];
    var nights = dep ? dep.nights : null;
    var trip = { transport: b.transport, date_start: b.date_start, nights: nights };
    var fl = TuronProvisional.flightsFor(trip);
    var hotels = TuronProvisional.hotelsFor(trip);
    var services = TuronProvisional.servicesFor(trip);
    var logo = brandLogoUrl();

    var win = window.open("", "_blank");
    if (!win) { flash("Разрешите всплывающие окна, чтобы открыть ваучер."); return; }

    var pax = (b.passengers || []).map(function (p) {
      var type = paxType(p.birth_date, b.date_start);
      return (
        '<div class="pax">' +
          '<div class="card pax-name">' + PERSON_SVG +
            '<span class="val">' + esc(p.full_name) + "</span></div>" +
          '<div class="card"><div class="lbl">Номер документа:</div>' +
            '<div class="val">' + esc(p.passport_number || "—") + "</div></div>" +
          '<div class="card"><div class="lbl">Дата рождения:</div>' +
            '<div class="val">' + esc(vDate(p.birth_date)) + "</div>" +
            (type ? '<div class="pax-type">' + type + "</div>" : "") +
          "</div>" +
        "</div>"
      );
    }).join("");

    // Отели идут подряд: первый от даты заезда, второй — от даты выселения
    // из первого. Так же, как их выдаёт оператор (4 ночи + 3 ночи).
    var cursor = b.date_start;
    var hotelHtml = hotels.map(function (h) {
      var from = cursor;
      var to = TuronApi.departureEnd(from, h.nights);
      cursor = to;
      return (
        '<div class="card hotel"><div class="lbl">Отель ' + esc(h.city) + ":</div>" +
          '<div class="val">' + esc(h.name) + "</div>" +
          '<div class="hotel-dates">' + esc(vDate(from)) + " - " + esc(vDate(to)) +
            " (" + vNights(h.nights) + ")</div>" +
        "</div>"
      );
    }).join("");

    var placements = [];
    (b.passengers || []).forEach(function (p) {
      if (p.placement && placements.indexOf(p.placement) === -1) placements.push(p.placement);
    });

    win.document.write(
      '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
      "<title>Ваучер " + esc(b.code) + "</title>" +
      "<style>" + voucherCss() + "</style></head><body>" +
      '<div class="sheet">' +
        '<div class="vh">' +
          '<div class="vh-brand"><img src="' + esc(logo) + '" alt="' + esc(op.name) + '"></div>' +
          '<div class="vh-order"><span>Номер заказа:</span>' +
            "<strong>" + esc(b.code) + "</strong></div>" +
        "</div>" +

        "<h2>Информация о пассажирах:</h2>" + pax +

        "<h2>Информация о маршруте:</h2>" +
        '<div class="route">' +
          '<div class="legs">' +
            (fl ? legHtml(fl.out, fl.out.date) + legHtml(fl.back, fl.back.date)
                : '<div class="card">Рейс на эту дату не в полётной программе — ' +
                  "уточните у оператора.</div>") +
          "</div>" +
          // Стоимости в ваучере нет намеренно: это документ клиента, сумму
          // сделки агентства ему показывать незачем (просил оператор).
          '<div class="card facts">' +
            '<div class="facts-wide"><div class="lbl">Размещение:</div><div class="val">' +
              esc(placements.join(", ") || "—") + "</div></div>" +
            '<div><div class="lbl">Ручная кладь:</div><div class="val">' +
              esc(fl ? fl.out.cabin_baggage : "—") + "</div></div>" +
            '<div><div class="lbl">Багаж:</div><div class="val">' +
              esc(fl ? fl.out.baggage : "—") + "</div></div>" +
          "</div>" +
        "</div>" +

        // Отели без своего заголовка — в образце они продолжают блок
        // маршрута, отдельная «Проживание» разрывала бы его надвое.
        (hotelHtml ? '<div class="hotels">' + hotelHtml + "</div>" : "") +

        (services.length
          ? "<h2>Трансфер и экскурсии:</h2><div class=\"svc\">" +
            services.map(function (x) { return "<div>" + esc(x) + "</div>"; }).join("") +
            "</div>"
          : "") +

        '<div class="req">' +
          '<div class="card"><div class="lbl">Агентство:</div>' +
            '<div class="val">' + esc(b.agency_name || session.name || "—") + "</div></div>" +
          '<div class="card"><div class="lbl">Телефон:</div>' +
            '<div class="val">' + esc(op.phone) + "</div></div>" +
          '<div class="card"><div class="lbl">Эл. почта:</div>' +
            '<div class="val">' + esc(op.email) + "</div></div>" +
          '<div class="card req-sm"><div class="lbl">Адрес:</div>' +
            '<div class="val">' + esc(op.address) + "</div></div>" +
          (b.note
            ? '<div class="card req-wide"><div class="lbl">Примечание:</div>' +
              '<div class="val">' + esc(b.note) + "</div></div>"
            : "") +
        "</div>" +
        '<div class="vrule"></div>' +
      "</div>" +
      '<div class="actions no-print">' +
        '<button onclick="window.print()">Печать / PDF</button>' +
      "</div></body></html>"
    );
    win.document.close();
  }

  /* ---------------------------------------------------------- авиабилет
   * Маршрут-квитанция на перелёт, вторым документом к ваучеру. Оформление
   * то же, что у ваучера, содержимое — только про перелёт: пассажиры с
   * документами, оба плеча посегментно (рейс, борт, время, длительность),
   * нормы багажа.
   *
   * QR-кода нет намеренно — так просил оператор. Посадочный талон
   * выдаёт авиакомпания на стойке регистрации, а этот бланк нужен
   * туристу как подтверждение перелёта в составе тура; кодом его всё
   * равно нигде не сканируют, и нарисованный «для вида» квадрат только
   * создавал бы впечатление, что документ проходит по контролю.
   */
  function segmentHtml(leg, date, idx) {
    return (
      '<div class="seg">' +
        '<div class="seg-head">' +
          "<span>Рейс " + esc(leg.code) + "</span>" +
          "<span>" + esc(leg.carrier) + " · " + esc(leg.aircraft) + "</span>" +
        "</div>" +
        '<div class="seg-body">' +
          "<div><div class=\"lbl\">Вылет</div>" +
            '<div class="val">' + esc(leg.dep) + "</div>" +
            '<div class="seg-city">' + esc(leg.from_city) + " (" + esc(leg.from) + ")</div>" +
            '<div class="seg-date">' + esc(vDate(date)) + "</div></div>" +
          '<div class="seg-mid"><span class="leg-dot">' + PLANE_SVG + "</span>" +
            '<div class="seg-dur">' + esc(leg.duration) + "</div></div>" +
          "<div><div class=\"lbl\">Прилёт</div>" +
            '<div class="val">' + esc(leg.arr) + "</div>" +
            '<div class="seg-city">' + esc(leg.to_city) + " (" + esc(leg.to) + ")</div>" +
            '<div class="seg-date">' + esc(vDate(date)) + "</div></div>" +
        "</div>" +
      "</div>"
    );
  }

  function openTicket(code) {
    var b = state.bookings.filter(function (x) { return x.code === code; })[0];
    if (!b) return;
    if (!docsUnlocked(b)) {
      flash("Авиабилет выдаётся после полной оплаты брони. Остаток " +
        money(b.balance || 0) + ".");
      return;
    }
    var op = TuronProvisional.OPERATOR;
    var dep = state.departures.filter(function (x) {
      return x.code === b.departure_code;
    })[0];
    var nights = dep ? dep.nights : null;
    var fl = TuronProvisional.flightsFor({
      transport: b.transport, date_start: b.date_start, nights: nights,
    });
    var logo = brandLogoUrl();

    var win = window.open("", "_blank");
    if (!win) { flash("Разрешите всплывающие окна, чтобы открыть билет."); return; }

    var rows = (b.passengers || []).map(function (p, i) {
      return "<tr><td>" + (i + 1) + "</td><td><strong>" + esc(p.full_name) +
        "</strong></td><td>" + esc(vDate(p.birth_date)) + "</td><td>" +
        esc(p.passport_number || "—") + "</td><td>" +
        esc(paxType(p.birth_date, b.date_start)) + "</td></tr>";
    }).join("");

    win.document.write(
      '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
      "<title>Авиабилет " + esc(b.code) + "</title>" +
      "<style>" + voucherCss() + ticketCss() + "</style></head><body>" +
      '<div class="sheet">' +
        '<div class="vh">' +
          '<div class="vh-brand"><img src="' + esc(logo) + '" alt="' +
            esc(op.name) + '"><div class="vh-sub">Маршрут-квитанция</div></div>' +
          '<div class="vh-order"><span>Код бронирования:</span>' +
            "<strong>" + esc(b.code) + "</strong></div>" +
        "</div>" +

        "<h2>Пассажиры:</h2>" +
        '<table class="tk"><tr><th>#</th><th>Фамилия и имя</th>' +
          "<th>Дата рождения</th><th>Документ</th><th>Тип</th></tr>" +
          rows + "</table>" +

        "<h2>Перелёт:</h2>" +
        (fl
          ? segmentHtml(fl.out, fl.out.date, 0) + segmentHtml(fl.back, fl.back.date, 1)
          : '<div class="card">Рейс на эту дату не в полётной программе — ' +
            "уточните у оператора.</div>") +

        (fl
          ? "<h2>Нормы багажа:</h2>" +
            '<div class="route"><div class="card facts">' +
              '<div><div class="lbl">Багаж</div><div class="val">' +
                esc(fl.out.baggage) + "</div></div>" +
              '<div><div class="lbl">Ручная кладь</div><div class="val">' +
                esc(fl.out.cabin_baggage) + "</div></div>" +
            "</div><div></div></div>"
          : "") +

        '<div class="req">' +
          '<div class="card"><div class="lbl">Агентство:</div>' +
            '<div class="val">' + esc(b.agency_name || session.name || "—") + "</div></div>" +
          '<div class="card"><div class="lbl">Телефон:</div>' +
            '<div class="val">' + esc(op.phone) + "</div></div>" +
          '<div class="card"><div class="lbl">Эл. почта:</div>' +
            '<div class="val">' + esc(op.email) + "</div></div>" +
          '<div class="card"><div class="lbl">Адрес:</div>' +
            '<div class="val">' + esc(op.address) + "</div></div>" +
          '<div class="card req-wide"><div class="lbl">Перевозчик:</div>' +
            '<div class="val">Перелёт входит в состав тура. Посадочный талон ' +
            "выдаёт авиакомпания при регистрации.</div></div>" +
        "</div>" +
      "</div>" +
      '<div class="actions no-print">' +
        '<button onclick="window.print()">Печать / PDF</button>' +
      "</div></body></html>"
    );
    win.document.close();
  }

  /* ------------------------------------------------------------- счёт
   * Счёт на оплату — то, что агентству нужно СРАЗУ после брони: по нему
   * платит клиент. Ваучер и авиабилет подтверждают уже оплаченную услугу,
   * поэтому до полной оплаты их выдавать нельзя (см. docsUnlocked).
   *
   * Суммы берутся из самой брони и из paymentPolicy — той же, что считает
   * график в разделе «Платежи» и в окне брони. Отдельной арифметики здесь
   * нет намеренно: разойдись счёт с кабинетом — спорить будет не о чем.
   */
  function openInvoice(code) {
    var b = state.bookings.filter(function (x) { return x.code === code; })[0];
    if (!b) return;
    var op = TuronProvisional.OPERATOR;
    var dep = state.departures.filter(function (x) {
      return x.code === b.departure_code;
    })[0];
    var nights = dep ? dep.nights : null;
    var back = TuronApi.departureEnd(b.date_start, nights);
    var logo = brandLogoUrl();

    var win = window.open("", "_blank");
    if (!win) { flash("Разрешите всплывающие окна, чтобы открыть счёт."); return; }

    var rows = (b.passengers || []).map(function (p) {
      return "<tr><td><strong>" + esc(p.full_name || "—") + "</strong></td>" +
        "<td>" + esc(p.placement || "—") + "</td>" +
        "<td>" + esc(p.tariff || p.price_code || "—") + "</td>" +
        '<td class="num">' + esc(money(p.price)) + "</td></tr>";
    }).join("");

    var pol = TuronApi.paymentPolicy(b.date_start, b.created_at);
    var today = new Date().toISOString().slice(0, 10);
    var steps = pol.steps.map(function (s) {
      var need = Math.round(b.total_price * s.share * 100) / 100;
      var due = s.due.toISOString().slice(0, 10);
      // Этап закрыт, если внесено не меньше нарастающего итога по нему.
      var done = b.paid >= need - 0.01;
      var late = !done && due < today;
      return '<div class="inv-step' + (done ? " is-done" : late ? " is-late" : "") + '">' +
        "<span>" + Math.round(s.share * 100) + "% · " + esc(s.label) +
          '<br><span class="due">до ' + esc(vDate(due)) + "</span></span>" +
        '<span class="amt">' + esc(money(need)) +
          (done ? " · внесено" : late ? " · просрочено" : "") + "</span></div>";
    }).join("");

    win.document.write(
      '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
      "<title>Счёт " + esc(b.code) + "</title>" +
      "<style>" + voucherCss() + invoiceCss() + "</style></head><body>" +
      '<div class="sheet">' +
        '<div class="vh">' +
          '<div class="vh-brand"><img src="' + esc(logo) + '" alt="' + esc(op.name) + '"></div>' +
          '<div class="vh-order"><span>Счёт на оплату:</span>' +
            "<strong>" + esc(b.code) + "</strong></div>" +
        "</div>" +

        '<div class="inv-meta">' +
          '<div><div class="lbl">Плательщик:</div><div class="val">' +
            esc(b.agency_name || (session && session.name) || "—") + "</div></div>" +
          '<div><div class="lbl">Дата брони:</div><div class="val">' +
            esc(vDate((b.created_at || "").slice(0, 10))) + "</div></div>" +
          '<div><div class="lbl">Заезд:</div><div class="val">' +
            esc(vDate(b.date_start)) + (back ? " – " + esc(vDate(back)) : "") + "</div></div>" +
        "</div>" +

        "<h2>Состав и стоимость:</h2>" +
        '<table class="inv"><thead><tr><th>Пассажир</th><th>Размещение</th>' +
          '<th>Тариф</th><th class="num">Стоимость</th></tr></thead><tbody>' +
          rows +
          '<tr class="total"><td colspan="3">Итого к оплате</td>' +
            '<td class="num">' + esc(money(b.total_price)) + "</td></tr>" +
        "</tbody></table>" +

        '<div class="inv-state">' +
          '<div><div class="lbl">Оплачено</div><div class="val">' +
            esc(money(b.paid || 0)) + "</div></div>" +
          '<div><div class="lbl">Остаток</div><div class="val">' +
            esc(money(b.balance || 0)) + "</div></div>" +
        "</div>" +

        '<div class="inv-pay"><div class="inv-pay-head">Порядок оплаты</div>' +
          steps + "</div>" +

        '<p class="inv-note">Ваучер и маршрут-квитанция авиабилета выдаются после ' +
          "полной оплаты брони — до этого момента в разделе «Документы» доступен " +
          "только этот счёт. Оплату подтверждает туроператор.</p>" +

        '<div class="req">' +
          '<div class="card"><div class="lbl">Получатель:</div>' +
            '<div class="val">' + esc(op.name) + "</div></div>" +
          '<div class="card"><div class="lbl">Телефон:</div>' +
            '<div class="val">' + esc(op.phone) + "</div></div>" +
          '<div class="card"><div class="lbl">Эл. почта:</div>' +
            '<div class="val">' + esc(op.email) + "</div></div>" +
          '<div class="card req-sm"><div class="lbl">Адрес:</div>' +
            '<div class="val">' + esc(op.address) + "</div></div>" +
        "</div>" +
      "</div>" +
      '<div class="actions no-print">' +
        '<button onclick="window.print()">Печать / PDF</button>' +
      "</div></body></html>"
    );
    win.document.close();
  }

  $("documents-list").addEventListener("click", function (e) {
    var i = e.target.closest("[data-invoice]");
    if (i) { openInvoice(i.dataset.invoice); return; }
    var v = e.target.closest("[data-voucher]");
    if (v) { openVoucher(v.dataset.voucher); return; }
    var t = e.target.closest("[data-ticket]");
    if (t) openTicket(t.dataset.ticket);
  });

  $("tv-query").addEventListener("input", renderTravellers);

  /* --------------------------------------------------------- контакты
   * Связь с оператором идёт по телефону и в Telegram — переписки внутри
   * кабинета нет. Здесь показаны рабочие контакты менеджера.
   */
  function renderMessages() {
    var op = TuronProvisional.OPERATOR;
    // Менеджеров может быть несколько — рисуем всех. Запасной вариант со
    // старыми плоскими полями оставлен на случай, если список пуст.
    var managers = (op.managers && op.managers.length)
      ? op.managers
      : [{ name: op.contact_name, phone: op.phone, phone_href: op.phone_href,
           telegram_href: op.telegram_href }];
    var people = managers.map(function (m) {
      return "<div><span>Менеджер" + (m.name ? " · " + esc(m.name) : "") +
        "</span><strong><a href=\"tel:" + esc(m.phone_href) + '">' +
        esc(m.phone) + "</a></strong>" +
        (m.telegram_href
          ? '<a class="tt-contact-tg" href="' + esc(m.telegram_href) +
            '" target="_blank" rel="noopener">Telegram</a>'
          : "") +
        "</div>";
    }).join("");

    $("messages-body").innerHTML =
      '<div class="tt-panel">' +
        "<h2>Контакты оператора</h2>" +
        '<p class="tt-muted-note">По броням отвечают менеджеры Etihad. ' +
        "Пишите в Telegram или звоните.</p>" +
        // Класс СВОЙ, а не общий tt-contact-grid: тем же именем назван блок
        // публичной секции «Свяжитесь с нами», и правило кабинета, стоящее
        // в styles.css ниже, молча перебивало её раскладку.
        '<div class="tt-op-contact-grid">' +
          people +
          "<div><span>Почта</span><strong><a href=\"mailto:" + esc(op.email) +
            '">' + esc(op.email) + "</a></strong></div>" +
          "<div><span>Офис</span><strong>" + esc(op.address) + "</strong></div>" +
        "</div>" +
      "</div>";
  }

  function switchTab(name) {
    var labels = {
      builder: ["Новый тур", "Конструктор путешествия"],
      travellers: ["Туристы", "Все пассажиры агентства"],
      payments: ["Платежи", "Сроки и задолженность"],
      documents: ["Документы", "Ваучеры по броням"],
      messages: ["Контакты", "Связь с оператором"],
      bookings: ["Бронирования", "Продажи агентства"],
      tours: ["Комиссии", "Партнёрская программа"],
      overview: ["Обзор", "Что происходит прямо сейчас"],
      manifest: ["Заезды и пассажиры", "Операторская панель"],
      "admin-bookings": ["Все брони", "Контроль продаж и оплат"],
      agencies: ["Агентства", "Партнёрская сеть"],
      "op-tours": ["Туры", "Продукты и комиссии"],
    };
    document.querySelectorAll(".tt-tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.tab === name);
    });
    ["builder", "bookings", "tours", "travellers",
     "payments", "documents", "messages", "overview", "manifest", "admin-bookings",
     "agencies", "op-tours"]
      .forEach(function (key) {
        var panel = $("panel-" + key);
        if (panel) panel.hidden = key !== name;
      });
    $("screen-app").classList.toggle("is-builder", name === "builder");
    $("screen-app").classList.toggle("is-manifest", name === "manifest");
    $("screen-app").classList.toggle("is-overview", name === "overview");
    if (labels[name]) {
      $("workspace-title").textContent = labels[name][0];
      $("workspace-kicker").textContent = labels[name][1];
    }
  }

  document.querySelector(".tt-tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tt-tab");
    if (!tab || !tab.dataset.tab) return;
    setNav(false);   // на телефоне меню выдвижное — закрываем после выбора
    goTab(tab.dataset.tab);
  });

  // Выдвижное меню на узком экране. Кнопка ☰ в шапке была, но ни к чему
  // не подключена, а боковая колонка оставалась шириной 248px — из-за
  // этого страница ехала вбок.
  function setNav(open) {
    $("screen-app").classList.toggle("is-nav-open", open);
    $("nav-scrim").hidden = !open;
    $("nav-toggle").setAttribute("aria-expanded", open ? "true" : "false");
  }

  $("nav-toggle").addEventListener("click", function () {
    setNav(!$("screen-app").classList.contains("is-nav-open"));
  });
  $("nav-scrim").addEventListener("click", function () { setNav(false); });

  // На широком экране меню можно оставить полноценным или свернуть до
  // вертикальной полосы иконок. Выбор агентства запоминается на устройстве.
  var sidebarStorageKey = "turon.sidebar.compact";
  var sidebarBtn = $("sidebar-collapse");

  document.querySelectorAll(".tt-sidebar .tt-tab").forEach(function (tab) {
    var label = tab.querySelector("span:last-child");
    if (!label) return;
    tab.dataset.tooltip = label.textContent.trim();
    tab.setAttribute("aria-label", label.textContent.trim());
  });

  function applySidebarMode(compact, remember) {
    $("screen-app").classList.toggle("is-sidebar-collapsed", compact);
    sidebarBtn.setAttribute("aria-pressed", compact ? "true" : "false");
    sidebarBtn.setAttribute("aria-label", compact
      ? "Развернуть боковую панель"
      : "Свернуть боковую панель");
    sidebarBtn.title = compact ? "Развернуть меню" : "Свернуть меню";
    if (remember) {
      try { localStorage.setItem(sidebarStorageKey, compact ? "1" : "0"); } catch (_) {}
    }
  }

  var savedSidebar = false;
  try { savedSidebar = localStorage.getItem(sidebarStorageKey) === "1"; } catch (_) {}
  applySidebarMode(savedSidebar, false);
  sidebarBtn.addEventListener("click", function () {
    applySidebarMode(!$("screen-app").classList.contains("is-sidebar-collapsed"), true);
  });

  // Слайдер тура: ручные стрелки, точки, клавиатура, свайп, спокойная
  // автопрокрутка и полноэкранный просмотр. При reduced-motion автоплей
  // отключён, а CSS убирает переходы.
  var media = $("builder-media");
  var mediaSlides = Array.from(media.querySelectorAll("[data-media-slide]"));
  var mediaDots = Array.from(media.querySelectorAll("[data-media-dot]"));
  var mediaCaptions = [
    ["Ризе", "Чайные долины"],
    ["Трабзон", "Черноморское побережье"],
    ["Батуми", "Приморский бульвар"],
    ["Батуми", "Отель у моря"],
  ];
  var mediaTimer = null;
  var mediaPointerX = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showMedia(index, announce) {
    state.mediaIndex = (index + mediaSlides.length) % mediaSlides.length;
    mediaSlides.forEach(function (slide, i) {
      var active = i === state.mediaIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    mediaDots.forEach(function (dot, i) {
      var active = i === state.mediaIndex;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    var caption = mediaCaptions[state.mediaIndex];
    $("builder-media-caption").innerHTML = "<small>" + esc(caption[0]) +
      "</small><strong>" + esc(caption[1]) + "</strong>";
    if (announce) {
      $("builder-media-status").textContent = "Фото " + (state.mediaIndex + 1) +
        " из " + mediaSlides.length + ": " + caption[0] + ", " + caption[1];
    }
  }

  function stopMediaAuto() {
    if (mediaTimer) window.clearInterval(mediaTimer);
    mediaTimer = null;
  }
  function startMediaAuto() {
    stopMediaAuto();
    if (reduceMotion || document.hidden) return;
    mediaTimer = window.setInterval(function () {
      showMedia(state.mediaIndex + 1, false);
    }, 6500);
  }
  function moveMedia(step) {
    showMedia(state.mediaIndex + step, true);
    startMediaAuto();
  }

  $("builder-media-prev").addEventListener("click", function () { moveMedia(-1); });
  $("builder-media-next").addEventListener("click", function () { moveMedia(1); });
  $("builder-media-dots").addEventListener("click", function (e) {
    var dot = e.target.closest("[data-media-dot]");
    if (!dot) return;
    showMedia(Number(dot.dataset.mediaDot), true);
    startMediaAuto();
  });
  media.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); moveMedia(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); moveMedia(1); }
  });
  media.addEventListener("pointerdown", function (e) { mediaPointerX = e.clientX; });
  media.addEventListener("pointerup", function (e) {
    if (mediaPointerX == null) return;
    var delta = e.clientX - mediaPointerX;
    mediaPointerX = null;
    if (Math.abs(delta) > 45) moveMedia(delta > 0 ? -1 : 1);
  });
  media.addEventListener("pointercancel", function () { mediaPointerX = null; });
  media.addEventListener("mouseenter", stopMediaAuto);
  media.addEventListener("mouseleave", startMediaAuto);
  media.addEventListener("focusin", stopMediaAuto);
  media.addEventListener("focusout", startMediaAuto);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopMediaAuto(); else startMediaAuto();
  });

  function setMediaFullscreen(open) {
    media.classList.toggle("is-fullscreen", open);
    $("builder-media-full").setAttribute("aria-pressed", open ? "true" : "false");
    $("builder-media-full").setAttribute("aria-label", open
      ? "Закрыть полноэкранный просмотр"
      : "Открыть фотографию на весь экран");
    $("builder-media-full").title = open ? "Закрыть" : "На весь экран";
    document.body.style.overflow = open ? "hidden" : "";
  }

  $("builder-media-full").addEventListener("click", function () {
    if (document.fullscreenElement === media) {
      document.exitFullscreen().catch(function () { setMediaFullscreen(false); });
      return;
    }
    if (media.classList.contains("is-fullscreen")) {
      setMediaFullscreen(false);
      return;
    }
    if (media.requestFullscreen) {
      media.requestFullscreen().catch(function () { setMediaFullscreen(true); });
    } else {
      setMediaFullscreen(true);
    }
  });
  document.addEventListener("fullscreenchange", function () {
    setMediaFullscreen(document.fullscreenElement === media);
  });
  showMedia(0, false);
  startMediaAuto();

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNav(false);
    if (e.key === "Escape" && media.classList.contains("is-fullscreen") && !document.fullscreenElement) {
      setMediaFullscreen(false);
    }
  });

  $("builder-book").addEventListener("click", function () {
    var d = builderDeparture();
    if (!d) {
      flash("Нет доступных заездов для бронирования.");
      return;
    }
    // Открываем ровно тот заезд и тот состав, что показаны в конструкторе:
    // раньше кнопка брала первый попавшийся заезд, и бронь не совпадала
    // с тем, что агент только что посчитал.
    var rows = [];
    if (!usesOccupancy(d)) {
      // Умра — по типу номера: сколько выбрано QUAD/TRPL/DBL, столько строк с
      // этим размещением. Раскладку по номерам агент поправит в форме брони.
      builderPlacements(d).forEach(function (p) {
        var n = state.builder.counts[p.code] || 0;
        for (var i = 0; i < n; i++) rows.push({ placement: p.code });
      });
    } else {
      // Карадениз — взрослые в одном размещении по их числу (1 → одноместный,
      // 2 → двухместный, 3+ → трёхместный). Дети — без размещения, их тариф
      // определит дата рождения. Сервер пересчитает цену по факту.
      var adultN = state.builder.counts.ADULT || 0;
      var pl = adultN > 0 ? adultPlacement(d, adultN) : null;
      for (var a = 0; a < adultN; a++) rows.push({ placement: pl.code, tariff: "ADULT" });
      builderTariffs(d).forEach(function (r) {
        var n = state.builder.counts[r.code] || 0;
        // Ребёнок живёт в номере со взрослыми — подставляем ИХ размещение, а не
        // оставляем пустое: пустое разворачивалось в первый пункт списка (DBL),
        // и агент видел «взрослый SNG + младенец DBL» — состав выглядел
        // неподхваченным. На цену это не влияет: детский тариф в priceFor
        // берётся раньше размещения.
        for (var i = 0; i < n; i++) {
          rows.push(pl ? { placement: pl.code, tariff: r.code } : { tariff: r.code });
        }
      });
    }
    openBooking(d.code, null, rows.length ? rows : null);
  });

  function flash(text) {
    var el = document.createElement("div");
    el.className = "tt-flash";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add("is-out"); }, 3200);
    setTimeout(function () { el.remove(); }, 3800);
  }

  // ----------------------------------------------------------------- старт
  if (TuronApi.isDemo()) {
    var hint = $("demo-hint");
    hint.hidden = false;
    hint.innerHTML = "Демо-режим: бэкенд не подключён, данные хранятся в браузере.<br>" +
      "Логины: <strong>" + TuronApi.demoLogins.join("</strong>, <strong>") +
      "</strong> · пароль <strong>" + TuronApi.demoPassword + "</strong>";
  }

  // При загрузке восстанавливаем сессию. Раньше ЛЮБАЯ ошибка /api/me роняла
  // в публичный экран — и мигание сети выглядело как «выкинуло из кабинета».
  // Теперь: 401 (токен протух) — честный выход; нет связи — держим токен и
  // показываем «нет связи» с кнопкой «Повторить».
  function restoreSession() {
    TuronApi.me().then(
      function (res) {
        hideOffline();
        session = res.agency;
        cabinetReady = false;
        syncPublicAccount();
        // Куда именно — решает адрес: обновление страницы на #/app/payments
        // обязано вернуть на «Платежи», а не на первую вкладку.
        applyRoute();
      },
      function (err) {
        // Обрабатываем здесь только отказ самого запроса /api/me.
        // Ошибка интерфейса после успешного ответа больше не маскируется
        // под отсутствие связи с сервером.
        if (err && err.status) {
          // сервер ответил (401 и т.п.) — токен протух, это честный выход
          session = null;
          cabinetReady = false;
          syncPublicAccount();
          var r = parseRoute();
          navigate(r.screen === "app" ? "#/" : window.location.hash || "#/", true);
        } else {
          showOffline();   // сеть недоступна — сессию не трогаем
        }
      }
    );
  }

  function showOffline() {
    var el = $("offline-screen");
    el.hidden = false;
    $("screen-public").hidden = true;
    $("screen-login").hidden = true;
    $("screen-app").hidden = true;
    // экран сменился в обход setScreen — сбрасываем метку, иначе возврат
    // на тот же экран после «Повторить» ничего не покажет
    currentScreen = null;
  }
  function hideOffline() { $("offline-screen").hidden = true; }

  $("offline-retry").addEventListener("click", function () {
    var btn = $("offline-retry");
    btn.disabled = true;
    btn.textContent = "Проверяем…";
    restoreSession();
    setTimeout(function () { btn.disabled = false; btn.textContent = "Повторить"; }, 1500);
  });

  window.addEventListener("hashchange", applyRoute);

  /* «Назад»/«Вперёд» браузера. Если адрес сменился — это переход по вкладке
   * или экрану, его ведёт applyRoute (через hashchange); наши шаги при этом
   * обнуляем. Если адрес НЕ менялся — значит откатили один из наших шагов
   * (окно брони, сетка Умры, конструктор): закрываем всё, что глубже целевого
   * шага из history.state. */
  window.addEventListener("popstate", function (e) {
    if (window.location.hash !== appliedHash) { clearSteps(); return; }
    var targetId = (e.state && e.state.ttStep) || 0;
    while (stepStack.length && stepStack[stepStack.length - 1].id > targetId) {
      var s = stepStack.pop();
      try { s.close(); } catch (_) {}
    }
  });

  if (TuronApi.isLoggedIn()) {
    restoreSession();
  } else {
    applyRoute();   // #/app/* без сессии сам уведёт на вход
  }
})();
