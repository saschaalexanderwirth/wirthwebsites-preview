/* Variante »classic« der persönlichen Vorschau: Einblendungen beim Scrollen, fester Knopf »Termin buchen (15 Min.)«,
   Terminbuchung (Tag → Uhrzeit → Name + »Passt diese Nummer?« → Bestätigung), WhatsApp-Text (Nebenweg) mit der Seitenadresse. Quelle: scan/assets/js/classic.js (von Hand gepflegt), Vorlage scan/vorlage.html.
   Fail-open: die Vorlage setzt .cs-js und nimmt sie wieder weg, wenn dieses Skript nicht lädt (window.wwReady fehlt).
   Bewegung nur bei prefers-reduced-motion: no-preference (CSS); ohne IntersectionObserver wird sofort alles gezeigt.
   Keine Netzwerk-Anfragen, kein Gerätespeicher: die Terminbuchung speichert und sendet NICHTS (siehe TODO unten). */
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

  /* ── Terminbuchung (15 Min.) ─────────────────────────────────────────────────────────────────────────────
     Termine sind PLATZHALTER: die nächsten 4 Werktage ab morgen (nie heute) × feste Uhrzeiten.
     TODO(termin-backend): echte Termine + Versand anbinden. Stand 2026-10: lead-finder hat /p/{token}/slots und
     POST /p/{token}/book (SPEC-gcal-booking.md, bookingapp/), beides braucht ein Lead-Token aus der lead-finder-DB
     und eine erreichbare App-URL mit CORS – von dieser statischen GitHub-Pages-Seite aus nicht nutzbar. Bis dahin:
     nichts speichern, nichts senden; die Bestätigung bittet um eine kurze E-Mail (mailto, vorbefüllt).
     Beim Anbinden: Slots per fetch laden statt TIMES/Werktage, im submit-Handler POST statt mailto, Fehlerfall zeigen. */
  var TIMES = ["09:00", "11:00", "14:00", "16:30"];
  var WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  var WT_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  window.wwEvents = window.wwEvents || [];   // nur lokal (wie restaurant.js), ohne Namen/Nummer
  var form = document.querySelector(".cs-book-form");
  if (form) {
    var alt = document.querySelector(".cs-book-alt");
    var days = form.querySelector(".cs-days"), times = form.querySelector(".cs-times");
    var steps = form.querySelectorAll(".cs-step");
    var chip = function (name, value, html, label) {
      var l = document.createElement("label");
      l.className = "cs-chip";
      l.innerHTML = '<input type="radio" name="' + name + '" value="' + value + '" aria-label="' + label + '">' + html;
      return l;
    };
    var d = new Date(); d.setHours(12, 0, 0, 0);
    for (var n = 0; n < 4;) {
      d.setDate(d.getDate() + 1);
      var w = d.getDay();
      if (w === 0 || w === 6) continue;
      var iso = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      days.appendChild(chip("tag", iso, WT[w] + "<small>" + d.getDate() + "." + (d.getMonth() + 1) + ".</small>",
        WT_LANG[w] + ", " + d.getDate() + ". " + MON[d.getMonth()]));
      n++;
    }
    TIMES.forEach(function (t) { times.appendChild(chip("zeit", t, t, t + " Uhr")); });

    var val = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; };
    var label = function (name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.getAttribute("aria-label") : ""; };
    var err = function (k, msg) { form.querySelector('[data-err="' + k + '"]').textContent = msg; };
    var show = function (k, focusEl) {
      Array.prototype.forEach.call(steps, function (st) { st.hidden = st.getAttribute("data-step") !== String(k); });
      if (focusEl) focusEl.focus({ preventScroll: false });
    };
    var termin = function () { return label("tag") + ", " + val("zeit") + " Uhr"; };

    form.querySelector("[data-next]").addEventListener("click", function () {
      if (!val("tag") || !val("zeit")) { err(1, !val("tag") ? "Bitte wählen Sie einen Tag." : "Bitte wählen Sie eine Uhrzeit."); return; }
      err(1, "");
      form.querySelector("[data-pick]").textContent = termin();
      show(2);
      form.elements.name.focus({ preventScroll: true });
      /* Absende-Knopf ins Bild holen (Schritt 2 ist höher als Schritt 1); bei reduzierter Bewegung ohne Gleiten */
      var sub = form.querySelector('[type="submit"]').getBoundingClientRect(), top = steps[1].getBoundingClientRect().top;
      var dy = sub.bottom + 24 - window.innerHeight;
      if (dy <= 0 && top < 0) dy = Math.max(top - 16, dy);   // Schritt beginnt oberhalb: hochholen, solange der Knopf sichtbar bleibt
      if (dy) window.scrollBy({ top: dy, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    form.querySelector("[data-back]").addEventListener("click", function () { show(1, form.querySelector('input[name="tag"]:checked') || days.querySelector("input")); });
    form.querySelector("[data-restart]").addEventListener("click", function () { show(1, form.querySelector('input[name="tag"]:checked')); });
    form.addEventListener("change", function () { err(1, ""); });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = form.elements.name.value.trim(), tel = form.elements.tel.value.trim();
      if (name.length < 2) { err(2, "Bitte geben Sie Ihren Namen ein."); form.elements.name.focus(); return; }
      if (tel.replace(/\D/g, "").length < 6) { err(2, "Bitte prüfen Sie die Telefonnummer."); form.elements.tel.focus(); return; }
      err(2, "");
      // TODO(termin-backend): hier an den Termin-Endpunkt senden (siehe oben). Bis dahin wird nichts übertragen.
      var firma = form.getAttribute("data-firma") || "";
      form.querySelector("[data-done-name]").textContent = ", " + name.split(/\s+/)[0];
      form.querySelector("[data-done-text]").textContent = "Ihr Wunschtermin: " + termin() + ". Ich rufe Sie unter " + tel + " an.";
      var body = "Guten Tag Herr Wirth,\n\nich möchte den Entwurf für " + firma + " gern in einem kurzen Telefonat (15 Min.) besprechen.\n\n" +
        "Wunschtermin: " + termin() + "\nName: " + name + "\nTelefon: " + tel + "\nEntwurf: " + location.href.split("#")[0] + "\n\nViele Grüße\n";
      form.querySelector("[data-done-mail]").href = "mailto:" + (form.getAttribute("data-mail") || "") +
        "?subject=" + encodeURIComponent("Termin: Website-Entwurf für " + firma) + "&body=" + encodeURIComponent(body);
      window.wwEvents.push({ type: "termin_submit", t: Date.now() });
      var done = form.querySelector(".cs-done");
      show(3, done);
    });
    if (alt) alt.hidden = true;
    form.hidden = false;
  }

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

  /* Fester Knopf: erst wenn das Hero zur Hälfte weg ist, und nicht, solange Fußzeile des Betriebs, Abschluss oder
     Terminbuchung im Bild sind (dort verdeckte er Text bzw. doppelte das Formular) */
  var dock = document.querySelector(".cs-dock"), hero = document.querySelector(".cs-hero");
  var ends = document.querySelectorAll(".cs-bfoot, .cs-wirth, #termin");
  if (!dock) return;
  if (!io || !hero || !ends.length) { dock.classList.add("on"); return; }
  var past = false, inEnd = [];
  function update() { dock.classList.toggle("on", past && inEnd.indexOf(true) < 0); }
  new IntersectionObserver(function (es) {
    var e = es[0];
    past = e.intersectionRatio < 0.5 && e.boundingClientRect.top < 0;
    update();
  }, { threshold: [0, 0.5, 1] }).observe(hero);
  var endObs = new IntersectionObserver(function (es) {
    es.forEach(function (e) { inEnd[Array.prototype.indexOf.call(ends, e.target)] = e.isIntersecting; });
    update();
  }, { threshold: 0 });
  Array.prototype.forEach.call(ends, function (el) { endObs.observe(el); });
})();
