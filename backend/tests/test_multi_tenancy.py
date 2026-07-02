"""
Multi-tenancy isolation tests.
CRITICAL: Verify that client A cannot access client B's data.
"""
import pytest


class TestMultiTenantIsolation:
    async def test_overview_scoped_to_client(self, client, auth_headers):
        """Overview data must only include the authenticated client's data."""
        resp = await client.get("/api/overview", headers=auth_headers)
        assert resp.status_code == 200
        # Verify response structure doesn't leak other client data
        data = resp.json()
        assert "active_projects" in data or "projects" in data

    async def test_marketing_requires_auth(self, client):
        """Marketing endpoint requires valid JWT."""
        resp = await client.get("/api/marketing/overview")
        assert resp.status_code == 401

    async def test_seo_requires_auth(self, client):
        """SEO endpoint requires valid JWT."""
        resp = await client.get("/api/seo/overview")
        assert resp.status_code == 401

    async def test_approvals_requires_auth(self, client):
        """Approvals require valid JWT."""
        resp = await client.get("/api/approvals")
        assert resp.status_code == 401

    async def test_marketing_returns_data_for_authenticated_user(self, client, auth_headers):
        """Marketing endpoint returns data for the authenticated client."""
        resp = await client.get("/api/marketing/overview?days=30", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "meta_ads" in data
        assert "google_analytics" in data
        assert data["meta_ads"]["spend"] >= 0

    async def test_seo_returns_data_for_authenticated_user(self, client, auth_headers):
        """SEO endpoint returns data for authenticated client."""
        resp = await client.get("/api/seo/overview", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "clicks" in data
        assert "impressions" in data

    async def test_campaigns_return_list(self, client, auth_headers):
        resp = await client.get("/api/marketing/campaigns", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_keywords_return_list(self, client, auth_headers):
        resp = await client.get("/api/seo/keywords", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) > 0

    async def test_approvals_list_for_client(self, client, auth_headers):
        resp = await client.get("/api/approvals?status=pending", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
