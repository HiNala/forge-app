"""GL-03 — Stripe webhook replay matrix (expand with Stripe CLI fixtures + signed payloads)."""

from __future__ import annotations

import pytest


@pytest.mark.skip(reason="Wire Stripe test secrets + event fixtures; scaffold for GL-03 Phase 5.")
def test_checkout_session_completed_flips_plan() -> None:
    raise AssertionError("scaffold: implement replay check")


@pytest.mark.skip(reason="Implement with stripe.Webhook.construct_event + idempotency store.")
def test_duplicate_stripe_event_id_ignored() -> None:
    raise AssertionError("scaffold: implement idempotency check")
