"""Contact / booking form composer."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ComponentTree
from app.services.orchestration.composer.base import BaseComposer


class ContactFormComposer(BaseComposer):
    workflow_key = "contact_form"
    prompt_file = "contact_form.v1.md"
    schema = ComponentTree
