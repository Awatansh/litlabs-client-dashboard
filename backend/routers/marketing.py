from fastapi import APIRouter, Depends, Query
from auth.dependencies import get_current_user
from models import User
from config import settings
from mock_data.meta_ads_mock import MOCK_OVERVIEW, MOCK_CAMPAIGNS
from mock_data.ga4_mock import MOCK_GA4_OVERVIEW

router = APIRouter()


def get_meta_service():
    """Factory: returns real or mock Meta Ads service."""
    if settings.META_ACCESS_TOKEN:
        from services.meta_ads_service import MetaAdsService
        return MetaAdsService()
    from services.meta_ads_service import MetaAdsMockService
    return MetaAdsMockService()


def get_ga4_service():
    """Factory: returns real or mock GA4 service."""
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GA4_PROPERTY_ID:
        from services.google_analytics_service import GA4Service
        return GA4Service()
    from services.google_analytics_service import GA4MockService
    return GA4MockService()


@router.get("/overview")
async def get_marketing_overview(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregated marketing metrics for the client.
    Pulls from Meta Ads + GA4. Uses mock data if credentials are not configured.
    """
    meta_service = get_meta_service()
    ga4_service = get_ga4_service()

    meta_data = await meta_service.get_overview(client_id=str(current_user.client_id), days=days)
    ga4_data = await ga4_service.get_overview(client_id=str(current_user.client_id), days=days)

    return {
        "meta_ads": meta_data,
        "google_analytics": ga4_data,
        "period_days": days,
    }


@router.get("/campaigns")
async def get_campaigns(
    current_user: User = Depends(get_current_user),
):
    """Per-campaign breakdown from Meta Ads."""
    meta_service = get_meta_service()
    return await meta_service.get_campaigns(client_id=str(current_user.client_id))


@router.get("/channel-breakdown")
async def get_channel_breakdown(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
):
    """Traffic channel breakdown from GA4."""
    ga4_service = get_ga4_service()
    data = await ga4_service.get_overview(client_id=str(current_user.client_id), days=days)
    return data.get("channel_breakdown", [])
