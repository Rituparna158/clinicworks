# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# Frontend Dockerfile for ClinicWorks Web Dashboard
# Multi-stage production build: Node 20 (Vite build) -> Nginx Alpine (Serving)
# ------------------------------------------------------------------------------

# Stage 1: Build React 18 TypeScript application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration and dependency declarations
COPY package.json tsconfig.json vite.config.ts index.html ./

# Install frontend dependencies
RUN npm install --frozen-lockfile=false

# Copy frontend source code
COPY src ./src

# Build production bundle with Vite into /app/dist
RUN npm run build

# Stage 2: Serve with lightweight Nginx Alpine
FROM nginx:alpine AS runner

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (reverse proxy & SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
