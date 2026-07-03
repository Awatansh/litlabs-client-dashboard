"""
Supabase Storage service (S3-compatible REST API).
Uses httpx to call Supabase Storage REST API directly — avoids boto3
redirect loops that occur with non-AWS S3 endpoints.
Files never pass through the backend — clients upload/download directly from Supabase.
"""
import uuid
import hmac
import hashlib
import datetime
import httpx
from config import settings


def _get_supabase_base() -> tuple[str, str]:
    """
    Parse the MINIO_ENDPOINT to extract:
    - supabase_url: e.g. https://dhtdhcxhzmmymomtbvoh.storage.supabase.co
    - project_id: e.g. dhtdhcxhzmmymomtbvoh
    MINIO_ENDPOINT may be the full S3 endpoint URL or just the host.
    """
    endpoint = settings.MINIO_ENDPOINT
    # Strip trailing slash
    endpoint = endpoint.rstrip("/")
    # If it contains /storage/v1/s3, strip that path
    if "/storage/v1/s3" in endpoint:
        base = endpoint.split("/storage/v1/s3")[0]
    else:
        # Add https:// if missing
        if not endpoint.startswith("http"):
            base = f"https://{endpoint}"
        else:
            base = endpoint
    return base


class StorageService:
    def __init__(self):
        self.base_url = _get_supabase_base()
        self.bucket = settings.MINIO_BUCKET
        # Use the Supabase service_role JWT if available, otherwise fall back to S3 access key
        self.service_key = settings.SUPABASE_SERVICE_KEY or settings.MINIO_ACCESS_KEY
        self.headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }

    def generate_upload_url(self, client_id: str, filename: str, content_type: str) -> dict:
        """Generate a presigned upload URL via Supabase Storage REST API (5 min expiry)."""
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = f"{self.base_url}/storage/v1/object/upload/sign/{self.bucket}/{object_key}"
        with httpx.Client() as client:
            resp = client.post(
                url,
                headers=self.headers,
                json={"expiresIn": 600},
                timeout=30,
            )
            resp.raise_for_status()
            signed_url = resp.json().get("signedURL", "")
            upload_url = f"{self.base_url}{signed_url}" if signed_url.startswith("/") else signed_url
        return {"upload_url": upload_url, "object_key": object_key}

    def generate_download_url(self, object_key: str) -> str:
        """Generate a presigned download URL via Supabase Storage REST API."""
        url = f"{self.base_url}/storage/v1/object/sign/{self.bucket}/{object_key}"
        with httpx.Client() as client:
            resp = client.post(
                url,
                headers=self.headers,
                json={"expiresIn": settings.PRESIGNED_URL_EXPIRY},
                timeout=30,
            )
            resp.raise_for_status()
            signed_url = resp.json().get("signedURL", "")
            return f"{self.base_url}{signed_url}" if signed_url.startswith("/") else signed_url

    def delete_object(self, object_key: str):
        """Delete an object via Supabase Storage REST API."""
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{object_key}"
        with httpx.Client() as client:
            resp = client.delete(url, headers=self.headers, timeout=30)
            resp.raise_for_status()

    def upload_pdf_bytes(self, client_id: str, filename: str, pdf_bytes: bytes) -> str:
        """Upload PDF bytes directly to Supabase Storage and return the object key."""
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{object_key}"
        upload_headers = {
            **self.headers,
            "Content-Type": "application/pdf",
        }
        with httpx.Client() as client:
            resp = client.post(url, headers=upload_headers, content=pdf_bytes, timeout=60)
            resp.raise_for_status()
        return object_key
