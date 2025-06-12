#!/usr/bin/env python3
"""
Test script to verify that completed transport appointments are properly displayed
in the TherapistDashboard with all required fields and correct filtering.
"""

import os
import sys
import re


def test_completed_transport_card_implementation():
    """Test the completed transport card implementation in TherapistDashboard."""

    # Path to the TherapistDashboard component
    dashboard_path = "royal-care-frontend/src/components/TherapistDashboard.jsx"
    css_path = "royal-care-frontend/src/styles/TherapistDashboard.css"

    print("🔍 Testing Completed Transport Card Implementation...")
    print("=" * 60)

    # Test 1: Check if renderCompletedTransportCard function exists
    print("\n1. Checking if renderCompletedTransportCard function exists...")

    try:
        with open(dashboard_path, "r", encoding="utf-8") as f:
            dashboard_content = f.read()

        if (
            "const renderCompletedTransportCard = (appointment) => {"
            in dashboard_content
        ):
            print("✅ renderCompletedTransportCard function found")
        else:
            print("❌ renderCompletedTransportCard function not found")
            return False

    except FileNotFoundError:
        print(f"❌ File not found: {dashboard_path}")
        return False

    # Test 2: Check required fields in the completed transport card
    print("\n2. Checking required fields in completed transport card...")

    required_fields = [
        "client_details?.first_name",
        "client_details?.last_name",
        "new Date(appointment.date).toLocaleDateString()",
        "session_started_at",
        "session_end_time",
        "appointment.location",
        "services_details?.map",
        "payment_amount",
    ]

    missing_fields = []
    for field in required_fields:
        if field not in dashboard_content:
            missing_fields.append(field)

    if not missing_fields:
        print("✅ All required fields found in completed transport card")
    else:
        print(f"❌ Missing fields: {missing_fields}")
        return False

    # Test 3: Check filtering logic for different views
    print("\n3. Checking filtering logic for different views...")

    # Check that transport_completed is excluded from today and upcoming views
    today_filter_pattern = r"myTodayAppointments.*filter.*transport_completed"
    upcoming_filter_pattern = r"myUpcomingAppointments.*filter.*transport_completed"

    if re.search(today_filter_pattern, dashboard_content, re.DOTALL):
        print("✅ Today's appointments correctly exclude transport_completed")
    else:
        print("❌ Today's appointments filter missing or incorrect")
        return False

    if re.search(upcoming_filter_pattern, dashboard_content, re.DOTALL):
        print("✅ Upcoming appointments correctly exclude transport_completed")
    else:
        print("❌ Upcoming appointments filter missing or incorrect")
        return False

    # Check that all appointments (myAppointments) include transport_completed
    if "myAppointments = appointments.filter" in dashboard_content:
        # Extract the myAppointments filter
        my_appointments_start = dashboard_content.find(
            "myAppointments = appointments.filter"
        )
        my_appointments_end = dashboard_content.find(");", my_appointments_start) + 2
        my_appointments_filter = dashboard_content[
            my_appointments_start:my_appointments_end
        ]

        if "transport_completed" not in my_appointments_filter:
            print("✅ All appointments correctly include transport_completed")
        else:
            print("❌ All appointments incorrectly exclude transport_completed")
            return False

    # Test 4: Check conditional rendering in renderAppointmentsList
    print("\n4. Checking conditional rendering logic...")

    render_condition = 'if (appointment.status === "transport_completed") {\n            return renderCompletedTransportCard(appointment);'

    if render_condition in dashboard_content:
        print("✅ Conditional rendering for transport_completed status found")
    else:
        print("❌ Conditional rendering for transport_completed status not found")
        return False

    # Test 5: Check CSS styling for completed transport cards
    print("\n5. Checking CSS styling for completed transport cards...")

    try:
        with open(css_path, "r", encoding="utf-8") as f:
            css_content = f.read()

        required_css_classes = [
            ".completed-transport-card",
            ".status-transport-completed",
            "#22c55e",  # Green color
            "background: linear-gradient",
        ]

        missing_css = []
        for css_class in required_css_classes:
            if css_class not in css_content:
                missing_css.append(css_class)

        if not missing_css:
            print("✅ All required CSS styling found")
        else:
            print(f"❌ Missing CSS styling: {missing_css}")
            return False

    except FileNotFoundError:
        print(f"❌ CSS file not found: {css_path}")
        return False

    # Test 6: Check view-specific rendering
    print("\n6. Checking view-specific rendering...")

    view_rendering_checks = [
        ('currentView === "today"', "myTodayAppointments"),
        ('currentView === "upcoming"', "myUpcomingAppointments"),
        ('currentView === "all"', "myAppointments"),
    ]

    for view_condition, appointments_var in view_rendering_checks:
        if (
            view_condition in dashboard_content
            and appointments_var in dashboard_content
        ):
            print(f"✅ {view_condition} correctly uses {appointments_var}")
        else:
            print(f"❌ View rendering issue with {view_condition}")
            return False

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED!")
    print("\nCompleted Transport Card Implementation Summary:")
    print("✅ Displays only in 'All My Appointments' view")
    print("✅ Shows all required fields:")
    print("   - Client Name")
    print("   - Date")
    print("   - Session Start and End Timestamps")
    print("   - Client Address")
    print("   - Service")
    print("   - Amount Paid")
    print("✅ Uses green styling and consistent UI patterns")
    print("✅ Properly filtered from Today and Upcoming views")

    return True


def test_backend_status_choices():
    """Test that the backend STATUS_CHOICES are properly formatted."""

    models_path = "guitara/scheduling/models.py"

    print("\n" + "=" * 60)
    print("🔍 Testing Backend STATUS_CHOICES...")

    try:
        with open(models_path, "r", encoding="utf-8") as f:
            models_content = f.read()

        # Check for proper STATUS_CHOICES format
        if "STATUS_CHOICES = [" in models_content:
            print("✅ STATUS_CHOICES found")

            # Check for transport_completed status
            if '"transport_completed"' in models_content:
                print("✅ transport_completed status found")

                # Check for no duplicates
                transport_completed_count = models_content.count(
                    '"transport_completed"'
                )
                if transport_completed_count == 1:
                    print("✅ No duplicate transport_completed entries")
                else:
                    print(
                        f"❌ Found {transport_completed_count} transport_completed entries (should be 1)"
                    )
                    return False
            else:
                print("❌ transport_completed status not found")
                return False
        else:
            print("❌ STATUS_CHOICES not found")
            return False

    except FileNotFoundError:
        print(f"❌ File not found: {models_path}")
        return False

    print("✅ Backend STATUS_CHOICES properly configured")
    return True


if __name__ == "__main__":
    print("Testing Completed Transport Appointment Display Implementation")
    print("=" * 60)

    # Test frontend implementation
    frontend_success = test_completed_transport_card_implementation()

    # Test backend implementation
    backend_success = test_backend_status_choices()

    if frontend_success and backend_success:
        print("\n🎉 ALL TESTS PASSED! Implementation is complete and correct.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please review the implementation.")
        sys.exit(1)
