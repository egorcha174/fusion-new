# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY components ./components
COPY hooks ./hooks
COPY *.json ./
COPY *.ts ./
COPY *.tsx ./
COPY *.html ./

# Create empty directories that may not exist
RUN mkdir -p store utils vendor config

RUN npm run build

# Runtime stage
FROM nginx:alpine

RUN rm -rf /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8099
