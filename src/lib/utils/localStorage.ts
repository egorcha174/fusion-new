
import { browser } from '$app/environment';
import type { Tab, GridLayoutItem, CardTemplates, CardElement, ColorScheme } from '$types';

export function loadAndMigrate<T>(key: string, initialValue: T): T {
  if (!browser) {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return initialValue;

    let parsedItem = JSON.parse(item);

    // Migration logic for Tabs
    if (key === 'ha-tabs' && Array.isArray(parsedItem)) {
      parsedItem = parsedItem.map((tab: any): Tab => {
        if (tab.layoutMode !== undefined || tab.groups !== undefined) {
           const allDeviceIdsInOldTab = [...(tab.orderedDeviceIds || []), ...(tab.groups || []).flatMap((g: any) => g.orderedDeviceIds || [])];
          tab.orderedDeviceIds = [...new Set(allDeviceIdsInOldTab)];
          delete tab.groups; delete tab.layoutMode; delete tab.gridLayout; delete tab.deviceIds;
        }

        if (tab.orderedDeviceIds && !tab.layout) {
          const { cols } = tab.gridSettings || { cols: 8 };
          const newLayout: GridLayoutItem[] = [];
          const uniqueDeviceIds = [...new Set(tab.orderedDeviceIds as string[])];

          uniqueDeviceIds.forEach((deviceId: unknown, index: number) => {
            if (typeof deviceId === 'string') {
                newLayout.push({ deviceId, col: index % cols, row: Math.floor(index / cols) });
            }
          });
          tab.layout = newLayout;
          delete tab.orderedDeviceIds;
        }
        
        if (tab.gridSettings === undefined) tab.gridSettings = { cols: 8, rows: 5 };
        if (!tab.layout) tab.layout = [];

        return tab as Tab;
      });
    }

    return parsedItem;

  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return initialValue;
  }
}
