
import { Tab, GridLayoutItem, CardTemplates, CardElement, CardTemplate } from '../types';

/**
 * Загружает данные из localStorage и применяет миграции, если структура данных устарела.
 * Это обеспечивает обратную совместимость при обновлении приложения.
 * @param key - Ключ в localStorage.
 * @param initialValue - Значение по умолчанию, если в localStorage ничего нет.
 * @returns {T} - Загруженные и (при необходимости) смигрированные данные.
 */
export function loadAndMigrate<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return initialValue;

    let parsedItem = JSON.parse(item);

    // --- ЛОГИКА МИГРАЦИИ для обратной совместимости ---

    // Миграция для вкладок ('ha-tabs')
    if (key === 'ha-tabs' && Array.isArray(parsedItem)) {
      parsedItem = parsedItem.map((tab: any): Tab => {
        // МИГРАЦИЯ 1: От старой структуры с `groups` и `orderedDeviceIds` к простому списку.
        if (tab.layoutMode !== undefined || tab.groups !== undefined || tab.gridLayout !== undefined) {
           const allDeviceIdsInOldTab = [...(tab.orderedDeviceIds || []), ...(tab.groups || []).flatMap((g: any) => g.orderedDeviceIds || [])];
          tab.orderedDeviceIds = [...new Set(allDeviceIdsInOldTab)];
          delete tab.groups; delete tab.layoutMode; delete tab.gridLayout; delete tab.deviceIds;
        }

        // МИГРАЦИЯ 2: От простого списка ID (`orderedDeviceIds`) к координатной сетке (`layout`).
        if (tab.orderedDeviceIds && !tab.layout) {
          const { cols } = tab.gridSettings || { cols: 8 };
          const newLayout: GridLayoutItem[] = [];
          const uniqueDeviceIds = [...new Set(tab.orderedDeviceIds as string[])];

          uniqueDeviceIds.forEach((deviceId, index) => {
            newLayout.push({ deviceId, col: index % cols, row: Math.floor(index / cols) });
          });
          tab.layout = newLayout;
          delete tab.orderedDeviceIds;
          delete tab.deviceIds;
        }
        
        // Убеждаемся, что настройки сетки и layout всегда существуют.
        if (tab.gridSettings === undefined) tab.gridSettings = { cols: 8, rows: 5 };
        if (!tab.layout) tab.layout = [];

        return tab;
      });
    }
    
    // Миграция для шаблонов карточек ('ha-card-templates')
    if (key === 'ha-card-templates') {
      // МИГРАЦИЯ 4: От старого формата, где был только один объект `sensor`.
      if (parsedItem.sensor && !parsedItem.sensor.id) {
          console.warn('Migrating old sensor template to new multi-template format.');
          const oldSensorTemplate = parsedItem.sensor;
          const newId = 'default-sensor';
          parsedItem = { [newId]: { ...oldSensorTemplate, id: newId, name: 'Стандартный сенсор' } };
      }
      
      // МИГРАЦИЯ 3: Гарантируем, что все элементы из шаблона по умолчанию присутствуют
      // в сохраненном шаблоне, чтобы избежать ошибок при добавлении новых элементов в обновлениях.
      const defaultTemplates = initialValue as CardTemplates;
      const migratedTemplates: CardTemplates = { ...parsedItem };

      Object.keys(defaultTemplates).forEach((templateKey: keyof CardTemplates) => {
        const defaultTemplate = defaultTemplates[templateKey];
        const storedTemplate = parsedItem[templateKey];

        if (!storedTemplate || !defaultTemplate) return;

        // Шаг 1: Миграция элементов из объекта в массив (очень старый формат).
        let storedElements = storedTemplate.elements;
        if (storedElements && !Array.isArray(storedElements)) {
          console.warn(`Migrating template elements for "${templateKey}" from object to array.`);
          storedElements = Object.values(storedElements);
        }

        if (Array.isArray(storedElements) && Array.isArray(defaultTemplate.elements)) {
          const defaultElementsMap = new Map(defaultTemplate.elements.map(el => [el.id, el]));
          
          // Шаг 2: Объединяем сохраненные элементы с элементами по умолчанию.
          const migratedElements = storedElements
            .map(storedEl => {
              if (!storedEl || !storedEl.id) return null;
              const defaultEl = defaultElementsMap.get(storedEl.id);
              if (defaultEl) {
                // Глубокое слияние: структура от default, значения от stored.
                return { ...defaultEl, ...storedEl, position: { ...defaultEl.position, ...(storedEl.position || {}) }, size: { ...defaultEl.size, ...(storedEl.size || {}) }, styles: { ...defaultEl.styles, ...(storedEl.styles || {}) }, };
              }
              return null; // Отбрасываем элементы, которых больше нет в шаблоне по умолчанию.
            })
            .filter((el): el is CardElement => el !== null);

          // Шаг 3: Добавляем новые элементы, которые есть в default, но отсутствуют в stored.
          defaultTemplate.elements.forEach(defaultEl => {
            if (!migratedElements.some(el => el.id === defaultEl.id)) {
              migratedElements.push(defaultEl);
            }
          });

          migratedTemplates[templateKey] = { ...defaultTemplate, ...storedTemplate, elements: migratedElements };
        }
      });
      parsedItem = migratedTemplates;
    }
    
    // --- КОНЕЦ ЛОГИКИ МИГРАЦИИ ---

    return parsedItem;

  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return initialValue;
  }
}
