"""Resolve voice profile from context bundle."""

from __future__ import annotations

from app.services.context.models import ContextBundle, VoiceProfile


def voice_from_bundle(bundle: ContextBundle | None) -> VoiceProfile:
    if bundle is None:
        return VoiceProfile()
    if bundle.user_voice and bundle.user_voice.persona_summary:
        return bundle.user_voice
    if bundle.site_voice and bundle.site_voice.persona_summary:
        return bundle.site_voice
    return VoiceProfile()
