import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, overview, projects, deliverables, approvals, marketing, seo, automation, reports, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created/verified")
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="LitLabs Client Dashboard API",
    description="Client portal backend for LitLabs agency services",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://litlabs-dashboard.vercel.app",
]

# Allow additional origins via CORS_ORIGINS env var (comma-separated)
extra = os.getenv("CORS_ORIGINS", "")
if extra:
    ALLOWED_ORIGINS += [o.strip() for o in extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(auth.router,           prefix="/auth",                  tags=["auth"])
app.include_router(overview.router,       prefix="/api/overview",          tags=["overview"])
app.include_router(projects.router,       prefix="/api/projects",          tags=["projects"])
app.include_router(deliverables.router,   prefix="/api/deliverables",      tags=["deliverables"])
app.include_router(approvals.router,      prefix="/api/approvals",         tags=["approvals"])
app.include_router(marketing.router,      prefix="/api/marketing",         tags=["marketing"])
app.include_router(seo.router,            prefix="/api/seo",               tags=["seo"])
app.include_router(automation.router,     prefix="/api/automation",        tags=["automation"])
app.include_router(reports.router,        prefix="/api/reports",           tags=["reports"])
app.include_router(notifications.router,  prefix="/api/notifications",     tags=["notifications"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
