#!/bin/bash

# =============================================
# GUITARA DOCKER SETUP SCRIPT
# =============================================

set -e

# Change to project root directory
cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🐳 Guitara Scheduling System - Docker Setup${NC}"
echo "=================================================="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual values before running the application${NC}"
    echo
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Make scripts executable (Linux/Mac only)
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    chmod +x docker/docker-manage.sh
    chmod +x docker/setup-docker.sh
    echo -e "${GREEN}✅ Made scripts executable${NC}"
fi

echo
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "1. Edit .env file with your database and email configuration"
echo "2. Run the application:"
echo "   ${YELLOW}# For development (with hot reload):${NC}"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "   docker\\docker-manage.bat dev"
else
    echo "   ./docker/docker-manage.sh dev"
fi
echo
echo "   ${YELLOW}# For production:${NC}"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "   docker\\docker-manage.bat prod"
else
    echo "   ./docker/docker-manage.sh prod"
fi
echo
echo "3. Access your application at: http://localhost:8000"
echo
echo -e "${GREEN}🎉 Setup complete!${NC}"
