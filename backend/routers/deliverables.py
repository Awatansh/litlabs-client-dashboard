import uuid
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from auth.dependencies import get_current_user
from models import User, Deliverable
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from services.storage_service import StorageService

router = APIRouter()

class DeliverableCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: str
    file_type: str
    file_size_bytes: Optional[int] = None
    project_id: Optional[uuid.UUID] = None

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
    
    storage = StorageService()
    
    output = []
    for d in deliverables:
        download_url = d.file_url
        if download_url and not download_url.startswith("http"):
            download_url = storage.generate_download_url(download_url)
            
        output.append({
            "id": str(d.id),
            "name": d.title,
            "folder": d.file_type.upper() if d.file_type else "General",
            "size": f"{d.file_size_bytes} bytes" if d.file_size_bytes else "Unknown",
            "download_url": download_url,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "status": d.status,
            "project_id": str(d.project_id) if d.project_id else None
        })
    return output


@router.post("/upload-url")
async def get_upload_url(
    filename: str,
    content_type: str,
    current_user: User = Depends(get_current_user),
):
    """Generate presigned MinIO upload URL."""
    storage = StorageService()
    return storage.generate_upload_url(str(current_user.client_id), filename, content_type)

@router.post("")
async def create_deliverable(
    payload: DeliverableCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a new deliverable after upload."""
    deliverable = Deliverable(
        client_id=current_user.client_id,
        title=payload.title,
        description=payload.description,
        file_url=payload.file_url,
        file_type=payload.file_type,
        file_size_bytes=payload.file_size_bytes,
        project_id=payload.project_id,
        status="final"
    )
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)
    return {"id": str(deliverable.id), "message": "Deliverable registered successfully."}
