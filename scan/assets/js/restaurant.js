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
  function waHref(wa) {
    var nr = (wa.getAttribute("data-wa") || "").replace(/\D/g, "");
    var text = (wa.getAttribute("data-wa-text") || "") + location.href.split("#")[0];
    return "https://wa.me/" + nr + "?text=" + encodeURIComponent(text);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".rw-wa"), function (wa) {
    wa.href = waHref(wa);
    wa.addEventListener("click", function () { wa.href = waHref(wa); track("whatsapp_click", { where: wa.closest(".rp-cta") ? "cta" : "dock" }); });
  });

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

/* »So geht's« im Fuß: WhatsApp-Chat, den man beim Scrollen live erlebt. Das Handy klebt (sticky), der Scroll-Fortschritt
   p (0..1) durch den hohen Abschnitt blendet Nachrichten, Tipp-Punkte, blaue Häkchen und die Bild-Überblendung ein –
   ausschließlich transform/opacity, gerechnet in rAF und nur, solange der Abschnitt sichtbar ist (IntersectionObserver).
   Ohne JS oder bei prefers-reduced-motion bleibt alles statisch sichtbar. */
(function () {
  "use strict";
  var chat = document.querySelector(".rp-chat");
  if (!chat || !("IntersectionObserver" in window)) return;
  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var cta = document.querySelector(".rp-cta"), root = document.documentElement;
  if (still.matches) {   // statisch: fester Knopf weicht erst dem WhatsApp-Knopf am Seitenende
    if (cta) new IntersectionObserver(function (es) {
      root.classList.toggle("rp-cta-seen", es[0].isIntersecting || es[0].boundingClientRect.top < 0);
    }, { rootMargin: "0px 0px -15% 0px" }).observe(cta);
    return;
  }
  // live: fester Knopf weicht, sobald das Handy den Bildschirm füllt (er läge sonst über dem Chat) – danach kommt der eigene
  new IntersectionObserver(function (es) {
    root.classList.toggle("rp-cta-seen", es[0].isIntersecting || es[0].boundingClientRect.top < 0);
  }, { rootMargin: "0px 0px -65% 0px" }).observe(chat);

  chat.classList.add("rp-chat-on");
  var body = chat.querySelector(".rp-wa-body"), col = chat.querySelector(".rp-wa-col");
  var typ = chat.querySelector(".rp-st-typ"), on = chat.querySelector(".rp-st-on");
  function all(sel) { return Array.prototype.slice.call(chat.querySelectorAll(sel)); }
  var msgs = all("[data-at]"), typings = all("[data-from]"), reads = all("[data-read]"), swaps = all("[data-swap]"), steps = all("[data-step]");
  var W = 0.035;   // Einblend-Strecke je Element (Anteil des Abschnitts)
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function ramp(p, at, w) { return ease(clamp((p - at) / (w || W))); }
  function num(el, k) { return parseFloat(el.getAttribute(k)); }

  // Unterkanten (im Spaltenfluss) für das Hochschieben – nur bei Aufbau/Größenänderung gemessen, nie pro Frame
  var H = 0, bottoms = [];
  function measure() {
    col.style.transform = "none";
    msgs.concat(typings).forEach(function (m) { m.style.transform = "none"; });
    H = body.clientHeight;
    var top = col.getBoundingClientRect().top;
    bottoms = msgs.map(function (m) { return m.getBoundingClientRect().bottom - top; })
      .concat(typings.map(function (t) { return t.getBoundingClientRect().bottom - top; }));
    last = -1; frame();
  }

  var last = -1, ticking = false;
  function progress() {
    var r = chat.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span) : 1;
  }
  function frame() {
    ticking = false;
    var p = progress();
    if (Math.abs(p - last) < 0.0005) return;
    last = p;
    var shift = 0, typing = 0;
    msgs.forEach(function (m, i) {
      var v = ramp(p, num(m, "data-at"));
      m.style.opacity = v;
      m.style.transform = v === 1 ? "none" : "translate3d(0," + (1 - v) * 0.75 + "rem,0) scale(" + (0.94 + 0.06 * v) + ")";
      shift = Math.max(shift, v * Math.max(0, bottoms[i] - H + 14));
    });
    typings.forEach(function (t, i) {
      var v = ramp(p, num(t, "data-from"), 0.02) * (1 - ramp(p, num(t, "data-to"), 0.012));
      t.style.opacity = v;
      t.style.transform = "scale(" + (0.85 + 0.15 * v) + ")";
      typing = Math.max(typing, v);
      shift = Math.max(shift, v * Math.max(0, bottoms[msgs.length + i] - H + 14));
    });
    reads.forEach(function (r) { r.lastChild.style.opacity = ramp(p, num(r, "data-read"), 0.02); });
    swaps.forEach(function (s) {
      var v = ramp(p, num(s, "data-swap"), 0.06);
      s.style.opacity = v;
      if (s.tagName === "PICTURE") s.style.transform = "scale(" + (1.08 - 0.08 * v) + ")";
    });
    steps.forEach(function (s, i) {
      var next = steps[i + 1], v = ramp(p, num(s, "data-step"), 0.03) * (next ? 1 - ramp(p, num(next, "data-step"), 0.03) : 1);
      s.style.opacity = v;
      s.style.transform = "translate3d(0," + (1 - v) * 0.4 + "rem,0)";
    });
    typ.style.opacity = typing; on.style.opacity = 1 - typing;
    col.style.transform = "translate3d(0," + -shift.toFixed(1) + "px,0)";
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  var listening = false;
  new IntersectionObserver(function (es) {
    var vis = es[0].isIntersecting;
    if (vis && !listening) { addEventListener("scroll", request, { passive: true }); request(); }
    if (!vis && listening) { removeEventListener("scroll", request); request(); }
    listening = vis;
  }, { rootMargin: "50% 0px" }).observe(chat);
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(measure, 120); });
  still.addEventListener && still.addEventListener("change", function () { location.reload(); });
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener("load", measure);
})();
