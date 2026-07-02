"""
Mock data for Google Analytics 4.
"""
from datetime import datetime, timedelta
import random


def _daily_sessions(days: int = 30, base: float = 280.0):
    result = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d")
        dow = (datetime.now() - timedelta(days=days - i)).weekday()
        factor = 0.7 if dow >= 5 else 1.0
        value = int(base * factor * random.uniform(0.8, 1.2))
        result.append({"date": date, "sessions": value})
    return result


MOCK_GA4_OVERVIEW = {
    "sessions": 8450,
    "users": 6820,
    "new_users": 4120,
    "conversions": 312,
    "bounce_rate": 42.3,
    "avg_session_duration": 187,  # seconds
    "daily_sessions": _daily_sessions(30, 281.7),
    "channel_breakdown": [
        {"channel": "Organic Search", "sessions": 3241, "conversions": 48, "pct": 38.4},
        {"channel": "Paid Social", "sessions": 2105, "conversions": 67, "pct": 24.9},
        {"channel": "Direct", "sessions": 1820, "conversions": 22, "pct": 21.5},
        {"channel": "Email", "sessions": 842, "conversions": 18, "pct": 9.9},
        {"channel": "Referral", "sessions": 442, "conversions": 8, "pct": 5.2},
    ],
    "vs_previous": {
        "sessions_change_pct": 12.4,
        "users_change_pct": 9.8,
        "conversions_change_pct": 18.2,
    },
    "data_source": "mock",
    "last_updated": datetime.utcnow().isoformat(),
}
