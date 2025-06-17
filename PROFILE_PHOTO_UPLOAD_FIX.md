# Profile Photo Upload Fix - Complete Solution

## Problem Summary

The profile photo upload functionality was failing with a 500 Internal Server Error because:

1. **Supabase Storage Configuration**: The system was using an anonymous Supabase key which has limited permissions for write operations
2. **Missing Bucket**: The `avatars` bucket might not exist or have proper permissions in Supabase
3. **No Fallback Mechanism**: When Supabase fails, there was no alternative storage solution

## Solution Implemented

### 1. Enhanced Storage Service with Fallback (`core/storage_service.py`)

**Key Changes:**

- Added `_upload_to_local_storage()` method as a fallback when Supabase is unavailable
- Modified `upload_profile_photo()` to try Supabase first, then fall back to local Django storage
- Enhanced error handling with detailed logging
- Added support for both Supabase Storage and local file storage

**How it works:**

1. First attempts to upload to Supabase Storage
2. If Supabase is unavailable or fails, automatically falls back to local file storage
3. Returns a proper URL for accessing the uploaded photo
4. Handles image processing (resize, compress, convert to JPEG)

### 2. Django Settings Configuration (`guitara/settings.py`)

**Added:**

- `BASE_URL = "http://localhost:8000"` for constructing absolute URLs
- Proper media file handling settings already existed

### 3. URL Configuration (`guitara/urls.py`)

**Added:**

- Media file serving in development mode:

```python
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 4. Error Handling Improvements (`registration/views.py`)

**Enhanced:**

- Better error messages in the ProfilePhotoUploadView
- More informative logging
- Proper exception handling

### 5. Directory Structure

**Created:**

- `guitara/media/profile_photos/` directory for local file storage
- `.env.example` file showing required Supabase configuration

## How to Use

### Option 1: With Supabase Storage (Recommended for Production)

1. Create a `.env` file in the `guitara/` directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_database_password
SUPABASE_DB_HOST=your_supabase_db_host
```

2. Create an `avatars` bucket in your Supabase project:
   - Go to Supabase Dashboard > Storage
   - Create a new bucket named `avatars`
   - Set it as public
   - Configure RLS policies to allow uploads

### Option 2: Local Storage Only (Works Immediately)

The system will automatically use local storage if Supabase is not configured. Photos will be stored in:

- `guitara/media/profile_photos/user_[USER_ID]/profile.jpg`
- Accessible via: `http://localhost:8000/media/profile_photos/user_[USER_ID]/profile.jpg`

## Testing the Fix

1. Start the development server:

```bash
cd guitara
python manage.py runserver
```

2. Try uploading a profile photo through the frontend interface

3. Check the logs for detailed information about the upload process

## File Locations Changed

1. `/core/storage_service.py` - Enhanced with fallback mechanism
2. `/guitara/settings.py` - Added BASE_URL setting
3. `/guitara/urls.py` - Added media file serving
4. `/registration/views.py` - Improved error handling
5. `/guitara/.env.example` - Configuration template

## Benefits of This Solution

1. **Resilient**: Works with or without Supabase configuration
2. **Immediate**: No setup required for basic functionality
3. **Production Ready**: Easy to switch to Supabase Storage when properly configured
4. **Debuggable**: Comprehensive logging for troubleshooting
5. **Secure**: Proper file validation and image processing

## Error Handling

The system now provides clear error messages:

- File size validation (5MB limit)
- File type validation (JPEG, PNG, WebP only)
- Proper image processing with error recovery
- Detailed logging for debugging

## Next Steps for Production

1. Set up Supabase Storage with proper bucket and RLS policies
2. Use HTTPS URLs in production
3. Consider using a CDN for better performance
4. Implement proper image optimization for different sizes
