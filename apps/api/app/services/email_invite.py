"""Send team invitations via Resend."""

from __future__ import annotations

from app.config import settings


async def send_team_invitation_email(
    *,
    to_email: str,
    organization_name: str,
    accept_url: str,
) -> None:
    if not settings.RESEND_API_KEY:
        return
    import resend

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(
        {
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": f"You're invited to {organization_name} on Forge (mini-app platform)",
            "html": (
                f"<p>You've been invited to join <strong>{organization_name}</strong> on Forge — "
                f"the mini-app platform. Describe a form, page, or deck; ship a link; track it.</p>"
                f'<p><a href="{accept_url}">Accept invitation</a></p>'
            ),
        }
    )
