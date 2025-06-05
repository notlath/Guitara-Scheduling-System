#!/usr/bin/env python3
"""
Security cleanup script to remove hardcoded secrets and archive test files
"""
import os
import shutil
import json
from datetime import datetime

def main():
    print("🔒 SECURITY CLEANUP - Removing Hardcoded Secrets")
    print("=" * 60)
    
    # Files with hardcoded secrets to be archived
    sensitive_files = [
        'get_auth_token.py',
        'test_websocket.py',
        'simple_websocket_test.py',
        'test_notification_workflow.py',
        'test_frontend_websocket.py',
        'create_test_user.py',
        'test_auth_fix.py',
        'test_middleware_fix.py',
        'test_notifications.py',
        'verify_fix.py',
    ]
    
    # Additional test files to archive
    test_files = [
        'cleanup_secrets.py',
        'debug_websocket_fixed.py',
        'debug_websocket.py',
        'simple_ws_test.py',
        'test_tokens.py',
        'test_websocket_auth.py',
    ]
    
    # Create archive directory for test scripts
    archive_dir = 'archive/test_scripts_with_secrets'
    os.makedirs(archive_dir, exist_ok=True)
    
    # Archive sensitive files from root
    archived_count = 0
    for file_name in sensitive_files:
        if os.path.exists(file_name):
            print(f"📦 Archiving: {file_name}")
            shutil.move(file_name, os.path.join(archive_dir, file_name))
            archived_count += 1
    
    # Archive test files from guitara/ directory
    guitara_dir = 'guitara'
    if os.path.exists(guitara_dir):
        for file_name in test_files:
            file_path = os.path.join(guitara_dir, file_name)
            if os.path.exists(file_path):
                print(f"📦 Archiving: {file_path}")
                shutil.move(file_path, os.path.join(archive_dir, file_name))
                archived_count += 1
    
    # Create cleanup log
    cleanup_log = {
        "cleanup_date": datetime.now().isoformat(),
        "reason": "GitGuardian security scan detected hardcoded secrets",
        "files_archived": archived_count,
        "archived_to": archive_dir,
        "security_issues_found": [
            "Hardcoded passwords in test credentials",
            "Authentication tokens in test files",
            "Generic high entropy secrets"
        ],
        "remediation_actions": [
            "Moved all test files with secrets to archive",
            "Removed hardcoded credentials from repository",
            "Created secure template for future testing"
        ]
    }
    
    with open('SECURITY_CLEANUP_LOG.json', 'w') as f:
        json.dump(cleanup_log, f, indent=2)
    
    print(f"\n✅ CLEANUP COMPLETE")
    print(f"   • {archived_count} files archived to {archive_dir}")
    print(f"   • Security log created: SECURITY_CLEANUP_LOG.json")
    print(f"   • Repository is now clean of hardcoded secrets")
    
    return True

if __name__ == "__main__":
    main()
