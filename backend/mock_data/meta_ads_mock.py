"""
Mock data for Meta Ads (Facebook/Instagram).
These structures exactly mirror the normalized response from MetaAdsService._normalize_*
so that contract tests can validate mock = real API shape.
"""
from datetime import datetime, timedelta
import random


def _daily_trend(days: int = 30, base: float = 100.0, variance: float = 0.3, growth: float = 0.005):
    """Generate realistic daily metrics with weekend dips and week-over-week growth."""
    trend = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d")
        day_of_week = (datetime.now() - timedelta(days=days - i)).weekday()
        weekend_factor = 0.65 if day_of_week >= 5 else 1.0
        growth_factor = 1 + (growth * i)  # Slight upward trend
        noise = random.uniform(1 - variance, 1 + variance)
        value = base * weekend_factor * growth_factor * noise
        trend.append({"date": date, "value": round(value, 2)})
    return trend


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
    "trends": {
        "spend": _daily_trend(30, base=118.3, variance=0.25, growth=0.004),
        "clicks": _daily_trend(30, base=160.7, variance=0.30, growth=0.005),
        "conversions": _daily_trend(30, base=4.23, variance=0.40, growth=0.007),
    },
    "vs_previous_period": {
        "spend_change_pct": 8.3,
        "impressions_change_pct": 12.1,
        "clicks_change_pct": 15.7,
        "conversions_change_pct": 14.2,
        "roas_change_pct": 5.7,
    },
    "data_source": "mock",
    "last_updated": datetime.utcnow().isoformat(),
}

MOCK_CAMPAIGNS = [
    {
        "id": "23845678901234",
        "name": "Lead Gen — Wellness Package Q3",
        "status": "ACTIVE",
        "objective": "OUTCOME_LEADS",
        "spend": 1847.50,
        "impressions": 98230,
        "clicks": 2541,
        "conversions": 67,
        "roas": 3.8,
        "ctr": 2.59,
        "cpc": 0.73,
    },
    {
        "id": "23845678905678",
        "name": "Brand Awareness — Summer Campaign",
        "status": "ACTIVE",
        "objective": "OUTCOME_AWARENESS",
        "spend": 1200.32,
        "impressions": 75430,
        "clicks": 1680,
        "conversions": 42,
        "roas": 2.8,
        "ctr": 2.23,
        "cpc": 0.71,
    },
    {
        "id": "23845678909012",
        "name": "Retargeting — Free Consultation",
        "status": "ACTIVE",
        "objective": "OUTCOME_SALES",
        "spend": 500.00,
        "impressions": 13770,
        "clicks": 600,
        "conversions": 18,
        "roas": 4.1,
        "ctr": 4.36,
        "cpc": 0.83,
    },
]
