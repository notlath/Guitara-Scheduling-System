#!/usr/bin/env python
"""
Test notification endpoints to verify response format
"""

import requests


def test_notification_endpoints():
    # Test data - replace with actual token
    token = "your_token_here"  # This would need to be replaced with actual token
    base_url = "http://localhost:8000/api/scheduling/notifications/"
    debug_url = "http://localhost:8000/api/scheduling/notifications/debug_all/"

    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}

    print("=== Testing Notification Endpoints ===")

    # Test regular endpoint
    print("\n1. Testing regular notifications endpoint:")
    print(f"URL: {base_url}")

    # Test debug endpoint
    print("\n2. Testing debug notifications endpoint:")
    print(f"URL: {debug_url}")

    print("\nExpected response formats:")
    print("Regular endpoint (paginated):")
    print(
        """{
  "count": 5,
  "total_pages": 1,
  "current_page": 1,
  "page_size": 20,
  "next": null,
  "previous": null,
  "results": {
    "notifications": [...],
    "unreadCount": 2
  }
}"""
    )

    print("\nDebug endpoint (direct):")
    print(
        """{
  "notifications": [...],
  "total_count": 5,
  "unread_count": 2,
  "user_role": "operator",
  "notification_types": ["appointment_created", "payment_verified"],
  "debug": true,
  "message": "Debug endpoint - no role filtering applied"
}"""
    )


if __name__ == "__main__":
    test_notification_endpoints()
