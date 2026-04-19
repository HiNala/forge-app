from fastapi import APIRouter
from app.api.v1 import pages

api_router = APIRouter()
api_router.include_router(pages.router, prefix="/pages", tags=["pages"])
