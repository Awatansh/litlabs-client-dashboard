from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import AutomationLog
from auth.dependencies import get_current_user
from models import User
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter()


class AutomationEvent(BaseModel):
    workflow_name: str
    workflow_source: str = "unknown"
    status: str = "success"
    tasks_completed: int = 1
    time_saved_minutes: int = 0
    metadata: dict = {}


@router.get("/summary")
async def get_automation_summary(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(
            func.count(AutomationLog.id).label("total_runs"),
            func.sum(AutomationLog.tasks_completed).label("total_tasks"),
            func.sum(AutomationLog.time_saved_minutes).label("total_time_saved"),
            func.count(func.distinct(AutomationLog.workflow_name)).label("unique_workflows"),
        ).where(
            AutomationLog.client_id == current_user.client_id,
            AutomationLog.timestamp >= since,
        )
    )
    row = result.one()
    return {
        "total_runs": row.total_runs or 0,
        "tasks_completed": row.total_tasks or 0,
        "time_saved_hours": round((row.total_time_saved or 0) / 60, 1),
        "active_workflows": row.unique_workflows or 0,
    }


@router.get("/recent")
async def get_recent_automation(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutomationLog).where(AutomationLog.client_id == current_user.client_id)
        .order_by(AutomationLog.timestamp.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "workflow_name": log.workflow_name,
            "workflow_source": log.workflow_source,
            "status": log.status,
            "tasks_completed": log.tasks_completed,
            "time_saved_minutes": log.time_saved_minutes,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.post("/event")
async def receive_automation_event(
    event: AutomationEvent,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Receive automation events from n8n, Make, Zapier via webhook."""
    log = AutomationLog(
        client_id=current_user.client_id,
        workflow_name=event.workflow_name,
        workflow_source=event.workflow_source,
        status=event.status,
        tasks_completed=event.tasks_completed,
        time_saved_minutes=event.time_saved_minutes,
        workflow_metadata=event.metadata,
    )
    db.add(log)
    await db.commit()
    return {"status": "received", "log_id": str(log.id)}
