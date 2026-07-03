from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

ROOT_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
BACKEND_ENV_FILE = Path(__file__).resolve().parent / ".env"

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./dashboard.db"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # MinIO / Supabase Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "litlabs-deliverables"
    MINIO_SECURE: bool = False
    PRESIGNED_URL_EXPIRY: int = 3600
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # Meta Ads (empty = mock mode)
    META_ACCESS_TOKEN: Optional[str] = None
    META_AD_ACCOUNT_ID: Optional[str] = None
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None

    # Google shared service account
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None
    GOOGLE_SEARCH_CONSOLE_SITE_URL: Optional[str] = None
    GA4_PROPERTY_ID: Optional[str] = None

    # Google Ads
    GOOGLE_ADS_DEVELOPER_TOKEN: Optional[str] = None
    GOOGLE_ADS_CLIENT_ID: Optional[str] = None
    GOOGLE_ADS_CLIENT_SECRET: Optional[str] = None
    GOOGLE_ADS_REFRESH_TOKEN: Optional[str] = None
    GOOGLE_ADS_CUSTOMER_ID: Optional[str] = None
    GOOGLE_ADS_LOGIN_CUSTOMER_ID: Optional[str] = None

    # LinkedIn Ads
    LINKEDIN_ACCESS_TOKEN: Optional[str] = None
    LINKEDIN_AD_ACCOUNT_ID: Optional[str] = None

    # HubSpot
    HUBSPOT_ACCESS_TOKEN: Optional[str] = None

    # Webhooks
    WEBHOOK_SECRET_KEY: str = "dev-webhook-key"

    # Scheduler
    META_FETCH_INTERVAL_HOURS: int = 6
    GA4_FETCH_INTERVAL_HOURS: int = 6
    SEO_FETCH_INTERVAL_HOURS: int = 24

    model_config = SettingsConfigDict(
        env_file=(ROOT_ENV_FILE, BACKEND_ENV_FILE),
        case_sensitive=True,
        extra="ignore",
    )

settings = Settings()
