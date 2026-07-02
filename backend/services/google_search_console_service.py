"""
Google Search Console service — mock and real implementations.
"""
from datetime import datetime, timedelta
from config import settings
from mock_data.gsc_mock import MOCK_GSC_OVERVIEW, MOCK_GSC_KEYWORDS, MOCK_GSC_TOP_PAGES


class GoogleSearchConsoleService:
    """Real GSC service using Search Console API."""

    def __init__(self):
        import json
        from google.oauth2 import service_account
        import googleapiclient.discovery
        creds_dict = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
        )
        self.service = googleapiclient.discovery.build("searchconsole", "v1", credentials=credentials)
        self.site_url = settings.GOOGLE_SEARCH_CONSOLE_SITE_URL

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        # Offset by 4 days for data lag
        end_date = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days + 4)).strftime("%Y-%m-%d")
        body = {"startDate": start_date, "endDate": end_date, "dimensions": ["date"], "rowLimit": days}
        response = self.service.searchanalytics().query(siteUrl=self.site_url, body=body).execute()
        rows = response.get("rows", [])
        return {
            "clicks": sum(r["clicks"] for r in rows),
            "impressions": sum(r["impressions"] for r in rows),
            "avg_ctr": sum(r["ctr"] for r in rows) / len(rows) * 100 if rows else 0,
            "avg_position": sum(r["position"] for r in rows) / len(rows) if rows else 0,
            "daily_clicks": [{"date": r["keys"][0], "clicks": r["clicks"]} for r in rows],
        }

    async def get_keywords(self, client_id: str, limit: int = 50) -> list[dict]:
        end_date = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=34)).strftime("%Y-%m-%d")
        body = {
            "startDate": start_date, "endDate": end_date,
            "dimensions": ["query"], "rowLimit": limit,
            "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
        }
        response = self.service.searchanalytics().query(siteUrl=self.site_url, body=body).execute()
        return [
            {
                "keyword": row["keys"][0],
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": round(row["ctr"] * 100, 1),
                "position": round(row["position"], 1),
            }
            for row in response.get("rows", [])
        ]

    async def get_top_pages(self, client_id: str, limit: int = 10) -> list[dict]:
        end_date = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=34)).strftime("%Y-%m-%d")
        body = {
            "startDate": start_date, "endDate": end_date,
            "dimensions": ["page"], "rowLimit": limit,
            "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
        }
        response = self.service.searchanalytics().query(siteUrl=self.site_url, body=body).execute()
        return [
            {"page": row["keys"][0], "clicks": row["clicks"],
             "impressions": row["impressions"], "position": round(row["position"], 1)}
            for row in response.get("rows", [])
        ]


class GoogleSearchConsoleMockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_GSC_OVERVIEW

    async def get_keywords(self, client_id: str, limit: int = 50) -> list[dict]:
        return MOCK_GSC_KEYWORDS[:limit]

    async def get_top_pages(self, client_id: str, limit: int = 10) -> list[dict]:
        return MOCK_GSC_TOP_PAGES[:limit]


def get_gsc_service():
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GOOGLE_SEARCH_CONSOLE_SITE_URL:
        return GoogleSearchConsoleService()
    return GoogleSearchConsoleMockService()
