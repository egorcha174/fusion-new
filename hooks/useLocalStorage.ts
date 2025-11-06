import React, { useState, useEffect } from 'react';
import { Tab, GridLayoutItem } from '../types';

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
          // MIGRATION 1: From list-based (orderedDeviceIds, groups) to simple list
          if (tab.layoutMode !== undefined || tab.groups !== undefined || tab.gridLayout !== undefined) {
             const allDeviceIdsInOldTab = [
              ...(tab.orderedDeviceIds || []),
              ...(tab.groups || []).flatMap((g: any) => g.orderedDeviceIds || [])
            ];
            tab.orderedDeviceIds = [...new Set(allDeviceIdsInOldTab)];
            delete tab.groups;
            delete tab.layoutMode;
            delete tab.gridLayout;
            delete tab.deviceIds;
          }

          // MIGRATION 2: From simple list (orderedDeviceIds) to coordinate-based (layout)
          if (tab.orderedDeviceIds && !tab.layout) {
            const { cols } = tab.gridSettings || { cols: 8 };
            const newLayout: GridLayoutItem[] = [];
            // FIX: Explicitly cast `tab.orderedDeviceIds` to `string[]`. This ensures `uniqueDeviceIds`
            // is correctly inferred as `string[]` instead of `unknown[]`, fixing the type error on line 39.
            const uniqueDeviceIds = [...new Set(tab.orderedDeviceIds as string[])];

            uniqueDeviceIds.forEach((deviceId, index) => {
              newLayout.push({
                deviceId,
                col: index % cols,
                row: Math.floor(index / cols),
              });
            });
            tab.layout = newLayout;
            delete tab.orderedDeviceIds;
            delete tab.deviceIds;
          }
          
          if (tab.gridSettings === undefined) {
            tab.gridSettings = { cols: 8, rows: 5 };
          }
          if (!tab.layout) {
              tab.layout = [];
          }

          return tab;
        });
      }

      // MIGRATION 3: For card templates (elements object to array)
      if (key === 'ha-card-templates' && parsedItem?.sensor?.elements && !Array.isArray(parsedItem.sensor.elements)) {
        console.log("Migrating old sensor template elements from object to array...");
        const elementsObject = parsedItem.sensor.elements as Record<string, any>;
        const elementsArray = Object.entries(elementsObject).map(([id, elementData]) => {
            // Ensure elementData is an object before spreading
            const data = (typeof elementData === 'object' && elementData !== null) ? elementData : {};
            return {
              id: id,
              ...data
            };
        });
        parsedItem.sensor.elements = elementsArray;
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
