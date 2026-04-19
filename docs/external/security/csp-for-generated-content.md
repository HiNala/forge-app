# CSP for Generated Content — Reference for Forge

**Version:** N/A
**Last researched:** 2026-04-19

## The Problem

Forge serves user-generated HTML pages at public URLs. These pages contain inline CSS and a small submission handler script. We need a Content-Security-Policy that:
1. Allows our inline styles (the generated page CSS)
2. Allows our submission handler script
3. Blocks all other scripts (XSS protection)

## Solution: Nonce-Based CSP

```python
# When serving a generated page
import secrets

def get_page_csp(nonce: str) -> str:
    return "; ".join([
        "default-src 'none'",
        f"script-src 'nonce-{nonce}'",
        "style-src 'unsafe-inline'",  # Generated pages have inline CSS
        "img-src 'self' data: https:",  # Allow images from our domain and data URIs
        "font-src 'self' https://fonts.gstatic.com",  # Google Fonts
        "connect-src 'self'",  # Allow fetch to our submission endpoint
        "form-action 'self'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
    ])

# In the page serving endpoint
nonce = secrets.token_urlsafe(16)
csp = get_page_csp(nonce)
# Add nonce to the script tag in the generated HTML
# Return with Content-Security-Policy header
```

## Generated Page Script Tag

```html
<!-- The submission handler gets the nonce -->
<script nonce="{{nonce}}">
  document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const res = await fetch('/p/{{slug}}/submit', {
      method: 'POST',
      body: data,
    });
    // Show confirmation
  });
</script>
```

## Known Pitfalls

1. **`unsafe-inline` for styles is OK**: Generated pages have inline CSS by design. The risk is low since we control the generation.
2. **Nonce must be unique per request**: Generate a new nonce for every page load.
3. **No `unsafe-eval`**: Never allow eval in generated pages.
4. **Test with Report-Only first**: Use `Content-Security-Policy-Report-Only` during development.

## Links
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
