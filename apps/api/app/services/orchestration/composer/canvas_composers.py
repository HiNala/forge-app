"""Dedicated mobile + multi-page web composers (AL-03)."""

from __future__ import annotations

from app.services.orchestration.composer.base import BaseComposer


class MobileAppComposer(BaseComposer):
    """iOS/Android-style canvases."""

    workflow_key = "mobile_app"
    role = "mobile_composer"
    prompt_file = "mobile_app.v1.md"


class WebsiteComposer(BaseComposer):
    """MultiBreakpoint web canvases."""

    workflow_key = "website"
    role = "web_composer"
    prompt_file = "website.v1.md"
