import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * PERFORMANCE OPTIMIZATION: Vite Configuration for Bundle Splitting
 * 
 * This configuration implements:
 * 1. Code Splitting - Separate vendor chunks from app code
 * 2. Tree Shaking - Remove unused code
 * 3. Asset Optimization - Compress and optimize static files
 * 4. Lazy Loading - Dynamic imports for large components
 * 5. Caching Strategy - Versioned assets for optimal browser caching
 */

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'zustand'],
          'animations': ['framer-motion'],
          'icons': ['@iconify/react'],
          'charts': ['recharts'],
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
    minify: 'terser',
    cssCodeSplit: true,
    sourcemap: 'hidden',
    outDir: 'dist',
    chunkSizeWarningLimit: 500,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'framer-motion'],
  },
})
