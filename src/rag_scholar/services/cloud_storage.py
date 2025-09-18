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
        self.buckets = {}

        if not GCS_AVAILABLE:
            logger.warning("Google Cloud Storage not available - cloud storage disabled")
            return

        if settings.use_gcs:
            try:
                self.client = storage.Client()
                # Initialize buckets
                bucket_configs = {
                    'indexes': settings.gcs_bucket_indexes,
                    'documents': settings.gcs_bucket_documents,
                    'users': settings.gcs_bucket_users,
                    'sessions': settings.gcs_bucket_sessions,
                }

                for bucket_type, bucket_name in bucket_configs.items():
                    if bucket_name:
                        self.buckets[bucket_type] = self.client.bucket(bucket_name)
                        logger.info(f"Initialized GCS client for {bucket_type} bucket: {bucket_name}")

            except Exception as e:
                logger.error(f"Failed to initialize GCS client: {e}")
                self.client = None
                self.buckets = {}

    def is_available(self) -> bool:
        """Check if cloud storage is available."""
        return self.client is not None and len(self.buckets) > 0

    def get_bucket(self, bucket_type: str):
        """Get a specific bucket by type."""
        return self.buckets.get(bucket_type)

    def get_user_path_prefix(self, user_id: str | None = None) -> str:
        """Get path prefix with user folder for user-specific data."""
        base_prefix = self.settings.get_gcs_path_prefix()
        if user_id and user_id in ['users', 'tokens']:
            # Global data - no user folder
            return base_prefix
        elif user_id:
            # User-specific data - include user folder
            return f"{base_prefix}{user_id}/"
        else:
            # Fallback to base prefix
            return base_prefix

    def upload_index(self, collection: str, local_index_dir: Path, user_id: str | None = None) -> bool:
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

                # Upload to GCS indexes bucket
                path_prefix = self.get_user_path_prefix(user_id)
                blob_name = f"{path_prefix}{collection}.zip"
                indexes_bucket = self.get_bucket('indexes')
                if not indexes_bucket:
                    logger.error("Indexes bucket not available")
                    return False
                blob = indexes_bucket.blob(blob_name)

                blob.upload_from_filename(str(temp_path))
                logger.info(f"Uploaded index for collection '{collection}' to GCS: {blob_name}")

                # Clean up temp file
                temp_path.unlink()

                return True

        except Exception as e:
            logger.error(f"Failed to upload index for collection '{collection}': {e}")
            return False

    def download_index(self, collection: str, local_index_dir: Path, user_id: str | None = None) -> bool:
        """Download FAISS index from cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping download")
            return False

        try:
            path_prefix = self.get_user_path_prefix(user_id)
            blob_name = f"{path_prefix}{collection}.zip"
            indexes_bucket = self.get_bucket('indexes')
            if not indexes_bucket:
                logger.error("Indexes bucket not available")
                return False
            blob = indexes_bucket.blob(blob_name)

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

    def upload_json(self, data: dict, blob_path: str, bucket_type: str = 'users') -> bool:
        """Upload JSON data to cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping JSON upload")
            return False

        try:
            import json
            # Use specified bucket for JSON data
            bucket = self.get_bucket(bucket_type)
            if not bucket:
                logger.error(f"{bucket_type.title()} bucket not available")
                return False
            blob = bucket.blob(blob_path)
            blob.upload_from_string(
                json.dumps(data, indent=2),
                content_type='application/json'
            )
            logger.info(f"Uploaded JSON data to GCS: {blob_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to upload JSON to '{blob_path}': {e}")
            return False

    def download_json(self, blob_path: str, bucket_type: str = 'users') -> dict | None:
        """Download JSON data from cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping JSON download")
            return None

        try:
            import json
            # Use specified bucket for JSON data
            bucket = self.get_bucket(bucket_type)
            if not bucket:
                logger.error(f"{bucket_type.title()} bucket not available")
                return None
            blob = bucket.blob(blob_path)

            if not blob.exists():
                logger.info(f"JSON file not found in GCS: {blob_path}")
                return None

            data = blob.download_as_text()
            result = json.loads(data)
            logger.info(f"Downloaded JSON data from GCS: {blob_path}")
            return result

        except NotFound:
            logger.info(f"JSON file not found in GCS: {blob_path}")
            return None
        except Exception as e:
            logger.error(f"Failed to download JSON from '{blob_path}': {e}")
            return None

    def delete_json(self, blob_path: str) -> bool:
        """Delete JSON data from cloud storage."""
        if not self.is_available():
            logger.warning("Cloud storage not available, skipping JSON delete")
            return False

        try:
            # Use data prefix for non-index files
            full_path = f"{self.settings.gcs_data_prefix}{blob_path}"
            blob = self.bucket.blob(full_path)

            if blob.exists():
                blob.delete()
                logger.info(f"Deleted JSON from GCS: {full_path}")
                return True
            else:
                logger.info(f"JSON file not found in GCS: {full_path}")
                return False

        except Exception as e:
            logger.error(f"Failed to delete JSON from '{blob_path}': {e}")
            return False