# Home Assistant Add-on Restructuring Guide

This document describes how to properly restructure the "Modern Dashboard UI" project for publication in the Home Assistant Add-on Store.

## Current Status

The project has been prepared with all the necessary files for Home Assistant integration:
- ✅ `addon.yaml` - Add-on manifest
- ✅ `Dockerfile` - Multi-stage Docker build
- ✅ `nginx.conf` - Web server configuration
- ✅ `CHANGELOG.md` - Version history
- ✅ React-based frontend with all components

## Directory Structure for HA Add-on

The repository is now structured as a Home Assistant add-on:

```
fusion-new/
├── addon.yaml                      # Add-on manifest (REQUIRED)
├── Dockerfile                      # Multi-stage build for optimization
├── nginx.conf                      # Nginx configuration
├── CHANGELOG.md                    # Version history
├── README.md                       # Project documentation
├── rootfs/                         # Files to copy to add-on container
│   └── etc/nginx/
│       └── nginx.conf              # Nginx config (copied in Dockerfile)
├── icon.png                        # Add-on icon (128x128 recommended)
├── logo.png                        # Add-on logo (512x512 recommended)
├── components/                     # React components
├── config/                         # Configuration files
├── hooks/                          # React hooks
├── modern-dashboard/               # Dashboard specific code
├── store/                          # State management (Zustand)
├── utils/                          # Utility functions
├── vendor/                         # Third-party code
├── App.tsx                         # Main React component
├── index.tsx                       # React entry point
├── index.html                      # HTML template
├── package.json                    # Node.js dependencies
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build configuration
└── constants.tsx                   # Application constants
```

## File Descriptions

### addon.yaml
The main configuration file for Home Assistant add-ons. Contains:
- Add-on name, slug, version
- Maintainer information
- Port mappings
- Architecture support
- Home Assistant version requirements

### Dockerfile
Multi-stage Docker build:
1. **Build Stage**: Compiles React app using Node.js 18-Alpine
2. **Runtime Stage**: Minimal Alpine Linux image with Nginx

### nginx.conf
Configures Nginx as a reverse proxy with:
- SPA routing (all requests → index.html for React routing)
- Gzip compression
- Cache control for static assets
- Security headers

### Package.json
Contains build scripts:
- `npm run build` - Vite build for production
- `npm run dev` - Development server
- `npm ci` - Install dependencies (used in Dockerfile)

## Next Steps for Publication

### 1. Create Required Images
```bash
# Icon (128x128 PNG)
# Logo (512x512 PNG)
# Place in repository root
```

### 2. Prepare rootfs Directory Structure
```bash
mkdir -p rootfs/etc/nginx/conf.d
cp nginx.conf rootfs/etc/nginx/nginx.conf
```

### 3. Test Locally with Home Assistant

#### Option A: Using Docker directly
```bash
docker build -t my-addon:latest .
docker run -p 8080:8080 my-addon:latest
```

#### Option B: Using Home Assistant Dev Container
```bash
# Add to Home Assistant add-ons folder
# Home Assistant will automatically discover and test it
```

### 4. Create Repository for Add-on Store

The add-on repository should follow this structure:
```
your-username/ha-addons/  (or similar)
├── modern-dashboard-ui/
│   ├── addon.yaml
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── icon.png
│   ├── logo.png
│   ├── README.md
│   ├── CHANGELOG.md
│   └── rootfs/
│       └── ...
└── README.md  # Repository-level README
```

### 5. Submit to Home Assistant Add-on Store

1. Fork the [Home Assistant Add-ons Repository](https://github.com/home-assistant/addons)
2. Create a new branch for your add-on
3. Place your add-on in a new directory
4. Submit a pull request
5. Wait for review and testing

## Deployment Considerations

### Port Mapping
- Add-on runs on port 8080 internally
- Home Assistant exposes it via its web interface
- Direct access: `http://homeassistant.local:8123/addons/modern_dashboard_ui` (or similar)

### Networking
- Add-on runs in Docker container with network isolation
- Must communicate with Home Assistant via the internal Docker network
- API calls to Home Assistant should use the bridge IP or DNS

### Data Persistence
- Configuration should be stored in `/config/` if needed
- Database or cached data in `/data/`
- These directories are automatically mounted from Home Assistant

### Environment Variables
Home Assistant provides:
- `TZ` - Timezone
- Add-on can access Home Assistant secrets via `/config/secrets.yaml`

## Build and Deployment

### Local Build
```bash
npm ci
npm run build
```

### Docker Build
```bash
docker build -t ha-modern-dashboard:1.0.0 .
```

### Health Check
The Dockerfile includes a health check:
- Interval: 30 seconds
- Timeout: 3 seconds
- Start period: 10 seconds
- Retries: 3

## Configuration

The `addon.yaml` currently has:
- Empty `options: {}`
- Empty `schema: {}`

To add configuration options:
```yaml
options:
  log_level: info
  api_timeout: 30

schema:
  log_level:
    select:
      - debug
      - info
      - warning
      - error
  api_timeout:
    int:
      min: 5
      max: 120
```

## Troubleshooting

### Docker Build Fails
- Check Node.js version compatibility
- Ensure all dependencies are listed in `package.json`
- Verify npm ci doesn't have network issues

### Nginx Errors
- Check `nginx.conf` syntax: `nginx -t`
- Ensure port 8080 is not in use
- Verify root directory permissions

### React App Not Loading
- Check browser console for errors
- Verify Nginx is serving `/usr/share/nginx/html/index.html`
- Ensure SPA routing is configured correctly

## Resources

- [Home Assistant Add-ons Documentation](https://developers.home-assistant.io/docs/add-ons/)
- [Home Assistant Add-ons Repository](https://github.com/home-assistant/addons)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
