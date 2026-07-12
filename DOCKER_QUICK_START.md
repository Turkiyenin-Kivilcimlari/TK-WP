# Docker Quick Start Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 4GB+ RAM available

## Quick Setup

### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Development Environment

```bash
# Start development environment
./scripts/docker-dev.sh up

# View logs
./scripts/docker-dev.sh logs

# Check health
./scripts/docker-dev.sh health
```

**Access Points:**
- Application: http://localhost:3000
- MongoDB Express: http://localhost:8081 (admin/admin123)
- Redis Commander: http://localhost:8082

### 3. Production Environment

```bash
# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production

# Deploy production
./scripts/docker-prod.sh deploy

# Check status
./scripts/docker-prod.sh status
```

**Access Points:**
- Application: http://localhost (via Nginx)
- Direct access: http://localhost:3000
- Monitoring: http://localhost:9090 (if enabled)

## Common Commands

### Development
```bash
# Build images
./scripts/docker-dev.sh build

# Start services
./scripts/docker-dev.sh up

# Stop services
./scripts/docker-dev.sh down

# Restart services
./scripts/docker-dev.sh restart

# View logs
./scripts/docker-dev.sh logs [service]

# Execute commands
./scripts/docker-dev.sh exec npm install
./scripts/docker-dev.sh exec bash

# Clean up
./scripts/docker-dev.sh clean
```

### Production
```bash
# Deploy
./scripts/docker-prod.sh deploy

# Update
./scripts/docker-prod.sh update

# Backup database
./scripts/docker-prod.sh backup

# Restore database
./scripts/docker-prod.sh restore backup_file.gz

# Scale services
./scripts/docker-prod.sh scale web 3

# Monitor logs
./scripts/docker-prod.sh monitor
```

## Troubleshooting

### Port Conflicts
```bash
# Check what's using port 3000
netstat -tulpn | grep :3000

# Kill process if needed
sudo kill -9 $(lsof -t -i:3000)
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### Container Issues
```bash
# View container status
docker ps -a

# Check logs
./scripts/docker-dev.sh logs [service]

# Restart specific service
docker-compose -f docker-compose.dev.yml restart [service]
```

### Database Connection Issues
```bash
# Test MongoDB connection
./scripts/docker-dev.sh exec mongosh mongodb://mongodb:27017/topluluk_dev

# Test Redis connection
./scripts/docker-dev.sh exec redis-cli -h redis ping
```

## Environment Variables

### Required Variables
```env
# Database
MONGODB_URI=mongodb://mongodb:27017/topluluk_dev
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-nextauth-secret

# Email (optional)
MAIL_HOST=smtp.gmail.com
MAIL_EMAIL=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Optional Variables
```env
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX

# Cloudflare (for captcha)
NEXT_PUBLIC_CLOUDFLARE_SITE_KEY=your-site-key
CLOUDFLARE_WIDGET_SECRET_KEY=your-secret-key
```

## Health Checks

### Application Health
```bash
curl http://localhost:3000/api/health
```

### Service Health
```bash
# MongoDB
./scripts/docker-dev.sh exec mongosh --eval "db.adminCommand('ping')"

# Redis
./scripts/docker-dev.sh exec redis-cli ping

# All services
./scripts/docker-dev.sh status
```

## Data Persistence

### Development
- MongoDB data: `mongodb_data` volume
- Redis data: `redis_data` volume

### Production
- Automated backups with `./scripts/docker-prod.sh backup`
- Manual restore with `./scripts/docker-prod.sh restore backup_file.gz`

## Performance Tips

1. **Allocate sufficient resources:**
   - Minimum 4GB RAM
   - 2+ CPU cores recommended

2. **Use SSD storage** for better I/O performance

3. **Monitor resource usage:**
   ```bash
   docker stats
   ./scripts/docker-prod.sh status
   ```

4. **Regular cleanup:**
   ```bash
   ./scripts/docker-dev.sh clean
   docker system prune -f
   ```

## Security Notes

### Development
- Default passwords are used for convenience
- Admin interfaces are exposed
- Debug ports are open

### Production
- Change all default passwords
- Use Docker secrets for sensitive data
- Enable SSL/TLS
- Regular security updates

## Getting Help

1. Check logs: `./scripts/docker-dev.sh logs`
2. Verify health: `./scripts/docker-dev.sh health`
3. Check container status: `docker ps -a`
4. Review documentation: `DOCKER_REVIEW_AND_RECOMMENDATIONS.md`

## Next Steps

1. Configure your environment variables
2. Start development environment
3. Test application functionality
4. Set up production environment
5. Configure monitoring and backups

---

For detailed information, see `DOCKER_REVIEW_AND_RECOMMENDATIONS.md`