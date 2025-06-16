"""
Storage service for handling file uploads to Supabase Storage
"""

import os
import logging
from typing import Optional, Dict, Any
from PIL import Image
from io import BytesIO
from registration.supabase_client import get_supabase_client, safe_supabase_operation

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
                return False

            self._bucket_checked = True
            logger.info(f"✅ Bucket '{self.bucket_name}' is accessible")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to check bucket existence: {e}")
            return False

    def _process_image(self, image_file, max_size=(400, 400), quality=85):
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

    def upload_profile_photo(
        self, user_id: int, image_file, filename: str
    ) -> Optional[str]:
        """
        Upload profile photo to Supabase Storage
        Returns the public URL of the uploaded file
        """
        if not self.client:
            logger.error("Supabase client not available")
            return None

        # Check if bucket exists and is accessible
        if not self._ensure_bucket_exists():
            logger.error(
                f"Cannot upload to bucket '{self.bucket_name}' - bucket not accessible"
            )
            return None

        try:
            # Process the image
            processed_image, image_data = self._process_image(image_file)

            # Create a unique filename
            file_extension = "jpg"  # Always save as JPEG after processing
            storage_path = f"users/{user_id}/profile.{file_extension}"

            def upload_operation():
                # First, try to remove existing file (if any)
                try:
                    self.client.storage.from_(self.bucket_name).remove([storage_path])
                except Exception:
                    # File might not exist, that's okay
                    pass

                # Upload the new file
                result = self.client.storage.from_(self.bucket_name).upload(
                    path=storage_path,
                    file=image_data,
                    file_options={
                        "content-type": "image/jpeg",
                        "cache-control": "3600",
                    },
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
                return None

            if result and hasattr(result, "path"):
                # Get the public URL
                public_url = self.client.storage.from_(self.bucket_name).get_public_url(
                    storage_path
                )
                logger.info(
                    f"✅ Profile photo uploaded successfully for user {user_id}: {public_url}"
                )
                return public_url
            else:
                logger.error(
                    f"❌ Upload failed for user {user_id} - no result or path: {result}"
                )
                return None

        except Exception as e:
            logger.error(f"Profile photo upload failed for user {user_id}: {e}")
            return None

    def delete_profile_photo(self, user_id: int) -> bool:
        """
        Delete profile photo from Supabase Storage
        """
        if not self.client:
            logger.error("Supabase client not available")
            return False

        try:
            storage_path = f"users/{user_id}/profile.jpg"

            def delete_operation():
                return self.client.storage.from_(self.bucket_name).remove(
                    [storage_path]
                )

            result, error = safe_supabase_operation(delete_operation, timeout=10)

            if result:
                logger.info(f"Profile photo deleted successfully for user {user_id}")
                return True
            else:
                logger.error(f"Delete failed for user {user_id}: {result}")
                return False

        except Exception as e:
            logger.error(f"Profile photo deletion failed for user {user_id}: {e}")
            return False


# Singleton instance
storage_service = SupabaseStorageService()
