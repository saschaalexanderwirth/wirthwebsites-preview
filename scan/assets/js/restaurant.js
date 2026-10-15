/* Variante »restaurant-whatsapp«: Scan-Animation, WhatsApp-Link mit der Seitenadresse, Ereignisse.
   Quelle: scan/assets/js/restaurant.js (von Hand gepflegt). Menü + Demo-Hinweise kommen aus entwurf.js.
   Keine Netzwerk-Anfragen, kein Gerätespeicher: track() legt Ereignisse nur in window.wwEvents ab und meldet
   sie als DOM-Ereignis »ww:track« – ein späterer Zähler kann sich dort anhängen. */
(function () {
  "use strict";
  var root = document.documentElement;

  function track(name, data) {
    try {
      var ev = { event: name, t: Date.now() };
      for (var k in data || {}) ev[k] = data[k];
      (window.wwEvents = window.wwEvents || []).push(ev);
      document.dispatchEvent(new CustomEvent("ww:track", { detail: ev }));
    } catch (e) { /* Ereignisse dürfen die Seite nie stören */ }
  }
  window.wwTrack = track;

  /* WhatsApp: Text mit der aktuellen Adresse (ohne #Sprungmarke) – erst zur Laufzeit bekannt */
  var wa = document.querySelector(".rw-wa");
  function waHref() {
    var nr = (wa.getAttribute("data-wa") || "").replace(/\D/g, "");
    var text = (wa.getAttribute("data-wa-text") || "") + location.href.split("#")[0];
    return "https://wa.me/" + nr + "?text=" + encodeURIComponent(text);
  }
  if (wa) {
    wa.href = waHref();
    wa.addEventListener("click", function () { wa.href = waHref(); track("whatsapp_click"); });
  }

  /* Scan-Animation: drei Häkchen, dann gibt sie die fertige Website frei. Tippen = überspringen. */
  track("scan");
  var scan = document.querySelector(".rw-scan");
  if (!scan || !root.classList.contains("rw-scanning")) { root.classList.remove("rw-scanning"); return; }
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var steps = scan.querySelectorAll(".rw-scan-steps li"), timers = [], done = false;
  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    scan.classList.add("is-done");
    root.classList.remove("rw-scanning");
    root.classList.add("rw-shown");
    setTimeout(function () { scan.remove(); }, 550);
  }
  var step = still ? 150 : 600;
  for (var i = 0; i < steps.length; i++) timers.push(setTimeout(steps[i].classList.add.bind(steps[i].classList, "on"), step * (i + 1)));
  timers.push(setTimeout(finish, step * (steps.length + 1) + (still ? 0 : 200)));
  scan.addEventListener("click", finish);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); }, { once: true });
})();
