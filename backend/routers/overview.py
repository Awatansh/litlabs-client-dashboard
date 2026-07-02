from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Project, Approval, AutomationLog, Notification
from auth.dependencies import get_current_user
from models import User

router = APIRouter()


@router.get("")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Single aggregated endpoint for the dashboard overview page.
    Combines counts from projects, approvals, automations, and notifications.
    """
    client_id = current_user.client_id

    # Active projects count
    proj_result = await db.execute(
        select(func.count(Project.id)).where(
            Project.client_id == client_id,
            Project.status == "active"
        )
    )
    active_projects = proj_result.scalar_one()

    # Pending approvals count
    appr_result = await db.execute(
        select(func.count(Approval.id)).where(
            Approval.client_id == client_id,
            Approval.status == "pending"
        )
    )
    pending_approvals = appr_result.scalar_one()

    # Time saved this month from automations
    from datetime import datetime, timedelta
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    time_result = await db.execute(
        select(func.sum(AutomationLog.time_saved_minutes)).where(
            AutomationLog.client_id == client_id,
            AutomationLog.timestamp >= month_start,
        )
    )
    time_saved_minutes = time_result.scalar_one() or 0

    # Recent projects
    proj_list = await db.execute(
        select(Project).where(Project.client_id == client_id, Project.status == "active")
        .order_by(Project.created_at.desc()).limit(5)
    )
    projects = proj_list.scalars().all()

    return {
        "active_projects": active_projects,
        "pending_approvals": pending_approvals,
        "time_saved_hours": round(time_saved_minutes / 60, 1),
        "projects": [
            {"id": str(p.id), "name": p.name, "status": p.status, "progress": p.progress}
            for p in projects
        ],
        # Marketing and SEO leads are pulled from their own endpoints
    }
