"""Section-edit graph — entry → section intent → composer → validator → persister (O-02 stub).

The live path still uses `section_editor.edit_section_html` + DB writes from the Studio route.
This module documents the intended graph shape for a future consolidation with `graph.py`.
"""

from __future__ import annotations

# Planned nodes (names only — implementation remains in `section_editor.py` + API):
#   entry → section_intent_parser → section_composer → section_validator → persister → terminal
