"""
Google Analytics 4 service — mock and real implementations.
"""
from config import settings
from mock_data.ga4_mock import MOCK_GA4_OVERVIEW


class GA4Service:
    """Real GA4 service using Google Analytics Data API."""

    def __init__(self):
        import json
        from google.oauth2 import service_account
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        creds_dict = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"]
        )
        self.client = BetaAnalyticsDataClient(credentials=credentials)
        self.property_id = settings.GA4_PROPERTY_ID

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric
        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            date_ranges=[
                DateRange(start_date=f"{days}daysAgo", end_date="today"),
                DateRange(start_date=f"{days * 2}daysAgo", end_date=f"{days + 1}daysAgo"),
            ],
            dimensions=[Dimension(name="date"), Dimension(name="sessionDefaultChannelGroup")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalUsers"),
                Metric(name="newUsers"),
                Metric(name="conversions"),
                Metric(name="bounceRate"),
            ],
        )
        response = self.client.run_report(request)
        return self._parse(response)

    def _parse(self, response) -> dict:
        totals = {"sessions": 0, "users": 0, "new_users": 0, "conversions": 0, "bounce_rate": 0}
        for row in response.rows:
            totals["sessions"] += int(row.metric_values[0].value)
            totals["users"] += int(row.metric_values[1].value)
            totals["new_users"] += int(row.metric_values[2].value)
            totals["conversions"] += int(row.metric_values[3].value)
        return totals


class GA4MockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_GA4_OVERVIEW

    async def get_channel_breakdown(self, client_id: str, days: int = 30) -> list[dict]:
        return MOCK_GA4_OVERVIEW.get("channel_breakdown", [])


def get_ga4_service():
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GA4_PROPERTY_ID:
        return GA4Service()
    return GA4MockService()
