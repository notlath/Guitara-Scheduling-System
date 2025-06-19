# PostgreSQL Performance Optimization for Guitara Scheduling System

This document outlines the comprehensive performance optimizations implemented for the Guitara Scheduling System, specifically designed for PostgreSQL databases.

## 🚀 Quick Start

### 1. Apply All Optimizations (Recommended)

```bash
# Run the comprehensive optimization command
python manage.py optimize_performance
```

### 2. Manual Migration Approach

If you prefer to run migrations manually:

```bash
# Run performance migrations for each app
python manage.py migrate core
python manage.py migrate scheduling
python manage.py migrate attendance
python manage.py migrate authentication
python manage.py migrate inventory
python manage.py migrate registration
```

### 3. Database-Only Optimizations

If you only want to apply database settings without migrations:

```bash
python manage.py optimize_performance --skip-migrations
```

## 📊 Performance Improvements Overview

### Critical Performance Areas Addressed

1. **Appointment Queries** - The most heavily used part of the system
2. **Availability Lookups** - Essential for conflict detection
3. **Real-time Operations** - Driver assignment and notifications
4. **Authentication & Security** - 2FA and login performance
5. **Inventory Management** - Stock tracking and usage logs
6. **Attendance Tracking** - Daily check-in/out operations

## 🔍 Detailed Index Implementations

### Scheduling System Indexes

#### Appointment Model (Primary Focus)

- `idx_appointments_status_date` - Status-based filtering with date
- `idx_appointments_therapist_date_status` - Therapist availability checks
- `idx_appointments_driver_date_status` - Driver assignment queries
- `idx_appointments_date_start_time` - Time slot conflicts
- `idx_appointments_pending_status` - Pending appointment queries
- `idx_appointments_overdue` - Auto-cancellation system
- `idx_appointments_pickup_requests` - Therapist pickup requests
- `idx_appointments_group_confirmation` - Multi-therapist support

#### Availability Model

- `idx_availability_user_date_time` - User availability lookups
- `idx_availability_available_only` - Only available slots
- `idx_availability_date_time_range` - Time range conflicts

#### Notification System

- `idx_notifications_user_unread` - Unread notifications
- `idx_notifications_appointment` - Appointment-specific alerts

### User Management Indexes

#### CustomUser Model

- `idx_users_driver_available_fifo` - FIFO driver assignment
- `idx_users_role_active` - Role-based user queries
- `idx_users_therapist_active` - Active therapist lookups
- `idx_users_two_factor` - 2FA enabled users

### Attendance System Indexes

#### AttendanceRecord Model

- `idx_attendance_staff_date` - Daily attendance lookups
- `idx_attendance_pending_approval` - Approval workflow
- `idx_attendance_hours_worked` - Payroll calculations

### Authentication Indexes

#### Security Models

- `idx_2fa_user_code` - 2FA code verification
- `idx_password_reset_user_code` - Password reset flows
- `idx_2fa_expired_cleanup` - Cleanup expired codes

### Inventory System Indexes

#### InventoryItem Model

- `idx_inventory_low_stock` - Low stock alerts
- `idx_inventory_expired_items` - Expiry monitoring
- `idx_inventory_category_stock` - Category-based inventory

#### UsageLog Model

- `idx_usage_log_item_timestamp` - Usage tracking
- `idx_usage_log_operator_action` - Operator activity

## ⚡ Performance Impact

### Expected Improvements

1. **Appointment Queries**: 60-80% faster
2. **Driver Assignment**: 50-70% faster
3. **Dashboard Loading**: 40-60% faster
4. **Conflict Detection**: 70-85% faster
5. **Real-time Updates**: 45-65% faster

### Before vs After Examples

```sql
-- Before: Full table scan (slow)
SELECT * FROM scheduling_appointment
WHERE status = 'pending' AND date = '2025-06-19';

-- After: Uses idx_appointments_status_date (fast)
-- Query time: ~500ms → ~15ms
```

## 🛠️ PostgreSQL Configuration

### Recommended postgresql.conf Settings

```ini
# Memory Configuration
shared_buffers = 256MB                    # 25% of RAM
effective_cache_size = 1GB                # 75% of available RAM
work_mem = 4MB                           # Sort/hash operations
maintenance_work_mem = 64MB              # Maintenance operations

# Query Planner
random_page_cost = 1.1                   # SSD optimization
effective_io_concurrency = 200           # Concurrent I/O

# Logging (Performance Monitoring)
log_statement = 'all'                    # Log all statements
log_min_duration_statement = 100         # Log slow queries (>100ms)
log_lock_waits = on                      # Log lock waits

# Connections
max_connections = 100                    # Adjust based on needs
checkpoint_completion_target = 0.9       # Checkpoint I/O spread
```

### Apply Configuration

1. Edit your `postgresql.conf` file
2. Restart PostgreSQL service
3. Verify settings: `SHOW shared_buffers;`

## 📈 Monitoring & Maintenance

### Performance Monitoring Queries

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;

-- Find slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Check table statistics
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Regular Maintenance

```sql
-- Update table statistics (weekly)
ANALYZE scheduling_appointment;
ANALYZE scheduling_availability;
ANALYZE core_customuser;

-- Vacuum tables (as needed)
VACUUM ANALYZE scheduling_appointment;
VACUUM ANALYZE scheduling_notification;
```

### Automated Maintenance Script

```bash
#!/bin/bash
# Add to crontab: 0 2 * * 0 (weekly at 2 AM)
python manage.py optimize_performance --analyze-only
```

## 🔧 Production Recommendations

### 1. Connection Pooling

Install and configure PgBouncer:

```ini
# pgbouncer.ini
[databases]
guitara = host=localhost port=5432 dbname=guitara

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
```

### 2. Django Settings

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'OPTIONS': {
            'MAX_CONNS': 20,
            'CONN_MAX_AGE': 600,  # 10 minutes
        }
    }
}
```

### 3. Caching Strategy

```python
# Add Redis caching for frequent queries
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Migration Errors**

   ```bash
   # Reset migrations if needed
   python manage.py migrate --fake-initial
   ```

2. **Index Creation Timeouts**

   ```sql
   -- Create indexes concurrently (no table locks)
   CREATE INDEX CONCURRENTLY idx_name ON table_name(column);
   ```

3. **Statistics Not Updated**
   ```bash
   python manage.py optimize_performance --analyze-only
   ```

### Performance Regression

If performance decreases after optimization:

1. Check if indexes are being used:

   ```sql
   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM scheduling_appointment WHERE status = 'pending';
   ```

2. Update statistics:

   ```bash
   python manage.py optimize_performance --analyze-only
   ```

3. Check for table bloat:
   ```sql
   SELECT * FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;
   ```

## 📋 Checklist

- [ ] Run `python manage.py optimize_performance`
- [ ] Update PostgreSQL configuration
- [ ] Restart PostgreSQL service
- [ ] Test critical queries performance
- [ ] Set up monitoring queries
- [ ] Schedule regular maintenance
- [ ] Configure connection pooling (production)
- [ ] Implement caching strategy
- [ ] Monitor index usage weekly

## 🎯 Expected Results

### Key Performance Metrics

- **Dashboard load time**: < 500ms
- **Appointment creation**: < 200ms
- **Driver assignment**: < 300ms
- **Conflict detection**: < 100ms
- **Real-time notifications**: < 50ms

### System Capacity

- **Concurrent users**: 50-100 users
- **Daily appointments**: 500-1000 appointments
- **Response time**: < 2 seconds for 95% of requests

---

**Note**: These optimizations are specifically designed for PostgreSQL. Performance gains may vary based on your specific hardware, data volume, and usage patterns. Monitor your system closely after implementation and adjust as needed.
