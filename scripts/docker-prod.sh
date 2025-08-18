#!/bin/bash

# Docker Production Scripts
# Usage: ./scripts/docker-prod.sh [command]

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
    if [ ! -f .env.production ]; then
        print_error ".env.production file not found. Please create it with production values."
        exit 1
    fi
}

# Create Docker secrets
create_secrets() {
    print_header "Creating Docker Secrets"
    
    # Check if secrets already exist
    if docker secret ls | grep -q "mongodb_root_password"; then
        print_warning "Secrets already exist. Skipping creation."
        return
    fi
    
    # Create secrets from environment variables
    echo "$MONGO_ROOT_PASSWORD" | docker secret create mongodb_root_password -
    echo "$REDIS_PASSWORD" | docker secret create redis_password -
    echo "$JWT_SECRET" | docker secret create jwt_secret -
    echo "$NEXTAUTH_SECRET" | docker secret create nextauth_secret -
    
    print_status "Docker secrets created successfully!"
}

# Build production images
build() {
    print_header "Building Production Images"
    check_env
    docker-compose -f docker-compose.prod.yml build --no-cache
    print_status "Production images built successfully!"
}

# Deploy production environment
deploy() {
    print_header "Deploying Production Environment"
    check_env
    create_secrets
    
    # Load environment variables
    export $(cat .env.production | xargs)
    
    docker-compose -f docker-compose.prod.yml up -d
    print_status "Production environment deployed!"
    print_status "Application: http://localhost (via Nginx)"
    print_status "Direct access: http://localhost:3000"
}

# Stop production environment
down() {
    print_header "Stopping Production Environment"
    docker-compose -f docker-compose.prod.yml down
    print_status "Production environment stopped!"
}

# Update production deployment
update() {
    print_header "Updating Production Deployment"
    check_env
    
    # Pull latest changes and rebuild
    git pull origin main
    build
    
    # Rolling update
    docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-deps web
    
    print_status "Production deployment updated!"
}

# View logs
logs() {
    if [ -z "$2" ]; then
        docker-compose -f docker-compose.prod.yml logs -f --tail=100
    else
        docker-compose -f docker-compose.prod.yml logs -f --tail=100 "$2"
    fi
}

# Execute command in web container
exec_web() {
    docker-compose -f docker-compose.prod.yml exec web "$@"
}

# Backup database
backup() {
    print_header "Creating Database Backup"
    
    BACKUP_DIR="./backups"
    BACKUP_FILE="mongodb_backup_$(date +%Y%m%d_%H%M%S).gz"
    
    mkdir -p "$BACKUP_DIR"
    
    docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump --archive --gzip > "$BACKUP_DIR/$BACKUP_FILE"
    
    print_status "Database backup created: $BACKUP_DIR/$BACKUP_FILE"
}

# Restore database
restore() {
    if [ -z "$2" ]; then
        print_error "Please specify backup file: $0 restore <backup_file>"
        exit 1
    fi
    
    print_header "Restoring Database"
    print_warning "This will overwrite the current database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.prod.yml exec -T mongodb mongorestore --archive --gzip < "$2"
        print_status "Database restored successfully!"
    else
        print_status "Restore cancelled."
    fi
}

# Scale services
scale() {
    if [ -z "$2" ] || [ -z "$3" ]; then
        print_error "Usage: $0 scale <service> <replicas>"
        exit 1
    fi
    
    print_header "Scaling Service: $2 to $3 replicas"
    docker-compose -f docker-compose.prod.yml up -d --scale "$2=$3"
    print_status "Service scaled successfully!"
}

# Show status
status() {
    print_header "Production Environment Status"
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    print_header "Resource Usage"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Health check
health() {
    print_header "Health Check"
    echo "Checking application health..."
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        print_status "Application is healthy!"
        curl -s http://localhost/api/health | jq .
    else
        print_error "Application health check failed!"
    fi
}

# Monitor logs in real-time
monitor() {
    print_header "Monitoring Production Logs"
    docker-compose -f docker-compose.prod.yml logs -f --tail=50
}

# Clean up old images and containers
cleanup() {
    print_header "Cleaning Up Old Images and Containers"
    docker system prune -f
    docker image prune -f
    print_status "Cleanup completed!"
}

# Show help
help() {
    echo "Docker Production Scripts"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build      Build production images"
    echo "  deploy     Deploy production environment"
    echo "  down       Stop production environment"
    echo "  update     Update production deployment"
    echo "  logs       View logs (optionally specify service)"
    echo "  exec       Execute command in web container"
    echo "  backup     Create database backup"
    echo "  restore    Restore database from backup"
    echo "  scale      Scale service replicas"
    echo "  status     Show container status and resource usage"
    echo "  health     Check application health"
    echo "  monitor    Monitor logs in real-time"
    echo "  cleanup    Clean up old images and containers"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 logs web"
    echo "  $0 backup"
    echo "  $0 scale web 3"
    echo "  $0 restore ./backups/mongodb_backup_20231201_120000.gz"
}

# Main script logic
case "$1" in
    build)
        build
        ;;
    deploy)
        deploy
        ;;
    down)
        down
        ;;
    update)
        update
        ;;
    logs)
        logs "$@"
        ;;
    exec)
        shift
        exec_web "$@"
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$@"
        ;;
    scale)
        scale "$@"
        ;;
    status)
        status
        ;;
    health)
        health
        ;;
    monitor)
        monitor
        ;;
    cleanup)
        cleanup
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