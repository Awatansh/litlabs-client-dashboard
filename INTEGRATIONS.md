# LitLabs Client Dashboard — Integrations Guide

> **Plug-and-Play Architecture**: Every integration follows the same pattern — mock mode when ENV var is absent, live mode when credential is set. Switching is a config change, not a code change.

---

## Table of Contents

1. [Integration Architecture Overview](#1-integration-architecture-overview)
2. [Meta Ads (Facebook/Instagram)](#2-meta-ads-facebookinstagram)
3. [Google Analytics 4](#3-google-analytics-4)
4. [Google Search Console (SEO)](#4-google-search-console-seo)
5. [Google Ads](#5-google-ads)
6. [LinkedIn Ads](#6-linkedin-ads)
7. [HubSpot CRM](#7-hubspot-crm)
8. [Automation Webhooks (n8n / Make / Zapier)](#8-automation-webhooks-n8n--make--zapier)
9. [WordPress / Webflow (Content)](#9-wordpress--webflow-content)
10. [File Storage (MinIO / S3)](#10-file-storage-minio--s3)
11. [Contract Tests & Mock Validation](#11-contract-tests--mock-validation)
12. [Rate Limit & Error Handling Reference](#12-rate-limit--error-handling-reference)

---

## 1. Integration Architecture Overview

### The Service Factory Pattern

```
ENV var set?
    YES → RealService (calls live API)
    NO  → MockService (returns realistic fake data)

Both implement the same Protocol interface.
Frontend and routers never know which is active.
```

### Directory Structure

```
backend/
├── services/
│   ├── base.py                        # Protocol definitions
│   ├── meta_ads_service.py            # Mock + Real
│   ├── google_analytics_service.py    # Mock + Real
│   ├── google_search_console_service.py # Mock + Real
│   ├── google_ads_service.py          # Mock + Real
│   ├── linkedin_ads_service.py        # Mock + Real
│   ├── hubspot_service.py             # Mock + Real
│   └── storage_service.py            # MinIO
└── mock_data/
    ├── meta_ads_mock.py
    ├── ga4_mock.py
    ├── gsc_mock.py
    ├── google_ads_mock.py
    ├── linkedin_ads_mock.py
    └── hubspot_mock.py
```

### Base Protocol (`services/base.py`)

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class MarketingProvider(Protocol):
    async def get_overview(self, client_id: str, days: int) -> dict: ...
    async def get_campaigns(self, client_id: str) -> list[dict]: ...
    async def get_daily_trends(self, client_id: str, days: int) -> list[dict]: ...

@runtime_checkable
class SEOProvider(Protocol):
    async def get_overview(self, client_id: str, days: int) -> dict: ...
    async def get_keywords(self, client_id: str, limit: int) -> list[dict]: ...
    async def get_top_pages(self, client_id: str, limit: int) -> list[dict]: ...

@runtime_checkable
class CRMProvider(Protocol):
    async def get_contacts(self, client_id: str, limit: int) -> list[dict]: ...
    async def get_deals(self, client_id: str) -> list[dict]: ...
    async def get_lead_summary(self, client_id: str, days: int) -> dict: ...
```

---

## 2. Meta Ads (Facebook/Instagram)

### How It Works in Real Life

Meta Ads uses the **Graph API** v20.0. The best authentication method for a server-to-server integration (no user interaction needed) is a **System User Token**:

1. Business Manager → Business Settings → System Users
2. Create a System User (Admin level recommended for full access)
3. Assign the System User to each Ad Account with "Analyst" role
4. Generate a Token with scopes: `ads_read`, `ads_management`, `read_insights`
5. ⚠️ **System User tokens NEVER expire** — unlike User tokens (60-day expiry)

### Setup Checklist

- [ ] Create/log into Facebook Business Manager: business.facebook.com
- [ ] Create a Facebook App (type: Business) at developers.facebook.com
- [ ] Under Business Settings > System Users — create system user
- [ ] Assign system user to Ad Account(s) with Analyst permission
- [ ] Generate token with scopes: `ads_read`, `ads_management`, `read_insights`, `business_management`
- [ ] Copy token to `META_ACCESS_TOKEN` in `.env`
- [ ] Copy Ad Account ID (format: `act_123456789`) to `META_AD_ACCOUNT_ID`
- [ ] Restart backend → API goes live

### Key API Endpoints

```
Base URL: https://graph.facebook.com/v20.0

GET /me/adaccounts
  → Lists all ad accounts accessible by this token

GET /act_{ad_account_id}/campaigns
  ?fields=name,status,objective,daily_budget,lifetime_budget
  &access_token={token}

GET /act_{ad_account_id}/insights
  ?fields=campaign_name,impressions,clicks,spend,reach,ctr,cpc,actions,action_values,frequency
  &date_preset=last_30_days    (or last_7_days, last_14_days, this_month)
  &level=campaign              (account | campaign | adset | ad)
  &time_increment=1            (daily breakdown)
  &access_token={token}
```

### Understanding `actions` Field

The `actions` field is an array of `{ action_type, value }` objects. Key types:
- `lead` — Facebook Lead Ads form submission
- `offsite_conversion.fb_pixel_lead` — Pixel-tracked lead on website
- `purchase` — Purchase conversion event
- `offsite_conversion.fb_pixel_purchase` — Pixel purchase

```python
def extract_conversions(actions: list) -> dict:
    action_map = {a["action_type"]: int(float(a["value"])) for a in actions}
    return {
        "leads": action_map.get("lead", 0) + action_map.get("offsite_conversion.fb_pixel_lead", 0),
        "purchases": action_map.get("purchase", 0) + action_map.get("offsite_conversion.fb_pixel_purchase", 0),
        "total": sum(action_map.values()),
    }
```

### ROAS Calculation

ROAS = Purchase Value / Spend. The `action_values` field (same shape as `actions`) provides monetary value of each conversion:

```python
def calculate_roas(action_values: list, spend: float) -> float:
    purchase_value = sum(
        float(av["value"]) for av in action_values
        if av["action_type"] in ("purchase", "offsite_conversion.fb_pixel_purchase")
    )
    return round(purchase_value / spend, 2) if spend > 0 else 0
```

### Pagination

Meta API uses cursor-based pagination. Always paginate through all results:

```python
async def paginate_meta(url: str, params: dict) -> list:
    results = []
    async with httpx.AsyncClient() as client:
        while url:
            resp = await client.get(url, params=params)
            data = resp.json()
            results.extend(data.get("data", []))
            url = data.get("paging", {}).get("next")  # None if last page
            params = {}  # Next URL already includes params
    return results
```

### Rate Limits

| Limit Type | Threshold | Response Header |
|------------|-----------|----------------|
| App-level | 200 calls/hour per user | `x-business-use-case-usage` |
| Marketing Insights | Has own throttle tier | `x-fb-ads-insights-throttle` |
| Batch request | Max 50 calls | — |

**On 429**: Parse `Retry-After` header, implement exponential backoff:
```python
import asyncio

async def rate_limited_request(client, url, params, max_retries=3):
    for attempt in range(max_retries):
        resp = await client.get(url, params=params)
        if resp.status_code == 429:
            wait = 2 ** attempt * 5  # 5s, 10s, 20s
            await asyncio.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    raise Exception("Meta API rate limit exceeded after retries")
```

### Data Lag

- Campaign data: up to 2 hours lag
- Conversion data: up to 48 hours lag (due to attribution window)
- ⚠️ Never display "live" Meta conversions — always note the date of last update

### Full Service Implementation

```python
# services/meta_ads_service.py
import httpx
from typing import Optional
from config import settings
from mock_data.meta_ads_mock import MOCK_OVERVIEW, MOCK_CAMPAIGNS

META_API_VERSION = "v20.0"
META_BASE = f"https://graph.facebook.com/{META_API_VERSION}"

class MetaAdsService:
    def __init__(self):
        self.token = settings.META_ACCESS_TOKEN
        self.account_id = settings.META_AD_ACCOUNT_ID  # e.g. act_123456789

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        url = f"{META_BASE}/{self.account_id}/insights"
        params = {
            "fields": ",".join([
                "impressions", "clicks", "spend", "reach",
                "ctr", "cpc", "actions", "action_values", "frequency"
            ]),
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
        
        # Fetch insights per campaign
        enriched = []
        for campaign in campaigns:
            insights = await self._get_campaign_insights(campaign["id"])
            enriched.append({**campaign, **insights})
        return enriched

    async def _get_campaign_insights(self, campaign_id: str) -> dict:
        url = f"{META_BASE}/{campaign_id}/insights"
        params = {
            "fields": "impressions,clicks,spend,ctr,cpc,actions",
            "date_preset": "last_30_days",
            "access_token": self.token,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json().get("data", [{}])[0] if resp.json().get("data") else {}
            return self._normalize_campaign(data)

    def _normalize_overview(self, raw: dict, days: int) -> dict:
        actions = {a["action_type"]: int(float(a["value"])) for a in raw.get("actions", [])}
        action_values = {av["action_type"]: float(av["value"]) for av in raw.get("action_values", [])}
        spend = float(raw.get("spend", 0))
        purchase_value = action_values.get("purchase", 0)
        return {
            "spend": spend,
            "impressions": int(raw.get("impressions", 0)),
            "clicks": int(raw.get("clicks", 0)),
            "reach": int(raw.get("reach", 0)),
            "ctr": float(raw.get("ctr", 0)),
            "cpc": float(raw.get("cpc", 0)),
            "leads": actions.get("lead", 0) + actions.get("offsite_conversion.fb_pixel_lead", 0),
            "purchases": actions.get("purchase", 0),
            "conversions": actions.get("lead", 0) + actions.get("purchase", 0),
            "roas": round(purchase_value / spend, 2) if spend > 0 else None,
            "period_days": days,
        }

    def _normalize_campaign(self, raw: dict) -> dict:
        actions = {a["action_type"]: int(float(a["value"])) for a in raw.get("actions", [])}
        return {
            "spend": float(raw.get("spend", 0)),
            "impressions": int(raw.get("impressions", 0)),
            "clicks": int(raw.get("clicks", 0)),
            "ctr": float(raw.get("ctr", 0)),
            "cpc": float(raw.get("cpc", 0)),
            "conversions": actions.get("lead", 0) + actions.get("purchase", 0),
        }


class MetaAdsMockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_OVERVIEW
    
    async def get_campaigns(self, client_id: str) -> list[dict]:
        return MOCK_CAMPAIGNS
    
    async def get_daily_trends(self, client_id: str, days: int = 30) -> list[dict]:
        return MOCK_OVERVIEW.get("trends", {}).get("spend", [])


def get_meta_ads_service():
    if settings.META_ACCESS_TOKEN:
        return MetaAdsService()
    return MetaAdsMockService()
```

### Mock Data

```python
# mock_data/meta_ads_mock.py
MOCK_OVERVIEW = {
    "spend": 3547.82,
    "impressions": 187430,
    "clicks": 4821,
    "reach": 89200,
    "ctr": 2.57,
    "cpc": 0.74,
    "leads": 98,
    "purchases": 29,
    "conversions": 127,
    "roas": 3.2,
    "period_days": 30,
    "trends": { ... },  # see IMPLEMENTATION.md for full mock
    "vs_previous_period": {"conversions_change_pct": 14.2, "roas_change_pct": 5.7},
}

MOCK_CAMPAIGNS = [
    {"id": "23845678901234", "name": "Lead Gen — Wellness Package Q3",
     "status": "ACTIVE", "objective": "OUTCOME_LEADS",
     "spend": 1847.50, "impressions": 98230, "clicks": 2541,
     "conversions": 67, "roas": 3.8, "ctr": 2.59, "cpc": 0.73},
    # ... more campaigns
]
```

---

## 3. Google Analytics 4

### How It Works in Real Life

Google Analytics 4 (GA4) replaced Universal Analytics (UA) in July 2023. The **Data API** is the correct API to use.

**Authentication**: Service Account (recommended for server-to-server)
1. Google Cloud Console → Create Project (or use existing)
2. Enable "Google Analytics Data API"
3. Create Service Account → download JSON key
4. In GA4: Admin → Property Access Management → Add User → paste service account email → Viewer role
5. Get Property ID: GA4 Admin → Property Settings → Property ID (numbers only, e.g., `354780123`)

### Setup Checklist

- [ ] Enable Google Analytics Data API in Cloud Console
- [ ] Create Service Account, download JSON key file
- [ ] Add service account email as Viewer in GA4 property
- [ ] Set `GOOGLE_SERVICE_ACCOUNT_JSON` to escaped JSON content
- [ ] Set `GA4_PROPERTY_ID` to numeric property ID
- [ ] Restart backend

### Key API Endpoint

```
POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
Authorization: Bearer {service_account_token}

Body:
{
  "dateRanges": [
    {"startDate": "30daysAgo", "endDate": "today"},
    {"startDate": "60daysAgo", "endDate": "31daysAgo"}  // Previous period comparison
  ],
  "dimensions": [
    {"name": "date"},
    {"name": "sessionDefaultChannelGroup"},
    {"name": "landingPage"}
  ],
  "metrics": [
    {"name": "sessions"},
    {"name": "totalUsers"},
    {"name": "newUsers"},
    {"name": "bounceRate"},
    {"name": "averageSessionDuration"},
    {"name": "conversions"},
    {"name": "screenPageViews"}
  ],
  "orderBys": [{"dimension": {"dimensionName": "date"}, "desc": false}],
  "limit": 1000
}
```

### Useful Dimension/Metric Combinations

| Goal | Dimensions | Metrics |
|------|-----------|---------|
| Traffic overview | date | sessions, totalUsers, newUsers |
| Channel breakdown | sessionDefaultChannelGroup | sessions, conversions |
| Top pages | pagePath, pageTitle | screenPageViews, averageSessionDuration |
| Device split | deviceCategory | sessions, bounceRate |

### Full Service Implementation

```python
# services/google_analytics_service.py
import json
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric, OrderBy
from config import settings
from mock_data.ga4_mock import MOCK_GA4_OVERVIEW

class GA4Service:
    def __init__(self):
        creds_dict = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"]
        )
        self.client = BetaAnalyticsDataClient(credentials=credentials)
        self.property_id = settings.GA4_PROPERTY_ID

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            date_ranges=[
                DateRange(start_date=f"{days}daysAgo", end_date="today"),
                DateRange(start_date=f"{days*2}daysAgo", end_date=f"{days+1}daysAgo"),
            ],
            dimensions=[Dimension(name="date")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalUsers"),
                Metric(name="newUsers"),
                Metric(name="conversions"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
            ],
        )
        response = self.client.run_report(request)
        return self._parse_overview(response, days)

    def _parse_overview(self, response, days: int) -> dict:
        current = {"sessions": 0, "users": 0, "new_users": 0, "conversions": 0}
        daily_sessions = []
        
        for row in response.rows:
            date_str = row.dimension_values[0].value
            sessions = int(row.metric_values[0].value)
            users = int(row.metric_values[1].value)
            new_users = int(row.metric_values[2].value)
            conversions = int(row.metric_values[3].value)
            
            current["sessions"] += sessions
            current["users"] += users
            current["new_users"] += new_users
            current["conversions"] += conversions
            daily_sessions.append({"date": date_str, "sessions": sessions})
        
        return {
            "sessions": current["sessions"],
            "users": current["users"],
            "new_users": current["new_users"],
            "conversions": current["conversions"],
            "bounce_rate": 0,  # Average separately
            "daily_sessions": daily_sessions,
        }


class GA4MockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_GA4_OVERVIEW

    async def get_channel_breakdown(self, client_id: str, days: int = 30) -> list[dict]:
        return [
            {"channel": "Organic Search", "sessions": 3241, "conversions": 48, "pct": 38.4},
            {"channel": "Paid Social", "sessions": 2105, "conversions": 67, "pct": 24.9},
            {"channel": "Direct", "sessions": 1820, "conversions": 22, "pct": 21.5},
            {"channel": "Email", "sessions": 842, "conversions": 18, "pct": 9.9},
            {"channel": "Referral", "sessions": 442, "conversions": 8, "pct": 5.2},
        ]


def get_ga4_service():
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GA4_PROPERTY_ID:
        return GA4Service()
    return GA4MockService()
```

---

## 4. Google Search Console (SEO)

### How It Works in Real Life

Google Search Console exposes the **Search Analytics API** (v3). Same service account auth pattern as GA4.

**Authentication Setup**:
1. Same Google Cloud Project and Service Account as GA4 (reuse!)
2. Enable "Google Search Console API" in Cloud Console
3. In Search Console: Settings → Users and Permissions → Add user with service account email (Full permission)
4. Site URL format: `https://www.yoursite.com` or `sc-domain:yoursite.com` (domain property, broader coverage)

### Key API Call

```
POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
Authorization: Bearer {service_account_token}

Body:
{
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "dimensions": ["query"],        // or ["page"], ["date"], ["country"]
  "dimensionFilterGroups": [],
  "rowLimit": 500,
  "startRow": 0,
  "dataState": "final"           // "final" = no data from last 3 days (accurate)
}

Response row: { keys: ["keyword"], clicks: 234, impressions: 5600, ctr: 0.042, position: 8.3 }
```

### Important Notes

- **Data lag**: GSC data is typically 3-4 days behind. Never show today's data.
- **Sampling**: For large sites, data may be sampled. Use `dimensions: ["page", "query"]` for unsampled data.
- **Position**: Average position (lower = better). Position 1 = #1 in search results.
- **Domain vs URL property**: Domain properties cover all subdomains and HTTP/HTTPS.

### Full Service Implementation

```python
# services/google_search_console_service.py
import json
from datetime import datetime, timedelta
from google.oauth2 import service_account
import googleapiclient.discovery
from config import settings
from mock_data.gsc_mock import MOCK_GSC_KEYWORDS, MOCK_GSC_OVERVIEW

class GoogleSearchConsoleService:
    def __init__(self):
        creds_dict = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
        )
        self.service = googleapiclient.discovery.build("searchconsole", "v1", credentials=credentials)
        self.site_url = settings.GOOGLE_SEARCH_CONSOLE_SITE_URL

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        end_date = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d")  # 4-day lag
        start_date = (datetime.now() - timedelta(days=days + 4)).strftime("%Y-%m-%d")
        
        # Total performance
        body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["date"],
            "rowLimit": days,
        }
        response = self.service.searchanalytics().query(siteUrl=self.site_url, body=body).execute()
        
        rows = response.get("rows", [])
        totals = {
            "clicks": sum(r["clicks"] for r in rows),
            "impressions": sum(r["impressions"] for r in rows),
            "avg_ctr": sum(r["ctr"] for r in rows) / len(rows) if rows else 0,
            "avg_position": sum(r["position"] for r in rows) / len(rows) if rows else 0,
            "daily_clicks": [{"date": r["keys"][0], "clicks": r["clicks"]} for r in rows],
        }
        return totals

    async def get_keywords(self, client_id: str, limit: int = 50) -> list[dict]:
        end_date = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=34)).strftime("%Y-%m-%d")
        
        body = {
            "startDate": start_date, "endDate": end_date,
            "dimensions": ["query"],
            "rowLimit": limit,
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


class GoogleSearchConsoleMockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_GSC_OVERVIEW
    
    async def get_keywords(self, client_id: str, limit: int = 50) -> list[dict]:
        return MOCK_GSC_KEYWORDS[:limit]


def get_gsc_service():
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON and settings.GOOGLE_SEARCH_CONSOLE_SITE_URL:
        return GoogleSearchConsoleService()
    return GoogleSearchConsoleMockService()
```

### Mock Data

```python
# mock_data/gsc_mock.py
MOCK_GSC_OVERVIEW = {
    "clicks": 4821,
    "impressions": 187430,
    "avg_ctr": 2.57,
    "avg_position": 14.3,
    "vs_previous": {"clicks_change_pct": 18.4, "impressions_change_pct": 22.1},
    "daily_clicks": [{"date": "2024-06-01", "clicks": 145}, ...],
}

MOCK_GSC_KEYWORDS = [
    {"keyword": "wellness coaching near me", "clicks": 412, "impressions": 4820,
     "ctr": 8.5, "position": 3.2, "position_change": +1},
    {"keyword": "holistic health coach", "clicks": 287, "impressions": 6100,
     "ctr": 4.7, "position": 6.8, "position_change": -2},
    {"keyword": "online wellness program", "clicks": 198, "impressions": 3200,
     "ctr": 6.2, "position": 8.1, "position_change": +3},
    # ... more keywords
]
```

---

## 5. Google Ads

### How It Works in Real Life

Google Ads API requires **two separate credentials**:
1. **Developer Token** — issued by Google Ads to your manager account, takes days to approve
2. **OAuth2 Credentials** — for authenticating the specific user/account

**Setup Checklist**:
- [ ] Apply for Developer Token: ads.google.com → Tools → API Center
  - Basic access: free, limited to test accounts
  - Standard access: requires production app review
- [ ] Create OAuth2 credentials in Cloud Console (Web application type)
- [ ] Generate refresh token via OAuth2 flow (use `google-ads` library's auth flow)
- [ ] Note Customer ID (10-digit number, remove dashes) → `GOOGLE_ADS_CUSTOMER_ID`
- [ ] If using MCC: also set `GOOGLE_ADS_LOGIN_CUSTOMER_ID` to MCC account ID

### Key API Query (GAQL)

```python
# Google Ads uses GAQL (Google Ads Query Language) — SQL-like
CAMPAIGN_QUERY = """
    SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.all_conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.search_impression_share
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
"""
# cost_micros / 1,000,000 = actual spend in account currency
```

### Full Service Implementation

```python
# services/google_ads_service.py
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from config import settings
from mock_data.google_ads_mock import MOCK_GOOGLE_ADS_OVERVIEW

class GoogleAdsService:
    def __init__(self):
        config = {
            "developer_token": settings.GOOGLE_ADS_DEVELOPER_TOKEN,
            "client_id": settings.GOOGLE_ADS_CLIENT_ID,
            "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
            "refresh_token": settings.GOOGLE_ADS_REFRESH_TOKEN,
            "use_proto_plus": True,
        }
        if settings.GOOGLE_ADS_LOGIN_CUSTOMER_ID:
            config["login_customer_id"] = settings.GOOGLE_ADS_LOGIN_CUSTOMER_ID
        self.client = GoogleAdsClient.load_from_dict(config)
        self.customer_id = settings.GOOGLE_ADS_CUSTOMER_ID

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        ga_service = self.client.get_service("GoogleAdsService")
        query = """
            SELECT metrics.impressions, metrics.clicks, metrics.cost_micros,
                   metrics.conversions, metrics.ctr, metrics.average_cpc
            FROM customer
            WHERE segments.date DURING LAST_30_DAYS
        """
        response = ga_service.search(customer_id=self.customer_id, query=query)
        totals = {"impressions": 0, "clicks": 0, "spend": 0, "conversions": 0}
        for row in response:
            totals["impressions"] += row.metrics.impressions
            totals["clicks"] += row.metrics.clicks
            totals["spend"] += row.metrics.cost_micros / 1_000_000
            totals["conversions"] += row.metrics.conversions
        return totals

    async def get_campaigns(self, client_id: str) -> list[dict]:
        ga_service = self.client.get_service("GoogleAdsService")
        query = """
            SELECT campaign.id, campaign.name, campaign.status,
                   metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
            FROM campaign
            WHERE segments.date DURING LAST_30_DAYS
              AND campaign.status != 'REMOVED'
            ORDER BY metrics.cost_micros DESC
        """
        response = ga_service.search(customer_id=self.customer_id, query=query)
        return [
            {
                "id": str(row.campaign.id),
                "name": row.campaign.name,
                "status": row.campaign.status.name,
                "impressions": row.metrics.impressions,
                "clicks": row.metrics.clicks,
                "spend": row.metrics.cost_micros / 1_000_000,
                "conversions": row.metrics.conversions,
            }
            for row in response
        ]


class GoogleAdsMockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return MOCK_GOOGLE_ADS_OVERVIEW

    async def get_campaigns(self, client_id: str) -> list[dict]:
        return [
            {"id": "1234567890", "name": "Search — Brand Keywords",
             "status": "ENABLED", "impressions": 45200, "clicks": 2840,
             "spend": 1240.50, "conversions": 38},
            {"id": "9876543210", "name": "Search — Service Keywords",
             "status": "ENABLED", "impressions": 28900, "clicks": 1205,
             "spend": 890.25, "conversions": 22},
        ]


def get_google_ads_service():
    if all([settings.GOOGLE_ADS_DEVELOPER_TOKEN, settings.GOOGLE_ADS_CUSTOMER_ID]):
        return GoogleAdsService()
    return GoogleAdsMockService()
```

---

## 6. LinkedIn Ads

### How It Works in Real Life

LinkedIn Ads uses the **Marketing Developer Platform** API. Authentication is OAuth2.

⚠️ **Important**: LinkedIn Marketing API access requires application to LinkedIn's Marketing API Program. Processing can take 1-2 weeks. Apply at: https://business.linkedin.com/marketing-solutions/marketing-partners/become-a-partner/marketing-developer-program

**Setup Checklist**:
- [ ] Apply to LinkedIn Marketing API Program
- [ ] Create LinkedIn App at linkedin.com/developers
- [ ] Request OAuth2 scopes: `r_ads`, `r_ads_reporting`, `rw_ads` (if needed)
- [ ] Complete OAuth2 authorization flow to get access + refresh tokens
- [ ] Get Account ID from campaign manager URL or API
- [ ] Set `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_AD_ACCOUNT_ID`

**⚠️ Token Refresh**: LinkedIn access tokens expire in **60 days**. You must implement token refresh and store refresh tokens securely.

### Key API Endpoints

```
Base: https://api.linkedin.com/v2

GET /adAccountsV2?q=search&search.type.values[0]=BUSINESS&fields=id,name,status
  → Find account IDs

GET /adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:{id}
  → List campaigns

POST /adAnalyticsV2
Body:
{
  "dateRange": {"start": {"year": 2024, "month": 6, "day": 1},
                "end": {"year": 2024, "month": 6, "day": 30}},
  "timeGranularity": "DAILY",
  "campaigns": [{"campaign": "urn:li:sponsoredCampaign:123456789"}],
  "fields": "impressions,clicks,totalEngagements,costInLocalCurrency,leadGenerationMailContactInfoShares,externalWebsiteConversions"
}
```

### Service Implementation

```python
# services/linkedin_ads_service.py
import httpx
from config import settings
from mock_data.linkedin_ads_mock import MOCK_LINKEDIN_OVERVIEW

LINKEDIN_BASE = "https://api.linkedin.com/v2"

class LinkedInAdsService:
    def __init__(self):
        self.token = settings.LINKEDIN_ACCESS_TOKEN
        self.account_id = settings.LINKEDIN_AD_ACCOUNT_ID
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "LinkedIn-Version": "202406",  # Use latest stable version
        }

    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{LINKEDIN_BASE}/adAnalyticsV2",
                headers=self.headers,
                params={
                    "q": "analytics",
                    "pivot": "CAMPAIGN",
                    "dateRange.start.year": 2024,
                    "dateRange.start.month": 6,
                    "dateRange.start.day": 1,
                    "dateRange.end.year": 2024,
                    "dateRange.end.month": 6,
                    "dateRange.end.day": 30,
                    "accounts[0]": f"urn:li:sponsoredAccount:{self.account_id}",
                    "fields": "impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
                }
            )
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            return self._normalize(elements)

    def _normalize(self, elements: list) -> dict:
        return {
            "impressions": sum(e.get("impressions", 0) for e in elements),
            "clicks": sum(e.get("clicks", 0) for e in elements),
            "spend": sum(float(e.get("costInLocalCurrency", 0)) for e in elements),
            "conversions": sum(e.get("externalWebsiteConversions", 0) for e in elements),
        }


class LinkedInAdsMockService:
    async def get_overview(self, client_id: str, days: int = 30) -> dict:
        return {
            "impressions": 42100,
            "clicks": 820,
            "spend": 650.00,
            "conversions": 12,
            "ctr": 1.95,
        }


def get_linkedin_ads_service():
    if settings.LINKEDIN_ACCESS_TOKEN:
        return LinkedInAdsService()
    return LinkedInAdsMockService()
```

---

## 7. HubSpot CRM

### How It Works in Real Life

HubSpot offers **Private App Tokens** (PAT) — the recommended authentication method for server integrations. They don't require OAuth2 flow and don't expire.

**Setup Checklist**:
- [ ] In HubSpot: Settings → Integrations → Private Apps → Create Private App
- [ ] Scopes needed: `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.companies.read`
- [ ] Copy the token → set as `HUBSPOT_ACCESS_TOKEN`
- [ ] Restart backend

### Key API Endpoints

```
Base: https://api.hubapi.com
Authorization: Bearer {private_app_token}

GET /crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,lifecyclestage,lead_status,createdate
GET /crm/v3/objects/deals?limit=100&properties=dealname,amount,closedate,dealstage,pipeline
GET /crm/v3/objects/contacts?limit=1&filterGroups=...  # Count-only query for stats
```

### Service Implementation

```python
# services/hubspot_service.py
import httpx
from config import settings

HUBSPOT_BASE = "https://api.hubapi.com"

class HubSpotService:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.HUBSPOT_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

    async def get_lead_summary(self, client_id: str, days: int = 30) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Contacts created in last N days
            resp = await client.post(
                f"{HUBSPOT_BASE}/crm/v3/objects/contacts/search",
                headers=self.headers,
                json={
                    "filterGroups": [{"filters": [
                        {"propertyName": "createdate", "operator": "GTE",
                         "value": str(int((datetime.now() - timedelta(days=days)).timestamp() * 1000))}
                    ]}],
                    "properties": ["email", "lifecyclestage", "lead_status"],
                    "limit": 100,
                }
            )
            contacts = resp.json().get("results", [])
            return {
                "total_leads": len(contacts),
                "new_contacts": len(contacts),
                "by_stage": self._group_by_stage(contacts),
            }

    def _group_by_stage(self, contacts: list) -> dict:
        stages = {}
        for c in contacts:
            stage = c.get("properties", {}).get("lifecyclestage", "unknown")
            stages[stage] = stages.get(stage, 0) + 1
        return stages


class HubSpotMockService:
    async def get_lead_summary(self, client_id: str, days: int = 30) -> dict:
        return {
            "total_leads": 127,
            "new_contacts": 89,
            "by_stage": {
                "lead": 45, "marketingqualifiedlead": 32,
                "salesqualifiedlead": 18, "customer": 12, "other": 20
            },
        }


def get_hubspot_service():
    if settings.HUBSPOT_ACCESS_TOKEN:
        return HubSpotService()
    return HubSpotMockService()
```

---

## 8. Automation Webhooks (n8n / Make / Zapier)

### How It Works in Real Life

The dashboard **receives** webhook calls from automation tools. No API keys needed on the dashboard side — the automation tool sends data TO us.

### Backend Webhook Endpoint

```python
# routers/automation.py
from fastapi import APIRouter, Depends, Body, Request
from pydantic import BaseModel
from typing import Optional
from auth.dependencies import get_current_user
from database import get_db
from models.metrics import AutomationLog

router = APIRouter()

class AutomationEvent(BaseModel):
    workflow_name: str
    workflow_source: str = "unknown"  # zapier, make, n8n, custom
    status: str = "success"           # success, error, partial
    tasks_completed: int = 1
    time_saved_minutes: int = 0
    metadata: dict = {}

# Optional: Simple API key auth for webhook (instead of JWT)
WEBHOOK_API_KEY = settings.WEBHOOK_SECRET_KEY  # Set in ENV

@router.post("/event")
async def receive_automation_event(
    event: AutomationEvent,
    request: Request,
    db = Depends(get_db),
):
    """
    Receive automation events from n8n, Make, Zapier.
    Protected by API key in header: X-Webhook-Key: {key}
    """
    # Verify webhook key
    api_key = request.headers.get("X-Webhook-Key")
    if api_key != WEBHOOK_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid webhook key")
    
    # Determine client from API key (or pass client_id in payload)
    client_id = request.headers.get("X-Client-ID")
    
    log = AutomationLog(
        client_id=client_id,
        workflow_name=event.workflow_name,
        workflow_source=event.workflow_source,
        status=event.status,
        tasks_completed=event.tasks_completed,
        time_saved_minutes=event.time_saved_minutes,
        metadata=event.metadata,
    )
    db.add(log)
    await db.commit()
    return {"status": "received", "log_id": str(log.id)}
```

### n8n Configuration

In n8n workflow:
1. Add **HTTP Request** node at the end of your workflow
2. Method: POST
3. URL: `https://your-backend.com/api/automation/event`
4. Headers: `X-Webhook-Key: your_secret_key`, `X-Client-ID: client_uuid`
5. Body (JSON):
```json
{
  "workflow_name": "Lead Enrichment & CRM Sync",
  "workflow_source": "n8n",
  "status": "success",
  "tasks_completed": 1,
  "time_saved_minutes": 12,
  "metadata": {
    "lead_email": "{{ $json.email }}",
    "crm_record_created": true
  }
}
```

### Make (Integromat) Configuration

1. Add **HTTP > Make a request** module
2. Same endpoint and headers
3. Map workflow fields to payload

### Zapier Configuration

1. Add **Webhooks by Zapier > POST** action
2. URL: your endpoint
3. Payload type: JSON
4. Set headers as key-value pairs

### Security Note

The `X-Webhook-Key` should be a random 32-character string per client. Store it in their `clients.settings` JSONB field:

```python
# In clients.settings:
{
  "webhook_key": "randomly-generated-32-char-string",
  "timezone": "America/New_York"
}
```

---

## 9. WordPress / Webflow (Content)

### WordPress REST API

```python
# services/wordpress_service.py
import httpx

WORDPRESS_BASE = settings.WORDPRESS_API_URL  # e.g. https://yoursite.com/wp-json/wp/v2

class WordPressService:
    async def get_posts(self, status="publish", limit=10) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{WORDPRESS_BASE}/posts",
                params={"status": status, "per_page": limit, "_fields": "id,title,status,date,link,excerpt"}
            )
            return [
                {"id": p["id"], "title": p["title"]["rendered"],
                 "status": p["status"], "date": p["date"], "url": p["link"]}
                for p in resp.json()
            ]
```

### Webflow CMS API

```python
# Uses Webflow Data API v2
# Auth: Bearer token from Webflow account settings

WEBFLOW_BASE = "https://api.webflow.com/v2"

async def get_webflow_items(collection_id: str, token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{WEBFLOW_BASE}/collections/{collection_id}/items",
            headers={"Authorization": f"Bearer {token}"}
        )
        return resp.json().get("items", [])
```

---

## 10. File Storage (MinIO / S3)

### How It Works

Files are stored in MinIO (S3-compatible). Access is via **presigned URLs** — temporary, authenticated URLs that expire after a set time. The frontend NEVER has direct MinIO credentials.

### Upload Flow

```
1. Frontend → POST /api/deliverables/upload-url { filename, content_type, size }
2. Backend → generates presigned PUT URL (expires in 10 min) → returns to frontend
3. Frontend → PUT file directly to MinIO via presigned URL (no backend involved)
4. Frontend → POST /api/deliverables { title, file_path, project_id } (creates DB record)
5. Backend → returns deliverable object
```

### Download Flow

```
1. Frontend → GET /api/deliverables/{id}/download-url
2. Backend → validates auth + client_id ownership → generates presigned GET URL (1 hour)
3. Frontend → redirects user to presigned URL
```

### Service Implementation

```python
# services/storage_service.py
from minio import Minio
from minio.error import S3Error
import uuid
from config import settings

class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        if not self.client.bucket_exists(settings.MINIO_BUCKET):
            self.client.make_bucket(settings.MINIO_BUCKET)

    def generate_upload_url(self, client_id: str, filename: str, content_type: str) -> dict:
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = self.client.presigned_put_object(
            settings.MINIO_BUCKET,
            object_key,
            expires=timedelta(minutes=10),
        )
        return {"upload_url": url, "object_key": object_key}

    def generate_download_url(self, object_key: str) -> str:
        return self.client.presigned_get_object(
            settings.MINIO_BUCKET,
            object_key,
            expires=timedelta(seconds=settings.PRESIGNED_URL_EXPIRY),
        )

    def delete_object(self, object_key: str):
        self.client.remove_object(settings.MINIO_BUCKET, object_key)
```

---

## 11. Contract Tests & Mock Validation

Contract tests ensure that mock data never drifts from real API response shapes.

```python
# tests/test_integrations.py
"""
Contract tests: mock data must match real API response schema.
Run these when updating integrations or mock data.
"""
import pytest
from services.meta_ads_service import MetaAdsMockService, MetaAdsService
from mock_data.meta_ads_mock import MOCK_OVERVIEW, MOCK_CAMPAIGNS

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

def test_meta_overview_mock_schema():
    """Mock data must have all required fields with correct types."""
    for field, expected_type in META_OVERVIEW_SCHEMA.items():
        assert field in MOCK_OVERVIEW, f"Missing field: {field}"
        if isinstance(expected_type, tuple):
            assert isinstance(MOCK_OVERVIEW[field], expected_type), \
                f"Field {field} has wrong type: {type(MOCK_OVERVIEW[field])}"
        else:
            assert isinstance(MOCK_OVERVIEW[field], expected_type), \
                f"Field {field} has wrong type: {type(MOCK_OVERVIEW[field])}"

def test_meta_campaigns_mock_schema():
    assert len(MOCK_CAMPAIGNS) > 0, "Mock campaigns must not be empty"
    required = ["id", "name", "status", "spend", "impressions", "clicks", "conversions"]
    for campaign in MOCK_CAMPAIGNS:
        for field in required:
            assert field in campaign, f"Campaign missing field: {field}"

def test_gsc_mock_schema():
    from mock_data.gsc_mock import MOCK_GSC_OVERVIEW, MOCK_GSC_KEYWORDS
    assert "clicks" in MOCK_GSC_OVERVIEW
    assert "impressions" in MOCK_GSC_OVERVIEW
    assert "avg_position" in MOCK_GSC_OVERVIEW
    
    assert len(MOCK_GSC_KEYWORDS) >= 5, "Need at least 5 keywords for useful UI"
    for kw in MOCK_GSC_KEYWORDS:
        assert "keyword" in kw and "clicks" in kw and "position" in kw

@pytest.mark.parametrize("service_class", [MetaAdsMockService])
async def test_service_returns_correct_shape(service_class):
    """All service methods return data matching declared schema."""
    service = service_class()
    overview = await service.get_overview("test_client", 30)
    for field in META_OVERVIEW_SCHEMA:
        assert field in overview, f"Service {service_class.__name__} missing field: {field}"
```

---

## 12. Rate Limit & Error Handling Reference

| Integration       | Rate Limit                         | Retry Strategy                     | Data Lag  |
|-------------------|------------------------------------|------------------------------------|-----------|
| Meta Ads          | 200 calls/hr (app-level)           | Exp backoff on 429, parse Retry-After | 2-48 hrs |
| Google Analytics 4 | 10 req/sec, 50,000/day (per prop) | Quota errors: wait 60s             | < 4 hrs   |
| Google Search Console | 1,200/day, 50/minute           | Rate-limited: wait 60s             | 3-4 days  |
| Google Ads        | Complex per-customer tiers         | RateExceededError: backoff 60s     | < 3 hrs   |
| LinkedIn Ads      | 500/day per member token           | 429: wait until reset              | < 6 hrs   |
| HubSpot           | 100 req/10 sec (private apps)      | 429: wait 10s                      | < 1 hr    |

### Centralized Error Handler

```python
# services/base.py
import asyncio
import httpx
from typing import Callable, TypeVar

T = TypeVar("T")

async def with_retry(fn: Callable, max_retries: int = 3, base_wait: float = 5.0):
    """Execute async function with exponential backoff on rate limit errors."""
    for attempt in range(max_retries):
        try:
            return await fn()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                wait = base_wait * (2 ** attempt)
                print(f"Rate limited. Waiting {wait}s before retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(wait)
            elif e.response.status_code >= 500:
                wait = base_wait * (2 ** attempt)
                await asyncio.sleep(wait)
            else:
                raise  # Don't retry 4xx errors (except 429)
    raise Exception(f"Max retries ({max_retries}) exceeded")
```
