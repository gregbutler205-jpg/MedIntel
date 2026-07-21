/* Landing page behavior. Loaded synchronously from <head> so the `js` class is
   set before first paint — scroll-reveal elements start hidden only when JS is
   available, which prevents a flash-then-hide. Kept external (not inline) so the
   page can ship a strict `script-src 'self'` CSP with no inline scripts
   (AUDIT_SEC_02 F-08). Because this runs in <head>, the DOM-dependent logic
   waits for DOMContentLoaded; the original inline block ran at end-of-body, so
   behavior is unchanged. */

/* Runs immediately (before paint): mark JS available. */
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", function () {
  /* Vault detection: presence-only, never read contents. */
  var VAULT_KEYS = ["mi_vault"]; // secureStorage.js VAULT_KEY — presence only, never read
  try {
    var hasVault = VAULT_KEYS.some(function (k) { return localStorage.getItem(k) !== null; });
    if (hasVault) document.body.classList.add("has-vault");
  } catch (e) { /* storage blocked; treat as no vault */ }

  /* Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  reveals.forEach(function (el) {
    var d = el.getAttribute("data-d");
    if (d) el.style.transitionDelay = d + "ms";
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("vis"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("vis"); });
  }

  /* Retire any root-scope service worker (old app shell). /app/ and /companion/ scopes untouched. */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) {
        if (r.scope === location.origin + "/") r.unregister();
      });
    }).catch(function () {});
  }

  /* Demo buttons → the ISOLATED demo origin (#49). Its own subdomain means its
     own localStorage, so the demo can never see or touch a real record here. */
  var DEMO_ORIGIN = "https://demo.insinahealth.com/";
  document.querySelectorAll(".js-demo").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); window.location.href = DEMO_ORIGIN; });
  });
});
