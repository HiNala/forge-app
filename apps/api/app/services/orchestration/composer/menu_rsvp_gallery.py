"""Menu, RSVP, gallery composers."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ComponentTree
from app.services.orchestration.composer.base import BaseComposer


class MenuComposer(BaseComposer):
    workflow_key = "menu"
    prompt_file = "menu.v1.md"
    schema = ComponentTree


class RsvpComposer(BaseComposer):
    workflow_key = "event_rsvp"
    prompt_file = "event_rsvp.v1.md"
    schema = ComponentTree


class GalleryComposer(BaseComposer):
    workflow_key = "gallery"
    prompt_file = "gallery.v1.md"
    schema = ComponentTree
