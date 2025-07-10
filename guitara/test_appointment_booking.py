#!/usr/bin/env python3
"""
Test script to verify appointment booking with materials creates proper logs
"""

import os
import sys
import django
from django.test import RequestFactory
from django.contrib.auth import get_user_model
import json
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from scheduling.models import Client, Appointment, AppointmentMaterial
from scheduling.views import AppointmentViewSet
from inventory.models import InventoryItem
from core.models import SystemLog
from registration.models import Service
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

def clean_test_data():
    """Clean up any existing test data"""
    print("🧹 Cleaning up test data...")
    
    # Delete test appointments and related logs
    test_appointments = Appointment.objects.filter(client__first_name="TestClient")
    print(f"  Deleting {test_appointments.count()} test appointments...")
    test_appointments.delete()
    
    # Delete test logs
    test_logs = SystemLog.objects.filter(description__icontains="TestClient")
    print(f"  Deleting {test_logs.count()} test logs...")
    test_logs.delete()
    
    print("✅ Test data cleaned up")

def test_appointment_booking():
    """Test appointment booking with materials and verify logs are created"""
    
    print("🚀 Starting appointment booking test...")
    
    # Get or create test user (operator)
    operator, created = User.objects.get_or_create(
        username='test_operator',
        defaults={
            'email': 'test@example.com',
            'role': 'operator',
            'first_name': 'Test',
            'last_name': 'Operator'
        }
    )
    print(f"📝 Using operator: {operator.username} (ID: {operator.id})")
    
    # Get or create test client
    client, created = Client.objects.get_or_create(
        first_name="TestClient",
        defaults={
            'last_name': 'TestLast',
            'phone_number': '+63912345678',
            'address': 'Test Address',
            'email': 'testclient@example.com'
        }
    )
    print(f"👤 Using client: {client.first_name} {client.last_name} (ID: {client.id})")
    
    # Get or create test service
    service, created = Service.objects.get_or_create(
        name='Test Service',
        defaults={
            'description': 'Test service for appointment booking',
            'duration': 60,
            'price': 100.0
        }
    )
    print(f"🛠️ Using service: {service.name} (ID: {service.id})")
    
    # Get or create test inventory items
    item1, created = InventoryItem.objects.get_or_create(
        name='Test Material 1',
        defaults={
            'category': 'consumable',
            'current_stock': 50,
            'min_stock': 10,
            'unit': 'pieces',
            'cost_per_unit': 5.00
        }
    )
    
    item2, created = InventoryItem.objects.get_or_create(
        name='Test Material 2', 
        defaults={
            'category': 'consumable',
            'current_stock': 30,
            'min_stock': 5,
            'unit': 'ml',
            'cost_per_unit': 2.50
        }
    )
    
    print(f"📦 Using inventory items:")
    print(f"  - {item1.name} (ID: {item1.id}, stock: {item1.current_stock})")
    print(f"  - {item2.name} (ID: {item2.id}, stock: {item2.current_stock})")
    
    # Prepare appointment data with materials
    appointment_date = datetime.now() + timedelta(days=1)
    appointment_data = {
        'client': client.id,
        'services': [service.id],
        'date': appointment_date.strftime('%Y-%m-%d'),
        'start_time': '14:00',
        'end_time': '15:00',
        'location': 'Test Location',
        'materials': [
            {
                'item_id': item1.id,
                'item_name': item1.name,
                'quantity_used': 2,
                'usage_type': 'consumable',
                'is_reusable': False
            },
            {
                'item_id': item2.id,
                'item_name': item2.name,
                'quantity_used': 5,
                'usage_type': 'consumable',
                'is_reusable': False
            }
        ]
    }
    
    print(f"📋 Appointment data prepared:")
    print(f"  Date: {appointment_data['date']} {appointment_data['start_time']}-{appointment_data['end_time']}")
    print(f"  Materials: {len(appointment_data['materials'])} items")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.post('/api/appointments/', 
                          data=json.dumps(appointment_data),
                          content_type='application/json')
    request.user = operator
    request.data = appointment_data
    
    # Count logs before appointment creation
    logs_before = SystemLog.objects.count()
    print(f"📊 System logs before: {logs_before}")
    
    # Create appointment using viewset
    try:
        from scheduling.serializers import AppointmentSerializer
        
        viewset = AppointmentViewSet()
        viewset.request = request
        
        # Create serializer with appointment data (excluding materials for serializer)
        serializer_data = appointment_data.copy()
        del serializer_data['materials']  # Remove materials from serializer data
        
        serializer = AppointmentSerializer(data=serializer_data)
        if serializer.is_valid():
            print("✅ Serializer is valid")
            viewset.perform_create(serializer)
            
            # Get the created appointment
            appointment = serializer.instance
            print(f"✅ Appointment created successfully (ID: {appointment.id})")
            
            # Check appointment materials were created
            materials_created = AppointmentMaterial.objects.filter(appointment=appointment)
            print(f"📦 AppointmentMaterials created: {materials_created.count()}")
            for mat in materials_created:
                print(f"  - {mat.inventory_item.name}: {mat.quantity_used} {mat.inventory_item.unit}")
            
            # Check system logs were created
            logs_after = SystemLog.objects.count()
            new_logs = logs_after - logs_before
            print(f"📊 System logs after: {logs_after} (new: {new_logs})")
            
            # Check specific logs
            appointment_logs = SystemLog.objects.filter(
                log_type='appointment',
                description__icontains=f'TestClient'
            ).order_by('-timestamp')
            
            inventory_logs = SystemLog.objects.filter(
                log_type='inventory',
                description__icontains='TestClient'
            ).order_by('-timestamp')
            
            print(f"🗓️ Appointment logs found: {appointment_logs.count()}")
            for log in appointment_logs[:3]:  # Show first 3
                print(f"  - {log.description}")
                
            print(f"📦 Inventory logs found: {inventory_logs.count()}")
            for log in inventory_logs[:3]:  # Show first 3
                print(f"  - {log.description}")
                
            # Verify inventory stock was moved
            item1.refresh_from_db()
            item2.refresh_from_db()
            print(f"📊 Inventory after booking:")
            print(f"  - {item1.name}: stock={item1.current_stock}, in_use={item1.in_use}")
            print(f"  - {item2.name}: stock={item2.current_stock}, in_use={item2.in_use}")
            
            return True
            
        else:
            print(f"❌ Serializer errors: {serializer.errors}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating appointment: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def main():
    print("=== APPOINTMENT BOOKING WITH MATERIALS TEST ===")
    
    # Clean up first
    clean_test_data()
    
    # Run the test
    success = test_appointment_booking()
    
    if success:
        print("\n✅ TEST PASSED: Appointment booking with materials and logging works!")
    else:
        print("\n❌ TEST FAILED: Issues with appointment booking or logging")
    
    print("\n=== TEST COMPLETE ===")

if __name__ == '__main__':
    main()
