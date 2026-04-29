"""Studio pipeline façade — forwards to legacy (BP-01); product brain is wired in ``product_brain``."""

from __future__ import annotations

from app.services.orchestration.legacy_pipeline import (
    StudioPipelineState,
    complete_studio_prep_from_gathered,
    gather_studio_context_bundle,
    prepare_studio_page_generation,
    stream_page_generation,
    stream_studio_page_generation_tail,
)

__all__ = [
    "StudioPipelineState",
    "complete_studio_prep_from_gathered",
    "gather_studio_context_bundle",
    "prepare_studio_page_generation",
    "stream_page_generation",
    "stream_studio_page_generation_tail",
]
