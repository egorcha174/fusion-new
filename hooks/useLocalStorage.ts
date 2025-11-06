
import React, { useState, useEffect } from 'react';
import { Tab } from '../types';

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
        parsedItem = parsedItem.map((tab: any): Tab => {
          // If tab is from the old structure (has groups, layoutMode, etc.)
          if (tab.layoutMode !== undefined || tab.groups !== undefined || tab.gridLayout !== undefined) {
             const allDeviceIdsInOldTab = [
              ...(tab.orderedDeviceIds || []),
              ...(tab.groups || []).flatMap((g: any) => g.orderedDeviceIds || [])
            ];
            
            // Create a unique set of device IDs
            const uniqueDeviceIds = [...new Set(allDeviceIdsInOldTab)];
            
            return {
              id: tab.id,
              name: tab.name,
              deviceIds: uniqueDeviceIds,
              orderedDeviceIds: uniqueDeviceIds, // Use the flattened list as the new order
              gridSettings: { cols: 8, rows: 5 } // Assign default grid settings
            };
          }
          
          // If it's a newer tab but missing gridSettings for some reason
          if (tab.gridSettings === undefined) {
            tab.gridSettings = { cols: 8, rows: 5 };
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