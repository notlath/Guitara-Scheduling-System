# Performance Setup Script - Redis Optional Mode

## Overview

The `performance_setup.bat` script has been modified to support running the Guitara Scheduling System with or without Redis, making it more flexible for different development environments.

## Key Modifications

### 1. **Flexible Redis Detection**

- The script now detects Redis availability automatically
- If Redis is not available, it gracefully switches to in-memory mode
- No longer blocks setup when Redis is unavailable

### 2. **Dual Mode Support**

#### Redis Mode (Optimal Performance)

- Uses Redis for channel layers (WebSocket support)
- Uses Redis as Celery broker for background tasks
- Full real-time features enabled
- Better performance and scalability

#### In-Memory Mode (Fallback)

- Uses Django's in-memory channel layers
- Celery tasks run synchronously (no background processing)
- Suitable for development without Redis
- Limited real-time features

### 3. **Enhanced Menu Options**

The performance control panel now includes:

- **Option 1**: Auto-detect setup (recommended)
- **Option 11**: Force in-memory mode
- **Option 12**: Force Redis mode
- **Option 2**: Enhanced system health check with status display

### 4. **Configuration Management**

The script creates dynamic configuration files:

- `guitara/mode_config.py`: Runtime mode configuration
- `guitara/local_settings.py`: Settings override handler
- Automatic mode switching without manual settings changes

### 5. **Improved Error Handling**

- Better feedback on Redis availability
- Graceful degradation when services are unavailable
- Clear status indicators for each component

## Usage Instructions

### Quick Start (Recommended)

```cmd
performance_setup.bat
# Select Option 1 for auto-setup
```

### Force Specific Mode

```cmd
# Force in-memory mode (no Redis required)
performance_setup.bat
# Select Option 11

# Force Redis mode (requires Redis server)
performance_setup.bat
# Select Option 12
```

### Check System Status

```cmd
performance_setup.bat
# Select Option 2 for health check
```

## Requirements by Mode

### Redis Mode Requirements

- Redis server running on localhost:6379
- All Python packages from requirements.txt
- PostgreSQL database connection

### In-Memory Mode Requirements

- PostgreSQL database connection
- Python packages (Redis packages still needed for dependencies)
- No Redis server required

## Limitations in In-Memory Mode

1. **WebSocket Performance**: Limited to single process
2. **Background Tasks**: Run synchronously (blocking)
3. **Scalability**: Not suitable for production
4. **Real-time Features**: May have reduced performance

## Switching Between Modes

You can switch between modes at any time:

1. Run the performance script
2. Select Option 11 (In-Memory) or Option 12 (Redis)
3. Restart the Django application for changes to take effect

## Configuration Files Created

- `performance_monitor.py`: System monitoring script
- `load_test.py`: Performance testing script
- `guitara/mode_config.py`: Current mode configuration
- `guitara/local_settings.py`: Settings override handler

## Troubleshooting

### Redis Not Available

- Script automatically switches to in-memory mode
- Background tasks will run synchronously
- WebSocket features may be limited

### Database Connection Issues

- Check .env file configuration
- Verify PostgreSQL server is running
- Run Option 2 to diagnose connection problems

### Performance Issues in In-Memory Mode

- Install and start Redis server
- Use Option 12 to switch to Redis mode
- Restart the application

## Best Practices

1. **Development**: Use in-memory mode for simple testing
2. **Testing**: Use Redis mode for realistic performance testing
3. **Production**: Always use Redis mode
4. **Monitoring**: Use the performance monitor script to track system health

This flexible setup ensures the Guitara Scheduling System can run in various environments while maintaining optimal performance when full infrastructure is available.
