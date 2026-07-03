# LitLabs Client Dashboard

> **Live Demo:** [litlabs-dashboard.vercel.app](https://litlabs-dashboard.vercel.app/) &nbsp;|&nbsp; **Backend API:** [litlabs-api.onrender.com](https://litlabs-api.onrender.com)
>
> **Demo credentials:** `owner@brightfuture.com` / `Litlabs2025!`

> [!WARNING]
> **Render Cold Start:** The backend is hosted on Render's free tier. If it hasn't been accessed recently, the first request may take **30–60 seconds** to wake up. Subsequent requests will be instant. Just wait a moment on first load and refresh if the login hangs.

---

A full-stack client portal for agency delivery. Clients get one place to:

- Review business performance across marketing, SEO & Google Ads
- Monitor projects and milestones
- Approve or reject deliverables
- Browse uploaded assets
- Track automation activity
- Access generated PDF reports

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **State / Data** | TanStack Query, Axios |
| **Charts** | Recharts |
| **UI Primitives** | Radix UI |
| **Backend** | FastAPI, Python 3.11 |
| **Database** | SQLAlchemy 2.0 async + asyncpg (Postgres) |
| **Auth** | JWT (access + refresh tokens) |
| **Storage** | Supabase Storage (via REST API) |
| **PDF Generation** | fpdf2 |
| **Frontend Host** | Vercel |
| **Backend Host** | Render |
| **Database Host** | Supabase (Postgres) |

---

## Deployment

| Service | URL |
|---|---|
| Frontend (Vercel) | https://litlabs-dashboard.vercel.app/ |
| Backend API (Render) | https://litlabs-api.onrender.com |
| Swagger / API Docs | https://litlabs-api.onrender.com/docs |

> [!NOTE]
> **Storage:** File uploads and PDF reports are stored in Supabase Storage. The backend uses the Supabase Storage REST API (via `httpx`) — **not** boto3 or the MinIO Python library — because Supabase's S3-compatible endpoint does not support the boto3 redirect flow.

> [!IMPORTANT]
> **Local Docker Compose:** The Docker Compose workflow uses a local MinIO container (`minio:9000`). MinIO does not implement the Supabase Storage REST API, so file upload and report download features **will not work** in Docker unless you swap the storage credentials to point at Supabase cloud instead of local MinIO.

---

## Repository Layout

```text
.
├── backend/
│   ├── auth/                # JWT helpers and auth dependencies
│   ├── mock_data/           # Mock marketing and SEO payloads
│   ├── routers/             # FastAPI route modules
│   ├── scripts/             # seed.py — creates demo client and uploads PDFs
│   ├── services/            # storage_service.py (Supabase REST), integrations
│   ├── tests/               # API and integration tests
│   ├── config.py            # Environment-backed settings (pydantic-settings)
│   ├── database.py          # Async SQLAlchemy engine and session dependency
│   ├── main.py              # FastAPI entry point and lifespan
│   ├── models.py            # SQLAlchemy ORM models
│   └── requirements.txt
├── frontend/
│   └── app/                 # Next.js application root
│       ├── src/app/         # App Router pages and layouts
│       ├── src/components/  # Shared UI and shell components
│       ├── src/contexts/    # AuthContext (JWT storage)
│       └── src/lib/         # Axios API client with auto-refresh
├── docker-compose.yml
├── .env.example
└── deployment.md            # Step-by-step production deployment guide
```

---

## Architecture

```
Browser
  │
  ▼
Vercel (Next.js)
  │  NEXT_PUBLIC_API_URL
  ▼
Render (FastAPI + uvicorn)
  │                    │
  ▼                    ▼
Supabase Postgres    Supabase Storage
(asyncpg pooler)     (REST API via httpx)
```

### Authentication Flow

1. User posts credentials to `POST /auth/token`
2. Backend returns `access_token` + `refresh_token`
3. Frontend stores both in `localStorage`
4. All API requests attach the bearer token
5. On `401`, the frontend silently calls `POST /auth/refresh`
6. All routes scope data to `current_user.client_id` — multi-tenant isolation

### API Routes

| Prefix | Description |
|---|---|
| `/auth` | Login, token refresh |
| `/api/overview` | Dashboard landing aggregates |
| `/api/projects` | Projects and milestones |
| `/api/deliverables` | Deliverables + Supabase upload URLs |
| `/api/approvals` | Approve / reject / request changes |
| `/api/marketing` | Campaign metrics (live or mock) |
| `/api/seo` | SEO overview, keywords, top pages |
| `/api/automation` | Automation logs and webhook ingestion |
| `/api/reports` | PDF report list and download URLs |
| `/api/notifications` | Unread count, list, mark read |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database — use Supabase pooler URL in production
DATABASE_URL=postgresql+asyncpg://postgres.yourproject:password@aws-X-region.pooler.supabase.com:5432/postgres

# Auth
JWT_SECRET=your-secret-at-least-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# Supabase Storage
MINIO_ENDPOINT=https://yourproject.storage.supabase.co/storage/v1/s3
MINIO_ACCESS_KEY=your-s3-access-key-id
MINIO_SECRET_KEY=your-s3-secret-access-key
MINIO_BUCKET=litlabs-deliverables
MINIO_SECURE=true
SUPABASE_SERVICE_KEY=your-supabase-service-role-jwt   # Required for REST API uploads
PRESIGNED_URL_EXPIRY=3600
```

> [!CAUTION]
> `SUPABASE_SERVICE_KEY` is the **service_role** JWT from Supabase → Project Settings → API. Never expose it client-side. Add it as an environment variable in Render.

### Frontend (`frontend/app/.env.local`)

```env
NEXT_PUBLIC_API_URL=https://litlabs-api.onrender.com/api
```

---

## Quick Start — Local Development (npm + uvicorn)

> [!TIP]
> This is the recommended local setup. No Docker required.

### Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- A Supabase project (for storage) or leave uploads disabled

### 1. Clone and configure

```powershell
git clone https://github.com/your-org/litlabs-dashboard.git
cd litlabs-dashboard
Copy-Item .env.example .env
```

Edit `.env` with your credentials (or leave defaults to run in mock mode with SQLite).

### 2. Start the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python scripts\seed.py
uvicorn main:app --reload --port 8000
```

| URL | Description |
|---|---|
| `http://localhost:8000` | API root |
| `http://localhost:8000/docs` | Swagger UI |
| `http://localhost:8000/health` | Health check |

### 3. Start the frontend

```powershell
cd frontend/app
npm install
npm run dev
```

Open `http://localhost:3000` and log in with `owner@brightfuture.com` / `Litlabs2025!`

---

## Docker Compose

> [!WARNING]
> **Storage limitation:** Docker Compose uses a local MinIO container which does not implement the Supabase Storage REST API. File upload and PDF download features will fail unless you configure the storage env vars to point at Supabase cloud instead of `minio:9000`.

```powershell
# From repo root
docker compose up --build
```

| URL | Description |
|---|---|
| `http://localhost:3000` | Frontend |
| `http://localhost:8000` | Backend API |
| `http://localhost:9000` | MinIO S3 API |
| `http://localhost:9001` | MinIO console |

```powershell
docker compose down
```

---

## Seeding Demo Data

The seed script creates the full demo tenant, inserts realistic data, generates PDF reports and uploads them to Supabase Storage.

```powershell
cd backend
python scripts\seed.py
```

It is safe to run multiple times — it skips reseeding if the demo client already exists.

**Demo tenant:**

| Field | Value |
|---|---|
| Company | Bright Future Wellness |
| Owner login | `owner@brightfuture.com` |
| Password | `Litlabs2025!` |

---

## Running Tests

```powershell
cd backend
pytest
```

Coverage includes auth flow, token refresh, route protection, multi-tenant isolation, and mock integration response schemas.

---

## Known Caveats

| Area | Status |
|---|---|
| Storage in Docker | ⚠️ MinIO container does not support Supabase Storage REST API |
| Render cold starts | ⚠️ Free tier sleeps after inactivity — first request takes 30–60s |
| File uploads | 🔑 Require `SUPABASE_SERVICE_KEY` to be set |
| Third-party integrations | 🔵 Mock mode by default; enable with env vars |
| DB migrations | ℹ️ Uses `Base.metadata.create_all()` — no Alembic migrations yet |

---

## Suggested Next Steps

1. Add Alembic migrations instead of relying on `create_all()`
2. Add timezone-aware UTC datetimes throughout
3. Enable live Meta Ads, GA4, and GSC integrations via env vars
4. Add per-client user management in the admin interface
