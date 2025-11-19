# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY src ./src
COPY components ./components
COPY hooks ./hooks

# Copy configuration and asset files
COPY *.json ./
COPY *.ts ./
COPY *.tsx ./
COPY *.html ./

# Build the application
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the application port
EXPOSE 8099
