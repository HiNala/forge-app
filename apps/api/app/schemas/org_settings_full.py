"""Typed organization settings (BI-04) — stored in `organizations.org_settings` JSONB."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class OrgDefaults(BaseModel):
    default_page_type: str = "contact_form"
    default_page_visibility: Literal["public", "unlisted"] = "public"
    default_notification_emails: list[str] = Field(default_factory=list)
    default_confirm_submitter: bool = True
    default_timezone: str = "America/Los_Angeles"


class OrgNotificationSettings(BaseModel):
    submission_digest_enabled: bool = True
    submission_digest_cadence: Literal["daily", "weekly", "never"] = "daily"
    submission_digest_recipients: list[str] = Field(default_factory=list)
    automation_failure_alert_emails: list[str] = Field(default_factory=list)


class OrgSecuritySettings(BaseModel):
    require_mfa_for_owners: bool = False
    session_max_age_hours: int = 720
    allowed_oauth_domains: list[str] = Field(default_factory=list)
    ip_allowlist: list[str] = Field(default_factory=list)


class DataRetentionSettings(BaseModel):
    submission_retention_days: int = 365
    analytics_retention_days: int = 90
    audit_log_retention_days: int = 365
    auto_archive_pages_with_no_activity_days: int | None = None


class OrgSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")

    defaults: OrgDefaults = Field(default_factory=OrgDefaults)
    notifications: OrgNotificationSettings = Field(default_factory=OrgNotificationSettings)
    security: OrgSecuritySettings = Field(default_factory=OrgSecuritySettings)
    data_retention: DataRetentionSettings = Field(default_factory=DataRetentionSettings)


class OrgSettingsPartial(BaseModel):
    """Sparse PATCH fragments — merged per section."""

    defaults: dict[str, Any] | None = None
    notifications: dict[str, Any] | None = None
    security: dict[str, Any] | None = None
    data_retention: dict[str, Any] | None = None
