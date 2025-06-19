#!/bin/bash

# Performance Monitoring and Optimization Script for Guitara Scheduling System
# This script sets up and monitors the optimized real-time application

echo "🚀 Starting Guitara Performance Optimization Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Redis is running
check_redis() {
    print_info "Checking Redis connection..."
    if redis-cli ping > /dev/null 2>&1; then
        print_status "Redis is running"
        return 0
    else
        print_error "Redis is not running. Please start Redis server."
        print_info "On Windows: Start Redis service or run redis-server.exe"
        print_info "On Linux/Mac: sudo systemctl start redis or brew services start redis"
        return 1
    fi
}

# Check database connection
check_database() {
    print_info "Checking database connection..."
    cd guitara
    if python manage.py check --database default > /dev/null 2>&1; then
        print_status "Database connection OK"
        return 0
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Run database optimizations
optimize_database() {
    print_info "Applying database optimizations..."
    cd guitara
    
    # Apply indexes
    print_info "Creating performance indexes..."
    python manage.py shell << EOF
from django.db import connection
from scheduling.models import Appointment, Availability, Notification

# Create indexes if they don't exist
with connection.cursor() as cursor:
    try:
        # Appointment indexes
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_status_date ON scheduling_appointment(status, date);")
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_therapist_date_status ON scheduling_appointment(therapist_id, date, status);")
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_driver_date_status ON scheduling_appointment(driver_id, date, status);")
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_start_time ON scheduling_appointment(date, start_time);")
        
        # Availability indexes
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_user_date_time ON scheduling_availability(user_id, date, start_time, end_time);")
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_user_date_available ON scheduling_availability(user_id, date, is_available) WHERE is_available = true;")
        
        # Notification indexes
        cursor.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON scheduling_notification(user_id, is_read, created_at) WHERE is_read = false;")
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Error creating indexes: {e}")
EOF
    
    print_status "Database optimization completed"
}

# Start Celery workers
start_celery() {
    print_info "Starting Celery workers..."
    cd guitara
    
    # Start Celery worker in background
    celery -A guitara worker --loglevel=info --concurrency=4 --detach --pidfile=celery_worker.pid --logfile=celery_worker.log
    
    # Start Celery beat scheduler in background
    celery -A guitara beat --loglevel=info --detach --pidfile=celery_beat.pid --logfile=celery_beat.log
    
    if [ -f celery_worker.pid ] && [ -f celery_beat.pid ]; then
        print_status "Celery workers started successfully"
        return 0
    else
        print_error "Failed to start Celery workers"
        return 1
    fi
}

# Start development server with optimizations
start_server() {
    print_info "Starting optimized Django server..."
    cd guitara
    
    # Set optimization environment variables
    export DJANGO_DEBUG=False
    export PYTHONOPTIMIZE=1
    
    # Start server with Uvicorn for better WebSocket performance
    if command -v uvicorn > /dev/null; then
        print_status "Starting with Uvicorn (recommended for WebSocket performance)"
        uvicorn guitara.asgi:application --host 0.0.0.0 --port 8000 --workers 4 --reload &
        SERVER_PID=$!
    else
        print_warning "Uvicorn not found, using Django development server"
        python manage.py runserver 0.0.0.0:8000 &
        SERVER_PID=$!
    fi
    
    echo $SERVER_PID > django_server.pid
    print_status "Django server started (PID: $SERVER_PID)"
}

# Monitor system performance
monitor_performance() {
    print_info "Setting up performance monitoring..."
    
    # Create monitoring script
    cat > performance_monitor.py << 'EOF'
#!/usr/bin/env python3
import time
import psutil
import requests
import json
from datetime import datetime

def check_system_health():
    """Check system resource usage"""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        'cpu_percent': cpu_percent,
        'memory_percent': memory.percent,
        'memory_available_mb': memory.available // 1024 // 1024,
        'disk_percent': disk.percent,
        'timestamp': datetime.now().isoformat()
    }

def check_app_health():
    """Check application health"""
    try:
        response = requests.get('http://localhost:8000/health/', timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            return {'status': 'unhealthy', 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'status': 'unreachable', 'error': str(e)}

def main():
    print("🔍 Performance Monitor Started")
    print("=" * 50)
    
    while True:
        try:
            # System metrics
            system_health = check_system_health()
            app_health = check_app_health()
            
            # Display metrics
            print(f"\n[{system_health['timestamp']}]")
            print(f"CPU: {system_health['cpu_percent']:.1f}%")
            print(f"Memory: {system_health['memory_percent']:.1f}% ({system_health['memory_available_mb']}MB available)")
            print(f"Disk: {system_health['disk_percent']:.1f}%")
            
            if app_health.get('status') == 'healthy':
                perf = app_health.get('performance', {})
                print(f"App Status: ✅ Healthy")
                print(f"Avg Response Time: {perf.get('avg_response_time', 'N/A')}s")
                print(f"Request Count: {perf.get('request_count', 'N/A')}")
                print(f"Cache Hit Rate: {perf.get('cache_hit_rate', 'N/A')}%")
            else:
                print(f"App Status: ❌ {app_health.get('status', 'Unknown')}")
                if 'error' in app_health:
                    print(f"Error: {app_health['error']}")
            
            # Warnings
            if system_health['cpu_percent'] > 80:
                print("⚠️  High CPU usage detected!")
            if system_health['memory_percent'] > 80:
                print("⚠️  High memory usage detected!")
            
            time.sleep(30)  # Check every 30 seconds
            
        except KeyboardInterrupt:
            print("\n👋 Performance monitoring stopped")
            break
        except Exception as e:
            print(f"❌ Monitoring error: {e}")
            time.sleep(10)

if __name__ == '__main__':
    main()
EOF
    
    chmod +x performance_monitor.py
    print_status "Performance monitor created (run with: python performance_monitor.py)"
}

# Load test script
create_load_test() {
    print_info "Creating load test script..."
    
    cat > load_test.py << 'EOF'
#!/usr/bin/env python3
import asyncio
import aiohttp
import time
import json
from datetime import datetime

async def test_endpoint(session, url, method='GET', data=None):
    """Test a single endpoint"""
    start_time = time.time()
    try:
        if method == 'GET':
            async with session.get(url) as response:
                result = await response.json()
                return {
                    'url': url,
                    'status': response.status,
                    'response_time': time.time() - start_time,
                    'success': response.status == 200
                }
        elif method == 'POST':
            async with session.post(url, json=data) as response:
                result = await response.json()
                return {
                    'url': url,
                    'status': response.status,
                    'response_time': time.time() - start_time,
                    'success': response.status in [200, 201]
                }
    except Exception as e:
        return {
            'url': url,
            'status': 0,
            'response_time': time.time() - start_time,
            'success': False,
            'error': str(e)
        }

async def load_test():
    """Run load test on key endpoints"""
    print("🧪 Starting Load Test...")
    
    endpoints = [
        {'url': 'http://localhost:8000/api/appointments/today/', 'method': 'GET'},
        {'url': 'http://localhost:8000/api/appointments/upcoming/', 'method': 'GET'},
        {'url': 'http://localhost:8000/api/availability/by_date/?date=2025-06-19', 'method': 'GET'},
        {'url': 'http://localhost:8000/health/', 'method': 'GET'},
    ]
    
    # Test with increasing concurrent requests
    concurrent_levels = [1, 5, 10, 20, 50]
    
    async with aiohttp.ClientSession() as session:
        for concurrent in concurrent_levels:
            print(f"\n📊 Testing with {concurrent} concurrent requests...")
            
            # Create tasks for concurrent requests
            tasks = []
            for _ in range(concurrent):
                for endpoint in endpoints:
                    task = test_endpoint(session, endpoint['url'], endpoint['method'])
                    tasks.append(task)
            
            # Execute all tasks concurrently
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            # Analyze results
            successful = sum(1 for r in results if isinstance(r, dict) and r['success'])
            failed = len(results) - successful
            avg_response_time = sum(r['response_time'] for r in results if isinstance(r, dict)) / len(results)
            
            print(f"Total Requests: {len(results)}")
            print(f"Successful: {successful}")
            print(f"Failed: {failed}")
            print(f"Success Rate: {successful/len(results)*100:.1f}%")
            print(f"Average Response Time: {avg_response_time:.3f}s")
            print(f"Total Test Time: {total_time:.3f}s")
            print(f"Requests/Second: {len(results)/total_time:.1f}")
            
            # Wait between tests
            await asyncio.sleep(2)

if __name__ == '__main__':
    asyncio.run(load_test())
EOF
    
    chmod +x load_test.py
    print_status "Load test script created (run with: python load_test.py)"
}

# Stop all services
stop_services() {
    print_info "Stopping services..."
    
    cd guitara
    
    # Stop Django server
    if [ -f django_server.pid ]; then
        SERVER_PID=$(cat django_server.pid)
        if kill -0 $SERVER_PID > /dev/null 2>&1; then
            kill $SERVER_PID
            rm django_server.pid
            print_status "Django server stopped"
        fi
    fi
    
    # Stop Celery workers
    if [ -f celery_worker.pid ]; then
        celery -A guitara control shutdown --destination=celery@$(hostname)
        rm -f celery_worker.pid celery_beat.pid
        print_status "Celery workers stopped"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "🎛️  Guitara Performance Control Panel"
    echo "=================================="
    echo "1. Full Setup (Redis + DB + Celery + Server)"
    echo "2. Check System Health"
    echo "3. Optimize Database"
    echo "4. Start Celery Workers"
    echo "5. Start Django Server"
    echo "6. Monitor Performance"
    echo "7. Run Load Test"
    echo "8. Stop All Services"
    echo "9. View Logs"
    echo "0. Exit"
    echo ""
    read -p "Select option (0-9): " choice
}

# View logs
view_logs() {
    echo "📋 Available logs:"
    echo "1. Django Server"
    echo "2. Celery Worker"
    echo "3. Celery Beat"
    echo "4. System Performance"
    echo ""
    read -p "Select log to view (1-4): " log_choice
    
    case $log_choice in
        1) tail -f guitara/django_server.log 2>/dev/null || echo "No Django server log found" ;;
        2) tail -f guitara/celery_worker.log 2>/dev/null || echo "No Celery worker log found" ;;
        3) tail -f guitara/celery_beat.log 2>/dev/null || echo "No Celery beat log found" ;;
        4) tail -f guitara/debug.log 2>/dev/null || echo "No performance log found" ;;
        *) print_error "Invalid choice" ;;
    esac
}

# Handle command line arguments
case "${1:-menu}" in
    "setup")
        check_redis && check_database && optimize_database && start_celery && start_server
        ;;
    "monitor")
        python performance_monitor.py
        ;;
    "test")
        python load_test.py
        ;;
    "stop")
        stop_services
        ;;
    "menu"|*)
        while true; do
            show_menu
            case $choice in
                1)
                    if check_redis && check_database; then
                        optimize_database
                        start_celery
                        start_server
                        monitor_performance
                        create_load_test
                        print_status "Full setup completed!"
                        print_info "Run 'python performance_monitor.py' to start monitoring"
                    fi
                    ;;
                2)
                    check_redis
                    check_database
                    ;;
                3)
                    optimize_database
                    ;;
                4)
                    start_celery
                    ;;
                5)
                    start_server
                    ;;
                6)
                    monitor_performance
                    python performance_monitor.py
                    ;;
                7)
                    create_load_test
                    python load_test.py
                    ;;
                8)
                    stop_services
                    ;;
                9)
                    view_logs
                    ;;
                0)
                    print_info "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    ;;
            esac
            echo ""
            read -p "Press Enter to continue..."
        done
        ;;
esac
