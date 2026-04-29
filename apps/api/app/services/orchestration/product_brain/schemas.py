"""BP-01 — typed orchestrator state + agent outputs."""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.orchestration.planning_models import WorkflowPlanType

WorkflowType = WorkflowPlanType


class Attachment(BaseModel):
    id: str | None = None
    kind: str = "unknown"
    label: str | None = None


class StylePreference(BaseModel):
    label: str = ""
    palette_hint: str = ""
    density: Literal["sparse", "balanced", "dense"] = "balanced"


class Assumption(BaseModel):
    field: str
    value: str
    reason: str = ""


class AlternativeInterpretation(BaseModel):
    workflow: WorkflowType
    label: str = ""
    confidence: float = Field(ge=0, le=1, default=0.5)


class IntentSpec(BaseModel):
    app_type: str = "web application"
    workflow_classification: WorkflowType = "other"
    confidence: float = Field(default=0.85, ge=0, le=1)
    target_user: str = ""
    primary_goal: str = ""
    platform: Literal["mobile_app", "web_app", "web_page", "mini_app", "document", "presentation"] = "web_app"
    style_preference: StylePreference | None = None
    must_have_features: list[str] = Field(default_factory=list)
    nice_to_have_features: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    urgency: Literal["exploring", "committed", "urgent"] = "exploring"
    assumptions: list[Assumption] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)
    alternatives: list[AlternativeInterpretation] = Field(default_factory=list)


class Metric(BaseModel):
    name: str
    target_hint: str = ""


class ProductStrategy(BaseModel):
    target_customer: str = ""
    target_customer_jobs: list[str] = Field(default_factory=list)
    primary_pain_point: str = ""
    user_promise: str = ""
    key_differentiators: list[str] = Field(default_factory=list)
    core_loop: str = ""
    retention_loop: str | None = None
    monetization_opportunities: list[str] = Field(default_factory=list)
    success_metrics: list[Metric] = Field(default_factory=list)
    competitive_context: list[str] = Field(default_factory=list)
    risks_and_unknowns: list[str] = Field(default_factory=list)


class FlowStep(BaseModel):
    label: str
    screen_hint: str = ""
    trigger: str = ""


class ScreenSpec(BaseModel):
    name: str
    purpose: str = ""
    depends_on: list[str] = Field(default_factory=list)
    key_components: list[str] = Field(default_factory=list)


class ScreenState(BaseModel):
    screen_name: str
    state_kind: Literal["empty", "loading", "success", "error", "partial"]


class FlowEdge(BaseModel):
    source: str
    target: str
    trigger: str = ""


class UXFlow(BaseModel):
    first_time_user_path: list[FlowStep] = Field(default_factory=list)
    returning_user_path: list[FlowStep] = Field(default_factory=list)
    power_user_path: list[FlowStep] | None = None
    screens_needed: list[ScreenSpec] = Field(default_factory=list)
    states_needed: list[ScreenState] = Field(default_factory=list)
    flow_edges: list[FlowEdge] = Field(default_factory=list)
    anti_patterns_avoided: list[str] = Field(default_factory=list)


class DataModel(BaseModel):
    name: str
    fields: list[str] = Field(default_factory=list)
    relations: list[str] = Field(default_factory=list)


class UserState(BaseModel):
    key: str
    description: str = ""


class PermissionRule(BaseModel):
    actor: str
    resource: str
    capability: str


class BehaviorEvent(BaseModel):
    name: str
    description: str = ""


class ActionSpec(BaseModel):
    id: str
    description: str = ""
    data_forge_action: str = ""


class APIEndpoint(BaseModel):
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"] = "GET"
    path_hint: str = ""


class LogicRule(BaseModel):
    predicate: str
    outcome: str = ""


class SystemSpec(BaseModel):
    data_models: list[DataModel] = Field(default_factory=list)
    user_states: list[UserState] = Field(default_factory=list)
    permissions: list[PermissionRule] = Field(default_factory=list)
    events: list[BehaviorEvent] = Field(default_factory=list)
    actions: list[ActionSpec] = Field(default_factory=list)
    api_needs: list[APIEndpoint] | None = None
    mock_data_sketch: dict[str, Any] | None = None
    logic_rules: list[LogicRule] = Field(default_factory=list)


class ColorTokens(BaseModel):
    primary: str = "#1E293B"
    accent: str = "#3B82F6"
    background: str = "#F8FAFC"
    foreground: str = "#0F172A"
    muted: str = "#64748B"
    success: str = "#16A34A"
    destructive: str = "#DC2626"


class TypographyScale(BaseModel):
    display: str = "font-semibold tracking-tight text-4xl md:text-5xl"
    heading: str = "font-semibold text-2xl md:text-3xl"
    body: str = "text-base leading-relaxed"
    caption: str = "text-sm text-muted-foreground"


class ShadowToken(BaseModel):
    name: str
    css: str = "0 10px 15px -3px rgb(0 0 0 / 0.08)"


class MotionToken(BaseModel):
    name: str
    css_duration_ms: int = 200


class ComponentStyle(BaseModel):
    notes: str = ""


class DesignTokens(BaseModel):
    colors: ColorTokens = Field(default_factory=ColorTokens)
    typography: TypographyScale = Field(default_factory=TypographyScale)
    spacing_scale: list[int] = Field(default_factory=lambda: [4, 8, 12, 16, 24, 32, 48, 64])
    radius_scale: dict[str, int] = Field(default_factory=lambda: {"sm": 6, "md": 10, "lg": 16, "full": 999})
    shadow_scale: list[ShadowToken] = Field(default_factory=list)
    motion_tempos: dict[str, MotionToken] = Field(
        default_factory=lambda: {
            "micro": MotionToken(name="micro", css_duration_ms=120),
            "standard": MotionToken(name="standard", css_duration_ms=200),
            "gentle": MotionToken(name="gentle", css_duration_ms=320),
            "dramatic": MotionToken(name="dramatic", css_duration_ms=480),
        }
    )
    component_styles: dict[str, ComponentStyle] = Field(default_factory=dict)
    rationale: str = "GlideDesign violet/coral palette with bold app surfaces."


class CodeFile(BaseModel):
    path: str
    content: str = ""


class CodeArtifacts(BaseModel):
    files: list[CodeFile] = Field(default_factory=list)
    package_dependencies: list[str] = Field(default_factory=list)
    readme_snippet: str = ""
    suggested_directory_structure: dict[str, list[str]] = Field(default_factory=dict)


class CritiqueDimension(StrEnum):
    product_clarity = "product_clarity"
    ux_flow = "ux_flow"
    visual_quality = "visual_quality"
    code_quality = "code_quality"
    accessibility = "accessibility"
    responsiveness = "responsiveness"
    originality = "originality"
    business_usefulness = "business_usefulness"


class Finding(BaseModel):
    severity: Literal["critical", "major", "minor", "suggestion"] = "minor"
    message: str
    tree_path: str | None = None


class Fix(BaseModel):
    description: str
    tree_path: str | None = None
    dimension_target: CritiqueDimension | None = None


class CritiqueReport(BaseModel):
    scores: dict[str, float] = Field(default_factory=dict)
    overall_score: float = Field(default=8.5, ge=1, le=10)
    issues: list[Finding] = Field(default_factory=list)
    recommended_fixes: list[Fix] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    security_flags: list[str] = Field(default_factory=list)


class JudgeDecision(BaseModel):
    verdict: Literal["ship", "iterate", "abort"] = "ship"
    reason: str = ""
    target_dimensions: list[CritiqueDimension] = Field(default_factory=list)
    scoped_fixes: list[Fix] = Field(default_factory=list)
    confidence: float = Field(default=0.9, ge=0, le=1)
    degraded_quality_flag: bool = False


class MemoryWrite(BaseModel):
    kind: str
    key: str
    value: dict[str, Any] = Field(default_factory=dict)


class AgentCall(BaseModel):
    agent_name: str
    started_at: float = 0.0
    completed_at: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_cents: int = 0
    latency_ms: int = 0
    status: str = "ok"
    error: str | None = None


class RunBudget(BaseModel):
    max_wall_time_seconds: float = 60.0
    max_cost_cents: int = 40
    spent_cost_cents: int = 0
    tokens_used_est: int = 0


class OrchestratorState(BaseModel):
    run_id: UUID
    org_id: UUID
    user_id: UUID
    prompt: str
    attachments: list[Attachment] = Field(default_factory=list)
    workflow_hint: WorkflowType | None = None

    intent: IntentSpec | None = None
    product_strategy: ProductStrategy | None = None
    ux_flow: UXFlow | None = None
    system_spec: SystemSpec | None = None
    design_tokens: DesignTokens | None = None
    ui_tree: Any | None = None  # ComponentTree-compatible dict or model
    code_artifacts: CodeArtifacts | None = None
    critique: CritiqueReport | None = None
    judge_decision: JudgeDecision | None = None
    memory_writes: list[MemoryWrite] = Field(default_factory=list)

    agent_calls: list[AgentCall] = Field(default_factory=list)
    budget: RunBudget = Field(default_factory=RunBudget)
    iterations: int = 0
    max_iterations: int = 2
    terminated_reason: str | None = None
    degraded_quality_note: bool = False
    cost_constrained: bool = False

    reasoning_text: str = ""
    suggestion_bullets: list[str] = Field(default_factory=list)

class FourLayerOutput(BaseModel):
    layer1_reasoning: str = ""
    layer2_design_spec_json: dict[str, Any] = Field(default_factory=dict)
    layer3_code: dict[str, Any] = Field(default_factory=dict)
    layer4_suggestions: list[str] = Field(default_factory=list)
