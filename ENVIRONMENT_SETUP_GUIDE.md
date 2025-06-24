# Environment Configuration Guide

## Overview

This project uses environment variables to configure different settings for development and production environments.

## Files

- `.env` - Development environment configuration (localhost)
- `.env.production` - Production environment configuration (Railway + Vercel)
- `.env.example` - Template with example values

## Current Configuration

### Development Environment (.env)

- **NODE_ENV**: `development`
- **API URLs**: Points to `http://localhost:8000/api` (local Django server)
- **WebSocket**: Points to `ws://localhost:8000/ws` (local WebSocket)
- **Usage**: For local development when running Django backend locally

### Production Environment (.env.production)

- **NODE_ENV**: `production`
- **API URLs**: Points to `https://charismatic-appreciation-production.up.railway.app/api` (Railway deployment)
- **WebSocket**: Points to `wss://charismatic-appreciation-production.up.railway.app/ws` (Railway WebSocket)
- **Usage**: For production deployment on Vercel

## Switching Environments

### For Local Development

```bash
# Use the development environment file
cp .env .env.local
# Or manually ensure .env has development settings
```

### For Production Deployment

```bash
# Use the production environment file
cp .env.production .env
# Or set environment variables directly in your deployment platform
```

### For Vercel Deployment

Set these environment variables in your Vercel dashboard:

- `NODE_ENV=production`
- `VITE_API_BASE_URL=https://charismatic-appreciation-production.up.railway.app/api`
- `VITE_WS_BASE_URL=wss://charismatic-appreciation-production.up.railway.app/ws`
- `VITE_SUPABASE_URL=https://cpxwkxtbjzgmjgxpheiw.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNweHdreHRianpnbWpneHBoZWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNDMwNjQsImV4cCI6MjA1ODgxOTA2NH0._tLksGoARKXHE4b-bqSlf_Eoygs3ATQClXVr5iGnsOw`

## Variable Descriptions

### API Configuration

- `VITE_API_BASE_URL`: Base URL for API requests (includes `/api` path)
- `VITE_WS_BASE_URL`: WebSocket URL for real-time features
- `NODE_ENV`: Environment mode (`development` or `production`)

### Supabase Configuration

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Public anon key for client-side operations
- `SUPABASE_URL`: Backend Supabase URL (Django)
- `SUPABASE_KEY`: Backend Supabase key (Django)
- `SUPABASE_SERVICE_KEY`: Service role key for admin operations

### Email Configuration

- `EMAIL_HOST`: SMTP server host
- `EMAIL_PORT`: SMTP server port
- `EMAIL_USE_TLS`: Enable TLS encryption
- `EMAIL_HOST_USER`: SMTP username
- `EMAIL_HOST_PASSWORD`: SMTP password (app-specific password)
- `DEFAULT_FROM_EMAIL`: Default sender email address
- `EMAIL_BACKEND`: Django email backend

## Security Notes

1. **Never commit sensitive keys** to version control
2. **Use app-specific passwords** for Gmail SMTP
3. **Rotate keys regularly** especially service keys
4. **Use different keys** for development and production
5. **Validate environment variables** in your application startup

## Troubleshooting

### Common Issues

1. **API calls failing**: Check if `VITE_API_BASE_URL` matches your backend URL
2. **WebSocket connection issues**: Verify `VITE_WS_BASE_URL` protocol (ws/wss)
3. **Supabase errors**: Ensure keys are not truncated and have proper permissions
4. **Email not sending**: Verify Gmail app password and SMTP settings

### Environment Detection

The frontend will automatically detect the environment and use appropriate settings. However, ensure:

- Development: Backend running on `localhost:8000`
- Production: Backend deployed on Railway and accessible

## Best Practices

1. **Always use `.env.local`** for local development overrides
2. **Set environment variables** in deployment platforms rather than committing them
3. **Test both environments** before deploying
4. **Monitor API endpoints** for availability
5. **Keep backups** of working configurations
