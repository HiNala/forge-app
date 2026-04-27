"""Workflow-specific composers — P-06 (survey, quiz, coming soon, resume, link in bio)."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ComponentTree
from app.services.orchestration.composer.base import BaseComposer


class LinkInBioComposer(BaseComposer):
    workflow_key = "link_in_bio"
    prompt_file = "link_in_bio.v1.md"
    schema = ComponentTree


class SurveyComposer(BaseComposer):
    workflow_key = "survey"
    prompt_file = "survey.v1.md"
    schema = ComponentTree


class QuizComposer(BaseComposer):
    workflow_key = "quiz"
    prompt_file = "quiz.v1.md"
    schema = ComponentTree


class ComingSoonComposer(BaseComposer):
    workflow_key = "coming_soon"
    prompt_file = "coming_soon.v1.md"
    schema = ComponentTree


class ResumeComposer(BaseComposer):
    workflow_key = "resume"
    prompt_file = "resume.v1.md"
    schema = ComponentTree
