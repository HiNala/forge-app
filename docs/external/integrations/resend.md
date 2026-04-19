# Resend — Reference for Forge

**Version:** Python SDK 2.x
**Last researched:** 2026-04-19

## What Forge Uses

Resend for all transactional email: submission notifications, confirmations, replies, team invitations.

## Setup

```bash
uv add resend
```

```python
# app/services/email.py
import resend
from app.config import settings

resend.api_key = settings.RESEND_API_KEY

async def send_notification_email(to: list[str], subject: str, html: str):
    """Send notification to page owner when a submission arrives."""
    params = {
        "from": settings.EMAIL_FROM,
        "to": to,
        "subject": subject,
        "html": html,
    }
    return resend.Emails.send(params)

async def send_confirmation_email(to: str, subject: str, html: str):
    """Send confirmation to the form submitter."""
    params = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
        "reply_to": settings.EMAIL_REPLY_TO,
    }
    return resend.Emails.send(params)

async def send_reply_email(to: str, subject: str, body: str, reply_to: str):
    """Send reply from page owner to submitter."""
    params = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": body,
        "reply_to": reply_to,
    }
    return resend.Emails.send(params)

async def send_invite_email(to: str, invite_url: str, org_name: str):
    """Send team invitation."""
    params = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": f"You've been invited to {org_name} on Forge",
        "html": f'<p>Click <a href="{invite_url}">here</a> to join {org_name}.</p>',
    }
    return resend.Emails.send(params)
```

## Webhook Events

```python
# POST /api/v1/email/webhook
# Events: email.sent, email.delivered, email.bounced, email.complained
@router.post("/email/webhook")
async def email_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get("type")
    if event_type == "email.bounced":
        # Mark notification as failed, alert user in dashboard
        pass
```

## Known Pitfalls

1. **Domain verification**: Must verify your sending domain in Resend dashboard.
2. **Rate limits**: Default 10 emails/second. Sufficient for Forge's scale.
3. **SDK is sync**: Wrap in `asyncio.to_thread()` if blocking is a concern, or use httpx directly.

## Links
- [Resend Docs](https://resend.com/docs)
- [Python SDK](https://resend.com/docs/sdks/python)
