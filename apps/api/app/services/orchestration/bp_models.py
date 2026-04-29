"""BP-01 product orchestration schemas."""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.orchestration.models import AlternativeInterpretation, Assumption, WorkflowType


class Attachment(BaseModel):
    id: UUID | None = None
    kind: str = "reference"
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StylePreference(BaseModel):
    tone: str | None = None
    density: Literal["sparse", "balanced", "dense"] | None = None
    color_temp: str | None = None
    notes: str | None = None


class HumanQuestionOption(BaseModel):
    label: str
    value: str
    description: str | None = None


class HumanQuestion(BaseModel):
    id: str
    question: str
    options: list[HumanQuestionOption] = Field(default_factory=list, max_length=6)
    allow_custom: bool = True


class IntentSpec(BaseModel):
    app_type: str
    workflow_classification: WorkflowType
    confidence: float = Field(ge=0, le=1)
    target_user: str
    primary_goal: str
    platform: Literal["mobile_app", "web_app", "web_page", "mini_app", "document", "presentation"]
    style_preference: StylePreference | None = None
    must_have_features: list[str]
    nice_to_have_features: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    urgency: Literal["exploring", "committed", "urgent"] = "exploring"
    assumptions: list[Assumption] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list, max_length=2)
    human_questions: list[HumanQuestion] = Field(default_factory=list, max_length=6)
    alternatives: list[AlternativeInterpretation] = Field(default_factory=list)


class Metric(BaseModel):
    name: str
    target: str | None = None
    rationale: str | None = None


class ProductStrategy(BaseModel):
    target_customer: str
    target_customer_jobs: list[str]
    primary_pain_point: str
    user_promise: str
    key_differentiators: list[str] = Field(default_factory=list)
    core_loop: str
    retention_loop: str | None = None
    monetization_opportunities: list[str] = Field(default_factory=list)
    success_metrics: list[Metric] = Field(default_factory=list)
    competitive_context: list[str] = Field(default_factory=list)
    risks_and_unknowns: list[str] = Field(default_factory=list)


class FlowStep(BaseModel):
    screen: str
    trigger: str
    user_value: str


class ScreenSpec(BaseModel):
    name: str
    purpose: str
    depends_on: list[str] = Field(default_factory=list)
    key_components: list[str] = Field(default_factory=list)


class ScreenState(BaseModel):
    screen: str
    states: list[str]


class FlowEdge(BaseModel):
    from_screen: str
    to_screen: str
    trigger: str


class UXFlow(BaseModel):
    first_time_user_path: list[FlowStep]
    returning_user_path: list[FlowStep] = Field(default_factory=list)
    power_user_path: list[FlowStep] | None = None
    screens_needed: list[ScreenSpec]
    states_needed: list[ScreenState]
    flow_edges: list[FlowEdge]
    anti_patterns_avoided: list[str] = Field(default_factory=list)


class DataModel(BaseModel):
    name: str
    fields: dict[str, str] = Field(default_factory=dict)
    relationships: list[str] = Field(default_factory=list)


class UserState(BaseModel):
    name: str
    description: str


class PermissionRule(BaseModel):
    actor: str
    action: str
    condition: str


class BehaviorEvent(BaseModel):
    name: str
    when: str


class ActionSpec(BaseModel):
    name: str
    trigger: str
    result: str


class APIEndpoint(BaseModel):
    method: str
    path: str
    purpose: str


class LogicRule(BaseModel):
    if_: str = Field(alias="if")
    then: str


class SystemSpec(BaseModel):
    data_models: list[DataModel] = Field(default_factory=list)
    user_states: list[UserState] = Field(default_factory=list)
    permissions: list[PermissionRule] = Field(default_factory=list)
    events: list[BehaviorEvent] = Field(default_factory=list)
    actions: list[ActionSpec] = Field(default_factory=list)
    api_needs: list[APIEndpoint] | None = None
    mock_data_sketch: dict[str, Any] | None = None
    logic_rules: list[LogicRule] = Field(default_factory=list)


class DesignTokens(BaseModel):
    colors: dict[str, str] = Field(default_factory=dict)
    typography: dict[str, Any] = Field(default_factory=dict)
    spacing_scale: list[int] = Field(default_factory=lambda: [4, 8, 12, 16, 24, 32, 48])
    radius_scale: dict[str, int] = Field(default_factory=lambda: {"sm": 6, "md": 10, "lg": 18, "full": 999})
    shadow_scale: list[dict[str, Any]] = Field(default_factory=list)
    motion_tempos: dict[str, Any] = Field(default_factory=dict)
    component_styles: dict[str, Any] = Field(default_factory=dict)
    rationale: str = ""


class ComponentNode(BaseModel):
    id: str
    component: str
    props: dict[str, Any] = Field(default_factory=dict)
    children: list[ComponentNode] = Field(default_factory=list)


class ComponentTree(BaseModel):
    screens: dict[str, ComponentNode] = Field(default_factory=dict)


class CodeFile(BaseModel):
    path: str
    content: str


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
    dimension: CritiqueDimension
    severity: Literal["minor", "major", "critical"] = "minor"
    message: str
    tree_path: str | None = None
    security: bool = False


class Fix(BaseModel):
    dimension: CritiqueDimension
    description: str
    target_path: str | None = None


class CritiqueReport(BaseModel):
    scores: dict[CritiqueDimension, float]
    overall_score: float
    issues: list[Finding] = Field(default_factory=list)
    recommended_fixes: list[Fix] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)


class JudgeDecision(BaseModel):
    verdict: Literal["ship", "iterate", "abort"]
    reason: str
    target_dimensions: list[CritiqueDimension] = Field(default_factory=list)
    scoped_fixes: list[Fix] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, default=1)
    degraded_quality_flag: bool = False


class MemoryWrite(BaseModel):
    kind: str
    key: str
    value: dict[str, Any]
    strength_delta: float = 0.1
    source: str | None = None


class AgentCall(BaseModel):
    agent_name: str
    status: Literal["success", "failed", "skipped"]
    input_tokens: int = 0
    output_tokens: int = 0
    cost_cents: int = 0
    latency_ms: int = 0
    model: str | None = None
    provider: str | None = None
    error: str | None = None


class RunBudget(BaseModel):
    max_agent_calls: int = 14
    max_wall_time_seconds: float = 60
    max_cost_cents: int = 40
    cost_cents: int = 0


class FourLayerOutput(BaseModel):
    product_reasoning: str = ""
    design_spec: dict[str, Any] = Field(default_factory=dict)
    code: CodeArtifacts | None = None
    improvement_suggestions: list[str] = Field(default_factory=list)
    memory_explanation: list[str] = Field(default_factory=list)


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
    ui_tree: ComponentTree | None = None
    code_artifacts: CodeArtifacts | None = None
    critique: CritiqueReport | None = None
    judge_decision: JudgeDecision | None = None
    memory_writes: list[MemoryWrite] = Field(default_factory=list)
    four_layer_output: FourLayerOutput = Field(default_factory=FourLayerOutput)
    agent_calls: list[AgentCall] = Field(default_factory=list)
    budget: RunBudget = Field(default_factory=RunBudget)
    iterations: int = 0
    max_iterations: int = 2
    terminated_reason: str | None = None


ComponentNode.model_rebuild()
