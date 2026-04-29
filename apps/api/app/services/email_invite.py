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
            "subject": f"You're invited to {organization_name} on GlideDesign",
            "html": (
                f'<div style="font-family:Inter,Arial,sans-serif;background:#f7f5ff;padding:32px;">'
                f'<div style="max-width:560px;margin:0 auto;background:white;border-radius:24px;padding:28px;">'
                f'<p style="margin:0 0 12px;color:#6651ff;font-weight:800;">GlideDesign</p>'
                f"<h1 style=\"margin:0 0 12px;color:#151120;\">You're invited to {organization_name}</h1>"
                f'<p style="color:#4f4b5f;line-height:1.6;">GlideDesign turns plain English into '
                f"product strategy, screens, code, and next moves. Open the link to join this workspace.</p>"
                f'<p><a href="{accept_url}" style="display:inline-block;'
                f"background:linear-gradient(95deg,#6651ff,#ff6e57);color:white;text-decoration:none;"
                f'border-radius:14px;padding:12px 18px;font-weight:800;">Accept invitation</a></p>'
                f'<p style="margin-top:28px;color:#8a8498;font-size:12px;">GlideDesign · glidedesign.ai</p>'
                f"</div></div>"
            ),
            "text": (
                f"You've been invited to join {organization_name} on GlideDesign.\n\n"
                f"Accept invitation: {accept_url}\n\n"
                "GlideDesign - glidedesign.ai"
            ),
        }
    )
