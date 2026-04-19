# Observability — Forge

## Structured Logging

All backend code uses Python's `logging` module with JSON format. No `print()` statements.

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, "org_id"):
            log_data["org_id"] = record.org_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)
```

## What Gets Logged vs Sentry'd

| Event | Log | Sentry |
|-------|-----|--------|
| Request start/end | ✅ (DEBUG) | ❌ |
| Auth failure | ✅ (WARNING) | ❌ |
| Rate limit hit | ✅ (INFO) | ❌ |
| LLM call (provider, model, tokens, latency) | ✅ (INFO) | ❌ |
| LLM validation failure | ✅ (WARNING) | ✅ |
| Unhandled exception | ✅ (ERROR) | ✅ |
| Background job failure | ✅ (ERROR) | ✅ |
| Database connection error | ✅ (CRITICAL) | ✅ |
| Cross-tenant access attempt | ✅ (WARNING) | ✅ |

## Metrics We Want

1. **Request count** — per endpoint, per status code
2. **LLM token usage** — per tenant, per model, per operation type
3. **LLM latency** — p50, p95, p99 per model
4. **Submission count** — per page, per day
5. **Background job success/failure rate** — per job type
6. **Active users** — DAU/MAU (via PostHog)
7. **Page generation success rate** — % that pass validation on first try

## PII Policy

- **Never log**: passwords, full email addresses, file contents, submission payloads
- **Log with masking**: email domain only (`user@***.com`), last 4 of phone
- **Sentry scrubbing**: Configure `before_send` to strip PII fields
- **Analytics IP anonymization**: Truncate source_ip to /24 after 30 days via worker job
