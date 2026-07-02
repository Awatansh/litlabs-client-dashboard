"""
Approvals router — full approval workflow for deliverables.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import get_db
from models import Approval, Deliverable, Notification, User
from auth.dependencies import get_current_user

router = APIRouter()


class ApprovalDecision(BaseModel):
    comment: Optional[str] = None


class ApprovalDecisionRequired(BaseModel):
    comment: str  # Required for rejections and change requests


@router.get("")
async def list_approvals(
    status_filter: str = Query(default="pending", alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List approvals for the current client.
    status=pending: items awaiting decision
    status=all: full history
    """
    query = select(Approval, Deliverable).join(
        Deliverable, Approval.deliverable_id == Deliverable.id
    ).where(Approval.client_id == current_user.client_id)

    if status_filter != "all":
        query = query.where(Approval.status == status_filter)

    result = await db.execute(query.order_by(Approval.requested_at.desc()))
    rows = result.all()

    return [
        {
            "id": str(approval.id),
            "status": approval.status,
            "type": deliverable.file_type or "document",
            "title": deliverable.title,
            "description": deliverable.description,
            "deliverable_url": deliverable.file_url,
            "created_at": approval.requested_at.isoformat(),
            "reviewer_comments": approval.comments,
        }
        for approval, deliverable in rows
    ]


@router.post("/{approval_id}/approve")
async def approve_deliverable(
    approval_id: uuid.UUID,
    decision: ApprovalDecision = ApprovalDecision(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a deliverable. Updates approval + deliverable status."""
    approval = await _get_approval_or_403(db, approval_id, current_user)

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="This approval has already been decided.")

    # Update approval
    await db.execute(
        update(Approval).where(Approval.id == approval_id).values(
            status="approved",
            decided_by=current_user.id,
            decided_at=datetime.utcnow(),
            comments=decision.comment,
        )
    )

    # Update deliverable status
    await db.execute(
        update(Deliverable).where(Deliverable.id == approval.deliverable_id).values(status="approved")
    )

    await db.commit()
    return {"message": "Deliverable approved. The LitLabs team has been notified.", "status": "approved"}


@router.post("/{approval_id}/reject")
async def reject_deliverable(
    approval_id: uuid.UUID,
    decision: ApprovalDecisionRequired,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a deliverable. Comment is required."""
    approval = await _get_approval_or_403(db, approval_id, current_user)

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="This approval has already been decided.")

    await db.execute(
        update(Approval).where(Approval.id == approval_id).values(
            status="rejected",
            decided_by=current_user.id,
            decided_at=datetime.utcnow(),
            comments=decision.comment,
        )
    )
    await db.execute(
        update(Deliverable).where(Deliverable.id == approval.deliverable_id).values(status="rejected")
    )

    await db.commit()
    return {"message": "Feedback submitted. The LitLabs team will revise the work.", "status": "rejected"}


@router.post("/{approval_id}/request-changes")
async def request_changes(
    approval_id: uuid.UUID,
    decision: ApprovalDecisionRequired,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request changes to a deliverable. Comment is required."""
    approval = await _get_approval_or_403(db, approval_id, current_user)

    await db.execute(
        update(Approval).where(Approval.id == approval_id).values(
            status="changes_requested",
            decided_by=current_user.id,
            decided_at=datetime.utcnow(),
            comments=decision.comment,
        )
    )
    await db.execute(
        update(Deliverable).where(Deliverable.id == approval.deliverable_id).values(status="draft")
    )

    await db.commit()
    return {"message": "Change request submitted. The team will revise and resubmit.", "status": "changes_requested"}


async def _get_approval_or_403(db: AsyncSession, approval_id: uuid.UUID, user: User) -> Approval:
    """Fetch approval and verify it belongs to the current client."""
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()

    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.client_id != user.client_id:
        raise HTTPException(status_code=403, detail="You do not have access to this approval")

    return approval
