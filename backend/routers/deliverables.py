from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user
from models import User, Deliverable
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
router = APIRouter()


@router.get("")
async def list_deliverables(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all deliverables for the client."""
    result = await db.execute(
        select(Deliverable).where(Deliverable.client_id == current_user.client_id).order_by(Deliverable.uploaded_at.desc())
    )
    deliverables = result.scalars().all()
    
    return [
        {
            "id": str(d.id),
            "name": d.title,
            "folder": d.file_type.upper() if d.file_type else "General",
            "size": "Unknown",  # To be added in future storage integration
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "status": d.status,
            "project_id": str(d.project_id) if d.project_id else None
        }
        for d in deliverables
    ]


@router.post("/upload-url")
async def get_upload_url(
    filename: str,
    content_type: str,
    current_user: User = Depends(get_current_user),
):
    """Generate presigned MinIO upload URL."""
    from services.storage_service import StorageService
    storage = StorageService()
    return storage.generate_upload_url(str(current_user.client_id), filename, content_type)
