-- PostgreSQL Performance Optimization Settings for Guitara Scheduling System
-- Apply these settings to improve query planner performance

-- ==============================================================================
-- QUERY PLANNER STATISTICS IMPROVEMENTS
-- ==============================================================================

-- Improve query planner statistics for heavily queried columns
ALTER TABLE scheduling_appointment ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE scheduling_appointment ALTER COLUMN date SET STATISTICS 1000;
ALTER TABLE scheduling_appointment ALTER COLUMN therapist_id SET STATISTICS 1000;
ALTER TABLE scheduling_appointment ALTER COLUMN driver_id SET STATISTICS 1000;

ALTER TABLE scheduling_availability ALTER COLUMN date SET STATISTICS 1000;
ALTER TABLE scheduling_availability ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE scheduling_availability ALTER COLUMN is_available SET STATISTICS 1000;

ALTER TABLE core_customuser ALTER COLUMN role SET STATISTICS 1000;
ALTER TABLE core_customuser ALTER COLUMN is_active SET STATISTICS 1000;

ALTER TABLE scheduling_notification ALTER COLUMN user_id SET STATISTICS 1000;
ALTER TABLE scheduling_notification ALTER COLUMN is_read SET STATISTICS 1000;

-- ==============================================================================
-- POSTGRESQL CONFIGURATION RECOMMENDATIONS
-- ==============================================================================

-- These settings should be added to postgresql.conf for optimal performance
-- Adjust values based on your server specifications

/*
# Memory Configuration
shared_buffers = 256MB                    # 25% of RAM for dedicated servers
effective_cache_size = 1GB                # 75% of available RAM
work_mem = 4MB                            # Memory for sorting and hashing
maintenance_work_mem = 64MB               # Memory for maintenance operations

# Query Planner
random_page_cost = 1.1                    # SSD storage optimization
effective_io_concurrency = 200            # Concurrent I/O operations

# Logging (for performance monitoring)
log_statement = 'all'                     # Log all SQL statements
log_min_duration_statement = 100          # Log queries taking >100ms
log_lock_waits = on                       # Log lock waits
log_checkpoints = on                      # Log checkpoint activity

# Connection and Performance
max_connections = 100                     # Adjust based on your needs
checkpoint_completion_target = 0.9        # Spread checkpoint I/O
wal_buffers = 16MB                        # WAL buffer size

# Background Writer
bgwriter_delay = 200ms                    # Background writer sleep time
bgwriter_lru_maxpages = 100              # Max pages to write per round
*/

-- ==============================================================================
-- ANALYZE TABLES FOR UPDATED STATISTICS
-- ==============================================================================

-- Update table statistics after creating indexes
ANALYZE scheduling_appointment;
ANALYZE scheduling_availability;
ANALYZE scheduling_notification;
ANALYZE scheduling_client;
ANALYZE core_customuser;
ANALYZE attendance_attendancerecord;
ANALYZE attendance_attendancesummary;
ANALYZE authentication_twofactorcode;
ANALYZE authentication_passwordresetcode;
ANALYZE inventory_inventoryitem;
ANALYZE inventory_usagelog;
ANALYZE registration_service;
ANALYZE registration_material;

-- ==============================================================================
-- VACUUM AND MAINTENANCE COMMANDS
-- ==============================================================================

-- Run these periodically for optimal performance
-- Consider setting up automated maintenance jobs

-- VACUUM ANALYZE scheduling_appointment;
-- VACUUM ANALYZE scheduling_availability;
-- VACUUM ANALYZE core_customuser;
-- VACUUM ANALYZE scheduling_notification;

-- ==============================================================================
-- MONITORING QUERIES
-- ==============================================================================

-- Use these queries to monitor index usage and performance

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY idx_tup_read DESC;

-- Check table statistics
-- SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
-- FROM pg_stat_user_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY n_live_tup DESC;

-- Check slow queries (if logging is enabled)
-- SELECT query, calls, total_time, mean_time, rows
-- FROM pg_stat_statements 
-- WHERE mean_time > 100 
-- ORDER BY mean_time DESC;

-- ==============================================================================
-- INDEX MAINTENANCE RECOMMENDATIONS
-- ==============================================================================

-- Monitor and rebuild indexes periodically if needed
-- Check for bloated indexes:
-- SELECT schemaname, tablename, indexname, 
--        pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes 
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ==============================================================================
-- CONNECTION POOLING RECOMMENDATIONS
-- ==============================================================================

/*
For production environments, consider implementing connection pooling:

1. PgBouncer Configuration:
   - pool_mode = transaction
   - max_client_conn = 100
   - default_pool_size = 25

2. Django Settings:
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'OPTIONS': {
               'MAX_CONNS': 20,
               'CONN_MAX_AGE': 600,  # 10 minutes
           }
       }
   }
*/
