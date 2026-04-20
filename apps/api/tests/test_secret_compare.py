"""Tests for :mod:`app.core.secret_compare`."""

from __future__ import annotations

from app.core.secret_compare import constant_time_str_equal


def test_equal_strings() -> None:
    assert constant_time_str_equal("same", "same") is True


def test_unequal_strings() -> None:
    assert constant_time_str_equal("a", "b") is False


def test_unequal_lengths() -> None:
    assert constant_time_str_equal("short", "much-longer-value") is False
