# Figma import (P-08 — roadmap)

## Goal

Let designers start from a **.fig** export or a **Figma file URL** (OAuth) and land a first-pass **Forge web or mobile** layout without redrawing from scratch.

## What will map (when implemented)

- Top-level **frames** → page sections.
- **Auto layout** children → simple flex column/row.
- **Text** → `text` components with a Tailwind-approximate type scale.
- **Vector / image fills** → `image` components backed by stored assets in Forge.

## What will not (honest list)

- Prototype connections, **smart animate**, and plugin output.
- Dev Mode code embeds and third-party Figma plugin layers.
- Deep variant matrices — a single representative **variant** or a raster fallback.
- Exotic auto-layout (hug+fill+mixed constraints) that does not have a 1:1 in Forge — fall back to **raster of that node** with a “convert in Studio” chip.

## Connection model

- **File upload** — `.fig` binary parsed on the server (format-dependent libraries TBD).
- **OAuth (read-only)** — user connects Figma, pastes a file link; we pull via the public REST file endpoint.

## Status

Milestone work is tracked in the main repo — this document is the **contract** for what we promise users once import ships.
