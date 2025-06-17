"""
Storage service for handling file uploads to Supabase Storage
"""

import os
import logging
from typing import Optional, Dict, Any
from PIL import Image
from io import BytesIO
from registration.supabase_client import get_supabase_client, safe_supabase_operation
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


class SupabaseStorageService:
    def __init__(self):
        self.client = get_supabase_client()
        self.bucket_name = "avatars"
        self._bucket_checked = False

    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, or provide helpful error message"""
        if self._bucket_checked:
            return True

        if not self.client:
            logger.error(
                "Supabase client not available - check SUPABASE_URL and SUPABASE_KEY in .env"
            )
            logger.info("Falling back to local file storage")
            return False

        try:
            # Try to list files to check if bucket exists and has proper permissions
            def check_bucket_operation():
                return self.client.storage.from_(self.bucket_name).list()

            result, error = safe_supabase_operation(check_bucket_operation, timeout=10)

            if error:
                error_msg = str(error).lower()
                if "not found" in error_msg or "does not exist" in error_msg:
                    logger.error(
                        f"❌ Bucket '{self.bucket_name}' does not exist. Please create it in Supabase Dashboard."
                    )
                elif "permission" in error_msg or "unauthorized" in error_msg:
                    logger.error(
                        f"❌ Permission denied for bucket '{self.bucket_name}'. Check RLS policies and bucket settings."
                    )
                    logger.error(
                        "💡 Make sure the bucket is set to 'public' and has proper RLS policies for uploads."
                    )
                else:
                    logger.error(f"❌ Bucket '{self.bucket_name}' error: {error}")

                logger.error(
                    "📋 See SUPABASE_AVATARS_BUCKET_CONFIG.md for setup instructions"
                )
                logger.info("Falling back to local file storage")
                return False

            self._bucket_checked = True
            logger.info(f"✅ Bucket '{self.bucket_name}' is accessible")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to check bucket existence: {e}")
            logger.info("Falling back to local file storage")
            return False

    def _process_image(self, image_file, max_size=(800, 800), quality=100):
        """
        Process uploaded image: resize, compress, and convert to JPEG
        """
        try:
            # Open and process the image
            image = Image.open(image_file)

            # Convert to RGB if necessary (handles RGBA, P mode images)
            if image.mode in ("RGBA", "P"):
                # Create a white background for transparent images
                background = Image.new("RGB", image.size, (255, 255, 255))
                if image.mode == "P":
                    image = image.convert("RGBA")
                background.paste(image, mask=image.split()[-1])
                image = background
            elif image.mode != "RGB":
                image = image.convert("RGB")

            # Resize image while maintaining aspect ratio
            image.thumbnail(max_size, Image.Resampling.LANCZOS)

            # Save to BytesIO
            output = BytesIO()
            image.save(output, format="JPEG", quality=quality, optimize=True)
            output.seek(0)

            return output, output.getvalue()

        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise ValueError(f"Invalid image file: {e}")

    def _upload_to_local_storage(
        self, user_id: int, image_file, filename: str
    ) -> Optional[str]:
        """
        Fallback method to upload to local Django file storage
        """
        try:
            # Process the image
            processed_image, image_data = self._process_image(image_file)

            # Create a unique filename
            file_extension = "jpg"  # Always save as JPEG after processing
            storage_path = f"profile_photos/user_{user_id}/profile.{file_extension}"

            # Save using Django's default storage
            saved_path = default_storage.save(
                storage_path, ContentFile(processed_image.getvalue())
            )

            # Generate URL for the uploaded file
            file_url = default_storage.url(saved_path)

            # Make it a full URL if it's relative
            if file_url.startswith("/"):
                from django.conf import settings

                # Use the current host from settings or fallback
                base_url = getattr(settings, "BASE_URL", "http://localhost:8000")
                file_url = f"{base_url}{file_url}"

            # Add cache-busting timestamp to the URL
            import time

            timestamp = int(time.time())
            cache_buster = f"?v={timestamp}"
            full_url = f"{file_url}{cache_buster}"

            logger.info(
                f"✅ Profile photo uploaded to local storage for user {user_id}: {full_url}"
            )
            return full_url

        except Exception as e:
            logger.error(f"Local storage upload failed for user {user_id}: {e}")
            return None

    def upload_profile_photo(
        self, user_id: int, image_file, filename: str
    ) -> Optional[str]:
        """
        Upload profile photo to Supabase Storage or local storage as fallback
        Returns the public URL of the uploaded file
        """
        # First try Supabase Storage
        if self.client and self._ensure_bucket_exists():
            try:
                # Process the image
                processed_image, image_data = self._process_image(image_file)

                # Create a unique filename with timestamp to force cache refresh
                import time

                timestamp = int(time.time())
                file_extension = "jpg"  # Always save as JPEG after processing
                storage_path = f"users/{user_id}/profile.{file_extension}"

                def upload_operation():
                    # Upload the new file - ensure we're using bytes
                    # Some Supabase library versions expect different formats
                    upload_data = image_data
                    if isinstance(upload_data, BytesIO):
                        upload_data = upload_data.getvalue()

                    # Ensure we have bytes
                    if not isinstance(upload_data, bytes):
                        logger.error(
                            f"Upload data is {type(upload_data)}, expected bytes"
                        )
                        raise ValueError(
                            f"Upload data must be bytes, got {type(upload_data)}"
                        )

                    # Force file replacement by using upsert
                    try:
                        # Try upsert first (replace if exists, create if not)
                        result = self.client.storage.from_(self.bucket_name).upload(
                            path=storage_path,
                            file=upload_data,
                            file_options={
                                "content-type": "image/jpeg",
                                "cache-control": "no-cache, must-revalidate",  # Force no caching
                                "upsert": "true",  # Replace if exists
                            },
                        )
                        logger.info(
                            f"✅ Used upsert for file replacement at {storage_path}"
                        )
                        return result
                    except Exception as upsert_error:
                        logger.warning(
                            f"Upsert failed, trying delete+upload: {upsert_error}"
                        )

                        # Fallback: Delete existing file first, then upload new one
                        try:
                            # First, try to remove existing file (if any)
                            remove_result = self.client.storage.from_(
                                self.bucket_name
                            ).remove([storage_path])
                            logger.info(f"Removed existing file: {remove_result}")
                        except Exception as delete_error:
                            # File might not exist, that's okay
                            logger.info(
                                f"No existing file to delete (or delete failed): {delete_error}"
                            )

                        # Now upload the new file
                        result = self.client.storage.from_(self.bucket_name).upload(
                            path=storage_path,
                            file=upload_data,
                            file_options={
                                "content-type": "image/jpeg",
                                "cache-control": "no-cache, must-revalidate",  # Force no caching
                            },
                        )
                        logger.info(
                            f"✅ Used delete+upload for file replacement at {storage_path}"
                        )
                        return result

                # Execute upload operation safely
                result, error = safe_supabase_operation(upload_operation, timeout=30)

                if error:
                    error_msg = str(error).lower()
                    if "permission" in error_msg or "unauthorized" in error_msg:
                        logger.error(
                            f"❌ Upload permission denied for user {user_id}. Check bucket RLS policies."
                        )
                    elif "not found" in error_msg:
                        logger.error(
                            f"❌ Bucket '{self.bucket_name}' not found during upload for user {user_id}"
                        )
                    else:
                        logger.error(f"❌ Upload error for user {user_id}: {error}")

                    # Fall back to local storage
                    logger.info("Falling back to local storage...")
                    return self._upload_to_local_storage(user_id, image_file, filename)

                if result and hasattr(result, "path"):
                    # Get the public URL
                    public_url = self.client.storage.from_(
                        self.bucket_name
                    ).get_public_url(storage_path)

                    # Add cache-busting timestamp to the URL
                    cache_buster = f"?v={timestamp}"
                    full_url = f"{public_url}{cache_buster}"

                    logger.info(
                        f"✅ Profile photo uploaded successfully for user {user_id}: {full_url}"
                    )
                    return full_url
                else:
                    logger.error(
                        f"❌ Upload failed for user {user_id} - no result or path: {result}"
                    )
                    # Fall back to local storage
                    logger.info("Falling back to local storage...")
                    return self._upload_to_local_storage(user_id, image_file, filename)

            except Exception as e:
                logger.error(f"Profile photo upload failed for user {user_id}: {e}")
                # Fall back to local storage
                logger.info("Falling back to local storage...")
                return self._upload_to_local_storage(user_id, image_file, filename)

        # If Supabase is not available, use local storage directly
        logger.info(f"Using local storage for user {user_id} profile photo")
        return self._upload_to_local_storage(user_id, image_file, filename)

    def delete_profile_photo(self, user_id: int) -> bool:
        """
        Delete profile photo from Supabase Storage or local storage
        """
        success = False

        # Try Supabase first
        if self.client:
            try:
                storage_path = f"users/{user_id}/profile.jpg"

                def delete_operation():
                    return self.client.storage.from_(self.bucket_name).remove(
                        [storage_path]
                    )

                result, error = safe_supabase_operation(delete_operation, timeout=10)

                if result:
                    logger.info(
                        f"Profile photo deleted from Supabase for user {user_id}"
                    )
                    success = True
                else:
                    logger.warning(
                        f"Supabase delete failed for user {user_id}: {error}"
                    )

            except Exception as e:
                logger.error(
                    f"Supabase profile photo deletion failed for user {user_id}: {e}"
                )

        # Also try to delete from local storage
        try:
            storage_path = f"profile_photos/user_{user_id}/profile.jpg"
            if default_storage.exists(storage_path):
                default_storage.delete(storage_path)
                logger.info(
                    f"Profile photo deleted from local storage for user {user_id}"
                )
                success = True
        except Exception as e:
            logger.error(
                f"Local storage profile photo deletion failed for user {user_id}: {e}"
            )

        return success


# Singleton instance
storage_service = SupabaseStorageService()
