# Supabase Storage RLS Policies Setup Guide

## Current Configuration

- **Bucket Name**: `avatars`
- **File Path Structure**: `users/{user_id}/profile.jpg`
- **Backend Authentication**: Service Key (Django backend)
- **Frontend Authentication**: Anonymous Key (React frontend)

## Required RLS Policies

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `cpxwkxtbjzgmjgxpheiw`
3. Navigate to **Storage** > **Policies**
4. Select the `avatars` bucket

### Step 2: Enable RLS

Make sure **"Enable RLS"** is turned ON for the `avatars` bucket.

### Step 3: Create the Following Policies

#### Policy 1: Public Read Access

- **Name**: `Allow public read access to avatar images`
- **Policy Type**: `SELECT`
- **Target Roles**: `public`
- **Policy Expression**:

```sql
((bucket_id = 'avatars'::text) AND (storage.extension(name) = 'jpg'::text))
```

#### Policy 2: Service Role Full Access

- **Name**: `Allow service role full access to avatars`
- **Policy Type**: `ALL`
- **Target Roles**: `service_role`
- **Policy Expression**:

```sql
(bucket_id = 'avatars'::text)
```

#### Policy 3: Authenticated Upload Access

- **Name**: `Allow authenticated users to upload avatars`
- **Policy Type**: `INSERT`
- **Target Roles**: `authenticated`
- **Policy Expression**:

```sql
((bucket_id = 'avatars'::text) AND
 (storage.foldername(name))[1] = 'users' AND
 (storage.extension(name) = 'jpg'::text))
```

#### Policy 4: Authenticated Update Access

- **Name**: `Allow authenticated users to update avatars`
- **Policy Type**: `UPDATE`
- **Target Roles**: `authenticated`
- **Policy Expression**:

```sql
((bucket_id = 'avatars'::text) AND
 (storage.foldername(name))[1] = 'users' AND
 (storage.extension(name) = 'jpg'::text))
```

#### Policy 5: Authenticated Delete Access

- **Name**: `Allow authenticated users to delete avatars`
- **Policy Type**: `DELETE`
- **Target Roles**: `authenticated`
- **Policy Expression**:

```sql
((bucket_id = 'avatars'::text) AND
 (storage.foldername(name))[1] = 'users' AND
 (storage.extension(name) = 'jpg'::text))
```

## Bucket Configuration

### Step 4: Bucket Settings

1. In **Storage** > **Buckets**, click on the `avatars` bucket
2. Make sure the following settings are configured:
   - **Public**: `true` (allows public read access)
   - **File size limit**: `5MB` (or your preferred limit)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

## Testing the Configuration

After implementing the policies above, you can test using these commands:

### Test 1: Check Bucket Access

```bash
cd /home/notlath/Downloads/Guitara-Scheduling-System
python -c "
from guitara.core.storage_service import SupabaseStorageService
service = SupabaseStorageService()
print('Bucket accessible:', service._ensure_bucket_exists())
"
```

### Test 2: Upload Test

```bash
cd /home/notlath/Downloads/Guitara-Scheduling-System
python test_rls_policies.py
```

## Common Issues and Solutions

### Issue 1: Service Role Blocked

**Symptoms**: Uploads from Django backend fail with permission errors
**Solution**: Ensure Policy 2 (Service Role Full Access) is properly configured

### Issue 2: Frontend Upload Failures

**Symptoms**: Uploads from React frontend fail
**Solution**: Verify that your frontend is authenticating users properly and using the correct anon key

### Issue 3: Images Not Visible

**Symptoms**: Upload succeeds but images don't display
**Solution**: Verify Policy 1 (Public Read Access) is configured correctly

### Issue 4: Wrong File Paths

**Symptoms**: Policy violations due to path mismatches
**Solution**: Ensure your file paths match the pattern `users/{user_id}/profile.jpg`

## Alternative Configuration (If Above Doesn't Work)

If you continue to have issues, try this simpler approach:

1. **Disable RLS temporarily** to test uploads
2. **Set bucket to public** with no policies
3. **Test uploads** to ensure basic functionality works
4. **Gradually re-enable policies** one by one

## Verification Steps

1. **Check Supabase Dashboard**: After upload, verify files appear in Storage browser
2. **Test Direct URLs**: Copy a file URL from dashboard and test in browser
3. **Check Network Tab**: Monitor browser dev tools for upload/download errors
4. **Review Logs**: Check both Django logs and Supabase logs

## Next Steps After Implementation

1. Clear any cached profile photo URLs in your database
2. Test uploads from both Django admin and React frontend
3. Verify that old local files are properly migrated
4. Monitor error logs for any remaining issues
