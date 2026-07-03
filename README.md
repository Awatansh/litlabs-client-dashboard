# LitLabs Client Dashboard

LitLabs Client Dashboard is a full-stack client portal for agency delivery. It combines a Next.js frontend with a FastAPI backend to give clients one place to:

- review business performance
- monitor projects and milestones
- approve or reject deliverables
- browse uploaded assets
- view SEO and marketing metrics
- track automation activity
- access generated reports

The project is currently set up primarily for local development with seeded demo data and mock integrations. Live integrations are supported behind environment variables, but several areas are still intentionally partial or stubbed.

## Tech Stack

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- TanStack Query
- Axios
- Recharts
- Radix UI primitives

### Backend

- FastAPI
- SQLAlchemy 2.0 async
- SQLite by default via `aiosqlite`
- `asyncpg` support remains available for future Postgres deployments
- JWT authentication
- MinIO for object storage
- fpdf2 used for PDF report generation

## Repository Layout

```text
.
├── backend/
│   ├── auth/                # JWT helpers and auth dependencies
│   ├── mock_data/           # Mock marketing and SEO payloads
│   ├── routers/             # FastAPI route modules
│   ├── scripts/             # Seed script for demo data
│   ├── services/            # Integration and storage services
│   ├── tests/               # API and integration tests
│   ├── config.py            # Environment-backed settings
│   ├── database.py          # Async engine and DB session dependency
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # SQLAlchemy models
│   └── requirements.txt
├── frontend/
│   ├── app/                 # Actual Next.js application root
│   │   ├── src/app/         # App Router pages and layouts
│   │   ├── src/components/  # Shared UI and shell components
│   │   ├── src/contexts/    # Auth provider
│   │   └── src/lib/         # API client and utils
│   └── demo.html            # Standalone design/demo artifact
├── docker-compose.yml
├── .env.example
├── IMPLEMENTATION.md
├── INTEGRATIONS.md
└── PRD.md
```

## Architecture Overview

### Frontend Architecture

The frontend lives in `frontend/app`, not directly in `frontend/`.

Key pieces:

- `src/app/layout.tsx`
  - wraps the app in `QueryProvider` and `AuthProvider`
- `src/app/login/page.tsx`
  - login screen with demo credentials prefilled
- `src/app/(dashboard)/layout.tsx`
  - protected app shell
  - redirects unauthenticated users to `/login`
- `src/components/layout/Sidebar.tsx`
  - left navigation for dashboard areas
- `src/components/layout/TopBar.tsx`
  - polling unread notification count and shared header
- `src/lib/api.ts`
  - central Axios client
  - attaches JWT access token
  - refreshes access token on `401`
- `src/contexts/AuthContext.tsx`
  - stores user and tokens in `localStorage`

Dashboard routes currently implemented:

- `/` dashboard overview
- `/marketing`
- `/seo`
- `/automation`
- `/projects`
- `/approvals`
- `/deliverables`
- `/reports`
- `/login`

Each page fetches directly from the backend using TanStack Query.

### Backend Architecture

The backend is a FastAPI app with modular routers under `backend/routers`.

Key pieces:

- `main.py`
  - creates the app
  - enables CORS for `http://localhost:3000` and `http://localhost:3001`
  - creates database tables on startup
- `config.py`
  - reads runtime settings from `.env`
- `database.py`
  - creates async SQLAlchemy engine and session factory
- `models.py`
  - defines clients, users, projects, milestones, deliverables, approvals, marketing metrics, SEO metrics, automation logs, notifications, activity logs, and reports
- `auth/jwt.py`
  - hashes passwords and issues/verifies JWTs
- `auth/dependencies.py`
  - authenticates bearer tokens and exposes role guard helpers

Primary API areas:

- `/auth`
  - login and token refresh
- `/api/overview`
  - aggregated counts for dashboard landing page
- `/api/projects`
  - list and detail for client projects
- `/api/deliverables`
  - list deliverables and generate MinIO upload URLs
- `/api/approvals`
  - list pending/history items and approve/reject/request changes
- `/api/marketing`
  - marketing overview, campaigns, channel breakdown
- `/api/seo`
  - SEO overview, keywords, top pages
- `/api/automation`
  - automation summary, recent runs, webhook event ingestion
- `/api/reports`
  - list reports and stub report generation
- `/api/notifications`
  - list notifications, unread count, mark read

## Data and Auth Flow

1. The user signs in from the frontend login page.
2. The frontend posts credentials to `POST /auth/token`.
3. The backend returns `access_token`, `refresh_token`, and a user payload.
4. The frontend stores these in `localStorage`.
5. All later frontend API requests attach the bearer token.
6. If a request returns `401`, the frontend calls `POST /auth/refresh`.
7. Most backend routes scope data to `current_user.client_id`, which is the main multi-tenant isolation mechanism.

## Demo Credentials

The seed script creates a demo tenant and users.

- Owner login: `owner@brightfuture.com`
- Password: `Litlabs2025!`

The login page also pre-fills these values.

## Integrations and Runtime Modes

The project supports both mock mode and live mode.

### Mock mode

Used when external credentials are not configured.

- Meta Ads falls back to mock responses
- GA4 falls back to mock responses
- Google Search Console falls back to mock responses

This is the easiest way to run the project locally.

### Live mode

Enabled by filling the relevant environment variables for:

- Meta Ads
- Google Analytics 4
- Google Search Console
- Google Ads
- LinkedIn Ads
- HubSpot
- MinIO

See `.env.example` for the full list.

## Environment Variables

The canonical template is the root `.env.example`.

Important variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `NEXT_PUBLIC_API_URL`
- `META_ACCESS_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SEARCH_CONSOLE_SITE_URL`
- `GA4_PROPERTY_ID`
- `WEBHOOK_SECRET_KEY`

### Important config note

The backend now reads environment variables from the repository root `.env` in both local and Docker workflows. Docker Compose only overrides the values that must differ inside containers, such as the internal MinIO hostname.

For the frontend:

- local development uses `frontend/app/.env.local`
- Docker Compose injects `NEXT_PUBLIC_API_URL` directly

## Quick Start

Choose one run method:

1. Local: run backend and frontend directly on your machine, with MinIO only for uploads.
2. Docker: run frontend, backend, and MinIO together with `docker compose`.

## How To Run Locally

### Prerequisites

- Node.js 20+
- npm
- Python 3.11 or 3.12
- Docker Desktop or a local MinIO instance for uploads

### 1. Start MinIO

The app now uses SQLite by default, so you do not need Postgres for the standard local workflow.

If you want the deliverables upload flow to work locally, start MinIO. The simplest option is Docker:

```powershell
docker run --name litlabs-minio -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin -p 9000:9000 -p 9001:9001 -d minio/minio server /data --console-address ":9001"
```

### 2. Configure backend environment

Copy the root example file to `.env` if you have not already:

```powershell
Copy-Item .env.example .env
```

```env
DATABASE_URL=sqlite+aiosqlite:///./dashboard.db
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=litlabs-deliverables
MINIO_SECURE=false
JWT_SECRET=dev-secret-change-in-production-at-least-32-chars
```

Leave third-party integration variables empty to stay in mock mode.

### 3. Start the backend

From `backend/`:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python scripts\seed.py
uvicorn main:app --reload --port 8000
```

Or use the provided helper:

```powershell
.\run_backend.ps1
```

Backend URLs:

- API: `http://localhost:8000`
- Health check: `http://localhost:8000/health`
- Swagger UI: `http://localhost:8000/docs`

### 4. Configure the frontend

From `frontend/app/`, copy `.env.local.example` to `.env.local`:

```powershell
Copy-Item .env.local.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5. Start the frontend

From `frontend/app/`:

```powershell
npm install
npm run dev
```

Frontend URL:

- App: `http://localhost:3000`

## How To Run With Docker Compose

The Compose workflow is now aligned with the local workflow:

- SQLite-backed backend
- MinIO for uploads
- Next.js frontend served from `frontend/app`
- automatic demo-data refresh on backend startup

### Prerequisites

- Docker Desktop
- port `3000` available for the frontend
- port `8000` available for the backend
- ports `9000` and `9001` available for MinIO

### 1. Configure environment

Copy the root example file if needed:

```powershell
Copy-Item .env.example .env
```

For the standard Docker path, the default `.env` values are already correct. Compose overrides the internal MinIO hostname automatically.

### 2. Build and start the stack

Run from the repository root:

```powershell
docker compose up --build
```

To run in the background:

```powershell
docker compose up --build -d
```

Service URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`

### 3. Stop the stack

```powershell
docker compose down
```

### Docker troubleshooting

If port `3000` is already occupied on your machine, either stop the process using that port or temporarily change the frontend mapping in [docker-compose.yml](C:/Users/awatansh/Documents/Dev/dashboard/docker-compose.yml) from:

```yaml
- "3000:3000"
```

to:

```yaml
- "3001:3000"
```

Then open `http://localhost:3001` instead.

## Seeding Demo Data

The seed script:

- creates tables
- creates the demo client `Bright Future Wellness`
- creates demo users
- inserts projects, milestones, deliverables, approvals, automation logs, notifications, and reports

Run it from `backend/`:

```powershell
python scripts\seed.py
```

It is idempotent for the demo client check and will skip reseeding if the demo tenant already exists.

## Tests

Backend tests live in `backend/tests`.

Run them from `backend/`:

```powershell
pytest
```

Test coverage includes:

- login/auth behavior
- token refresh
- route protection
- multi-tenant data isolation
- mock integration response schemas

## Known Gaps and Current Caveats

These are worth knowing before extending or deploying the app:

- the checked-in virtual environments and dependency folders should not be treated as canonical; use `pip install -r requirements.txt` and `npm install` if your local copies drift.

## Validation Notes

During analysis, I verified:

- backend startup path from `backend/main.py`
- auth flow and seeded demo credentials
- frontend route structure and shared providers
- backend route modules and data model layout

I also ran a quick validation pass:

- `npm run build` succeeds in `frontend/app`
- `pytest` succeeds in `backend` with `27 passed`
- `docker compose config` succeeds
- `docker compose build backend frontend` succeeds
- the Compose backend serves `GET /health` successfully
- the frontend image serves successfully; during validation I used port `3001` because port `3000` was already occupied on this machine

## Suggested Next Improvements

If you want to make the project more production-ready, the highest-value next steps are:

1. move timestamp handling to timezone-aware UTC datetimes
2. add migrations instead of relying only on `Base.metadata.create_all()`
3. decide whether production should stay on SQLite or move to Postgres
