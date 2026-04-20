from fastapi import APIRouter

from app.api.v1 import (
    admin,
    admin_platform,
    analytics,
    auth,
    automations,
    availability_calendars,
    billing,
    calendar,
    notifications_center,
    organization,
    orgs_current_alias,
    page_deck,
    page_proposal,
    pages,
    proposal_templates,
    public_demo,
    public_runtime,
    public_templates,
    settings_surfaces,
    studio,
    submissions,
    team,
    templates,
    webhooks,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(public_demo.router)
api_router.include_router(public_runtime.router)
api_router.include_router(public_templates.router)
api_router.include_router(organization.router)
api_router.include_router(orgs_current_alias.router)
api_router.include_router(settings_surfaces.router)
api_router.include_router(notifications_center.router)
api_router.include_router(team.router)
api_router.include_router(pages.router)
api_router.include_router(page_proposal.router, prefix="/pages")
api_router.include_router(page_deck.router, prefix="/pages")
api_router.include_router(proposal_templates.router)
api_router.include_router(studio.router)
api_router.include_router(submissions.router)
api_router.include_router(automations.router)
api_router.include_router(calendar.router)
api_router.include_router(availability_calendars.router)
api_router.include_router(analytics.router)
api_router.include_router(billing.router)
api_router.include_router(templates.router)
api_router.include_router(webhooks.router)
api_router.include_router(admin.router)
api_router.include_router(admin_platform.router)
