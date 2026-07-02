from fastapi import APIRouter, Depends, Query
from auth.dependencies import get_current_user
from models import User
from config import settings

router = APIRouter()


def get_gsc_service():
    """Factory: returns real or mock GSC service."""
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GOOGLE_SEARCH_CONSOLE_SITE_URL:
        from services.google_search_console_service import GoogleSearchConsoleService
        return GoogleSearchConsoleService()
    from services.google_search_console_service import GoogleSearchConsoleMockService
    return GoogleSearchConsoleMockService()


@router.get("/overview")
async def get_seo_overview(
    days: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
):
    """
    SEO performance overview from Google Search Console.
    Note: GSC data has a 3-4 day lag — this is expected behavior.
    """
    service = get_gsc_service()
    return await service.get_overview(client_id=str(current_user.client_id), days=days)


@router.get("/keywords")
async def get_keywords(
    limit: int = Query(default=20, ge=5, le=100),
    current_user: User = Depends(get_current_user),
):
    """Top keywords by clicks, with position ranking."""
    service = get_gsc_service()
    return await service.get_keywords(client_id=str(current_user.client_id), limit=limit)


@router.get("/top-pages")
async def get_top_pages(
    limit: int = Query(default=10, ge=5, le=50),
    current_user: User = Depends(get_current_user),
):
    """Top performing pages by organic traffic."""
    service = get_gsc_service()
    return await service.get_top_pages(client_id=str(current_user.client_id), limit=limit)
