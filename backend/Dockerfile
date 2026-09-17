# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# Backend Dockerfile for ClinicWorks Clinical Document Processing Platform
# Multi-stage production build using Node.js 20 Alpine
# ------------------------------------------------------------------------------

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json tsconfig.json ./

# Install npm dependencies (including devDependencies for TypeScript compilation)
RUN npm install --frozen-lockfile=false

# Copy source code
COPY src ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile=false && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security compliance
RUN addgroup -g 1001 -S nodejs && \
    adduser -S clinicuser -u 1001 -G nodejs && \
    chown -R clinicuser:nodejs /app

USER clinicuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
