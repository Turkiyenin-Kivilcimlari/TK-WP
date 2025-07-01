# Base image - Node.js
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps

# Set working directory
WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files - Improved caching
COPY package*.json ./
# Install dependencies
RUN npm ci

# Builder stage
FROM base AS builder

# Set working directory
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy necessary project files
COPY app/ ./app/
COPY components/ ./components/
COPY lib/ ./lib/
COPY models/ ./models/
COPY hooks/ ./hooks/
COPY types/ ./types/
COPY middleware/ ./middleware/
COPY middleware.ts ./
COPY next.config.mjs ./
#COPY next.config.mjs ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./
COPY components.json ./
COPY package.json ./
COPY package-lock.json ./
COPY .env ./
COPY public/ ./public/

# Build application
RUN npm run build

# Production stage
FROM base AS production

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ensure correct permissions
RUN chown -R nextjs:nodejs .

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]