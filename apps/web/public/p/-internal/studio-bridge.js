/* Studio iframe bridge: section hover/click → parent, apply patched HTML from parent. */
(function () {
  var root = document.documentElement;
  if (root.getAttribute("data-forge-preview") !== "studio") return;

  function post(type, el) {
    var id = el.getAttribute("data-forge-section");
    if (!id) return;
    var r = el.getBoundingClientRect();
    try {
      parent.postMessage(
        {
          forgeStudio: true,
          type: type,
          sectionId: id,
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        },
        "*",
      );
    } catch {
      /* ignore postMessage failures (e.g. cross-origin) */
    }
  }

  function bind(el) {
    el.addEventListener("mouseenter", function () {
      post("forge-section-hover", el);
    });
    el.addEventListener("mouseleave", function () {
      post("forge-section-leave", el);
    });
    el.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        post("forge-section-click", el);
      },
      true,
    );
  }

  function wire() {
    document.querySelectorAll("[data-forge-section]").forEach(bind);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.forgeStudioParent !== true) return;
    if (d.type === "apply-section-html" && d.sectionId && typeof d.html === "string") {
      var sel = '[data-forge-section="' + d.sectionId.replace(/\\/g, "").replace(/"/g, '\\"') + '"]';
      var target = document.querySelector(sel);
      if (!target) return;
      target.style.opacity = "0.7";
      setTimeout(function () {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = d.html.trim();
        var neo = wrapper.firstElementChild;
        if (!neo) return;
        target.replaceWith(neo);
        neo.style.opacity = "0";
        neo.style.transition = "opacity 0.3s ease";
        requestAnimationFrame(function () {
          neo.style.opacity = "1";
        });
        bind(neo);
      }, 40);
    }
  });
})();
