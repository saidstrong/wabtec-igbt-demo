/* theme.js: light / dark display theme. Loaded in <head> before the styles so the saved theme is set on <html>
   before the first paint (no bright flash). Display only: no data, rule or export depends on it.
   Choice order: saved choice (localStorage), else the system setting, else light. Storage may be unavailable
   (file:// in some browsers, private mode); the toggle then still works for the open page. */
(function () {
  var KEY = "igbt_theme";
  var root = document.documentElement;
  function saved() {
    try { var t = window.localStorage.getItem(KEY); return t === "dark" || t === "light" ? t : null; } catch (e) { return null; }
  }
  function system() {
    try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
  }
  function apply(t) {
    root.setAttribute("data-theme", t);
    var b = document.getElementById("theme-toggle");
    if (b) b.setAttribute("aria-pressed", String(t === "dark"));
  }
  apply(saved() || system());

  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("theme-toggle");
    if (!b) return;
    apply(root.getAttribute("data-theme"));
    b.addEventListener("click", function () {
      var t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(t);
      try { window.localStorage.setItem(KEY, t); } catch (e) { /* not saved; this page still switches */ }
    });
  });
})();
