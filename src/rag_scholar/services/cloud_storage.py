"""Cloud storage service for persistent vector indexes."""

import logging
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from rag_scholar.config.settings import Settings

try:
    from google.cloud import storage
    from google.cloud.exceptions import NotFound
    GCS_AVAILABLE = True
except ImportError:
    storage = None
    NotFound = Exception
    GCS_AVAILABLE = False

logger = logging.getLogger(__name__)


class CloudStorageService:
    """Service for managing vector indexes in Google Cloud Storage."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = None
        self.bucket = None

        if not GCS_AVAILABLE:
            logger.warning("Google Cloud Storage not available - cloud storage disabled")
            return

        if settings.use_cloud_storage and settings.gcs_bucket_name:
            try:
                self.client = storage.Client()
                self.bucket = self.client.bucket(settings.gcs_bucket_name)
                logger.info(f"Initialized GCS client for bucket: {settings.gcs_bucket_name}")
            except Exception as e:
                logger.error(f"Failed to initialize GCS client: {e}")
                self.client = None
                self.bucket = None

    def is_available(self) -> bool:
        """Check if cloud storage is available."""
        return self.client is not None and self.bucket is not None

    def upload_index(self, collection: str, local_index_dir: Path) -> bool:
        """Upload FAISS index to cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping upload")
            return False

        if not local_index_dir.exists():
            logger.warning(f"Local index directory not found: {local_index_dir}")
            return False

        try:
            # Create a zip file of the index directory
            with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_file:
                temp_path = Path(temp_file.name)

                with zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for file_path in local_index_dir.rglob('*'):
                        if file_path.is_file():
                            arcname = file_path.relative_to(local_index_dir)
                            zipf.write(file_path, arcname)

                # Upload to GCS
                blob_name = f"{self.settings.gcs_index_prefix}{collection}.zip"
                blob = self.bucket.blob(blob_name)

                blob.upload_from_filename(str(temp_path))
                logger.info(f"Uploaded index for collection '{collection}' to GCS: {blob_name}")

                # Clean up temp file
                temp_path.unlink()

                return True

        except Exception as e:
            logger.error(f"Failed to upload index for collection '{collection}': {e}")
            return False

    def download_index(self, collection: str, local_index_dir: Path) -> bool:
        """Download FAISS index from cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping download")
            return False

        try:
            blob_name = f"{self.settings.gcs_index_prefix}{collection}.zip"
            blob = self.bucket.blob(blob_name)

            if not blob.exists():
                logger.info(f"Index for collection '{collection}' not found in GCS: {blob_name}")
                return False

            # Download to temp file
            with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_file:
                temp_path = Path(temp_file.name)
                blob.download_to_filename(str(temp_path))

                # Extract to local directory
                local_index_dir.mkdir(parents=True, exist_ok=True)

                with zipfile.ZipFile(temp_path, 'r') as zipf:
                    zipf.extractall(local_index_dir)

                logger.info(f"Downloaded index for collection '{collection}' from GCS: {blob_name}")

                # Clean up temp file
                temp_path.unlink()

                return True

        except NotFound:
            logger.info(f"Index for collection '{collection}' not found in GCS")
            return False
        except Exception as e:
            logger.error(f"Failed to download index for collection '{collection}': {e}")
            return False

    def list_collections(self) -> list[str]:
        """List available collections in cloud storage."""
        if not self.is_available():
            return []

        try:
            collections = []
            prefix = self.settings.gcs_index_prefix

            blobs = self.bucket.list_blobs(prefix=prefix)

            for blob in blobs:
                if blob.name.endswith('.zip'):
                    # Extract collection name from blob path
                    collection_name = blob.name[len(prefix):].replace('.zip', '')
                    collections.append(collection_name)

            logger.info(f"Found {len(collections)} collections in GCS")
            return collections

        except Exception as e:
            logger.error(f"Failed to list collections from GCS: {e}")
            return []

    def delete_index(self, collection: str) -> bool:
        """Delete index from cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping delete")
            return False

        try:
            blob_name = f"{self.settings.gcs_index_prefix}{collection}.zip"
            blob = self.bucket.blob(blob_name)

            if blob.exists():
                blob.delete()
                logger.info(f"Deleted index for collection '{collection}' from GCS: {blob_name}")
                return True
            else:
                logger.info(f"Index for collection '{collection}' not found in GCS: {blob_name}")
                return False

        except Exception as e:
            logger.error(f"Failed to delete index for collection '{collection}': {e}")
            return False