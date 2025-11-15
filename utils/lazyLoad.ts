import { lazy, ComponentType, ReactNode } from 'react'
import { Suspense } from 'react'

/**
 * STEP 2: LAZY LOADING FOR PERFORMANCE
 * Dynamically load components only when needed
 */

interface LazyLoadOptions {
  fallback?: ReactNode
  delay?: number
}

/**
 * Wrap a lazy-loaded component with Suspense and error boundary
 */
export function lazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
) {
  const Component = lazy(importFunc)
  const { fallback = <div>Loading...</div>, delay = 0 } = options

  return {
    Component,
    Suspense: (props: P) => (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    ),
  }
}

/**
 * Lazy load with delay (for perceived performance)
 */
export function lazyLoadWithDelay<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  delayMs: number = 300
) {
  return lazy(() =>
    new Promise((resolve) =>
      setTimeout(() => {
        resolve(importFunc())
      }, delayMs)
    )
  )
}

/**
 * Usage examples:
 * 
 * // Basic lazy loading
 * const Dashboard = lazy(() => import('@components/Dashboard'))
 * 
 * // With lazyLoad helper
 * const { Suspense: DashboardSuspense } = lazyLoad(
 *   () => import('@components/Dashboard'),
 *   { fallback: <LoadingSpinner /> }
 * )
 * 
 * // In your component
 * <DashboardSuspense {...props} />
 */
