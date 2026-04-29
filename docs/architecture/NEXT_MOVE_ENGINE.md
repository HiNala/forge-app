# Next Move engine — BP-03

Forge surfaces **exactly one** prioritized next step between the canvas row and action dock (**Next move** strip).

## Current implementation

- **Client heuristic engine:** `apps/web/src/lib/next-move-engine.ts`.
- Computes from page metadata (title/type/status/review scores), BP-02 memory hints, optional analytics inputs.
- **Dismissal:** `sessionStorage` key `forge:next-move-dismissed` tracks per-id dismiss count, cooldown (~4 hours), and permanent suppression after three dismissals.

## Server engine (planned)

Promote persistent `NextMove` after orchestration **`ship`** with **priority/confidence**. Store cooldown server-side keyed by `{user_id, project_id, move_id}` for cross-device coherence.

Adding a **`action_kind`**: extend union in TypeScript (+ API mirror); wire the strip **Open** handler to routing/refine intents.
