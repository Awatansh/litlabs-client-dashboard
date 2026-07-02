"""
pytest configuration and fixtures.
"""
import os
from pathlib import Path

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

TEST_DB_PATH = Path(__file__).resolve().parent / "test_dashboard.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"

@pytest_asyncio.fixture(scope="session", autouse=True)
async def seeded_database():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    from scripts.seed import seed

    await seed()
    yield

    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

@pytest_asyncio.fixture(scope="session")
async def client(seeded_database):
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture(scope="session")
async def auth_headers(client):
    """Login as demo owner and return auth headers."""
    resp = await client.post(
        "/auth/token",
        data={"username": "owner@brightfuture.com", "password": "Litlabs2025!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
