"""
Supabase Storage service (REST API).
Uses httpx to call Supabase Storage REST API directly — avoids boto3
redirect loops that occur with non-AWS S3 endpoints.
Files never pass through the backend — clients upload/download directly via presigned URLs.
"""
import uuid
import httpx
from config import settings


def _get_supabase_base() -> str:
    """
    Parse MINIO_ENDPOINT to the Supabase storage base URL.
    MINIO_ENDPOINT may be:
      - Full S3 URL: https://xyz.storage.supabase.co/storage/v1/s3
      - Just the host: xyz.storage.supabase.co
    """
    endpoint = settings.MINIO_ENDPOINT.rstrip("/")
    if "/storage/v1/s3" in endpoint:
        return endpoint.split("/storage/v1/s3")[0]
    if not endpoint.startswith("http"):
        return f"https://{endpoint}"
    return endpoint


class StorageService:
    def __init__(self):
        self.base_url = _get_supabase_base()
        self.bucket = settings.MINIO_BUCKET
        # Prefer service_role JWT; fall back to S3 access key (won't work for REST API)
        self.service_key = settings.SUPABASE_SERVICE_KEY or settings.MINIO_ACCESS_KEY
        self.headers = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }

    # -------------------------------------------------------------------------
    # Sync methods (safe to call from seed script or sync contexts)
    # -------------------------------------------------------------------------

    def generate_upload_url(self, client_id: str, filename: str, content_type: str) -> dict:
        """Generate a presigned PUT URL for client-side upload (10 min expiry)."""
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = f"{self.base_url}/storage/v1/object/upload/sign/{self.bucket}/{object_key}"
        with httpx.Client() as client:
            resp = client.post(url, headers=self.headers, json={"expiresIn": 600}, timeout=30)
            resp.raise_for_status()
            signed_url = resp.json().get("signedURL", "")
            upload_url = f"{self.base_url}{signed_url}" if signed_url.startswith("/") else signed_url
        return {"upload_url": upload_url, "object_key": object_key}

    def generate_download_url(self, object_key: str) -> str:
        """Generate a presigned GET URL for file download."""
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

    def upload_pdf_bytes(self, client_id: str, filename: str, pdf_bytes: bytes) -> str:
        """Upload PDF bytes directly to Supabase Storage and return the object key.

        NOTE: fpdf2's pdf.output() returns bytearray — always wrap with bytes() before calling this.
        """
        if not isinstance(pdf_bytes, bytes):
            pdf_bytes = bytes(pdf_bytes)
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{object_key}"
        upload_headers = {**self.headers, "Content-Type": "application/pdf"}
        with httpx.Client() as client:
            resp = client.post(url, headers=upload_headers, content=pdf_bytes, timeout=60)
            resp.raise_for_status()
        return object_key

    def delete_object(self, object_key: str):
        """Delete an object from Supabase Storage."""
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{object_key}"
        with httpx.Client() as client:
            resp = client.delete(url, headers=self.headers, timeout=30)
            resp.raise_for_status()

    # -------------------------------------------------------------------------
    # Async methods (for FastAPI route handlers)
    # -------------------------------------------------------------------------

    async def async_generate_download_url(self, object_key: str) -> str:
        """Async version of generate_download_url for use in FastAPI routes."""
        url = f"{self.base_url}/storage/v1/object/sign/{self.bucket}/{object_key}"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers=self.headers,
                json={"expiresIn": settings.PRESIGNED_URL_EXPIRY},
                timeout=30,
            )
            resp.raise_for_status()
            signed_url = resp.json().get("signedURL", "")
            return f"{self.base_url}{signed_url}" if signed_url.startswith("/") else signed_url

    async def async_upload_pdf_bytes(self, client_id: str, filename: str, pdf_bytes: bytes) -> str:
        """Async version of upload_pdf_bytes for use in FastAPI routes."""
        if not isinstance(pdf_bytes, bytes):
            pdf_bytes = bytes(pdf_bytes)
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{object_key}"
        upload_headers = {**self.headers, "Content-Type": "application/pdf"}
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=upload_headers, content=pdf_bytes, timeout=60)
            resp.raise_for_status()
        return object_key
