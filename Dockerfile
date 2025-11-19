# Home Assistant Dashboard Add-on
# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Runtime image
FROM alpine:3.18

# Install nginx and necessary packages
RUN apk add --no-cache \
    nginx \
    ca-certificates \
    && mkdir -p /run/nginx

# Copy nginx configuration
COPY rootfs/etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY rootfs/etc/nginx/conf.d/ /etc/nginx/conf.d/

# Copy built application from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/

# Expose ports
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
