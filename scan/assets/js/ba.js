/* Wirth Websites – gemeinsame Bausteine für Website und Scan-Seite (ohne Bibliotheken).
   Quelle: wirthwebsites/design/ba.js (Kopien per design/sync.py).
   1) [data-ba]: Vorher/Nachher-Schieber – Maus, Touch, Tastatur. Nur transform (CSS-Variable --p).
      Optional data-ba-demo: zeigt einmal, sobald sichtbar, kurz wie es geht (nicht bei reduzierter Bewegung).
      Knöpfe [data-ba-set="0..100"][aria-controls=<id des Schiebers>] setzen die Position (z. B. »Heute« / »Entwurf«).
   2) [data-rv]: einmalige Einblendung beim ersten Sichtbarwerden.
   3) .dock: Anrufleiste, sobald [data-dock-anchor] aus dem Bild ist.
   Setzt window.wwReady – das Inline-Skript im <head> nimmt sonst .js wieder weg (Inhalte bleiben sichtbar). */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initBA(el) {
    var knob = el.querySelector(".ba-knob"), p = parseFloat(getComputedStyle(el).getPropertyValue("--p"));
    if (isNaN(p)) p = 50;   // 0 ist ein gültiger Startwert (nur der Entwurf sichtbar)
    var labelL = el.getAttribute("data-ba-left") || "Vorher", labelR = el.getAttribute("data-ba-right") || "Nachher";
    var raf = 0, next = p, dragging = false, demoRun = false;
    function paint() { raf = 0; el.style.setProperty("--p", next.toFixed(2)); }
    function set(v, user) {
      next = p = Math.max(0, Math.min(100, v));
      if (!raf) raf = requestAnimationFrame(paint);
      if (knob) {
        knob.setAttribute("aria-valuenow", Math.round(p));
        knob.setAttribute("aria-valuetext", Math.round(100 - p) + " % " + labelR + " sichtbar");
      }
      if (user) demoRun = true;
      if (el.id) document.querySelectorAll('[data-ba-set][aria-controls="' + el.id + '"]').forEach(function (b) {
        b.setAttribute("aria-pressed", String(Math.abs(parseFloat(b.getAttribute("data-ba-set")) - p) < 1));
      });
    }
    if (el.id) document.querySelectorAll('[data-ba-set][aria-controls="' + el.id + '"]').forEach(function (b) {
      b.addEventListener("click", function () { set(parseFloat(b.getAttribute("data-ba-set")), true); });
    });
    function fromEvent(e) { var r = el.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    /* Maus: sofort. Touch: erst wenn die Geste eindeutig horizontal ist (sonst scrollt die Seite normal). */
    var sx = 0, sy = 0, armed = false;
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; armed = true;
      if (e.pointerType === "mouse" || e.target === knob) {
        dragging = true; el.classList.add("is-drag");
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        if (e.target !== knob) set(fromEvent(e), true);
        if (knob && e.pointerType === "mouse") { e.preventDefault(); knob.focus({ preventScroll: true }); }
      }
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging && armed && e.pointerType !== "mouse") {
        var dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dx > 6 && dx > dy) { dragging = true; el.classList.add("is-drag"); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
        else if (dy > 8) armed = false;
      }
      if (dragging) set(fromEvent(e), true);
    });
    function end(e) {
      if (armed && !dragging && e && e.type === "pointerup" && e.pointerType !== "mouse") set(fromEvent(e), true);   // Tippen springt dorthin
      armed = false; dragging = false; el.classList.remove("is-drag");
    }
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", function () { armed = false; dragging = false; el.classList.remove("is-drag"); });
    if (knob) knob.addEventListener("keydown", function (e) {
      var k = e.key, step = e.shiftKey ? 10 : 2;
      if (k === "ArrowLeft" || k === "ArrowDown") set(p - step, true);
      else if (k === "ArrowRight" || k === "ArrowUp") set(p + step, true);
      else if (k === "PageDown") set(p - 10, true);
      else if (k === "PageUp") set(p + 10, true);
      else if (k === "Home") set(0, true);
      else if (k === "End") set(100, true);
      else return;
      e.preventDefault();
    });
    set(p, false);
    /* Einmaliger Hinweis: Regler fährt kurz hin und zurück, sobald der Schieber sichtbar ist. */
    if (el.hasAttribute("data-ba-demo") && !reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        if (demoRun) return;
        var start = null, from = p, a = parseFloat(el.getAttribute("data-ba-demo")) || 28;
        function step(t) {
          if (demoRun) return;
          if (start === null) start = t;
          var k = Math.min(1, (t - start) / 1600);
          next = p = from - a * Math.sin(k * Math.PI);   // weich hin und zurück
          el.style.setProperty("--p", next.toFixed(2));
          if (k < 1) requestAnimationFrame(step); else set(from, false);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 450);
      }, { threshold: .6 });
      io.observe(el);
    }
  }

  function initReveal() {
    var els = document.querySelectorAll("[data-rv]");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    els.forEach(function (e) { io.observe(e); });
  }

  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function () {
    document.querySelectorAll("[data-ba]").forEach(initBA);
    initReveal();
    /* Dock (mobile Anrufleiste): erscheint, sobald der Hero-CTA aus dem Bild ist. */
    var dock = document.querySelector(".dock"), anchor = document.querySelector("[data-dock-anchor]");
    if (dock && anchor && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { dock.classList.toggle("on", !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(anchor);
    } else if (dock) dock.classList.add("on");
    /* Fotos, die (noch) fehlen: Bild entfernen, gestalteter Platzhalter bleibt sichtbar. */
    document.querySelectorAll("img[data-optional]").forEach(function (img) {
      function gone() { var f = img.closest("[data-slot]"); if (f) f.classList.add("is-empty"); img.remove(); }
      if (img.complete && img.naturalWidth === 0) gone(); else img.addEventListener("error", gone);
    });
    window.wwReady = true;
  });
})();
