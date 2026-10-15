/* Website-Entwürfe: mobiles Menü + Demo-Hinweise. Quelle: scan/assets/js/entwurf.js (von Hand gepflegt).
   Ohne JS bleibt alles lesbar: das Menü ist dann nur auf großen Bildschirmen sichtbar, Demo-Knöpfe springen zu #kontakt. */
(function () {
  "use strict";
  var burger = document.querySelector(".e-burger"), menu = document.getElementById("e-menu");
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("is-open", open);
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".e-head")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); burger.focus(); } });
    var y0 = 0;
    addEventListener("scroll", function () {
      if (!menu.classList.contains("is-open")) { y0 = scrollY; return; }
      if (Math.abs(scrollY - y0) > 40) setMenu(false);
    }, { passive: true });
    addEventListener("resize", function () { if (innerWidth >= 1024) setMenu(false); });
  }

  /* Demo: im Entwurf wählt kein Knopf eine Nummer und nichts wird gesendet – ein kurzer Hinweis erklärt es. */
  var toast = document.querySelector(".e-toast"), timer = 0;
  var TEXT = {
    tel: "Im Entwurf: Dieser Knopf ruft später direkt bei Ihnen an.",
    mail: "Im Entwurf: Hier öffnet sich später eine E-Mail an Sie.",
    form: "Im Entwurf wird nichts gesendet. Später landet die Anfrage direkt in Ihrem Postfach.",
    link: "Im Entwurf: Impressum und Datenschutz ergänzen wir mit Ihren Angaben."
  };
  function say(kind) {
    if (!toast) return;
    toast.textContent = TEXT[kind] || TEXT.link;
    toast.classList.add("on");
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove("on"); }, 3600);
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("a[data-demo]");
    if (!el) return;
    var kind = el.getAttribute("data-demo");
    if (kind === "tel" || kind === "mail" || kind === "link") { e.preventDefault(); say(kind); }
  });
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (e) { e.preventDefault(); say("form"); });
  });
})();
