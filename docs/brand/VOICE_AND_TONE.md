# Forge Voice & Tone

**Philosophy:** Plain, credible, humane — Stripe/Linear seriousness + workshop warmth — **never** conversational filler.

Canonical copy buckets will migrate to **`apps/web/src/lib/copy/`** (keys + rationale). Until full sweep: new strings obey these rules first.

---

## Rules

### Verbs over nouns
- ✅ “Publish page” ❌ “Page actions modal”.

### Specific over vague
- ✅ “Forge Credits reset Sundays 00:00 UTC” ❌ “Resets weekly sometime.”.

### Plain over corporate
- ✅ “We couldn’t reach Stripe — try again shortly.” ❌ “A fault occurred during synchronous payment orchestration.”

### Honest over hype
Inside product/marketing truthful surfaces: ✅ “Exports to Webflow are not supported yet.” ❌ vague “Soon!” placeholders.

---

## Forbidden patterns (avoid)
- Promo superlatives: “Awesome”, “Amazing”, “Incredible” (unless verbatim user citation).
- Forced chirp openers (“Hey!”) inside production chrome.
- Unhedged vague AI claims (“powerful AI”).
- gratuitous punctuation (`!!!`).
- Emoji in **product chrome** chrome (routing, dialogs, dashboards). Allowed in testimonials / inbound user content contexts.

Celebratory confirmations (first signup, milestone) may omit exclamation-heavy copy — prefer restrained confirmation.

---

## Error pattern

BAD: generic error fallback.

GOOD component:
1. **What failed**
2. **What was not persisted**
3. **Next retry / support path**

Example: “Stripe did not acknowledge the billing update — limits did not change. Try again shortly or contact billing support.”


---

### Empty-state pattern

BAD: whimsical cheer.

GOOD: instructive neutrality — “No submissions yet. Publish and share your page link — replies appear here.”


---

Translations later treat `apps/web/src/lib/copy/` source keys as ICU-ready string ids.
