from fastapi import APIRouter

from app.api.v1 import (
    admin,
    analytics,
    auth,
    automations,
    billing,
    calendar,
    organization,
    pages,
    public_demo,
    public_runtime,
    studio,
    submissions,
    team,
    templates,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(public_demo.router)
api_router.include_router(public_runtime.router)
api_router.include_router(organization.router)
api_router.include_router(team.router)
api_router.include_router(pages.router)
api_router.include_router(studio.router)
api_router.include_router(submissions.router)
api_router.include_router(automations.router)
api_router.include_router(calendar.router)
api_router.include_router(analytics.router)
api_router.include_router(billing.router)
api_router.include_router(templates.router)
api_router.include_router(admin.router)
