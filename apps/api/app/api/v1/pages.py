from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter()

@router.get("/")
async def list_pages(db: AsyncSession = Depends(get_db)):
    return {"ok": True, "stub": "endpoint not yet implemented"}

@router.get("/{page_id}")
async def get_page(page_id: str, db: AsyncSession = Depends(get_db)):
    return {"ok": True, "stub": "endpoint not yet implemented"}
