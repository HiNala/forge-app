/* P-08 conversational form — one field at a time; honors form_schema.fields order and show_if. */
(function () {
  "use strict";

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function formPayload(form) {
    var out = {};
    var els = form.querySelectorAll("input, textarea, select");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.name || String(el.name).indexOf("__") === 0) continue;
      if (el.type === "checkbox") {
        out[el.name] = el.checked ? el.value || "on" : "";
      } else if (el.type === "radio") {
        if (el.checked) out[el.name] = el.value;
      } else {
        out[el.name] = el.value;
      }
    }
    return out;
  }

  function isEmpty(v) {
    if (v === undefined || v === null) return true;
    if (typeof v === "string" && !v.trim()) return true;
    return false;
  }

  function getField(payload, field) {
    if (!field) return null;
    if (Object.prototype.hasOwnProperty.call(payload, field)) return payload[field];
    return null;
  }

  function evalCondition(payload, c) {
    if (!c || typeof c !== "object") return true;
    if (Array.isArray(c.all)) return c.all.every(function (x) { return evalCondition(payload, x); });
    if (Array.isArray(c.any)) return c.any.some(function (x) { return evalCondition(payload, x); });
    if ("not" in c) return !evalTree(payload, c.not);

    var op = c.op;
    if (!op) return true;
    var field = c.field;
    if (typeof field !== "string" || !field) return true;
    var value = c.value;
    var left = getField(payload, field);

    if (op === "empty") return isEmpty(left);
    if (op === "not_empty") return !isEmpty(left);
    if (op === "eq") return left === value;
    if (op === "neq") return left !== value;
    if (op === "gt" || op === "lt" || op === "gte" || op === "lte") {
      var ln = parseFloat(left);
      var rn = parseFloat(value);
      if (isNaN(ln) || isNaN(rn)) return false;
      if (op === "gt") return ln > rn;
      if (op === "lt") return ln < rn;
      if (op === "gte") return ln >= rn;
      return ln <= rn;
    }
    if (op === "in") return Array.isArray(value) && value.indexOf(left) !== -1;
    if (op === "nin") return Array.isArray(value) && value.indexOf(left) === -1;
    if (op === "contains") {
      if (left == null) return false;
      return String(left).indexOf(value !== undefined && value !== null ? String(value) : "") !== -1;
    }
    return true;
  }

  function evalTree(payload, node) {
    return evalCondition(payload, node);
  }

  function fieldVisible(schema, fieldName, payload) {
    var fields = schema.fields;
    if (!fields || !fields.length) return true;
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f || f.name !== fieldName) continue;
      var rule = f.show_if;
      if (!rule || (typeof rule === "object" && Object.keys(rule).length === 0)) return true;
      try {
        return evalTree(payload, rule);
      } catch {
        return false;
      }
    }
    return true;
  }

  function labelForField(form, name) {
    var sel = '[name="' + name.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"]';
    var inp = form.querySelector(sel);
    if (!inp) return null;
    var lb = inp.closest("label");
    if (lb && lb.querySelector("input, textarea, select")) return lb;
    if (inp.id) {
      var byId = form.querySelector("label[for=\"" + inp.id.replace(/"/g, '\\"') + "\"]");
      if (byId) return byId;
    }
    return null;
  }

  function buildGroupsFromSchema(form, schema) {
    var payload = formPayload(form);
    var fields = schema.fields;
    if (!fields || !fields.length) return null;
    var groups = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f || !f.name) continue;
      if (!fieldVisible(schema, f.name, payload)) continue;
      var lb = labelForField(form, f.name);
      if (lb) groups.push(lb);
    }
    return groups.length ? groups : null;
  }

  function buildGroupsFromLabels(form) {
    var groups = [];
    var labels = form.querySelectorAll("label");
    for (var i = 0; i < labels.length; i++) {
      var lb = labels[i];
      if (lb.querySelector("input, textarea, select")) groups.push(lb);
    }
    return groups;
  }

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

  var bar = document.createElement("div");
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  bar.className = "forge-cf-bar";
  bar.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:50;padding:0.75rem 1rem;background:#111827f0;color:#f9fafb;font:15px/1.4 system-ui,-apple-system,sans-serif;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;";
  var dots = document.createElement("div");
  dots.style.cssText = "display:flex;gap:6px;flex:1;justify-content:center;";
  var back = document.createElement("button");
  back.type = "button";
  back.textContent = "Back";
  back.style.cssText = "background:#374151;border:0;color:#fff;padding:0.4rem 0.8rem;border-radius:6px;cursor:pointer;";
  var next = document.createElement("button");
  next.type = "button";
  next.textContent = "OK";
  next.style.cssText = back.style.cssText + "background:#0ea5e9;";
  bar.appendChild(back);
  bar.appendChild(dots);
  bar.appendChild(next);
  if (form.parentNode) form.parentNode.appendChild(bar);

  var cur = 0;
  var groups = [];
  var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

  function redrawDots(n, ix) {
    dots.innerHTML = "";
    for (var d = 0; d < n; d++) {
      var dot = document.createElement("span");
      dot.style.cssText =
        "width:8px;height:8px;border-radius:50%;background:" + (d === ix ? "#38bdf8" : "#4b5563");
      dots.appendChild(dot);
    }
  }

  function refreshGroups() {
    var g = buildGroupsFromSchema(form, schema);
    if (!g) g = buildGroupsFromLabels(form);
    groups = g || [];
    if (groups.length < 2) return false;
    if (cur >= groups.length) cur = groups.length - 1;
    if (cur < 0) cur = 0;
    return true;
  }

  if (!refreshGroups() || groups.length < 2) return;

  function announce(ix) {
    var g = groups[ix];
    var t = g ? g.innerText || g.textContent : "";
    if (t) bar.setAttribute("aria-label", t.trim().slice(0, 200));
  }

  function show(ix) {
    if (!refreshGroups() || groups.length < 2) return;
    if (ix < 0) ix = 0;
    if (ix >= groups.length) ix = groups.length - 1;
    cur = ix;
    for (var j = 0; j < groups.length; j++) {
      groups[j].style.display = j === cur ? "" : "none";
      groups[j].style.marginBottom = "1.25rem";
    }
    redrawDots(groups.length, cur);
    var isLast = cur === groups.length - 1;
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
    announce(cur);
  }

  function validateCurrent() {
    var g = groups[cur];
    if (!g) return true;
    var inp = g.querySelector("input, textarea, select");
    if (!inp) return true;
    if (inp.hasAttribute("required") && !String(inp.value || "").trim()) {
      inp.focus();
      return false;
    }
    return true;
  }

  back.onclick = function () {
    if (cur > 0) show(cur - 1);
  };
  next.onclick = function () {
    if (!validateCurrent()) return;
    if (cur < groups.length - 1) show(cur + 1);
  };

  form.addEventListener(
    "input",
    function () {
      var prev = cur;
      if (!refreshGroups()) return;
      if (prev >= groups.length) prev = groups.length - 1;
      show(prev);
    },
    true,
  );

  show(0);
  if (submitBtn) submitBtn.style.display = "none";

  form.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target && ev.target.tagName !== "TEXTAREA") {
      if (cur < groups.length - 1) {
        ev.preventDefault();
        if (validateCurrent()) show(cur + 1);
      }
    }
  });
})();
