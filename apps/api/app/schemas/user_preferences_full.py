"""Typed user preferences (BI-04) — merged with DB JSONB on read/write."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserNotificationPreferences(BaseModel):
    email_on_submission: bool = True
    email_on_automation_failure: bool = True
    email_weekly_summary: bool = True
    email_trial_reminder: bool = True
    email_product_updates: bool = False
    browser_push_enabled: bool = False
    digest_cadence: Literal["realtime", "daily_9am", "weekly_monday", "never"] = "realtime"


class UserNotificationPreferencesPartial(BaseModel):
    """Partial patch for nested notification prefs."""

    email_on_submission: bool | None = None
    email_on_automation_failure: bool | None = None
    email_weekly_summary: bool | None = None
    email_trial_reminder: bool | None = None
    email_product_updates: bool | None = None
    browser_push_enabled: bool | None = None
    digest_cadence: Literal["realtime", "daily_9am", "weekly_monday", "never"] | None = None


class UserPreferencesPartial(BaseModel):
    """PATCH body — omitted fields preserved."""

    onboarded_for_workflow: (
        Literal["contact-form", "proposal", "pitch_deck", "undecided"] | None
    ) = None
    sidebar_collapsed: bool | None = None
    theme: Literal["light", "dark", "system"] | None = None
    reduced_motion: bool | None = None
    command_palette_last_used: list[str] | None = None
    pinned_pages: list[str] | None = None
    dismissed_hints: list[str] | None = None
    analytics_default_range: Literal["7d", "30d", "90d"] | None = None
    notifications: UserNotificationPreferencesPartial | None = None
    workspace_timezone: str | None = None
    dashboard_tip_dismissed: bool | None = None
    notification_daily_automation_digest: bool | None = None
    notification_weekly_submissions: bool | None = None
    notification_product_updates: bool | None = None
    timezone: str | None = None
    locale: str | None = None


class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")

    onboarded_for_workflow: Literal[
        "contact-form", "proposal", "pitch_deck", "undecided"
    ] = "undecided"
    sidebar_collapsed: bool = False
    theme: Literal["light", "dark", "system"] = "light"
    reduced_motion: bool = False
    command_palette_last_used: list[str] = Field(default_factory=list)
    pinned_pages: list[str] = Field(default_factory=list)  # UUID strings in JSON
    dismissed_hints: list[str] = Field(default_factory=list)
    analytics_default_range: Literal["7d", "30d", "90d"] = "30d"
    notifications: UserNotificationPreferences = Field(default_factory=UserNotificationPreferences)

    # Legacy keys still used by the web app and BI-03
    workspace_timezone: str | None = None
    dashboard_tip_dismissed: bool | None = None
    notification_daily_automation_digest: bool | None = None
    notification_weekly_submissions: bool | None = None
    notification_product_updates: bool | None = None
    timezone: str | None = None
    locale: str | None = None
