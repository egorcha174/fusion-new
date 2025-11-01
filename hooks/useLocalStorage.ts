
import React, { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      let parsedItem = JSON.parse(item);

      // --- MIGRATION LOGIC for backward compatibility ---
      if (key === 'ha-tabs' && Array.isArray(parsedItem)) {
        parsedItem = parsedItem.map((tab: any) => {
          // If old 'deviceOrder' property exists and new 'orderedDeviceIds' doesn't
          if (tab.deviceOrder && tab.orderedDeviceIds === undefined) {
            // Migrate the order for the current tab
            tab.orderedDeviceIds = tab.deviceOrder[tab.id] || [];
            delete tab.deviceOrder; // Clean up old property
          } else if (tab.orderedDeviceIds === undefined) {
            // Ensure new property exists even if deviceOrder didn't
            tab.orderedDeviceIds = [];
          }
          return tab;
        });
      }
      // --- END MIGRATION LOGIC ---

      return parsedItem;

    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}