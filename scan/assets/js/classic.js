/* Variante »classic« der persönlichen Vorschau: Einblendungen beim Scrollen, fester WhatsApp-Knopf, WhatsApp-Text mit
   der Seitenadresse. Quelle: scan/assets/js/classic.js (von Hand gepflegt), Vorlage scan/vorlage.html.
   Fail-open: die Vorlage setzt .cs-js und nimmt sie wieder weg, wenn dieses Skript nicht lädt (window.wwReady fehlt).
   Bewegung nur bei prefers-reduced-motion: no-preference (CSS); ohne IntersectionObserver wird sofort alles gezeigt.
   Keine Netzwerk-Anfragen, kein Gerätespeicher. */
(function () {
  "use strict";
  window.wwReady = true;
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  /* WhatsApp: Text mit der aktuellen Adresse (ohne #Sprungmarke) – erst zur Laufzeit bekannt */
  function waHref(a) {
    var nr = (a.getAttribute("data-wa") || "").replace(/\D/g, "");
    return "https://wa.me/" + nr + "?text=" + encodeURIComponent((a.getAttribute("data-wa-text") || "") + location.href.split("#")[0]);
  }
  each(".cs-wa[data-wa]", function (a) {
    a.href = waHref(a);
    a.addEventListener("click", function () { a.href = waHref(a); });
  });

  var io = "IntersectionObserver" in window;

  /* Einblendungen: einmal, gestaffelt je Geschwister (70 ms, höchstens 350 ms) */
  var rv = document.querySelectorAll(".rv");
  if (!io) {
    Array.prototype.forEach.call(rv, function (el) { el.classList.add("in"); });
  } else {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        obs.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    Array.prototype.forEach.call(rv, function (el) {
      var i = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty("--rv-d", Math.min(i * 0.07, 0.35) + "s");
      obs.observe(el);
    });
  }

  /* Fester Knopf: erst wenn das Hero zur Hälfte weg ist, und nicht mehr, sobald der Abschluss im Bild ist */
  var dock = document.querySelector(".cs-dock"), hero = document.querySelector(".cs-hero"), end = document.querySelector(".cs-wirth");
  if (!dock) return;
  if (!io || !hero || !end) { dock.classList.add("on"); return; }
  var past = false, atEnd = false;
  function update() { dock.classList.toggle("on", past && !atEnd); }
  new IntersectionObserver(function (es) {
    var e = es[0];
    past = e.intersectionRatio < 0.5 && e.boundingClientRect.top < 0;
    update();
  }, { threshold: [0, 0.5, 1] }).observe(hero);
  new IntersectionObserver(function (es) { atEnd = es[0].isIntersecting; update(); }, { threshold: 0 }).observe(end);
})();
