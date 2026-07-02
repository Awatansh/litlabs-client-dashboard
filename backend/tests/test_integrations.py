"""
Integration contract tests.
These verify that mock data shapes exactly match real API normalized schemas.
Run these when updating integrations or mock data to catch schema drift.
"""
import pytest
import asyncio


# ===========================
# Schema definitions
# (match the _normalize_* methods in each service)
# ===========================

META_OVERVIEW_SCHEMA = {
    "spend": float,
    "impressions": int,
    "clicks": int,
    "reach": int,
    "ctr": float,
    "cpc": float,
    "leads": int,
    "purchases": int,
    "conversions": int,
    "roas": (float, type(None)),
    "period_days": int,
}

META_CAMPAIGN_SCHEMA = {
    "id": str,
    "name": str,
    "status": str,
    "spend": float,
    "impressions": int,
    "clicks": int,
    "conversions": int,
    "roas": (float, type(None)),
    "ctr": float,
}

GSC_OVERVIEW_SCHEMA = {
    "clicks": int,
    "impressions": int,
    "avg_ctr": float,
    "avg_position": float,
    "daily_clicks": list,
}

GSC_KEYWORD_SCHEMA = {
    "keyword": str,
    "clicks": int,
    "impressions": int,
    "ctr": float,
    "position": float,
}

GA4_OVERVIEW_SCHEMA = {
    "sessions": int,
    "users": int,
    "new_users": int,
    "conversions": int,
    "bounce_rate": float,
}


def _check_schema(data: dict, schema: dict, context: str):
    """Assert that data dict contains all required fields with correct types."""
    for field, expected_type in schema.items():
        assert field in data, f"[{context}] Missing required field: '{field}'"
        if isinstance(expected_type, tuple):
            assert isinstance(data[field], expected_type), \
                f"[{context}] Field '{field}' has wrong type: {type(data[field])}, expected {expected_type}"
        else:
            assert isinstance(data[field], expected_type), \
                f"[{context}] Field '{field}' has wrong type: {type(data[field])}, expected {expected_type.__name__}"


class TestMetaAdsMockSchema:
    def test_overview_schema(self):
        from mock_data.meta_ads_mock import MOCK_OVERVIEW
        _check_schema(MOCK_OVERVIEW, META_OVERVIEW_SCHEMA, "Meta Ads Overview")

    def test_campaigns_schema(self):
        from mock_data.meta_ads_mock import MOCK_CAMPAIGNS
        assert len(MOCK_CAMPAIGNS) > 0, "Mock campaigns list must not be empty"
        for i, campaign in enumerate(MOCK_CAMPAIGNS):
            _check_schema(campaign, META_CAMPAIGN_SCHEMA, f"Meta Campaign #{i}")

    def test_campaigns_have_positive_values(self):
        from mock_data.meta_ads_mock import MOCK_CAMPAIGNS
        for campaign in MOCK_CAMPAIGNS:
            assert campaign["spend"] >= 0
            assert campaign["impressions"] >= 0
            assert campaign["clicks"] >= 0

    def test_overview_roas_is_positive_or_none(self):
        from mock_data.meta_ads_mock import MOCK_OVERVIEW
        if MOCK_OVERVIEW["roas"] is not None:
            assert MOCK_OVERVIEW["roas"] > 0

    def test_overview_has_trends(self):
        from mock_data.meta_ads_mock import MOCK_OVERVIEW
        assert "trends" in MOCK_OVERVIEW
        assert "spend" in MOCK_OVERVIEW["trends"]
        assert len(MOCK_OVERVIEW["trends"]["spend"]) >= 7


class TestGSCMockSchema:
    def test_overview_schema(self):
        from mock_data.gsc_mock import MOCK_GSC_OVERVIEW
        _check_schema(MOCK_GSC_OVERVIEW, GSC_OVERVIEW_SCHEMA, "GSC Overview")

    def test_keywords_schema(self):
        from mock_data.gsc_mock import MOCK_GSC_KEYWORDS
        assert len(MOCK_GSC_KEYWORDS) >= 5, "Need at least 5 keywords for useful UI"
        for i, kw in enumerate(MOCK_GSC_KEYWORDS):
            _check_schema(kw, GSC_KEYWORD_SCHEMA, f"GSC Keyword #{i}")

    def test_keyword_positions_are_valid(self):
        from mock_data.gsc_mock import MOCK_GSC_KEYWORDS
        for kw in MOCK_GSC_KEYWORDS:
            assert 1.0 <= kw["position"] <= 100.0, f"Invalid position: {kw['position']}"


class TestGA4MockSchema:
    def test_overview_schema(self):
        from mock_data.ga4_mock import MOCK_GA4_OVERVIEW
        _check_schema(MOCK_GA4_OVERVIEW, GA4_OVERVIEW_SCHEMA, "GA4 Overview")

    def test_channel_breakdown_is_valid(self):
        from mock_data.ga4_mock import MOCK_GA4_OVERVIEW
        channels = MOCK_GA4_OVERVIEW.get("channel_breakdown", [])
        assert len(channels) >= 3
        for ch in channels:
            assert "channel" in ch
            assert "sessions" in ch
            assert "pct" in ch


class TestMockServiceInterface:
    """Verify mock services return data with correct schemas (end-to-end)."""

    async def test_meta_mock_service_overview_shape(self):
        from services.meta_ads_service import MetaAdsMockService
        service = MetaAdsMockService()
        result = await service.get_overview("test_client", 30)
        _check_schema(result, META_OVERVIEW_SCHEMA, "MetaAdsMockService.get_overview")

    async def test_meta_mock_service_campaigns_shape(self):
        from services.meta_ads_service import MetaAdsMockService
        service = MetaAdsMockService()
        result = await service.get_campaigns("test_client")
        assert isinstance(result, list)
        assert len(result) > 0
        _check_schema(result[0], META_CAMPAIGN_SCHEMA, "MetaAdsMockService.get_campaigns[0]")
