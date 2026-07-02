"""
Mock data for Google Search Console.
Matches exact normalized schema from GoogleSearchConsoleService.
"""
from datetime import datetime, timedelta
import random


def _daily_clicks(days: int = 30, base: float = 150.0):
    trend = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=days - i + 4)).strftime("%Y-%m-%d")  # 4-day lag
        day_of_week = (datetime.now() - timedelta(days=days - i + 4)).weekday()
        factor = 0.6 if day_of_week >= 5 else 1.0
        value = int(base * factor * random.uniform(0.75, 1.25))
        trend.append({"date": date, "clicks": value})
    return trend


MOCK_GSC_OVERVIEW = {
    "clicks": 4821,
    "impressions": 187430,
    "avg_ctr": 2.57,
    "avg_position": 14.3,
    "daily_clicks": _daily_clicks(30, 160.7),
    "vs_previous": {
        "clicks_change_pct": 18.4,
        "impressions_change_pct": 22.1,
        "position_change": -1.8,  # Negative = improved (lower position is better)
    },
    "data_source": "mock",
    "last_updated": datetime.utcnow().isoformat(),
}

MOCK_GSC_KEYWORDS = [
    {"keyword": "wellness coaching near me", "clicks": 412, "impressions": 4820, "ctr": 8.5, "position": 3.2, "position_change": 1},
    {"keyword": "holistic health coach", "clicks": 287, "impressions": 6100, "ctr": 4.7, "position": 6.8, "position_change": -2},
    {"keyword": "online wellness program", "clicks": 198, "impressions": 3200, "ctr": 6.2, "position": 8.1, "position_change": 3},
    {"keyword": "mindfulness coaching online", "clicks": 175, "impressions": 4500, "ctr": 3.9, "position": 11.4, "position_change": 0},
    {"keyword": "health and wellness consultant", "clicks": 142, "impressions": 8200, "ctr": 1.7, "position": 18.7, "position_change": 5},
    {"keyword": "stress management coaching", "clicks": 128, "impressions": 2100, "ctr": 6.1, "position": 4.9, "position_change": 2},
    {"keyword": "life coach wellness", "clicks": 115, "impressions": 5400, "ctr": 2.1, "position": 15.2, "position_change": -1},
    {"keyword": "nutrition coaching program", "clicks": 98, "impressions": 1900, "ctr": 5.2, "position": 7.3, "position_change": 4},
    {"keyword": "corporate wellness programs", "clicks": 87, "impressions": 6700, "ctr": 1.3, "position": 22.1, "position_change": 3},
    {"keyword": "weight management coaching", "clicks": 76, "impressions": 1400, "ctr": 5.4, "position": 9.8, "position_change": 1},
]

MOCK_GSC_TOP_PAGES = [
    {"page": "/services/wellness-coaching", "clicks": 982, "impressions": 12400, "position": 4.2},
    {"page": "/blog/stress-management-tips", "clicks": 743, "impressions": 18900, "position": 6.8},
    {"page": "/", "clicks": 621, "impressions": 9800, "position": 8.1},
    {"page": "/services/nutrition-plan", "clicks": 445, "impressions": 7200, "position": 11.3},
    {"page": "/blog/mindfulness-benefits", "clicks": 312, "impressions": 14500, "position": 15.7},
]
