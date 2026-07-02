"""
Tests for authentication endpoints.
"""
import pytest


class TestLogin:
    async def test_login_success(self, client):
        resp = await client.post(
            "/auth/token",
            data={"username": "owner@brightfuture.com", "password": "Litlabs2025!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["role"] == "owner"

    async def test_login_wrong_password(self, client):
        resp = await client.post(
            "/auth/token",
            data={"username": "owner@brightfuture.com", "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert resp.status_code == 401

    async def test_login_unknown_user(self, client):
        resp = await client.post(
            "/auth/token",
            data={"username": "nobody@example.com", "password": "test"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert resp.status_code == 401

    async def test_protected_endpoint_without_token(self, client):
        resp = await client.get("/api/overview")
        assert resp.status_code == 401

    async def test_protected_endpoint_with_invalid_token(self, client):
        resp = await client.get("/api/overview", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    async def test_token_refresh(self, client):
        # Login first
        login_resp = await client.post(
            "/auth/token",
            data={"username": "owner@brightfuture.com", "password": "Litlabs2025!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        refresh_token = login_resp.json()["refresh_token"]

        # Refresh
        resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()
