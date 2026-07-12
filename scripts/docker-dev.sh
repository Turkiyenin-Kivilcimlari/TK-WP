#!/bin/bash

# Docker Development Scripts
# Usage: ./scripts/docker-dev.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status ".env file created. Please update it with your actual values."
        else
            print_error ".env.example file not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Build development images
build() {
    print_header "Building Development Images"
    check_env
    docker-compose -f docker-compose.dev.yml build --no-cache
    print_status "Development images built successfully!"
}

# Start development environment
up() {
    print_header "Starting Development Environment"
    check_env
    docker-compose -f docker-compose.dev.yml up -d
    print_status "Development environment started!"
    print_status "Application: http://localhost:3000"
    print_status "MongoDB Express: http://localhost:8081 (admin/admin123)"
    print_status "Redis Commander: http://localhost:8082"
}

# Stop development environment
down() {
    print_header "Stopping Development Environment"
    docker-compose -f docker-compose.dev.yml down
    print_status "Development environment stopped!"
}

# Restart development environment
restart() {
    print_header "Restarting Development Environment"
    down
    up
}

# View logs
logs() {
    if [ -z "$2" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose -f docker-compose.dev.yml logs -f "$2"
    fi
}

# Execute command in web container
exec_web() {
    docker-compose -f docker-compose.dev.yml exec web "$@"
}

# Clean up everything
clean() {
    print_header "Cleaning Up Development Environment"
    print_warning "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.dev.yml down -v --rmi all
        docker system prune -f
        print_status "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Show status
status() {
    print_header "Development Environment Status"
    docker-compose -f docker-compose.dev.yml ps
}

# Health check
health() {
    print_header "Health Check"
    echo "Checking application health..."
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Application is healthy!"
    else
        print_error "Application health check failed!"
    fi
}

# Show help
help() {
    echo "Docker Development Scripts"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build development images"
    echo "  up        Start development environment"
    echo "  down      Stop development environment"
    echo "  restart   Restart development environment"
    echo "  logs      View logs (optionally specify service)"
    echo "  exec      Execute command in web container"
    echo "  clean     Clean up everything (containers, volumes, images)"
    echo "  status    Show container status"
    echo "  health    Check application health"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up"
    echo "  $0 logs web"
    echo "  $0 exec npm install"
    echo "  $0 exec bash"
}

# Main script logic
case "$1" in
    build)
        build
        ;;
    up)
        up
        ;;
    down)
        down
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    exec)
        shift
        exec_web "$@"
        ;;
    clean)
        clean
        ;;
    status)
        status
        ;;
    health)
        health
        ;;
    help|--help|-h)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        help
        exit 1
        ;;
esac