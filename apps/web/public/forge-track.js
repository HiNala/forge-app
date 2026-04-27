/* Forge public-page analytics ~5KB raw — queue + beacon (GL-01). */
(function () {
  var C = window.__FORGE_TRACK_CONFIG__;
  if (!C || !C.apiBase) return;
  var B =
    C.apiBase +
    "/p/" +
    encodeURIComponent(C.org) +
    "/" +
    encodeURIComponent(C.page) +
    "/track";
  if (navigator.doNotTrack === "1") return;

  var Q = [];
  var T = null;
  var FLUSH_MS = 2000;
  var MAX_BATCH = 10;

  function cid(k) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function scid(k, v, sec) {
    document.cookie =
      k + "=" + encodeURIComponent(v) + ";path=/;max-age=" + sec + ";SameSite=Lax";
  }
  function vid() {
    var x = cid("forge_v");
    if (!x) {
      x =
        (crypto.randomUUID && crypto.randomUUID()) ||
        "v" + Math.random().toString(36).slice(2);
      scid("forge_v", x, 31536000);
    }
    return x;
  }
  function sid() {
    var x = cid("forge_s");
    var t = Date.now();
    var p = parseInt(cid("forge_sla") || "0", 10) || 0;
    if (!x || t - p > 1800000) {
      x =
        (crypto.randomUUID && crypto.randomUUID()) ||
        "s" + Math.random().toString(36).slice(2);
      scid("forge_s", x, 86400);
    }
    scid("forge_sla", String(t), 86400);
    return x;
  }
  function clientEventId() {
    return crypto.randomUUID ? crypto.randomUUID() : "c" + Math.random().toString(36).slice(2);
  }
  function trimMeta(md) {
    try {
      var s = JSON.stringify(md || {});
      if (s.length > 16000) return { _truncated: true };
      return md || {};
    } catch {
      return {};
    }
  }
  function push(ev, md) {
    Q.push({
      event_type: ev,
      metadata: trimMeta(md),
      visitor_id: vid(),
      session_id: sid(),
      client_event_id: clientEventId(),
    });
    sched();
  }
  function sched() {
    if (T) return;
    T = setTimeout(function () {
      T = null;
      flush();
    }, FLUSH_MS);
    if (Q.length >= MAX_BATCH) flush();
  }
  function flush() {
    if (!Q.length) return;
    var batch = Q.splice(0, MAX_BATCH);
    if (!batch.length) return;
    var body = JSON.stringify({ events: batch });
    try {
      if (navigator.sendBeacon)
        navigator.sendBeacon(B, new Blob([body], { type: "application/json" }));
      else
        fetch(B, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true,
        }).catch(function () {});
    } catch {}
  }
  window.forge = window.forge || {};
  window.forge.track = function (eventType, properties) {
    push(eventType, properties);
  };

  push("page_view", { page_type: C.pageType, page_id: C.pageId });

  var scrollSent = { 25: false, 50: false, 75: false, 100: false };
  document.addEventListener(
    "scroll",
    function () {
      var h = document.documentElement;
      var pct = ((h.scrollTop + h.clientHeight) / Math.max(h.scrollHeight, 1)) * 100;
      [25, 50, 75, 100].forEach(function (m) {
        if (!scrollSent[m] && pct >= m) {
          scrollSent[m] = true;
          push("scroll_depth", { scroll_pct: m });
        }
      });
    },
    { passive: true }
  );

  var io = new IntersectionObserver(
    function (es) {
      es.forEach(function (e) {
        var el = e.target;
        var se = el._fs || (el._fs = { v: false, t: 0, dwellTimer: null });
        if (e.isIntersecting) {
          se.v = true;
          if (!se.t) se.t = Date.now();
          if (se.dwellTimer) clearTimeout(se.dwellTimer);
          se.dwellTimer = setTimeout(function () {
            if (se.v)
              push("section_dwell", {
                section_id: el.getAttribute("data-forge-section") || "",
                dwell_ms: 3000,
              });
          }, 3000);
        } else if (se.v) {
          var d = se.t ? Date.now() - se.t : 0;
          push("section_exit", {
            section_id: el.getAttribute("data-forge-section") || "",
            dwell_ms: d,
          });
          se.v = false;
          se.t = 0;
          if (se.dwellTimer) clearTimeout(se.dwellTimer);
        }
      });
    },
    { threshold: 0.2 }
  );
  document.querySelectorAll("[data-forge-section]").forEach(function (el) {
    io.observe(el);
  });

  document.addEventListener(
    "click",
    function (ev) {
      var fa = ev.target.closest("[data-forge-analytics]");
      if (fa) {
        var evName = fa.getAttribute("data-forge-analytics");
        if (evName) {
          var md = { page_id: C.pageId };
          var lbl = fa.getAttribute("data-link-label");
          if (lbl) md.link_label = lbl;
          var href = fa.getAttribute("href");
          if (href) md.url = href;
          push(evName, md);
          return;
        }
      }
      var t = ev.target.closest("[data-forge-track-cta], [data-forge-cta]");
      if (t)
        push("cta_click", {
          target:
            t.getAttribute("data-forge-track-cta") ||
            t.getAttribute("data-forge-cta") ||
            "cta",
        });
      var a = ev.target.closest("[data-forge-proposal-accept]");
      if (a) push("proposal_accept_click", {});
      var d = ev.target.closest("[data-forge-proposal-decline]");
      if (d) push("proposal_decline", {});
      var ol = ev.target.closest("a[href^='http']");
      if (ol && ol.hostname && ol.hostname !== location.hostname)
        push("outbound_link", { url: ol.href });
    },
    true
  );

  var FS = false,
    FSUB = false,
    DONE = false;
  function unload() {
    if (DONE) return;
    DONE = true;
    if (FS && !FSUB) push("form_abandon", {});
    push("page_leave", { duration_ms: performance.now() | 0 });
    flush();
  }
  window.addEventListener("beforeunload", unload);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") unload();
  });

  document.querySelectorAll("form").forEach(function (form) {
    form.addEventListener(
      "focusin",
      function (e) {
        if (e.target && e.target.name && !FS) {
          FS = true;
          push("form_start", {});
        }
      },
      true
    );
    form.addEventListener(
      "focusout",
      function (e) {
        var t = e.target;
        if (t && t.name)
          push("form_field_touch", { field_id: String(t.name), field: String(t.name) });
      },
      true
    );
    form.addEventListener("submit", function (ev) {
      var act = form.getAttribute("action") || "";
      var u = act.indexOf("http") === 0 ? act : C.apiBase + act;
      ev.preventDefault();
      push("form_submit_attempt", {});
      var fd = new FormData(form);
      fetch(u, { method: "POST", body: fd, headers: { Accept: "application/json" } }).then(
        function (r) {
          if (r.ok) {
            FSUB = true;
            push("form_submit_success", { status: r.status });
          } else push("form_submit_error", { status: r.status });
          flush();
        }
      );
    });
  });
})();
