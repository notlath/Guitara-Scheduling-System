# Archive Directory

This directory contains archived files that were moved from the main project, including test scripts, validation tools, documentation, and completed implementations that are no longer needed for ongoing development.

## Directory Structure

### Documentation (`/docs`)

Complete documentation and fix summaries for all implemented features:

#### Core Implementation Documentation

- **AUTO_RETRY_LOGIN_IMPLEMENTATION.md** - Auto-retry login system for re-enabled accounts
- **AVAILABILITY_MANAGER_DISABLED_STAFF_FIX.md** - Fix for disabled staff availability management
- **AVAILABILITY_ROUTE_FIX.md** - Availability routing fixes
- **CROSS_DAY_AVAILABILITY_IMPLEMENTATION.md** - Cross-day availability support implementation
- **DISABLED_ACCOUNT_IMPLEMENTATION.md** - Disabled account prevention system
- **INFINITE_LOOP_FIX_SUMMARY.md** - React infinite loop fixes
- **LOGO_CLICK_IMPLEMENTATION_COMPLETE.md** - Logo click functionality implementation
- **PAGE_REFRESH_REDIRECT_FIX.md** - Page refresh and redirect fixes
- **PROJECT_STATUS_COMPLETE.md** - Complete project status summary
- **REAL_TIME_SYNC_COMPLETE.md** - Real-time synchronization implementation
- **REAL_TIME_SYNC_IMPLEMENTATION_COMPLETE.md** - Comprehensive sync implementation
- **REAL_TIME_SYNC_IMPLEMENTATION.md** - Original sync implementation documentation
- **REAL_TIME_SYNC_SOLUTION.md** - Real-time sync solution documentation
- **REFRESH_FIX_SUMMARY.md** - Page refresh behavior fixes
- **SCHEDULING_VIEW_PERSISTENCE_COMPLETE.md** - Scheduling view persistence implementation
- **STAFF_STATUS_DISPLAY_FIX.md** - Staff status display fixes
- **STAFF_STATUS_FIX_SUMMARY.md** - Staff status fix summary
- **THERAPIST_DASHBOARD_ROUTING_FIX_COMPLETE.md** - Therapist dashboard routing fixes

#### Organized Sub-directories

**`/docs/summaries/`**

- **frontend_fixes_progress.md** - Progress tracking for frontend fixes
- **testing_plan.md** - Comprehensive testing plan for applied fixes

**`/docs/fixes/`**

- **AVAILABILITY_CREATION_FIX.md** - Fix for availability creation issues
- **AVAILABILITY_DISPLAY_FIX.md** - Fix for availability display problems
- **REACT_INFINITE_LOOP_FIX.md** - Solution for React infinite loop issues
- **WEBSOCKET_FIX_SUMMARY.md** - WebSocket connectivity fixes

**`/docs/implementation/`**

- **LOADING_UX_IMPROVEMENTS.md** - Loading UX enhancement implementation
- **NON_INTRUSIVE_LOADING_SUMMARY.md** - Non-intrusive loading system summary
- **NOTIFICATION_SYSTEM_IMPROVEMENTS.md** - Notification system enhancements

### Scripts (`/scripts`)

All test scripts, validation tools, and utility scripts organized by category:

#### `/scripts/testing/`

**JavaScript Test Scripts:**

- **test_frontend_sync.js** - Comprehensive frontend sync testing
- **test_isStaffActive_function.js** - Staff active status function testing
- **test_logo_click_functionality.js** - Logo click functionality testing
- **test_real_time_sync_fix.js** - Real-time sync fix validation
- **test_real_time_sync_validation.js** - Real-time sync validation testing
- **test_refresh_behavior.js** - Page refresh behavior testing
- **test_refresh_navigation.js** - Refresh navigation testing
- **test_refresh_navigation_guide.js** - Manual refresh navigation testing
- **test_scheduling_view_persistence.js** - Scheduling view persistence testing
- **validate_refresh_fix.js** - Refresh fix validation script
- **validate_scheduling_view_persistence.js** - Scheduling view persistence validation

**Python Test Scripts:**

- **test_auto_retry_login.py** - Auto-retry login system testing
- **test_availability_creation.py** - Availability creation testing
- **test_availability_display.py** - Availability display testing
- **test_availability_manager_fixes.py** - Availability manager fixes testing
- **test_availability_route.py** - Availability route testing
- **test_availability_route_fix.py** - Availability route fix testing
- **test_cross_day_availability.py** - Cross-day availability testing
- **test_disabled_account_prevention.py** - Disabled account prevention testing
- **test_endpoint_directly.py** - Direct endpoint testing
- **test_notification_features.py** - Notification feature testing
- **test_notification_logic.py** - Notification logic testing
- **test_notifications.py** - General notification testing
- **test_notifications_endpoint.py** - Notification endpoint testing
- **test_real_time_sync.py** - Backend real-time sync testing
- **test_rejection_flow.py** - Rejection workflow testing
- **test_review_payload.py** - Review payload testing
- **test_services.py** - Service functionality testing
- **test_staff_api_debug.py** - Staff API debugging
- **test_staff_is_active.py** - Staff active status testing
- **test_workflow.py** - General workflow testing

#### `/scripts/database/`

- **check_database_staff.py** - Database staff status verification
- **debug_staff_data.py** - Staff data debugging
- **fix_database_staff.py** - Database staff status fixes
- **setup_database.bat** - Database setup script
- Other database management and utility scripts

#### `/scripts/migration/`

- **fix_migration.py** - Script to fix inconsistent migration history
- **fix_sqlite_migrations.py** - Script to repair SQLite migration records
- Migration management and repair tools

#### `/scripts/notification/`

- **check_notifications.py** - Notification verification script
- **create_test_notifications.py** - Test notification creation
- Notification system testing and utility scripts

#### `/scripts/websocket/`

- **check_websocket.py** - WebSocket functionality testing
- **verify_websocket.py** - WebSocket connection verification
- WebSocket-related testing scripts

### Extended Documentation (`/documentation`)

#### Archive Logs

- **archive_log_2025-06-01.md** - Files archived on June 1, 2025
- **archive_log_2025-06-02.md** - Migration and testing scripts archived on June 2, 2025
- **archive_log_2025-06-05.md** - Test scripts archived on June 5, 2025
- **archive_log_2025-06-05_md_cleanup.md** - Documentation cleanup on June 5, 2025

#### Implementation Documentation

- **APPOINTMENT_WORKFLOW_IMPLEMENTATION.md** - Appointment workflow implementation
- **AVAILABILITY_FIX_SUMMARY.md** - Therapist availability filtering fixes
- **IMPLEMENTATION_STATUS.md** - Comprehensive status summary
- **MIGRATION_GUIDE.md** - Supabase database migration guide
- **NOTIFICATION_FEATURES_IMPLEMENTATION.md** - Enhanced notification system
- **NOTIFICATIONS_FIX_SUMMARY.md** - Operator dashboard notifications fixes
- **REJECTION_FIX_SUMMARY.md** - Therapist appointment rejection fixes
- **REVIEW_REJECTION_FIX.md** - Review rejection field mismatch fixes

### Migration History (`/migrations_history`)

- Contains archived migration files and migration-related scripts
- Preserved for historical reference and potential troubleshooting

## Usage

All test scripts now reference their correct paths within the archive structure. To run any test script, use the full path from the project root:

### JavaScript Tests

```bash
node archive/scripts/testing/test_frontend_sync.js
node archive/scripts/testing/validate_refresh_fix.js
```

### Python Tests

```bash
python archive/scripts/testing/test_auto_retry_login.py
python archive/scripts/testing/test_availability_manager_fixes.py
```

### Database Scripts

```bash
python archive/scripts/database/check_database_staff.py
python archive/scripts/database/debug_staff_data.py
```

### Notification Scripts

```bash
python archive/scripts/notification/create_test_notifications.py
python archive/scripts/notification/check_notifications.py
```

## Important Notes

1. **Organized Structure**: All test scripts, validation tools, and documentation are now properly organized by category and purpose.

2. **Updated References**: All documentation files have been updated to reference the correct paths for test scripts and validation tools.

3. **Preserved Functionality**: All scripts maintain their original functionality while being properly organized in the archive.

4. **Easy Access**: The organized structure makes it easy to find specific test scripts or documentation for any feature.

5. **Historical Reference**: This archive serves as a complete historical record of all implementations, fixes, and testing procedures.

## Maintenance

If you need to:

- **Run a specific test**: Use the full path as shown in the Usage section above
- **Reference implementation details**: Check the appropriate documentation file in `/docs` or `/documentation`
- **Access migration history**: Look in `/migrations_history` for historical migration files
- **Find utility scripts**: Check the appropriate subdirectory in `/scripts`
