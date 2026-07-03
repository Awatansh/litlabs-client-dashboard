"""
Seed script — creates demo client and realistic data for development.
Run: python scripts/seed.py
"""
import asyncio
import uuid
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timedelta, date, timezone
from database import AsyncSessionLocal, engine, Base
from models import (
    Client, User, Project, Milestone, Deliverable, Approval,
    AutomationLog, Notification, ActivityLog, Report
)
from auth.jwt import hash_password
from services.storage_service import StorageService
from fpdf import FPDF


DEMO_CLIENT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DEMO_USER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


async def seed():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        from sqlalchemy import select
        result = await db.execute(select(Client).where(Client.id == DEMO_CLIENT_ID))
        existing_client = result.scalar_one_or_none()
        if existing_client:
            owner_result = await db.execute(select(User).where(User.email == "owner@brightfuture.com"))
            owner = owner_result.scalar_one_or_none()
            manager_result = await db.execute(select(User).where(User.email == "marketing@brightfuture.com"))
            manager = manager_result.scalar_one_or_none()

            if owner:
                owner.hashed_password = hash_password("Litlabs2025!")
                owner.is_active = True

            if manager:
                manager.hashed_password = hash_password("Litlabs2025!")
                manager.is_active = True

            await db.commit()
            print("✅ Demo data already exists. Refreshed demo user credentials.")
            return

        print("🌱 Seeding demo data...")

        # Create demo client
        client = Client(
            id=DEMO_CLIENT_ID,
            name="Bright Future Wellness",
            slug="bright-future-wellness",
            website="https://brightfuturewellness.com",
            industry="Health & Wellness",
            settings={"webhook_key": "demo-webhook-key-abc123", "timezone": "America/New_York"},
        )
        db.add(client)

        # Create owner user
        owner = User(
            id=DEMO_USER_ID,
            client_id=DEMO_CLIENT_ID,
            email="owner@brightfuture.com",
            hashed_password=hash_password("Litlabs2025!"),
            full_name="Sarah Mitchell",
            role="owner",
        )
        db.add(owner)

        # Create manager user
        manager = User(
            client_id=DEMO_CLIENT_ID,
            email="marketing@brightfuture.com",
            hashed_password=hash_password("Litlabs2025!"),
            full_name="James Chen",
            role="manager",
        )
        db.add(manager)

        # Projects
        projects_data = [
            {
                "name": "Q3 Lead Generation Campaign",
                "description": "Facebook & Instagram ad campaigns targeting wellness enthusiasts in target cities.",
                "status": "active",
                "progress": 65,
                "start_date": date.today() - timedelta(days=45),
                "end_date": date.today() + timedelta(days=30),
            },
            {
                "name": "Website SEO Overhaul",
                "description": "Technical SEO improvements, content optimization, and backlink building.",
                "status": "active",
                "progress": 40,
                "start_date": date.today() - timedelta(days=30),
                "end_date": date.today() + timedelta(days=60),
            },
            {
                "name": "Email Marketing Automation",
                "description": "Welcome sequence, lead nurture, and re-engagement email flows.",
                "status": "active",
                "progress": 80,
                "start_date": date.today() - timedelta(days=60),
                "end_date": date.today() + timedelta(days=15),
            },
            {
                "name": "Brand Content Calendar",
                "description": "Monthly content creation for blog, social media, and email newsletters.",
                "status": "active",
                "progress": 55,
                "start_date": date.today() - timedelta(days=20),
                "end_date": date.today() + timedelta(days=40),
            },
        ]

        project_objects = []
        for p_data in projects_data:
            project = Project(client_id=DEMO_CLIENT_ID, **p_data)
            db.add(project)
            project_objects.append(project)

        await db.flush()  # Get IDs

        # Milestones for first project
        milestones_data = [
            {"title": "Campaign brief approved", "due_date": date.today() - timedelta(days=30), "status": "completed"},
            {"title": "Ad creatives delivered", "due_date": date.today() - timedelta(days=15), "status": "completed"},
            {"title": "Campaign launch", "due_date": date.today() + timedelta(days=5), "status": "in_progress"},
            {"title": "First performance review", "due_date": date.today() + timedelta(days=15), "status": "pending"},
            {"title": "Campaign wrap-up report", "due_date": date.today() + timedelta(days=30), "status": "pending"},
        ]
        for m_data in milestones_data:
            milestone = Milestone(project_id=project_objects[0].id, **m_data)
            db.add(milestone)

        # Deliverables
        deliverables_data = [
            {
                "title": "Q3 Campaign Strategy Document",
                "description": "Detailed strategy for the Q3 lead generation campaign including targeting, creative direction, and budget allocation.",
                "file_type": "pdf",
                "status": "approved",
                "project_id": project_objects[0].id,
            },
            {
                "title": "Social Media Ad Creatives — Set A",
                "description": "6 ad variations for Facebook and Instagram (static + video).",
                "file_type": "image",
                "status": "pending_review",
                "project_id": project_objects[0].id,
            },
            {
                "title": "SEO Audit Report — July 2025",
                "description": "Comprehensive SEO audit with technical issues, keyword gaps, and prioritized action plan.",
                "file_type": "pdf",
                "status": "approved",
                "project_id": project_objects[1].id,
            },
            {
                "title": "Email Welcome Sequence (5 emails)",
                "description": "Welcome sequence for new subscribers with subject lines, copy, and send schedule.",
                "file_type": "doc",
                "status": "pending_review",
                "project_id": project_objects[2].id,
            },
        ]

        deliverable_objects = []
        for d_data in deliverables_data:
            deliverable = Deliverable(client_id=DEMO_CLIENT_ID, **d_data)
            db.add(deliverable)
            deliverable_objects.append(deliverable)

        await db.flush()

        # Create approvals for pending deliverables
        for deliverable in deliverable_objects:
            if deliverable.status == "pending_review":
                approval = Approval(
                    client_id=DEMO_CLIENT_ID,
                    deliverable_id=deliverable.id,
                    requested_by=manager.id,
                    due_date=date.today() + timedelta(days=3),
                    status="pending",
                )
                db.add(approval)

        # Automation logs
        automation_data = [
            ("New Lead CRM Sync", "n8n", "success", 1, 12),
            ("Monthly Invoice Generation", "make", "success", 5, 45),
            ("Social Media Scheduler", "zapier", "success", 3, 28),
            ("Lead Enrichment Workflow", "n8n", "success", 1, 15),
            ("Weekly Report Distribution", "make", "success", 1, 30),
            ("New Lead CRM Sync", "n8n", "success", 1, 12),
            ("Social Media Scheduler", "zapier", "success", 3, 28),
            ("New Lead CRM Sync", "n8n", "error", 0, 0),
            ("Lead Enrichment Workflow", "n8n", "success", 1, 15),
            ("New Lead CRM Sync", "n8n", "success", 1, 12),
        ]
        for i, (name, source, status, tasks, time_saved) in enumerate(automation_data):
            log = AutomationLog(
                client_id=DEMO_CLIENT_ID,
                workflow_name=name,
                workflow_source=source,
                status=status,
                tasks_completed=tasks,
                time_saved_minutes=time_saved,
                timestamp=datetime.now(timezone.utc) - timedelta(hours=i * 6),
            )
            db.add(log)

        # Notifications for the owner
        notifications_data = [
            ("approval_requested", "New deliverable needs your review", "Ad Creatives — Set A is ready for your approval.", "deliverable"),
            ("approval_requested", "Email sequence ready for review", "5-email welcome sequence requires your approval.", "deliverable"),
            ("milestone_due", "Milestone due in 5 days", "Campaign launch milestone is coming up on schedule.", "milestone"),
            ("report_ready", "Monthly Performance Report ready", "Your July 2025 performance report has been generated.", "report"),
        ]
        for i, (ntype, title, message, entity_type) in enumerate(notifications_data):
            notification = Notification(
                user_id=owner.id,
                client_id=DEMO_CLIENT_ID,
                type=ntype,
                title=title,
                message=message,
                entity_type=entity_type,
                read=(i > 1),  # First 2 unread
                created_at=datetime.now(timezone.utc) - timedelta(hours=i * 4),
            )
            db.add(notification)

        # Reports
        reports_data = [
            ("July 2025 Performance Report", "monthly", datetime.now(timezone.utc) - timedelta(days=2)),
            ("Q2 Quarterly Strategy Review", "quarterly", datetime.now(timezone.utc) - timedelta(days=32)),
            ("Weekly Ad Spend Summary", "weekly", datetime.now(timezone.utc) - timedelta(days=7)),
        ]
        
        storage = StorageService()
        for name, rtype, created_at in reports_data:
            # Generate dummy PDF
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("helvetica", size=16)
            pdf.cell(200, 20, text=f"{name} (Seeded Data)", new_x="LMARGIN", new_y="NEXT", align='C')
            pdf.set_font("helvetica", size=12)
            pdf.cell(200, 10, text="This is a dummy report generated during database seeding.", new_x="LMARGIN", new_y="NEXT")
            pdf_bytes = bytes(pdf.output())

            filename = f"report_{rtype}_{int(created_at.timestamp())}.pdf"
            object_key = storage.upload_pdf_bytes(str(DEMO_CLIENT_ID), filename, pdf_bytes)

            report = Report(
                client_id=DEMO_CLIENT_ID,
                name=name,
                type=rtype,
                download_url=object_key,
                created_at=created_at,
            )
            db.add(report)

        await db.commit()
        print("✅ Demo data seeded successfully!")
        print("   Client: Bright Future Wellness")
        print("   Login: owner@brightfuture.com / Litlabs2025!")
        print("   URL: http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(seed())
