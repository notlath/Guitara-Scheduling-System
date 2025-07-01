# Docker Configuration

This folder contains advanced Docker configurations and helper scripts for the Guitara Scheduling System.

## System Requirements

- **Docker**: Latest version
- **Python**: 3.12.8
- **Django**: 5.1.4
- **React**: 19.1.0
- **PostgreSQL**: 15.8 (Alpine)
- **Redis**: 7 (Alpine)
- **Node.js**: 18+ for frontend builds

## File Structure

```
docker/
├── docker-compose.prod.yml     # Production Docker Compose configuration
├── docker-compose.dev.yml      # Development override configuration
├── docker-manage.sh            # Docker management script (Linux/Mac)
├── docker-manage.bat           # Docker management script (Windows)
├── setup-docker.sh             # Docker setup script (Linux/Mac)
├── setup-docker.bat            # Docker setup script (Windows)
└── README.md                   # This file
```

## Main Files (in project root)

- `Dockerfile` - Main application container definition
- `docker-compose.yml` - Base Docker Compose configuration with PostgreSQL 15.8
- `.dockerignore` - Docker build context exclusions

## Usage

### Development Mode

```bash
# Linux/Mac
./docker/docker-manage.sh dev

# Windows
docker\docker-manage.bat dev

# Or manually:
docker-compose -f docker-compose.yml -f docker/docker-compose.dev.yml up
```

### Production Mode

```bash
# Linux/Mac
./docker/docker-manage.sh up

# Windows
docker\docker-manage.bat up

# Or with production config:
docker-compose -f docker-compose.yml -f docker/docker-compose.prod.yml up
```

### Setup

```bash
# Linux/Mac
./docker/setup-docker.sh

# Windows
docker\setup-docker.bat
```

## Environment Variables

Make sure to configure your `.env` file in the project root with:

- Database credentials (Supabase or local PostgreSQL)
- Email configuration
- Secret keys
- Other environment-specific settings

## Development Features

The development configuration includes:

- Hot reload with volume mounts
- Debug mode enabled
- Django development server instead of Daphne
- Detailed logging

## Production Features

The production configuration includes:

- Optimized for performance
- Uses Daphne ASGI server
- Static file serving
- Health checks
- Resource limits
- Proper logging configuration
