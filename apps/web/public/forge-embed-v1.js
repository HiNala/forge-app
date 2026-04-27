/* Forge inline embed v1 — loads published pages into a placeholder div (P-07). */
(function () {
  function run() {
    var nodes = document.querySelectorAll("[data-forge-org][data-forge-page]");
    nodes.forEach(function (el) {
      if (el.querySelector("iframe[data-forge-inline]")) return;
      var org = el.getAttribute("data-forge-org");
      var slug = el.getAttribute("data-forge-page");
      var base = (el.getAttribute("data-forge-base") || "").replace(/\/$/, "");
      if (!org || !slug || !base) return;
      var src =
        base +
        "/p/" +
        encodeURIComponent(org) +
        "/" +
        encodeURIComponent(slug);
      var ifr = document.createElement("iframe");
      ifr.setAttribute("data-forge-inline", "1");
      ifr.src = src;
      ifr.title = "Forge";
      ifr.style.cssText =
        "width:100%;min-height:520px;border:0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);";
      ifr.loading = "lazy";
      el.appendChild(ifr);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
