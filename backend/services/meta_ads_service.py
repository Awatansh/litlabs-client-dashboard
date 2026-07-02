"""
Meta Ads service — mock and real implementations.
Factory function `get_meta_ads_service()` returns the appropriate one.
"""
import httpx
from config import settings
from mock_data.meta_ads_mock import MOCK_OVERVIEW, MOCK_CAMPAIGNS

META_API_VERSION = "v20.0"
META_BASE = f"https://graph.facebook.com/{META_API_VERSION}"


class MetaAdsService:
    """Real Meta Ads service using Graph API."""

    def __init__(self):
        self.token = settings.META_ACCESS_TOKEN
        self.account_id = settings.META_AD_ACCOUNT_ID

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        url = f"{META_BASE}/{self.account_id}/insights"
        params = {
            "fields": "impressions,clicks,spend,reach,ctr,cpc,actions,action_values",
            "date_preset": f"last_{days}_days",
            "level": "account",
            "access_token": self.token,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json().get("data", [{}])[0]
            return self._normalize_overview(data, days)

    async def get_campaigns(self, client_id: str) -> list[dict]:
        url = f"{META_BASE}/{self.account_id}/campaigns"
        params = {
            "fields": "name,status,objective,daily_budget",
            "access_token": self.token,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            campaigns = resp.json().get("data", [])
        return campaigns  # Full enrichment in production

    async def get_daily_trends(self, client_id: str, days: int = 30) -> list[dict]:
        url = f"{META_BASE}/{self.account_id}/insights"
        params = {
            "fields": "spend,impressions,actions",
            "date_preset": f"last_{days}_days",
            "time_increment": "1",  # Daily breakdown
            "access_token": self.token,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json().get("data", [])

    def _normalize_overview(self, raw: dict, days: int) -> dict:
        actions = {a["action_type"]: int(float(a["value"])) for a in raw.get("actions", [])}
        action_values = {av["action_type"]: float(av["value"]) for av in raw.get("action_values", [])}
        spend = float(raw.get("spend", 0))
        purchase_value = action_values.get("purchase", 0) + action_values.get("offsite_conversion.fb_pixel_purchase", 0)
        return {
            "spend": spend,
            "impressions": int(raw.get("impressions", 0)),
            "clicks": int(raw.get("clicks", 0)),
            "reach": int(raw.get("reach", 0)),
            "ctr": float(raw.get("ctr", 0)),
            "cpc": float(raw.get("cpc", 0)),
            "leads": actions.get("lead", 0) + actions.get("offsite_conversion.fb_pixel_lead", 0),
            "purchases": actions.get("purchase", 0),
            "conversions": (actions.get("lead", 0) + actions.get("offsite_conversion.fb_pixel_lead", 0) +
                            actions.get("purchase", 0)),
            "roas": round(purchase_value / spend, 2) if spend > 0 else None,
            "period_days": days,
        }


class MetaAdsMockService:
    """Returns realistic mock data when no API token is configured."""

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_OVERVIEW

    async def get_campaigns(self, client_id: str) -> list[dict]:
        return MOCK_CAMPAIGNS

    async def get_daily_trends(self, client_id: str, days: int = 30) -> list[dict]:
        return MOCK_OVERVIEW.get("trends", {}).get("spend", [])


def get_meta_ads_service():
    """Factory: return real service if credentials set, otherwise mock."""
    if settings.META_ACCESS_TOKEN:
        return MetaAdsService()
    return MetaAdsMockService()
