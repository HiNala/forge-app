# ruff: noqa: E501
"""Web-native scrollable deck HTML (W-03) — no executable scripts in stored document."""

from __future__ import annotations

import html as html_lib
import json
from typing import Any

from app.db.models import Deck, Page


def _esc(s: str | None) -> str:
    return html_lib.escape(s or "", quote=True)


def _render_metrics(slide: dict[str, Any]) -> str:
    parts: list[str] = []
    for m in slide.get("metrics") or []:
        if not isinstance(m, dict):
            continue
        parts.append(
            "<div class='forge-metric'>"
            f"<span class='forge-metric-value'>{_esc(str(m.get('value','')))}</span>"
            f"<span class='forge-metric-label'>{_esc(str(m.get('label','')))}</span>"
            f"<span class='forge-metric-sub'>{_esc(str(m.get('sublabel') or ''))}</span>"
            "</div>"
        )
    return "<div class='forge-metrics'>" + "".join(parts) + "</div>"


def _render_team(slide: dict[str, Any]) -> str:
    cards: list[str] = []
    for t in slide.get("team_members") or []:
        if not isinstance(t, dict):
            continue
        cards.append(
            "<div class='forge-team-card'>"
            f"<div class='forge-team-name'>{_esc(str(t.get('name','')))}</div>"
            f"<div class='forge-team-role'>{_esc(str(t.get('role') or ''))}</div>"
            f"<p class='forge-team-bio'>{_esc(str(t.get('bio') or ''))}</p>"
            "</div>"
        )
    return "<div class='forge-team-grid'>" + "".join(cards) + "</div>"


def _chart_data_table(chart: dict[str, Any]) -> str:
    """Screen-reader–accessible copy of chart numbers (W-03 accessibility)."""
    raw_la = chart.get("labels")
    raw_se = chart.get("series")
    labels: list[Any] = list(raw_la) if isinstance(raw_la, list) else []
    series: list[Any] = list(raw_se) if isinstance(raw_se, list) else []
    heads = "".join(
        f"<th scope='col'>{_esc(str(s.get('name', f'Series {i}')))}</th>"
        for i, s in enumerate(series)
        if isinstance(s, dict)
    )
    body_rows: list[str] = []
    for li, lab in enumerate(labels):
        cells = []
        for s in series:
            if not isinstance(s, dict):
                continue
            raw_data = s.get("data")
            data: list[Any] = raw_data if isinstance(raw_data, list) else []
            val = data[li] if li < len(data) else ""
            cells.append(f"<td>{_esc(str(val))}</td>")
        body_rows.append(
            "<tr>"
            f"<th scope='row'>{_esc(str(lab))}</th>"
            + "".join(cells)
            + "</tr>"
        )
    if not body_rows:
        body_rows.append("<tr><td colspan='99'>No chart data</td></tr>")
    return (
        "<table class='forge-chart-sr-only'>"
        "<caption>Chart data</caption><thead><tr>"
        "<th scope='col'>Label</th>"
        f"{heads}</tr></thead><tbody>{''.join(body_rows)}</tbody></table>"
    )


def _render_chart(slide: dict[str, Any]) -> str:
    ch = slide.get("chart")
    if not isinstance(ch, dict):
        return ""
    raw = json.dumps(ch, ensure_ascii=False)
    cap = _esc(str(ch.get("title") or slide.get("title") or "Chart"))
    placeholder_note = ""
    if ch.get("is_placeholder"):
        placeholder_note = (
            "<p class='forge-chart-placeholder' data-studio-only='1'>Draft data — "
            f"{_esc(str(ch.get('source_hint') or 'Replace with your numbers.'))}</p>"
        )
    sr_table = _chart_data_table(ch)
    return (
        f"<figure class='forge-deck-chart' aria-label='{cap}'>"
        f"{placeholder_note}"
        "<canvas width='900' height='420' class='forge-chart-canvas' role='img'></canvas>"
        f"<pre class='forge-chart-json'>{_esc(raw)}</pre>"
        f"{sr_table}"
        "</figure>"
    )


def _render_image(slide: dict[str, Any]) -> str:
    img = slide.get("image")
    if not isinstance(img, dict):
        return ""
    if img.get("url"):
        return (
            f"<figure class='forge-deck-image'><img src='{_esc(img['url'])}' alt='{_esc(str(img.get('alt') or ''))}' />"
            "</figure>"
        )
    prompt = _esc(str(img.get("prompt") or "Visual"))
    return (
        f"<div class='forge-deck-image-placeholder' data-image-prompt='{prompt}'>"
        "<span>Image loading…</span></div>"
    )


def _render_slide_body(slide: dict[str, Any]) -> str:
    layout = str(slide.get("layout") or "single_takeaway")
    if layout == "big_number":
        return _render_metrics(slide)
    if layout == "chart":
        return _render_chart(slide)
    if layout == "team_grid":
        return _render_team(slide)
    if layout in ("image_full", "image_with_caption", "title_cover"):
        return _render_image(slide)
    if layout == "quote":
        q = slide.get("quote")
        if isinstance(q, dict):
            return (
                "<blockquote class='forge-deck-quote'>"
                f"<p>{_esc(str(q.get('text','')))}</p>"
                f"<cite>{_esc(str(q.get('attribution') or ''))}</cite>"
                "</blockquote>"
            )
    bullets = slide.get("bullets") or []
    bul = ""
    if isinstance(bullets, list) and bullets:
        bul = "<ul class='forge-deck-bullets'>" + "".join(
            f"<li>{_esc(str(x))}</li>" for x in bullets
        ) + "</ul>"
    body = slide.get("body")
    body_html = f"<div class='forge-deck-body'>{_esc(str(body))}</div>" if body else ""
    return body_html + bul


def render_deck_html(
    *,
    org_name: str,
    org_slug: str,
    page: Page,
    deck: Deck,
    primary: str = "#2563EB",
    secondary: str = "#0F172A",
) -> str:
    """Single scroll-snap page; each slide is a 16:9 section with stable anchors."""
    slides_raw = deck.slides if isinstance(deck.slides, list) else []
    slides = [s for s in slides_raw if isinstance(s, dict)]
    slides_sorted = sorted(slides, key=lambda x: int(x.get("order", 0)))
    total = len(slides_sorted)
    theme = deck.theme if isinstance(deck.theme, dict) else {}
    primary_c = str(theme.get("primary", primary))
    secondary_c = str(theme.get("secondary", secondary))

    parts: list[str] = []
    for idx, sl in enumerate(slides_sorted):
        sid = str(sl.get("id") or f"slide_{idx}")
        order_num = idx + 1
        role = str((sl.get("metadata") or {}).get("role") or "")
        frag = order_num
        tid = f"title-slide-{frag}"
        title = sl.get("title")
        sub = sl.get("subtitle")
        inner = _render_slide_body(sl)
        notes = sl.get("speaker_notes")
        notes_html = ""
        if notes:
            notes_html = (
                f"<aside class='forge-speaker-notes' data-forge-notes-for='slide-{frag}'>"
                f"<p>{_esc(str(notes))}</p></aside>"
            )
        parts.append(
            f"<section id='slide-{frag}' class='forge-slide' role='region' "
            f"aria-labelledby='{tid}' data-forge-slide='{_esc(sid)}' "
            f"data-forge-section='{_esc(sid)}' data-layout='{_esc(str(sl.get('layout')))}'>"
            f"<div class='forge-slide-inner'>"
            f"<header><h2 id='{tid}' class='forge-slide-title'>{_esc(str(title or ''))}</h2>"
            f"<p class='forge-slide-sub'>{_esc(str(sub or ''))}</p></header>"
            f"<div class='forge-slide-content'>{inner}</div>"
            f"<footer class='forge-slide-num'>{order_num} / {total}</footer>"
            f"{notes_html}"
            f"<span class='forge-slide-role sr-only'>{_esc(role)}</span>"
            "</div>"
            "</section>"
        )

    body = (
        f"<div class='forge-deck-root' data-org-slug='{_esc(org_slug)}' data-page-slug='{_esc(page.slug)}'>"
        "<nav class='forge-deck-toc' aria-label='Slides'><ol>"
        + "".join(
            f"<li><a href='#slide-{i+1}'>{_esc(str(s.get('title') or f'Slide {i+1}'))}</a></li>"
            for i, s in enumerate(slides_sorted)
        )
        + "</ol></nav>"
        + "<div class='forge-deck-scroll'>"
        + "".join(parts)
        + "</div></div>"
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{_esc(page.title)}</title>
  <style>
    :root {{
      --deck-primary: {primary_c};
      --deck-secondary: {secondary_c};
    }}
    body {{ margin: 0; background: #0f172a0d; color: #111827;
      font-family: system-ui, Segoe UI, Roboto, sans-serif; line-height: 1.45; }}
    .forge-deck-root {{ max-width: 1200px; margin: 0 auto; }}
    .forge-deck-toc {{ padding: 1rem; background: #fff; position: sticky; top: 0; z-index: 2;
      border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }}
    .forge-deck-toc ol {{ margin: 0; padding-left: 1.25rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }}
    .forge-deck-toc a {{ color: var(--deck-primary); text-decoration: none; }}
    .forge-deck-scroll {{ scroll-snap-type: y mandatory; max-height: 100vh; overflow-y: auto; }}
    .forge-slide {{ scroll-snap-align: start; min-height: min(100vh, 56.25vw);
      max-width: 100%; margin: 0 auto; border-bottom: 1px solid #e5e7eb;
      background: #fff; display: flex; align-items: center; justify-content: center; }}
    .forge-slide-inner {{ width: 100%; max-width: 1120px; padding: 3rem 2rem 4rem;
      box-sizing: border-box; position: relative; }}
    .forge-slide-title {{ font-family: Georgia, 'Times New Roman', serif; font-size: clamp(1.75rem, 4vw, 3rem);
      font-weight: 600; margin: 0 0 0.5rem; }}
    .forge-slide-sub {{ color: #4b5563; font-size: clamp(1rem, 2vw, 1.25rem); margin: 0 0 1rem; }}
    .forge-slide-content {{ font-size: clamp(1rem, 1.8vw, 1.35rem); }}
    .forge-slide-num {{ position: absolute; right: 1.5rem; bottom: 1rem; font-size: 0.85rem; color: #9ca3af; }}
    .forge-deck-bullets {{ margin: 0; padding-left: 1.2rem; }}
    .forge-deck-bullets li {{ margin: 0.35rem 0; }}
    .forge-metric {{ text-align: center; margin: 1rem 0; }}
    .forge-metric-value {{ display: block; font-size: clamp(3rem, 10vw, 7rem); font-weight: 700;
      color: var(--deck-primary); line-height: 1; }}
    .forge-metric-label {{ font-size: 1.25rem; }}
    .forge-team-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }}
    .forge-team-card {{ border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: #fafafa; }}
    .forge-chart-json {{ display: none; }}
    .forge-deck-quote {{ font-family: Georgia, serif; font-size: 1.5rem; margin: 1rem 0; }}
    .forge-deck-quote cite {{ display: block; margin-top: 0.75rem; font-size: 1rem; font-style: normal;
      color: #6b7280; }}
    .forge-speaker-notes {{ display: none; margin-top: 1.5rem; padding: 1rem; background: #f9fafb;
      border-left: 3px solid var(--deck-secondary); font-size: 0.95rem; color: #374151; }}
    body[data-show-notes='1'] .forge-speaker-notes {{ display: block; }}
    .sr-only {{ position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); border: 0; }}
    @media print {{
      .forge-deck-toc {{ display: none; }}
      .forge-slide {{ break-inside: avoid; min-height: auto; page-break-after: always; }}
    }}
  </style>
</head>
<body data-forge-deck="1" data-forge-org-name="{_esc(org_name)}">
{body}
</body>
</html>"""
