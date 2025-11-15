import { useShallow } from 'zustand/react'  // or use custom shallow equality

/**
 * STEP 3: MEMOIZATION IN ZUSTAND SELECTORS
 * Optimize store subscriptions to prevent unnecessary re-renders
 */

/**
 * Create memoized selectors to prevent re-renders
 * when store state changes but selected values remain the same
 */

// Example: Memoized selector that prevents re-renders when array contents haven't changed
export const useDevicesShallow = (store: any) => {
  return store(
    (state: any) => ({
      devices: state.devices,
      selectedDeviceId: state.selectedDeviceId,
    }),
    useShallow  // Shallow comparison - prevents re-render on same array reference
  )
}

// Example: Custom memoization with specific equality function
export const createMemoizedSelector = <State, Selected>(
  selector: (state: State) => Selected,
  equalityFn?: (a: Selected, b: Selected) => boolean
) => {
  return (store: any) => store(selector, equalityFn)
}

/**
 * Usage in components:
 * 
 * // Instead of:
 * const devices = useStore(state => state.devices)  // Re-renders on every state change
 * 
 * // Use memoized selector:
 * const { devices, selectedDeviceId } = useDevicesShallow(useStore)  // Only re-renders when these specific values change
 * 
 * Or with React.memo for component:
 * export const DeviceList = memo(({ devices }) => {
 *   return <div>{devices.map(d => ...)}</div>
 * })
 */

/**
 * Best practices:
 * 1. Use useShallow for objects/arrays comparison
 * 2. Memoize complex computations in selectors
 * 3. Combine with React.memo() for components
 * 4. Use useMemo() for derived state calculations
 * 5. Avoid creating new objects/arrays in selectors
 */
