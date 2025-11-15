# Performance Optimization Guide

## Steps 4 & 5: Asset Caching & Performance Monitoring

### STEP 4: ASSET CACHING STRATEGY

#### HTTP Cache Headers Configuration

```nginx
# In your web server (nginx/Apache)
Location ~ \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf|otf)$ {
  # Cache for 1 year (versioned files)
  expires 1y;
  add_header Cache-Control "public, immutable";
}

Location ~ \.(html|json)$ {
  # Don't cache HTML and JSON
  expires -1;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

#### Service Worker Caching

```typescript
// src/service-worker.ts
const CACHE_NAME = 'app-v1'
const urlsToCache = [
  '/',
  '/js/vendor-[hash].js',
  '/js/main-[hash].js',
  '/css/style-[hash].css',
  '/fonts/...',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})
```

#### Image Optimization

- Use WebP format with fallback
- Compress images with tools like TinyPNG
- Use responsive images with srcset
- Implement lazy loading for images

### STEP 5: PERFORMANCE MONITORING

#### Web Vitals Monitoring

```typescript
// src/utils/performanceMonitoring.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export const initPerformanceMonitoring = () => {
  // Cumulative Layout Shift
  getCLS((metric) => {
    console.log('CLS:', metric.value)
    sendToAnalytics('CLS', metric.value)
  })

  // First Input Delay
  getFID((metric) => {
    console.log('FID:', metric.value)
    sendToAnalytics('FID', metric.value)
  })

  // Largest Contentful Paint
  getLCP((metric) => {
    console.log('LCP:', metric.value)
    sendToAnalytics('LCP', metric.value)
  })

  // First Contentful Paint
  getFCP((metric) => {
    console.log('FCP:', metric.value)
    sendToAnalytics('FCP', metric.value)
  })

  // Time to First Byte
  getTTFB((metric) => {
    console.log('TTFB:', metric.value)
    sendToAnalytics('TTFB', metric.value)
  })
}

// Send metrics to your analytics service
function sendToAnalytics(name: string, value: number) {
  // Integration with analytics platform
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', JSON.stringify({ name, value }))
  }
}
```

#### Runtime Performance Monitoring

```typescript
// Monitor component render times
export const withPerformanceMonitoring = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const start = performance.now()
    
    React.useEffect(() => {
      const end = performance.now()
      console.log(`${Component.name} rendered in ${end - start}ms`)
    }, [])
    
    return <Component {...props} />
  }
}

// Monitor state changes
export const withStateMonitoring = (hook: () => any) => {
  return () => {
    const state = hook()
    
    useEffect(() => {
      console.log('State updated:', state)
    }, [state])
    
    return state
  }
}
```

#### Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# In vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
})

# Run: npm run build
```

#### Chrome DevTools Integration

- Use Performance tab for recording
- Analyze Frame Rate and CPU usage
- Check Memory Profiler for leaks
- Use Lighthouse for comprehensive audit

### SUMMARY: All 5 Performance Steps

✅ **Step 1**: Code Splitting via vite.config.optimized.ts
✅ **Step 2**: Lazy Loading with lazyLoad.ts utilities
✅ **Step 3**: Memoization with zustandMemoization.ts
✅ **Step 4**: Asset Caching with HTTP headers & Service Workers
✅ **Step 5**: Performance Monitoring with Web Vitals & Runtime tracking

### Next Steps

1. Update vite.config.ts with optimized settings
2. Implement Service Worker for offline support
3. Set up Web Vitals tracking
4. Configure CDN with proper cache headers
5. Monitor in production with analytics integration
