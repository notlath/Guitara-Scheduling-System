# Supabase Connection Issues - Debugging Guide

## 🚨 Common Supabase Hanging Issues

Based on your Railway deployment problems, here are the specific Supabase issues to check:

### 1. **Connection Pooler Timeouts**
**Issue**: Supabase uses connection poolers that can hang during high load
**Check**: 
- Your host: `aws-0-us-east-1.pooler.supabase.com`
- This is a pooler, not direct DB connection
- Poolers can timeout or become unresponsive

**Solution**:
```python
# In Django settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'OPTIONS': {
            'connect_timeout': 10,  # Short timeout
            'sslmode': 'require',
            'server_side_binding': False,  # Disable for poolers
        }
    }
}
```

### 2. **SSL Connection Issues**
**Issue**: Supabase requires SSL, but SSL handshake can hang
**Check**: Railway logs for SSL-related errors
**Solution**: Use `sslmode='require'` but add timeouts

### 3. **Connection Pool Exhaustion**
**Issue**: Too many connections to Supabase (max 100 for free tier)
**Check**: Number of active connections in Supabase dashboard
**Solution**: 
- Reduce `CONN_MAX_AGE` in Django
- Use connection pooling middleware
- Close connections explicitly

### 4. **Railway → Supabase Network Issues**
**Issue**: Railway's network may have intermittent connectivity to Supabase
**Check**: Network latency and packet loss
**Solution**: Implement retry logic and fallback

## 🔍 What to Check on Supabase Dashboard

### 1. **Database → Settings → General**
- ✅ Check if "Pause after inactivity" is disabled
- ✅ Verify SSL enforcement is ON
- ✅ Note your connection limit (100 for free, 200+ for paid)

### 2. **Database → Logs**
- 🔍 Look for connection errors
- 🔍 Check for "too many connections" errors
- 🔍 Monitor connection spikes during Railway deploys

### 3. **Database → Reports**
- 📊 Check "Active connections" graph
- 📊 Look for connection spikes that might exhaust the pool
- 📊 Monitor query performance (slow queries can hold connections)

### 4. **API → Settings**
- ✅ Verify RLS (Row Level Security) settings if using
- ✅ Check if any policies might block connections

## 🚨 Specific Railway + Supabase Issues

### Connection Hanging During Health Checks
```python
# PROBLEM: Health check tries to connect to DB and hangs
# Railway health check → Django → Supabase connection → HANGS

# SOLUTION: Database-independent health checks
def health_check_view(request):
    return JsonResponse({"status": "healthy"})  # No DB access
```

### Environment Variable Issues
```bash
# ❌ WRONG: Using Supabase URL instead of connection pooler
SUPABASE_DB_HOST=cpxwkxtbjzgmjgxpheiw.supabase.co

# ✅ CORRECT: Using connection pooler
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com
```

### Connection String Issues
```python
# ❌ WRONG: Missing timeouts
'HOST': 'aws-0-us-east-1.pooler.supabase.com',
'PORT': '5432',

# ✅ CORRECT: With proper timeouts
'HOST': 'aws-0-us-east-1.pooler.supabase.com',
'PORT': '5432',
'OPTIONS': {
    'connect_timeout': 10,
    'sslmode': 'require',
    'application_name': 'railway-guitara'
}
```

## 🔧 Debug Script Usage

Run the diagnostic script:
```bash
# Set your Railway environment variables first
export SUPABASE_DB_HOST="aws-0-us-east-1.pooler.supabase.com"
export SUPABASE_DB_NAME="postgres"
export SUPABASE_DB_USER="postgres.cpxwkxtbjzgmjgxpheiw"
export SUPABASE_DB_PASSWORD="your-password"
export SUPABASE_DB_PORT="5432"

# Run diagnostics
python debug_supabase_connection.py
```

## 🚨 Emergency Actions if Supabase is Hanging

### 1. **Immediate Fix** (Emergency Mode)
- Deploy with database-independent health checks
- Use SQLite for non-critical operations
- Keep Supabase for production data only

### 2. **Connection Pool Management**
```python
# Add to Django settings
DATABASES = {
    'default': {
        # ...existing config...
        'CONN_MAX_AGE': 300,  # 5 minutes instead of persistent
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'MAX_CONNS': 20,  # Limit connections per worker
        }
    }
}
```

### 3. **Monitor Supabase Usage**
- Check connection count in Supabase dashboard
- Monitor for connection leaks
- Set up alerts for high connection usage

### 4. **Alternative: Direct Database Connection**
```bash
# Try bypassing the pooler (for testing only)
SUPABASE_DB_HOST=db.cpxwkxtbjzgmjgxpheiw.supabase.co  # Direct connection
```
**⚠️ Note**: Direct connections have lower connection limits

## 📊 Expected Test Results

**✅ Healthy Supabase Connection:**
- DNS resolution: < 1 second
- Network connectivity: < 2 seconds  
- PostgreSQL connection: < 5 seconds
- No hanging in threading test
- Multiple concurrent connections succeed

**❌ Problematic Supabase Connection:**
- Connection timeouts > 15 seconds
- Threading test shows hanging
- Concurrent connections fail
- Django connection intermittent failures

## 🎯 Next Steps

1. **Run the diagnostic script** to identify specific issues
2. **Check Supabase dashboard** for connection limits and errors
3. **Update Django settings** with proper timeouts
4. **Deploy emergency mode** if connections are still hanging
5. **Monitor Railway logs** for connection patterns

The diagnostic script will help identify whether the hanging is due to:
- Network connectivity issues
- SSL handshake problems  
- Connection pool exhaustion
- Supabase service issues
- Django configuration problems
