"""
MinIO file storage service.
Handles presigned URL generation for secure file upload/download.
Files never pass through the backend — clients upload/download directly from MinIO.
"""
import uuid
from datetime import timedelta
from minio import Minio
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
        """Generate a presigned PUT URL for file upload (10 min expiry)."""
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        url = self.client.presigned_put_object(
            settings.MINIO_BUCKET,
            object_key,
            expires=timedelta(minutes=10),
        )
        return {"upload_url": url, "object_key": object_key}

    def generate_download_url(self, object_key: str) -> str:
        """Generate a presigned GET URL for file download (1 hour expiry)."""
        return self.client.presigned_get_object(
            settings.MINIO_BUCKET,
            object_key,
            expires=timedelta(seconds=settings.PRESIGNED_URL_EXPIRY),
        )

    def delete_object(self, object_key: str):
        self.client.remove_object(settings.MINIO_BUCKET, object_key)

    def upload_pdf_bytes(self, client_id: str, filename: str, pdf_bytes: bytes) -> str:
        """Upload PDF bytes directly to MinIO and return the object key."""
        import io
        object_key = f"{client_id}/{uuid.uuid4()}/{filename}"
        self.client.put_object(
            settings.MINIO_BUCKET,
            object_key,
            data=io.BytesIO(pdf_bytes),
            length=len(pdf_bytes),
            content_type="application/pdf"
        )
        return object_key
