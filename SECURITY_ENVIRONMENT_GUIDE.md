# Security Guide - Environment Variables Management

## Overview

This guide explains how to manage secrets and environment variables securely in the Guitara Scheduling System.

## Files Fixed

The following files had hard-coded secrets that have been replaced with environment variables:

1. **royal-care-frontend/.env.production** - Supabase credentials
2. **guitara/guitara/settings_docker.py** - Redis connection strings
3. **guitara/guitara/settings.py** - Django secret key
4. **docker/docker-compose.prod.yml** - Already using variables (good!)

## Environment Variable Templates Created

### 1. `.env.template`

Main environment variables template for the Django backend.

### 2. `docker/.env.prod.template`

Production environment variables for Docker deployment.

### 3. `royal-care-frontend/.env.production.template`

Frontend environment variables template for Vercel deployment.

## Setup Instructions

### For Local Development:

1. Copy `.env.template` to `.env`
2. Fill in your actual values
3. Copy `royal-care-frontend/.env.production.template` to `royal-care-frontend/.env.production`
4. Fill in your frontend values

### For Production Deployment:

1. Copy `docker/.env.prod.template` to `docker/.env.prod`
2. Fill in your production values
3. Set environment variables in your deployment platform (Railway, Vercel, etc.)

## Security Best Practices

### ✅ What We Fixed:

- Removed hard-coded Redis passwords
- Removed hard-coded Supabase credentials
- Made Django secret key configurable
- Created secure templates

### ✅ Current Security Measures:

- All `.env` files are in `.gitignore`
- Using environment variable substitution
- Template files for easy setup

### 🔒 Additional Recommendations:

1. **Generate New Secrets**: Create new secret keys, passwords, and API keys
2. **Use Secret Managers**: Consider using services like AWS Secrets Manager, Azure Key Vault, etc.
3. **Rotate Credentials**: Regularly rotate passwords and API keys
4. **Limit Access**: Only give access to secrets to those who need them
5. **Monitor Usage**: Set up alerts for unusual access patterns

## Critical Secrets to Set

### Backend (.env):

- `SECRET_KEY` - Django secret key (generate new one)
- `SUPABASE_DB_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis password
- `EMAIL_HOST_PASSWORD` - Email app password

### Frontend (.env.production):

- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SUPABASE_URL` - Supabase project URL

## Generate New Secret Key

To generate a new Django secret key, run:

```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

## Deployment Platform Configuration

### Railway:

Set environment variables in the Railway dashboard under your service settings.

### Vercel:

Set environment variables in the Vercel dashboard under your project settings.

### Docker:

Use the `docker/.env.prod` file or pass environment variables directly to docker-compose.

## Next Steps

1. Fill in the template files with your actual values
2. Generate new secret keys and passwords
3. Test your deployment with the new environment variables
4. Delete any backup files that might contain the old secrets
5. Consider implementing additional security measures like secret rotation

## Emergency Response

If secrets have been exposed:

1. Immediately rotate all affected credentials
2. Check access logs for unauthorized usage
3. Update all deployment environments
4. Consider implementing additional monitoring
