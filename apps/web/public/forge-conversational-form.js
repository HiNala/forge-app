/* P-08 conversational form: one label-group at a time. Reads #forge-form-schema. */
(function () {
  "use strict";
  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var schemaEl = document.getElementById("forge-form-schema");
  if (!schemaEl) return;
  var schema;
  try {
    schema = JSON.parse(schemaEl.textContent || "{}");
  } catch {
    return;
  }
  if (schema.display_mode !== "conversational") return;

  var form = document.querySelector('form[action$="/submit"]') || document.querySelector("form");
  if (!form) return;

  var groups = [];
  var labels = form.querySelectorAll("label");
  for (var i = 0; i < labels.length; i++) {
    var lb = labels[i];
    if (lb.querySelector("input, textarea, select")) groups.push(lb);
  }
  if (groups.length < 2) return;

  var bar = document.createElement("div");
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  bar.className = "forge-cf-bar";
  bar.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:50;padding:0.75rem 1rem;background:#111827f0;color:#f9fafb;font:15px/1.4 system-ui,-apple-system,sans-serif;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;";
  var dots = document.createElement("div");
  dots.style.cssText = "display:flex;gap:6px;flex:1;justify-content:center;";
  for (var d = 0; d < groups.length; d++) {
    var dot = document.createElement("span");
    dot.style.cssText =
      "width:8px;height:8px;border-radius:50%;background:" + (d === 0 ? "#38bdf8" : "#4b5563");
    dot.setAttribute("data-idx", String(d));
    dots.appendChild(dot);
  }
  var back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back";
  back.style.cssText = "background:#374151;border:0;color:#fff;padding:0.4rem 0.8rem;border-radius:6px;cursor:pointer;";
  var next = document.createElement("button");
  next.type = "button";
  next.textContent = "Next";
  next.style.cssText = back.style.cssText + "background:#0ea5e9;";
  bar.appendChild(back);
  bar.appendChild(dots);
  bar.appendChild(next);
  if (form.parentNode) {
    form.parentNode.appendChild(bar);
  }

  var cur = 0;
  var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

  function show(ix) {
    for (var j = 0; j < groups.length; j++) {
      var g = groups[j];
      g.style.display = j === ix ? "" : "none";
      g.style.marginBottom = "1.25rem";
    }
    for (var k = 0; k < dots.children.length; k++) {
      dots.children[k].style.background = k === ix ? "#38bdf8" : "#4b5563";
    }
    var isLast = ix === groups.length - 1;
    next.style.display = isLast ? "none" : "inline-block";
    if (submitBtn) submitBtn.style.display = isLast ? "" : "none";
    if (form.parentElement) {
      form.parentElement.style.minHeight = "60vh";
      form.parentElement.style.boxSizing = "border-box";
    }
    if (!reduce) {
      form.style.transition = "opacity 0.28s ease";
      form.style.opacity = "0.6";
      setTimeout(function () {
        form.style.opacity = "1";
      }, 20);
    }
  }

  function validateCurrent() {
    var inp = groups[cur].querySelector("input, textarea, select");
    if (!inp) return true;
    if (inp.hasAttribute("required") && !inp.value.trim()) {
      inp.focus();
      return false;
    }
    return true;
  }

  back.onclick = function () {
    if (cur > 0) {
      cur--;
      show(cur);
    }
  };
  next.onclick = function () {
    if (!validateCurrent()) return;
    if (cur < groups.length - 1) {
      cur++;
      show(cur);
    }
  };

  for (var a = 0; a < groups.length; a++) {
    groups[a].style.display = "none";
  }
  show(0);
  if (submitBtn) submitBtn.style.display = "none";

  form.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target && ev.target.tagName !== "TEXTAREA") {
      if (cur < groups.length - 1) {
        ev.preventDefault();
        if (validateCurrent()) {
          cur++;
          show(cur);
        }
      }
    }
  });
})();
