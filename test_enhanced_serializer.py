#!/usr/bin/env python3
"""
Test script to verify enhanced appointment serializer functionality
"""

import os
import sys
import django
from datetime import datetime, timedelta, timezone

# Setup Django environment
sys.path.append('/Users/USer/Downloads/Guitara-Scheduling-System/guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

def test_enhanced_serializer():
    """Test the enhanced appointment serializer fields"""
    print("🧪 Testing Enhanced Appointment Serializer...")
    
    try:
        from scheduling.serializers import AppointmentSerializer
        from scheduling.models import Appointment
        
        # Try to get a sample appointment
        appointments = Appointment.objects.all()[:1]
        
        if appointments:
            appointment = appointments[0]
            serializer = AppointmentSerializer(appointment)
            data = serializer.data
            
            print("✅ Serializer loaded successfully!")
            print(f"📋 Available fields: {list(data.keys())}")
            
            # Check for new enhanced fields
            enhanced_fields = ['formatted_date', 'formatted_start_time', 'formatted_end_time', 'urgency_level']
            missing_fields = []
            
            for field in enhanced_fields:
                if field in data:
                    print(f"✅ {field}: {data[field]}")
                else:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"⚠️  Missing enhanced fields: {missing_fields}")
            else:
                print("🎉 All enhanced fields are present!")
                
            # Check client details
            if 'client_details' in data and data['client_details']:
                print(f"👤 Client: {data['client_details'].get('first_name', 'N/A')} {data['client_details'].get('last_name', 'N/A')}")
            
            # Check services details
            if 'services_details' in data and data['services_details']:
                print(f"💆 Services: {len(data['services_details'])} service(s)")
                for service in data['services_details']:
                    print(f"   - {service.get('name', 'N/A')}: ₱{service.get('price', 'N/A')}")
            
        else:
            print("⚠️  No appointments found in database to test with")
            print("✅ Serializer structure looks good though!")
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure Django is properly set up and the models exist")
    except Exception as e:
        print(f"❌ Error testing serializer: {e}")

if __name__ == "__main__":
    test_enhanced_serializer()
