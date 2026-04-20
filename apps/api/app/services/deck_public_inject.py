# ruff: noqa: E501, W605 — embedded CSS/JS snippets
from __future__ import annotations

import re
from html import escape as html_escape
from urllib.parse import quote

_PUBLIC_SLIDE_STYLE = """
<style id="forge-deck-public-style">
  html:has([data-forge-deck-root]) { scroll-snap-type: y mandatory; overflow-y: auto; height: 100%; }
  [data-forge-deck-root] [data-forge-slide] {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    min-height: 100vh;
    box-sizing: border-box;
    padding: clamp(16px, 5vw, 56px);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  [data-forge-deck-root] .forge-deck-chart { margin: 12px 0; max-width: min(980px, 100%); }
  [data-forge-deck-root] .forge-deck-chart .forge-chart-canvas {
    width: 100% !important; max-width: 900px; height: auto !important; display: block;
  }
  [data-forge-deck-root] .forge-chart-json { display: none; }
  [data-forge-deck-root] .forge-chart-sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
  [data-forge-deck-root][data-forge-mode="present"] [data-forge-slide] {
    min-height: 100vh;
    border-bottom: 1px solid rgba(0,0,0,0.08);
  }
  html[dir="rtl"] [data-forge-deck-root][data-forge-mode="present"] [data-forge-slide] {
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  [data-forge-deck-ui] {
    position: fixed; z-index: 50; bottom: 14px; right: 14px; display: flex; gap: 8px;
    flex-wrap: wrap; align-items: center; justify-content: flex-end;
    font-family: system-ui, sans-serif; font-size: 12px;
  }
  [data-forge-deck-ui] button {
    border: 1px solid rgba(0,0,0,0.2); background: rgba(255,255,255,0.95);
    border-radius: 10px; padding: 8px 10px; cursor: pointer;
  }
  [data-forge-deck-ui] span {
    border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.85);
    border-radius: 10px; padding: 8px 10px;
  }
  @media (prefers-color-scheme: dark) {
    [data-forge-deck-ui] button { background: rgba(30,30,30,0.92); color: #eee; border-color: rgba(255,255,255,0.2); }
    [data-forge-deck-ui] span { background: rgba(30,30,30,0.85); color: #ddd; border-color: rgba(255,255,255,0.15); }
  }
</style>
"""


_PUBLIC_SLIDE_SCRIPT = """
<script id="forge-deck-public-js">
(function () {
  var root = document.querySelector("[data-forge-deck-root]");
  if (!root) return;

  function getParam(name) {
    try {
      var pq = window.__FORGE_PARENT_SEARCH__;
      if (pq && typeof pq === "string") {
        var v = new URLSearchParams(pq.replace(/^\\?/, "")).get(name);
        if (v !== null && v !== "") return v;
      }
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  var present = getParam("mode") === "present";
  var notes = getParam("notes") === "true" || getParam("notes") === "1";
  var presenterView = getParam("presenter") === "true" || getParam("presenter") === "1";
  if (present) root.setAttribute("data-forge-mode", "present");
  if (notes) root.setAttribute("data-forge-notes", "true");
  if (presenterView) document.body.setAttribute("data-forge-presenter-view", "1");

  var slideNodes = Array.prototype.slice.call(root.querySelectorAll("[data-forge-slide]"));
  slideNodes.forEach(function (el, i) {
    if (!el.id) el.id = "forge-slide-" + (i + 1);
  });

  function slideIndexFromHash() {
    var h = (window.location.hash || "").replace(/^#/, "");
    var m = /^slide-(\\d+)$/.exec(h);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n >= 1 && n <= slideNodes.length) return n - 1;
    }
    return 0;
  }

  function setHashForIndex(i) {
    var n = Math.max(0, Math.min(slideNodes.length - 1, i)) + 1;
    var next = "#slide-" + n;
    if (window.location.hash !== next) {
      try { history.replaceState(null, "", next); } catch (e) { window.location.hash = "slide-" + n; }
    }
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "forge_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
  }

  function cookieGet(name) {
    var m = document.cookie.match(new RegExp("(?:^|;\\\\s*)" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function cookieSet(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days || 400) * 864e5);
    document.cookie = name + "=" + encodeURIComponent(value) + ";path=/;SameSite=Lax;expires=" + d.toUTCString();
  }

  function getVisitorSession() {
    var vid = cookieGet("forge_vid");
    if (!vid) { vid = uid(); cookieSet("forge_vid", vid); }
    var sid = cookieGet("forge_sid");
    if (!sid) { sid = uid(); cookieSet("forge_sid", sid); }
    return { visitor_id: vid, session_id: sid };
  }

  var visitorSession = getVisitorSession();

  var pushEndpoint = "";
  try { pushEndpoint = String(root.getAttribute("data-forge-track-endpoint") || "").trim(); } catch (e) {}

  function postEvents(batch) {
    if (!pushEndpoint || !batch || !batch.length) return;
    var payload = { events: batch };
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(pushEndpoint, new Blob([body], {type: "application/json"}));
        return;
      } catch (e) {}
    }
    try {
      fetch(pushEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "cache-control": "no-cache" },
        mode: "cors",
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  var lastTrackedSlide = -1;

  function track(name, attrs) {
    var md = {};
    if (attrs && typeof attrs === "object") {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) md[k] = attrs[k];
      }
    }
    postEvents([
      {
        event_type: String(name),
        visitor_id: visitorSession.visitor_id,
        session_id: visitorSession.session_id,
        metadata: md,
      },
    ]);
  }

  if (present) {
    track("present_start", { slide_count: slideNodes.length });
  }

  function onSlideVisible(i) {
    if (!present || i === lastTrackedSlide) return;
    lastTrackedSlide = i;
    track("present_slide_view", { slide_index: i, slide_id: slideNodes[i] ? slideNodes[i].id : "" });
  }

  var io = null;
  try {
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var idx = slideNodes.indexOf(el);
          if (idx < 0) return;
          setHashForIndex(idx);
          onSlideVisible(idx);
        });
      },
      { root: null, threshold: 0.55 }
    );
    slideNodes.forEach(function (el) { io.observe(el); });
  } catch (e) {}

  function currentSlideFromVisibility() {
    var best = 0;
    var bestRatio = 0;
    for (var i = 0; i < slideNodes.length; i++) {
      var r = slideNodes[i].getBoundingClientRect();
      var vh = window.innerHeight || 800;
      var overlap = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      var ratio = overlap / Math.max(1, Math.min(r.height, vh));
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = i;
      }
    }
    return best;
  }

  function scrollToIndex(i) {
    var el = slideNodes[i];
    if (!el) return;
    try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { el.scrollIntoView(true); }
  }

  var firstIdx = slideIndexFromHash();
  setHashForIndex(firstIdx);
  if (firstIdx > 0) {
    setTimeout(function () { scrollToIndex(firstIdx); }, 50);
  }

  window.addEventListener(
    "hashchange",
    function () {
      var idx = slideIndexFromHash();
      scrollToIndex(idx);
    },
    false
  );

  window.addEventListener(
    "keydown",
    function (e) {
      if (!present || !slideNodes.length) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      var cur = slideIndexFromHash();
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setHashForIndex(cur + 1);
        scrollToIndex(slideIndexFromHash());
      } else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") {
        e.preventDefault();
        setHashForIndex(cur - 1);
        scrollToIndex(slideIndexFromHash());
      } else if (e.key === "Home") {
        e.preventDefault();
        setHashForIndex(0);
        scrollToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setHashForIndex(slideNodes.length - 1);
        scrollToIndex(slideNodes.length - 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        endPresent("escape");
        try {
          if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
        } catch (err) {}
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        window.alert(
          "Keyboard shortcuts (present mode):\\n" +
          "→ Space PageDn — next slide\\n" +
          "← Backspace PageUp — previous\\n" +
          "Home / End — first / last slide\\n" +
          "Esc — exit fullscreen\\n" +
          "Click — next slide"
        );
      }
    },
    true
  );

  /* -------- Chart.js: render charts from JSON (no executable scripts in stored HTML) -------- */
  function chartJsReady(cb) {
    if (window.Chart) return cb();
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
    s.async = true;
    s.onload = function () { cb(); };
    s.onerror = function () { /* optional CDN fallback */ };
    document.head.appendChild(s);
  }

  function mapChartType(t) {
    if (t === "line" || t === "area") return "line";
    if (t === "pie" || t === "doughnut") return "pie";
    return "bar";
  }

  function buildDatasets(chart) {
    var series = chart.series || [];
    var labels = chart.labels || [];
    var cht = String(chart.chart_type || chart.type || "");
    var ty = mapChartType(cht);
    if (ty === "pie") {
      var s0 = series[0] || {};
      var ds0 = {
        label: String(s0.name || ""),
        data: Array.isArray(s0.data) ? s0.data.map(function (v) { return Number(v); }) : [],
      };
      if (s0.color) ds0.backgroundColor = s0.color;
      return { labels: labels.map(String), datasets: [ds0] };
    }
    var out = [];
    for (var i = 0; i < series.length; i++) {
      var s = series[i] || {};
      var ds = {
        label: String(s.name || "Series"),
        data: Array.isArray(s.data) ? s.data.map(function (v) { return Number(v); }) : [],
      };
      if (ty === "line") {
        ds.fill = cht === "area";
        ds.tension = 0.25;
      }
      if (s.color) {
        ds.borderColor = s.color;
        ds.backgroundColor = s.color;
      }
      out.push(ds);
    }
    return { labels: labels.map(String), datasets: out };
  }

  function initCharts() {
    chartJsReady(function () {
      var figures = root.querySelectorAll(".forge-deck-chart");
      figures.forEach(function (fig) {
        var pre = fig.querySelector("pre.forge-chart-json");
        var canvas = fig.querySelector("canvas.forge-chart-canvas");
        if (!pre || !canvas) return;
        var text = (pre.textContent || "").trim();
        if (!text) return;
        var chartSpec;
        try { chartSpec = JSON.parse(text); } catch (e) { return; }
        var Chart = window.Chart;
        var ty = mapChartType(chartSpec.chart_type || chartSpec.type || "");
        var built = buildDatasets(chartSpec);
        var opts = { responsive: true, maintainAspectRatio: true, animation: false };
        if (ty !== "pie") {
          opts.scales = { x: { ticks: { maxRotation: 0 } }, y: { beginAtZero: true } };
        }
        try {
          new Chart(canvas.getContext("2d"), { type: ty, data: built, options: opts });
        } catch (e) {}
      });
    });
  }

  initCharts();

  /* -------- Presenter UI -------- */
  var ui = document.createElement("div");
  ui.setAttribute("data-forge-deck-ui", "true");
  var spSlide = document.createElement("span");
  spSlide.textContent = "Slide 1 / " + Math.max(1, slideNodes.length);
  var btnFs = document.createElement("button");
  btnFs.type = "button";
  btnFs.textContent = "Fullscreen";
  btnFs.setAttribute("aria-label", "Toggle fullscreen");
  var btnPrev = document.createElement("button");
  btnPrev.type = "button";
  btnPrev.textContent = "←";
  btnPrev.setAttribute("aria-label", "Previous slide");
  var btnNext = document.createElement("button");
  btnNext.type = "button";
  btnNext.textContent = "→";
  btnNext.setAttribute("aria-label", "Next slide");

  if (present || notes) {
    ui.appendChild(spSlide);
    ui.appendChild(btnPrev);
    ui.appendChild(btnNext);
    ui.appendChild(btnFs);
    document.body.appendChild(ui);
  }

  function updateSlideLabel() {
    var idx = present ? slideIndexFromHash() : currentSlideFromVisibility();
    spSlide.textContent = "Slide " + (idx + 1) + " / " + Math.max(1, slideNodes.length);
  }

  updateSlideLabel();
  setInterval(updateSlideLabel, 600);

  btnPrev.addEventListener("click", function () {
    var cur = slideIndexFromHash();
    setHashForIndex(cur - 1);
    scrollToIndex(slideIndexFromHash());
    updateSlideLabel();
  });
  btnNext.addEventListener("click", function () {
    var cur = slideIndexFromHash();
    setHashForIndex(cur + 1);
    scrollToIndex(slideIndexFromHash());
    updateSlideLabel();
  });

  btnFs.addEventListener("click", function () {
    var d = document.documentElement;
    if (!document.fullscreenElement) {
      try {
        (d.requestFullscreen || d.webkitRequestFullscreen || d.mozRequestFullScreen || d.msRequestFullscreen).call(d);
      } catch (e) {}
    } else {
      try {
        (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen).call(document);
      } catch (e) {}
    }
  });

  window.addEventListener(
    "scroll",
    function () {
      if (present) return;
      updateSlideLabel();
    },
    { passive: true }
  );

  function endPresent(reason) {
    track("present_end", { reason: reason || "unknown" });
  }

  window.addEventListener("beforeunload", function () { if (present) endPresent("beforeunload"); });
  document.addEventListener("visibilitychange", function () {
    if (present && document.visibilityState === "hidden") endPresent("visibility");
  });

  if (notes) {
    document.body.setAttribute("data-show-notes", "1");
  }
})();
</script>
"""


_STYLE_TAG_RE = re.compile(r"<style[^>]*data-forge-runtime[^>]*>", re.IGNORECASE)
_SCRIPT_TAG_RE = re.compile(r"<script[^>]*data-forge-runtime[^>]*>", re.IGNORECASE)


def inject_public_deck_runtime_into_html(html: str, *, page_id: str, track_endpoint: str) -> str:
    """
    Inject deck scroll/presenter runtime into published page HTML.
    Safe: no executable third-party script from stored page body; only our bundle + Chart.js from CDN.
    """
    if not html or "forge-deck-root" not in html:
        return html

    pid = (page_id or "").strip()
    ep = (track_endpoint or "").strip()
    extra = ' data-forge-deck-root=""'
    if ep:
        extra += f' data-forge-track-endpoint="{html_escape(ep, quote=True)}"'
    if pid:
        extra += f' data-forge-page-id="{html_escape(pid, quote=True)}"'

    sq_open = "<div class='forge-deck-root'"
    dq_open = '<div class="forge-deck-root"'
    html2 = html
    if sq_open in html2:
        html2 = html2.replace(sq_open, sq_open + extra, 1)
    elif dq_open in html2:
        html2 = html2.replace(dq_open, dq_open + extra, 1)
    else:
        return html

    if _STYLE_TAG_RE.search(html2):
        html2 = _STYLE_TAG_RE.sub(_PUBLIC_SLIDE_STYLE.strip(), html2, count=1)
    else:
        html2 = html2.replace("</head>", _PUBLIC_SLIDE_STYLE + "</head>", 1)

    if _SCRIPT_TAG_RE.search(html2):
        html2 = _SCRIPT_TAG_RE.sub(_PUBLIC_SLIDE_SCRIPT.strip(), html2, count=1)
    else:
        html2 = html2.replace("</body>", _PUBLIC_SLIDE_SCRIPT + "</body>", 1)

    return html2


def inject_deck_public_runtime(
    html: str,
    *,
    api_base: str,
    org_slug: str,
    page_slug: str,
    page_id: str = "",
) -> str:
    """Augment published pitch deck HTML at read time (public GET)."""
    base = api_base.rstrip("/")
    ep = f"{base}/p/{quote(org_slug, safe='')}/{quote(page_slug, safe='')}/track"
    return inject_public_deck_runtime_into_html(html, page_id=page_id, track_endpoint=ep)
