"""Firebase Storage service for document storage and preview generation."""

import structlog
from google.cloud import storage
from typing import Optional, Tuple
import io
from datetime import timedelta

logger = structlog.get_logger()


class DocumentStorageService:
    """Service for storing documents and generating previews in Firebase Storage."""

    def __init__(self, settings):
        self.settings = settings
        self.storage_client = storage.Client(project=settings.google_cloud_project)
        self.bucket_name = f"{settings.google_cloud_project}.appspot.com"
        self.bucket = self.storage_client.bucket(self.bucket_name)

    async def upload_document(
        self,
        file_content: bytes,
        filename: str,
        user_id: str,
        document_id: str,
        content_type: str = "application/pdf"
    ) -> Tuple[str, str]:
        """
        Upload document to Firebase Storage and return URLs.

        Returns:
            Tuple of (storage_url, download_url)
        """
        try:
            # Create storage path
            storage_path = f"users/{user_id}/documents/{document_id}/original"

            # Upload to Firebase Storage
            blob = self.bucket.blob(storage_path)
            blob.upload_from_string(
                file_content,
                content_type=content_type
            )

            # Set metadata
            blob.metadata = {
                "filename": filename,
                "user_id": user_id,
                "document_id": document_id
            }
            blob.patch()

            # Generate signed URL (valid for 7 days)
            download_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(days=7),
                method="GET"
            )

            storage_url = f"gs://{self.bucket_name}/{storage_path}"

            logger.info("Uploaded document to Firebase Storage",
                       user_id=user_id,
                       document_id=document_id,
                       filename=filename,
                       storage_path=storage_path)

            return storage_url, download_url

        except Exception as e:
            logger.error("Failed to upload document to storage",
                        user_id=user_id,
                        document_id=document_id,
                        error=str(e))
            raise

    async def upload_preview(
        self,
        preview_content: bytes,
        user_id: str,
        document_id: str,
        content_type: str = "application/pdf"
    ) -> Tuple[str, str]:
        """
        Upload preview (first 3 pages) to Firebase Storage.

        Returns:
            Tuple of (storage_url, download_url)
        """
        try:
            # Create storage path for preview
            storage_path = f"users/{user_id}/documents/{document_id}/preview"

            # Upload preview
            blob = self.bucket.blob(storage_path)
            blob.upload_from_string(
                preview_content,
                content_type=content_type
            )

            # Set metadata
            blob.metadata = {
                "user_id": user_id,
                "document_id": document_id,
                "is_preview": "true"
            }
            blob.patch()

            # Generate signed URL (valid for 7 days)
            download_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(days=7),
                method="GET"
            )

            storage_url = f"gs://{self.bucket_name}/{storage_path}"

            logger.info("Uploaded preview to Firebase Storage",
                       user_id=user_id,
                       document_id=document_id,
                       storage_path=storage_path)

            return storage_url, download_url

        except Exception as e:
            logger.error("Failed to upload preview to storage",
                        user_id=user_id,
                        document_id=document_id,
                        error=str(e))
            # Don't fail the whole upload if preview fails
            return "", ""

    async def generate_pdf_preview(
        self,
        file_content: bytes,
        max_pages: int = 3
    ) -> Optional[bytes]:
        """
        Generate a preview PDF with first N pages.

        Args:
            file_content: Original PDF content
            max_pages: Maximum number of pages to include (default 3)

        Returns:
            Preview PDF content as bytes, or None if generation fails
        """
        try:
            import PyPDF2

            # Read PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))

            # If PDF has 3 or fewer pages, return original
            if len(pdf_reader.pages) <= max_pages:
                logger.info("PDF has few pages, using original as preview",
                           total_pages=len(pdf_reader.pages))
                return file_content

            # Create preview with first N pages
            pdf_writer = PyPDF2.PdfWriter()
            for i in range(min(max_pages, len(pdf_reader.pages))):
                pdf_writer.add_page(pdf_reader.pages[i])

            # Write to bytes
            preview_buffer = io.BytesIO()
            pdf_writer.write(preview_buffer)
            preview_content = preview_buffer.getvalue()

            logger.info("Generated PDF preview",
                       original_pages=len(pdf_reader.pages),
                       preview_pages=max_pages,
                       original_size=len(file_content),
                       preview_size=len(preview_content))

            return preview_content

        except Exception as e:
            logger.error("Failed to generate PDF preview", error=str(e))
            return None

    async def delete_document_storage(
        self,
        user_id: str,
        document_id: str
    ) -> bool:
        """Delete document and preview from Firebase Storage."""
        try:
            # Delete original
            original_blob = self.bucket.blob(f"users/{user_id}/documents/{document_id}/original")
            if original_blob.exists():
                original_blob.delete()

            # Delete preview
            preview_blob = self.bucket.blob(f"users/{user_id}/documents/{document_id}/preview")
            if preview_blob.exists():
                preview_blob.delete()

            logger.info("Deleted document from storage",
                       user_id=user_id,
                       document_id=document_id)
            return True

        except Exception as e:
            logger.error("Failed to delete document from storage",
                        user_id=user_id,
                        document_id=document_id,
                        error=str(e))
            return False

    def get_download_url(
        self,
        storage_url: str,
        expiration_days: int = 7
    ) -> str:
        """Generate a new signed download URL from storage URL."""
        try:
            # Extract path from gs:// URL
            if storage_url.startswith("gs://"):
                path = storage_url.replace(f"gs://{self.bucket_name}/", "")
                blob = self.bucket.blob(path)

                return blob.generate_signed_url(
                    version="v4",
                    expiration=timedelta(days=expiration_days),
                    method="GET"
                )
            return ""

        except Exception as e:
            logger.error("Failed to generate download URL", error=str(e))
            return ""
