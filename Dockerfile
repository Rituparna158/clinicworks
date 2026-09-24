# syntax=docker/dockerfile:1
# Multi-stage production build for ClinicWorks Platform (Frontend + Backend)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configurations
COPY package.json package-lock.json* tsconfig.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies for both workspaces
RUN npm install --frozen-lockfile=false

# Copy frontend and backend sources
COPY frontend ./frontend
COPY backend ./backend

# Build both frontend and backend
RUN npm run build

# Stage 2: Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies for backend
COPY backend/package.json ./package.json
RUN npm install --omit=dev --frozen-lockfile=false && npm cache clean --force

# Copy compiled backend
COPY --from=builder /app/backend/dist ./dist

# Copy compiled frontend into static locations checked by server.ts
COPY --from=builder /app/frontend/dist ./dist/frontend
COPY --from=builder /app/frontend/dist ./public
COPY --from=builder /app/frontend/dist ./frontend/dist


# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S clinicuser -u 1001 -G nodejs && \
    chown -R clinicuser:nodejs /app

USER clinicuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
