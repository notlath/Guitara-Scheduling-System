#!/bin/bash

# =============================================
# GUITARA DOCKER MANAGEMENT SCRIPT
# =============================================

set -e

# Change to project root directory
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.yml"
DEV_COMPOSE_FILE="docker/docker-compose.dev.yml"
PROD_COMPOSE_FILE="docker/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_help() {
    echo -e "${BLUE}Guitara Docker Management Script${NC}"
    echo "================================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build     - Build Docker images"
    echo "  up        - Start all services"
    echo "  dev       - Start services in development mode (with volume mounts)"
    echo "  prod      - Start services in production mode"
    echo "  down      - Stop all services"
    echo "  logs      - Show logs for all services"
    echo "  shell     - Open Django shell in web container"
    echo "  migrate   - Run Django migrations"
    echo "  test      - Run Django tests"
    echo "  clean     - Clean up Docker images and volumes"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Start in development mode"
    echo "  $0 prod             # Start in production mode"
    echo "  $0 logs web         # Show logs for web service only"
    echo "  $0 shell            # Access Django shell"
}

case "$1" in
    build)
        echo -e "${YELLOW}Building Docker images...${NC}"
        docker-compose -f $COMPOSE_FILE build
        ;;
    up)
        echo -e "${GREEN}Starting Guitara services...${NC}"
        docker-compose -f $COMPOSE_FILE up -d
        echo -e "${GREEN}Services started. Access the application at http://localhost:8000${NC}"
        ;;
    dev)
        echo -e "${GREEN}Starting Guitara services in development mode...${NC}"
        docker-compose -f $COMPOSE_FILE -f $DEV_COMPOSE_FILE up -d
        echo -e "${GREEN}Development services started. Access the application at http://localhost:8000${NC}"
        ;;
    prod)
        echo -e "${GREEN}Starting Guitara services in production mode...${NC}"
        docker-compose -f $COMPOSE_FILE -f $PROD_COMPOSE_FILE up -d
        echo -e "${GREEN}Production services started. Access the application at http://localhost:8000${NC}"
        ;;
    down)
        echo -e "${YELLOW}Stopping Guitara services...${NC}"
        docker-compose -f $COMPOSE_FILE -f $DEV_COMPOSE_FILE -f $PROD_COMPOSE_FILE down
        ;;
    logs)
        if [ -n "$2" ]; then
            docker-compose -f $COMPOSE_FILE logs -f "$2"
        else
            docker-compose -f $COMPOSE_FILE logs -f
        fi
        ;;
    shell)
        echo -e "${BLUE}Opening Django shell...${NC}"
        docker-compose -f $COMPOSE_FILE exec web python manage.py shell
        ;;
    migrate)
        echo -e "${YELLOW}Running Django migrations...${NC}"
        docker-compose -f $COMPOSE_FILE exec web python manage.py migrate
        ;;
    test)
        echo -e "${YELLOW}Running Django tests...${NC}"
        docker-compose -f $COMPOSE_FILE exec web python manage.py test
        ;;
    clean)
        echo -e "${RED}Cleaning up Docker resources...${NC}"
        docker-compose -f $COMPOSE_FILE -f $DEV_COMPOSE_FILE -f $PROD_COMPOSE_FILE down --volumes --remove-orphans
        docker system prune -f
        ;;
    help|--help|-h)
        print_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_help
        exit 1
        ;;
esac
