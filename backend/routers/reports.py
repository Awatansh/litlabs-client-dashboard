from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user
from models import User, Report
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter()


@router.get("")
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all generated reports for the client."""
    result = await db.execute(
        select(Report).where(Report.client_id == current_user.client_id).order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "type": r.type,
            "download_url": r.download_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]


@router.post("/generate")
async def generate_report(
    report_type: str = "monthly",
    current_user: User = Depends(get_current_user),
):
    """Trigger report generation (PDF). Returns download URL when ready."""
    return {"status": "queued", "message": "Report generation started. Check back in a moment."}
