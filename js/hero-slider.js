/*
 * Public hero slider enhancement.
 *
 * Slide 1 is the existing video hero rendered by js/catalog.js. This file
 * does not replace or rebuild it: it only adds slider state/classes and
 * appends Slide 2 (Japan) plus controls after the existing hero appears.
 *
 * The public catalogue already owns navigation through delegated [data-dest]
 * clicks. The Japan CTA deliberately reuses that contract instead of
 * inventing a second router or a fake page.
 */
(function (global) {
  "use strict";

  var ROOT_ID = "public-catalog";
  var HERO_SELECTOR = ".tt-public-intro";
  var ENHANCED_ATTR = "data-hero-slider-ready";
  var JAPAN_IMAGE = "img/hero-japan-2026.webp";
  var observer = null;
  var scheduled = false;

  function svgArrow(direction) {
    var path = direction === "prev"
      ? "M14.5 6 8.5 12l6 6"
      : "m9.5 6 6 6-6 6";
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '" /></svg>';
  }

  function japanSlideHtml() {
    return (
      '<section class="tt-hero-slide tt-hero-slide--japan" data-hero-panel="2" ' +
        'aria-hidden="true" aria-label="Япония — второй слайд">' +
        '<img class="tt-hero-japan-image" src="' + JAPAN_IMAGE + '" alt="" ' +
          'decoding="async" fetchpriority="low" />' +
        '<div class="tt-hero-japan-shade" aria-hidden="true"></div>' +
        '<div class="tt-hero-japan-content">' +
          '<span class="tt-hero-japan-label">JAPAN · 2026</span>' +
          '<h2>Япония, которую хочется увидеть</h2>' +
          '<p class="tt-hero-japan-route">Токио · Киото · Осака · Фудзи</p>' +
          '<p class="tt-hero-japan-text">Четыре программы путешествий по Японии — ' +
            'от огней Токио до классических маршрутов и Japan Camp.</p>' +
          '<div class="tt-hero-japan-meta">4 программы <i aria-hidden="true"></i> Сезон 2026</div>' +
          '<button class="tt-hero-japan-cta" type="button" data-dest="Япония">' +
            '<span>Смотреть туры</span><span aria-hidden="true">↗</span>' +
          '</button>' +
        '</div>' +
      '</section>'
    );
  }

  function controlsHtml() {
    return (
      '<div class="tt-hero-slider-controls" role="group" aria-label="Переключение hero-слайдов">' +
        '<button class="tt-hero-slider-arrow" type="button" data-hero-prev ' +
          'aria-label="Предыдущий слайд">' + svgArrow("prev") + '</button>' +
        '<div class="tt-hero-slider-count" aria-live="polite">' +
          '<strong data-hero-current>01</strong><span>/</span><span>02</span>' +
        '</div>' +
        '<div class="tt-hero-slider-dots" aria-label="Выбор слайда">' +
          '<button class="is-active" type="button" data-hero-to="1" aria-label="Слайд 1" ' +
            'aria-current="true"><i></i></button>' +
          '<button type="button" data-hero-to="2" aria-label="Слайд 2"><i></i></button>' +
        '</div>' +
        '<button class="tt-hero-slider-arrow" type="button" data-hero-next ' +
          'aria-label="Следующий слайд">' + svgArrow("next") + '</button>' +
      '</div>'
    );
  }

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function pauseVideoForJapan(video) {
    if (!video) return;
    // catalog.js listens to pause and normally wakes the video back up. Mark it
    // as intentionally paused first; resumeHero() explicitly respects this.
    if (!video.hasAttribute("data-no-autoplay")) {
      video.setAttribute("data-slider-paused", "");
      video.setAttribute("data-no-autoplay", "");
    }
    video.pause();
  }

  function resumeVideoForFirstSlide(video) {
    if (!video) return;
    // Remove only the marker that this slider itself created. If reduced
    // motion had already disabled autoplay, leave catalog.js's marker intact.
    if (!video.hasAttribute("data-slider-paused")) return;
    video.removeAttribute("data-slider-paused");
    video.removeAttribute("data-no-autoplay");
    if (prefersReducedMotion() || global.document.hidden) return;
    var started = video.play();
    if (started && started.catch) started.catch(function () {});
  }

  function setSlide(hero, next) {
    var index = next === 2 ? 2 : 1;
    var video = hero.querySelector(".tt-hero-video");
    var japan = hero.querySelector('[data-hero-panel="2"]');
    var current = hero.querySelector("[data-hero-current]");
    var dots = hero.querySelectorAll("[data-hero-to]");

    hero.setAttribute("data-hero-slide", String(index));
    if (current) current.textContent = index === 1 ? "01" : "02";
    if (japan) japan.setAttribute("aria-hidden", index === 2 ? "false" : "true");

    Array.prototype.forEach.call(dots, function (dot) {
      var active = Number(dot.getAttribute("data-hero-to")) === index;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (index === 2) pauseVideoForJapan(video);
    else resumeVideoForFirstSlide(video);
  }

  function mount(hero) {
    // The hero may have been replaced by catalogue navigation while the image
    // was preloading. Never enhance a stale detached node.
    if (!hero || !hero.isConnected) return;
    if (hero.getAttribute(ENHANCED_ATTR) === "ready") return;

    hero.setAttribute(ENHANCED_ATTR, "ready");
    hero.classList.add("tt-has-slider");
    hero.setAttribute("data-hero-slide", "1");
    hero.insertAdjacentHTML("beforeend", japanSlideHtml() + controlsHtml());

    hero.addEventListener("click", function (event) {
      var direct = event.target.closest("[data-hero-to]");
      if (direct) {
        setSlide(hero, Number(direct.getAttribute("data-hero-to")));
        return;
      }
      if (event.target.closest("[data-hero-prev]")) {
        setSlide(hero, hero.getAttribute("data-hero-slide") === "2" ? 1 : 2);
        return;
      }
      if (event.target.closest("[data-hero-next]")) {
        setSlide(hero, hero.getAttribute("data-hero-slide") === "2" ? 1 : 2);
      }
    });

    hero.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") setSlide(hero, 1);
      if (event.key === "ArrowRight") setSlide(hero, 2);
    });
  }

  function enhance(hero) {
    if (!hero || hero.hasAttribute(ENHANCED_ATTR)) return;
    // Guard against a future catalogue render with a different hero layout.
    // Slide 1 must remain the existing video hero, so do nothing unless both
    // original pieces are present.
    if (!hero.querySelector(".tt-hero-video") || !hero.querySelector(".tt-hero-content")) return;

    // Never expose a half-built second slide. The supplied Japan photograph
    // must exist before we add controls/classes. If the asset is absent or
    // fails to load, the page remains exactly the existing one-slide video
    // hero; a reload after the image is deployed will enable the slider.
    hero.setAttribute(ENHANCED_ATTR, "loading");
    var probe = new global.Image();
    probe.onload = function () { mount(hero); };
    probe.onerror = function () {
      if (hero && hero.isConnected && hero.getAttribute(ENHANCED_ATTR) === "loading") {
        hero.removeAttribute(ENHANCED_ATTR);
      }
    };
    probe.src = JAPAN_IMAGE;
  }

  function enhanceCurrentHero() {
    scheduled = false;
    var root = global.document.getElementById(ROOT_ID);
    if (!root) return;
    enhance(root.querySelector(HERO_SELECTOR));
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(enhanceCurrentHero);
  }

  function boot() {
    var root = global.document.getElementById(ROOT_ID);
    if (!root) return;
    scheduleEnhance();
    observer = new global.MutationObserver(scheduleEnhance);
    observer.observe(root, { childList: true, subtree: true });
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window);
