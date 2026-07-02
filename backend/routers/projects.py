from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Project, Milestone
from auth.dependencies import get_current_user
from models import User
import uuid

router = APIRouter()


@router.get("")
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.client_id == current_user.client_id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "progress": p.progress,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
        }
        for p in projects
    ]


@router.get("/{project_id}")
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get milestones
    ms_result = await db.execute(
        select(Milestone).where(Milestone.project_id == project_id).order_by(Milestone.due_date)
    )
    milestones = ms_result.scalars().all()

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "progress": project.progress,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "milestones": [
            {"id": str(m.id), "title": m.title, "due_date": m.due_date.isoformat(), "status": m.status}
            for m in milestones
        ],
    }
