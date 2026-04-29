"""Import all models for Alembic metadata."""

from app.db.models.analytics_event import AnalyticsEvent
from app.db.models.api_token import ApiToken
from app.db.models.artifact_feedback import ArtifactFeedback
from app.db.models.audit_log import AuditLog
from app.db.models.auth_session import AuthSession
from app.db.models.automation_rule import AutomationRule
from app.db.models.automation_run import AutomationRun
from app.db.models.availability_calendar import AvailabilityCalendar
from app.db.models.brand_kit import BrandKit
from app.db.models.calendar_busy_block import CalendarBusyBlock
from app.db.models.calendar_connection import CalendarConnection
from app.db.models.canvas import CanvasFlow, CanvasProject, CanvasScreen, CanvasScreenRevision
from app.db.models.conversation import Conversation
from app.db.models.credit_ledger import CreditLedger
from app.db.models.custom_domain import CustomDomain
from app.db.models.custom_event_definition import CustomEventDefinition
from app.db.models.deck import Deck
from app.db.models.design_memory import DesignMemory
from app.db.models.email_template_override import EmailTemplateOverride
from app.db.models.identity_merge import IdentityMerge
from app.db.models.improvement_report import ImprovementReport
from app.db.models.invitation import Invitation
from app.db.models.llm_routing_policy import LlmRoutingHistory, LlmRoutingPolicy
from app.db.models.membership import Membership
from app.db.models.message import Message
from app.db.models.notification import Notification
from app.db.models.oauth_identity import OAuthIdentity
from app.db.models.orchestration_run import OrchestrationRun
from app.db.models.org_feature_flag import OrgFeatureFlag
from app.db.models.organization import Organization
from app.db.models.outbound_webhook import OutboundWebhook
from app.db.models.page import Page
from app.db.models.page_revision import PageRevision
from app.db.models.page_version import PageVersion
from app.db.models.plan_recommendation import PlanRecommendation
from app.db.models.platform_rbac import (
    PlatformPermission,
    PlatformRole,
    PlatformRolePermission,
    PlatformUserRole,
)
from app.db.models.proposal import (
    OrgTestimonial,
    Proposal,
    ProposalQuestion,
    ProposalSequence,
    ProposalTemplate,
)
from app.db.models.refund_request import RefundRequest
from app.db.models.scheduled_plan_change import ScheduledPlanChange
from app.db.models.slot_hold import SlotHold
from app.db.models.stripe_event_processed import StripeEventProcessed
from app.db.models.studio_attachment import StudioAttachment
from app.db.models.submission import Submission
from app.db.models.submission_file import SubmissionFile
from app.db.models.submission_reply import SubmissionReply
from app.db.models.subscription_usage import SubscriptionUsage
from app.db.models.template import Template
from app.db.models.user import User

__all__ = [
    "AnalyticsEvent",
    "ArtifactFeedback",
    "AvailabilityCalendar",
    "ApiToken",
    "AuthSession",
    "AuditLog",
    "AutomationRule",
    "AutomationRun",
    "BrandKit",
    "CalendarBusyBlock",
    "CalendarConnection",
    "CanvasFlow",
    "CanvasProject",
    "CanvasScreen",
    "CanvasScreenRevision",
    "CustomDomain",
    "Deck",
    "EmailTemplateOverride",
    "DesignMemory",
    "CreditLedger",
    "Conversation",
    "CustomEventDefinition",
    "IdentityMerge",
    "ImprovementReport",
    "Invitation",
    "LlmRoutingHistory",
    "LlmRoutingPolicy",
    "Membership",
    "Message",
    "Notification",
    "OrchestrationRun",
    "OAuthIdentity",
    "Organization",
    "PlatformPermission",
    "PlatformRole",
    "PlatformRolePermission",
    "PlatformUserRole",
    "PlanRecommendation",
    "OrgTestimonial",
    "OrgFeatureFlag",
    "OutboundWebhook",
    "Proposal",
    "ProposalQuestion",
    "ProposalSequence",
    "ProposalTemplate",
    "RefundRequest",
    "Page",
    "PageRevision",
    "PageVersion",
    "ScheduledPlanChange",
    "SlotHold",
    "StudioAttachment",
    "Submission",
    "SubmissionFile",
    "SubmissionReply",
    "StripeEventProcessed",
    "SubscriptionUsage",
    "Template",
    "User",
]
