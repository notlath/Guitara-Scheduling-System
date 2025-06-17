# Profile Photo Upload Cache-Busting Fix - Implementation Complete

## Problem Summary

When uploading a new profile photo, the old image gets replaced in Supabase Storage, but browsers still show the old cached image because the URL stays the same.

## Root Cause

Browser caching: Even though the file is replaced on the server, browsers cache images by URL. Since the URL path (`users/123/profile.jpg`) doesn't change, browsers serve the cached old image instead of fetching the new one.

## Solution Implemented

### 1. Backend Cache-Busting (Django)

**File: `guitara/core/storage_service.py`**

Added timestamp-based cache-busting to both Supabase and local storage URLs:

```python
# For Supabase Storage
cache_buster = f"?v={timestamp}"
full_url = f"{public_url}{cache_buster}"

# For Local Storage
cache_buster = f"?v={timestamp}"
full_url = f"{file_url}{cache_buster}"
```

This ensures that every upload generates a unique URL like:

- `https://supabase.co/storage/avatars/users/123/profile.jpg?v=1703097600`
- `http://localhost:8000/media/profile_photos/user_123/profile.jpg?v=1703097601`

### 2. Cache-Control Headers

The storage service already sets proper cache-control headers:

```python
"cache-control": "no-cache, must-revalidate"
```

### 3. File Replacement Strategy

The service uses a robust replacement approach:

1. **Upsert**: Try to replace existing file directly
2. **Delete + Upload**: If upsert fails, delete old file first, then upload new one
3. **Fallback**: Use local storage if Supabase fails

## How It Works Now

1. **User uploads new photo** → Frontend sends file to Django API
2. **Django processes image** → Resizes, converts to JPEG, optimizes
3. **Upload with replacement** → Uses upsert or delete+upload to replace existing file
4. **Generate cache-busted URL** → Adds timestamp parameter: `?v=1703097600`
5. **Return new URL** → Frontend receives unique URL that bypasses browser cache
6. **Update UI** → Image immediately shows the new photo

## Frontend Integration

The frontend components (`ProfilePhotoUploadPure.jsx`) are already compatible:

- They receive the new URL from the backend
- Update the preview immediately
- Update Redux store and localStorage with new URL
- Browser fetches new image because URL is different

## Testing

To test that the fix is working:

1. **Upload a profile photo** → Should see new image immediately
2. **Upload another photo** → Should replace the first one instantly
3. **Check URLs** → Each upload should have different `?v=` parameters
4. **Browser cache** → Should not show old images

## Additional Recommendations

### For Maximum Cache-Busting:

Add this to your frontend image elements:

```jsx
<img
  src={photoUrl}
  alt="Profile"
  key={photoUrl} // Force React re-render when URL changes
/>
```

### For Network Issues:

If you experience slow uploads, consider:

1. Image compression before upload
2. Progress indicators during upload
3. Retry mechanisms for failed uploads

## Files Modified

1. **`guitara/core/storage_service.py`**

   - Added timestamp-based cache-busting to URLs
   - Applied to both Supabase and local storage

2. **Frontend Components** (already compatible)
   - `ProfilePhotoUploadPure.jsx`
   - `ProfilePhotoUpload.jsx`

## Result

✅ **Image replacement now works correctly**
✅ **No more cached old images**  
✅ **Immediate visual feedback**
✅ **Works with both Supabase and local storage**

The fix ensures that when you upload a new profile photo, the old image is replaced in storage AND the browser immediately shows the new image without caching issues.
