/*
 * Язык КАБИНЕТА — свой, отдельный от публичного.
 *
 * Почему не общий с сайтом: публичную часть смотрит клиент агентства, и он
 * может открыть её на любом языке. Кабинет смотрят два разных человека с
 * разными потребностями:
 *
 *   - агентство-партнёр — ему язык нужен, ради него всё и делается;
 *   - оператор (вы) — ему кабинет нужен русским всегда.
 *
 * Будь язык один на сайт и кабинет, оператор, посмотрев публичную страницу
 * по-английски, вернулся бы в английскую панель управления. Поэтому у
 * кабинета своё хранилище (turon.app-language), по умолчанию русский, а
 * переключатель показывается ТОЛЬКО агентству — см. syncAppLangVisibility
 * в js/app.js.
 *
 * Тот же приём, что с темой: data-app-theme отдельный от data-theme.
 *
 * ОПЕРАТОРСКАЯ ПАНЕЛЬ НЕ ПЕРЕВЕДЕНА и не планируется: её видите только вы,
 * английская или турецкая она бы вам мешала. Строки admin.js остаются
 * русскими намеренно — это не забытая работа.
 */
(function (global) {
  "use strict";

  var STORAGE = "turon.app-language";

  var dictionaries = {
    ru: {
      // ---------------------------------------------------------- вкладки
      "tab.builder": "Новый тур",
      "tab.bookings": "Бронирования",
      "tab.travellers": "Туристы",
      "tab.payments": "Платежи",
      "tab.tours": "Комиссии",
      "tab.documents": "Документы",
      "tab.messages": "Контакты",
      "hdr.logout": "Выход",
      "hdr.notices": "Уведомления",
      "hdr.theme": "Тема кабинета",
      "hdr.language": "Язык кабинета",
      "hdr.toSite": "На сайт",
      // ------------------------------------------------------------ общее
      "act.book": "Забронировать",
      "act.cancel": "Отмена",
      "act.save": "Сохранить",
      "act.close": "Закрыть",
      "act.calc": "Рассчитать",
      "act.apply": "Применить",
      "act.details": "Подробнее",
      "act.print": "Печать",
      "act.download": "Скачать",
      "state.loading": "Загружаем…",
      "state.empty": "Пока пусто",
      "state.error": "Не удалось загрузить",
      "state.retry": "Повторить",
    },
    uz: {
      "tab.builder": "Yangi tur",
      "tab.bookings": "Bronlar",
      "tab.travellers": "Sayohatchilar",
      "tab.payments": "To‘lovlar",
      "tab.tours": "Komissiyalar",
      "tab.documents": "Hujjatlar",
      "tab.messages": "Kontaktlar",
      "hdr.logout": "Chiqish",
      "hdr.notices": "Bildirishnomalar",
      "hdr.theme": "Kabinet mavzusi",
      "hdr.language": "Kabinet tili",
      "hdr.toSite": "Saytga",
      "act.book": "Bron qilish",
      "act.cancel": "Bekor qilish",
      "act.save": "Saqlash",
      "act.close": "Yopish",
      "act.calc": "Hisoblash",
      "act.apply": "Qo‘llash",
      "act.details": "Batafsil",
      "act.print": "Chop etish",
      "act.download": "Yuklab olish",
      "state.loading": "Yuklanmoqda…",
      "state.empty": "Hozircha bo‘sh",
      "state.error": "Yuklab bo‘lmadi",
      "state.retry": "Qayta urinish",
    },
    en: {
      "tab.builder": "New tour",
      "tab.bookings": "Bookings",
      "tab.travellers": "Travellers",
      "tab.payments": "Payments",
      "tab.tours": "Commissions",
      "tab.documents": "Documents",
      "tab.messages": "Contacts",
      "hdr.logout": "Sign out",
      "hdr.notices": "Notifications",
      "hdr.theme": "Cabinet theme",
      "hdr.language": "Cabinet language",
      "hdr.toSite": "To the site",
      "act.book": "Book",
      "act.cancel": "Cancel",
      "act.save": "Save",
      "act.close": "Close",
      "act.calc": "Calculate",
      "act.apply": "Apply",
      "act.details": "Details",
      "act.print": "Print",
      "act.download": "Download",
      "state.loading": "Loading…",
      "state.empty": "Nothing here yet",
      "state.error": "Could not load",
      "state.retry": "Try again",
    },
    tr: {
      "tab.builder": "Yeni tur",
      "tab.bookings": "Rezervasyonlar",
      "tab.travellers": "Yolcular",
      "tab.payments": "Ödemeler",
      "tab.tours": "Komisyonlar",
      "tab.documents": "Belgeler",
      "tab.messages": "İletişim",
      "hdr.logout": "Çıkış",
      "hdr.notices": "Bildirimler",
      "hdr.theme": "Kabin teması",
      "hdr.language": "Kabin dili",
      "hdr.toSite": "Siteye",
      "act.book": "Rezervasyon yap",
      "act.cancel": "İptal",
      "act.save": "Kaydet",
      "act.close": "Kapat",
      "act.calc": "Hesapla",
      "act.apply": "Uygula",
      "act.details": "Ayrıntılar",
      "act.print": "Yazdır",
      "act.download": "İndir",
      "state.loading": "Yükleniyor…",
      "state.empty": "Henüz boş",
      "state.error": "Yüklenemedi",
      "state.retry": "Tekrar dene",
    },
  };

  function saved() {
    try {
      var v = global.localStorage.getItem(STORAGE);
      return dictionaries[v] ? v : "ru";
    } catch (_) {
      return "ru";
    }
  }

  var language = saved();

  /* Пропущенный ключ не падает ошибкой — откатывается на русский, а если и
   * его нет, отдаёт само имя ключа. Имя ключа на экране заметнее пустоты:
   * «tab.payments» видно сразу, а пустая вкладка выглядит как «так и было». */
  function t(key) {
    return (dictionaries[language] && dictionaries[language][key]) ||
      dictionaries.ru[key] || key;
  }

  /** Подстановка: t() даёт «Осталось {n}», сюда — значения. */
  function fmt(key, vars) {
    return String(t(key)).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] != null ? vars[k] : m;
    });
  }

  function setLanguage(next) {
    if (!dictionaries[next] || next === language) return;
    language = next;
    try { global.localStorage.setItem(STORAGE, next); } catch (_) {}
    apply();
    global.dispatchEvent(new CustomEvent("turon:app-language", {
      detail: { language: language }
    }));
  }

  /** Статические подписи разметки кабинета: [data-app-i18n]. */
  function apply() {
    document.querySelectorAll("[data-app-i18n]").forEach(function (node) {
      node.textContent = t(node.dataset.appI18n);
    });
    document.querySelectorAll("[data-app-i18n-label]").forEach(function (node) {
      var value = t(node.dataset.appI18nLabel);
      node.setAttribute("aria-label", value);
      if (node.hasAttribute("title")) node.setAttribute("title", value);
    });
    syncWidget();
  }

  /* Виджет языка кабинета. Флаги берём у публичной шапки: свой набор
   * SVG был бы копией на сорок строк, которая разойдётся при первой правке. */
  function syncWidget() {
    var pub = global.TuronPublicUi;
    var flag = document.getElementById("app-lang-flag");
    var code = document.getElementById("app-lang-code");
    if (!pub || !flag || !code) return;
    flag.innerHTML = pub.flags[language] || "";
    code.textContent = pub.langCodes[language] || language.toUpperCase();
    var menu = document.getElementById("app-lang-menu");
    if (!menu) return;
    Array.prototype.forEach.call(menu.querySelectorAll("[data-lang]"), function (li) {
      li.setAttribute("aria-selected", li.dataset.lang === language ? "true" : "false");
    });
  }

  function initWidget() {
    var pub = global.TuronPublicUi;
    var widget = document.getElementById("app-lang-widget");
    var toggle = document.getElementById("app-lang-toggle");
    var menu = document.getElementById("app-lang-menu");
    if (!pub || !widget || !toggle || !menu) return;

    menu.innerHTML = pub.langOrder.map(function (lc) {
      return '<li class="tt-lang-opt" role="option" data-lang="' + lc + '">' +
        '<span class="tt-lang-flag">' + pub.flags[lc] + "</span>" +
        '<span class="tt-lang-code">' + pub.langCodes[lc] + "</span></li>";
    }).join("");

    function close() { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) {
        menu.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
      } else { close(); }
    });
    menu.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-lang]");
      if (!opt) return;
      setLanguage(opt.dataset.lang);
      close();
    });
    document.addEventListener("click", function (e) {
      if (!widget.contains(e.target)) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    syncWidget();
  }

  global.TuronAppI18n = {
    t: t,
    fmt: fmt,
    language: function () { return language; },
    setLanguage: setLanguage,
    apply: apply,
    initWidget: initWidget,
    // Для тестов и проверки паритета ключей.
    dictionaries: dictionaries
  };
})(window);
