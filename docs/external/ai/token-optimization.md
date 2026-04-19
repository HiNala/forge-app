# Token Optimization — Reference for Forge

**Version:** N/A
**Last researched:** 2026-04-19

## Key Techniques for Forge

### 1. Section-Targeted Editing (10x Cheaper)
Instead of sending the full page HTML for every edit, send only the clicked section:
- Full page: ~3000 tokens prompt → $0.03 per edit
- Single section: ~300 tokens prompt → $0.003 per edit

### 2. Component Library Reference
Include a compact reference of available HTML/CSS blocks in the system prompt. The LLM composes from these rather than inventing CSS each time.

### 3. Structured Intent Parsing
Use the fast model to extract structured intent (JSON) from the user's prompt. Then pass structured data to the page composer. This avoids the heavy model re-interpreting natural language.

### 4. Prompt Trimming
- Strip HTML comments from section HTML before sending
- Minify whitespace in HTML tokens
- Use abbreviated class names in the component library

### 5. Dual-Tier Model Strategy
- **Heavy model**: Full page generation, complex structural changes
- **Fast model**: Section edits, refinement chips, intent parsing, reply drafts

### 6. Session Context Reuse
Keep conversation context in the database, but only send the last 2-3 messages + the current HTML state to the LLM. Don't send the full chat history.

## Cost Target

PRD target: < $0.50/tenant/month for free-tier (1 page, ~5 edits).
- 1 generation: $0.03
- 5 section edits: 5 × $0.0005 = $0.0025
- Total: ~$0.035 per page lifecycle

## Links
- See `docs/architecture/AI_ORCHESTRATION.md` for the full pipeline design
