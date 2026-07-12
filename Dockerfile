# Multi-stage Dockerfile for Next.js 14 application
# Optimized for security, performance, and caching

# Base image with security updates
FROM node:20-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    libc6-compat \
    dumb-init \
    python3 \
    make \
    g++ && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Dependencies stage - optimized for caching
FROM base AS deps

# Copy package files for better caching
COPY package*.json ./

# Install dependencies with security optimizations
RUN npm ci --only=production --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

# Builder stage
FROM base AS builder

# Copy dependencies from dev-deps stage
COPY --from=dev-deps /app/node_modules ./node_modules

# Copy source code with proper ordering for cache optimization
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./
COPY components.json ./
COPY package*.json ./

# Copy application source
COPY app/ ./app/
COPY components/ ./components/
COPY lib/ ./lib/
COPY models/ ./models/
COPY hooks/ ./hooks/
COPY types/ ./types/
COPY middleware/ ./middleware/
COPY middleware.ts ./
COPY public/ ./public/

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build && \
    npm prune --production

# Production stage
FROM base AS production

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application from builder (standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json for standalone mode
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Add comprehensive health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Development stage
FROM base AS development

# Install additional development tools
RUN apk add --no-cache git

# Copy dependencies from dev-deps stage
COPY --from=dev-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy source code
COPY --chown=nextjs:nodejs . .

# Set development environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Run as root in development for file permissions
# USER nextjs

# Expose port and debug port
EXPOSE 3000 9229

# Start development server with hot reload
CMD ["npm", "run", "dev"]