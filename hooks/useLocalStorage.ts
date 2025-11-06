
import React, { useState, useEffect } from 'react';
import { Tab, GridLayoutItem, CardTemplates, CardElement, CardTemplate } from '../types';

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
      
      // MIGRATION 4: For card templates (from old single-object to new multi-template format)
      if (key === 'ha-card-templates') {
        // Check if it's the old format: has a 'sensor' key, but that object lacks an 'id'.
        if (parsedItem.sensor && !parsedItem.sensor.id) {
            console.warn('Migrating old sensor template to new multi-template format.');
            const oldSensorTemplate = parsedItem.sensor;
            const newId = 'default-sensor';
            parsedItem = {
                [newId]: {
                    ...oldSensorTemplate,
                    id: newId,
                    name: 'Стандартный сенсор',
                }
            };
        }
      }

      // MIGRATION 3: For card templates (ensuring structure and properties)
      if (key === 'ha-card-templates') {
        const defaultTemplates = initialValue as CardTemplates;
        const migratedTemplates: CardTemplates = { ...parsedItem };

        Object.keys(defaultTemplates).forEach((templateKey: keyof CardTemplates) => {
          const defaultTemplate = defaultTemplates[templateKey];
          const storedTemplate = parsedItem[templateKey];

          if (!storedTemplate || !defaultTemplate) {
            return; // No stored template or no default, nothing to migrate for this key
          }

          // Step 1: Ensure `elements` is an array (migration from old object format)
          let storedElements = storedTemplate.elements;
          if (storedElements && !Array.isArray(storedElements)) {
            console.warn(`Migrating template elements for "${templateKey}" from object to array.`);
            storedElements = Object.values(storedElements);
          }

          // Step 2: Merge stored elements with defaults to guarantee structure
          if (Array.isArray(storedElements) && Array.isArray(defaultTemplate.elements)) {
            const defaultElementsMap = new Map(defaultTemplate.elements.map(el => [el.id, el]));
            
            const migratedElements = storedElements
              .map(storedEl => {
                if (!storedEl || !storedEl.id) return null; // Filter out invalid elements
                const defaultEl = defaultElementsMap.get(storedEl.id);
                if (defaultEl) {
                  // Deep merge: default provides the structure, stored provides the values
                  return {
                    ...defaultEl,
                    ...storedEl,
                    position: { ...defaultEl.position, ...(storedEl.position || {}) },
                    size: { ...defaultEl.size, ...(storedEl.size || {}) },
                    styles: { ...defaultEl.styles, ...(storedEl.styles || {}) },
                  };
                }
                return null; // Discard elements that are no longer in the default template
              })
              .filter((el): el is CardElement => el !== null);

            // Step 3: Ensure all elements from the default template are present
            defaultTemplate.elements.forEach(defaultEl => {
              if (!migratedElements.some(el => el.id === defaultEl.id)) {
                migratedElements.push(defaultEl);
              }
            });

            // Update the template in our migrated copy
            migratedTemplates[templateKey] = {
              ...defaultTemplate, // Base styles from default
              ...storedTemplate,  // Overwrite with stored styles
              elements: migratedElements, // Use the safely merged elements
            };
          }
        });
        parsedItem = migratedTemplates;
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
