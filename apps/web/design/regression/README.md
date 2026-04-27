# Visual regression (P-09)

This folder is reserved for **light + dark**, **desktop + mobile** baseline screenshots of primary surfaces, committed after intentional design changes.

**Process**

1. Use a single viewport contract (e.g. 1440×900 desktop, 390×844 mobile).
2. Capture each route listed in the mission report before/after significant UI work.
3. Store PNGs with stable names, e.g. `settings-usage-light.png`, `admin-pulse-dark.png`.
4. Compare in review — any diff should map to a ticket or a deliberate token change.

Automation is optional; the discipline is a fixed checklist per release.
