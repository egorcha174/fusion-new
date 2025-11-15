/**
 * Zustand Store Selectors
 * Оптимизированные селекторы для избежания ненужных re-renders
 * Используют shallow equality checks для объектов
 */

import type { AppState, AppActions } from '../store/appStore';

/**
 * Селекторы для UI state (часто меняется, высокая частота обновлений)
 */
export const uiStateSelectors = {
  // Текущая страница
  currentPage: (state: AppState) => state.currentPage,
  
  // Режим редактирования
  isEditMode: (state: AppState) => state.isEditMode,
  
  // Поле поиска (дебаунсиру ввод)
  searchTerm: (state: AppState) => state.searchTerm,
  
  // Активная вкладка (узко-специфичный селектор)
  activeTabId: (state: AppState) => state.activeTabId,
  
  // Видимость сайдбара
  isSidebarVisible: (state: AppState) => state.isSidebarVisible,
};

/**
 * Селекторы для контента (меняется редко, кэшируется)
 */
export const contentSelectors = {
  // Все вкладки (используй shallow comparison)
  tabs: (state: AppState) => state.tabs,
  
  // Все устройства и их кастомизации
  customizations: (state: AppState) => state.customizations,
  
  // Шаблоны карточек
  templates: (state: AppState) => state.templates,
  
  // Получить все вкладки и активную вкладку вместе
  tabsWithActive: (state: AppState) => ({
    tabs: state.tabs,
    activeTabId: state.activeTabId,
  }),
};

/**
 * Селекторы для настроек (очень редко меняется)
 */
export const settingsSelectors = {
  // Тема
  theme: (state: AppState) => state.theme,
  scheduleStartTime: (state: AppState) => state.scheduleStartTime,
  scheduleEndTime: (state: AppState) => state.scheduleEndTime,
  
  // Все настройки расписания
  scheduleSettings: (state: AppState) => ({
    theme: state.theme,
    scheduleStartTime: state.scheduleStartTime,
    scheduleEndTime: state.scheduleEndTime,
  }),
  
  // Цветовая схема
  colorScheme: (state: AppState) => state.colorScheme,
  isDark: (state: AppState) => {
    // Вычисляемое значение: является ли текущая тема темной
    const theme = state.theme;
    if (theme === 'day') return false;
    if (theme === 'night') return true;
    if (theme === 'schedule') {
      const now = new Date();
      const hours = now.getHours();
      const startHour = parseInt(state.scheduleStartTime.split(':')[0]);
      const endHour = parseInt(state.scheduleEndTime.split(':')[0]);
      return hours >= startHour || hours < endHour;
    }
    // 'auto' - определяем по системным настройкам
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  
  // Настройки камеры
  cameraSettings: (state: AppState) => state.cameraSettings,
  
  // Настройки часов
  clockSettings: (state: AppState) => state.clockSettings,
  
  // API ключи
  apiKeys: (state: AppState) => ({
    openWeatherMapKey: state.openWeatherMapKey,
    yandexWeatherKey: state.yandexWeatherKey,
    forecaApiKey: state.forecaApiKey,
  }),
};

/**
 * Селекторы для модальных диалогов
 */
export const modalSelectors = {
  editingDevice: (state: AppState) => state.editingDevice,
  editingTab: (state: AppState) => state.editingTab,
  editingTemplate: (state: AppState) => state.editingTemplate,
  historyModalEntityId: (state: AppState) => state.historyModalEntityId,
  floatingCamera: (state: AppState) => state.floatingCamera,
  contextMenu: (state: AppState) => state.contextMenu,
  
  // Проверка, есть ли открытая модаль
  hasOpenModal: (state: AppState) => !!(state.editingDevice || state.editingTab || state.editingTemplate || state.historyModalEntityId || state.floatingCamera),
};

/**
 * Селектор для экспорта только необходимых действий
 * Предотвращает ненужные re-renders при вызове action'ов
 */
export const actionSelectors = {
  // Группирование связанных действий для удобства
  deviceActions: (state: AppState & AppActions) => ({
    onDeviceToggle: state.onDeviceToggle,
    onBrightnessChange: state.onBrightnessChange,
    onTemperatureChange: state.onTemperatureChange,
    onHvacModeChange: state.onHvacModeChange,
  }),
};

/**
 * Composite selectors - объединяют несколько селекторов
 * Используй для экранов, которым нужны данные из нескольких категорий
 */
export const compositeSelectors = {
  // Для Dashboard страницы
  dashboardData: (state: AppState) => ({
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    customizations: state.customizations,
    templates: state.templates,
    isEditMode: state.isEditMode,
    colorScheme: state.colorScheme,
  }),
  
  // Для Settings страницы
  settingsData: (state: AppState) => ({
    theme: state.theme,
    scheduleStartTime: state.scheduleStartTime,
    scheduleEndTime: state.scheduleEndTime,
    colorScheme: state.colorScheme,
    clockSettings: state.clockSettings,
    cameraSettings: state.cameraSettings,
    sidebarWidth: state.sidebarWidth,
    isSidebarVisible: state.isSidebarVisible,
  }),
};

/**
 * Memoized selector factory
 * Используется для создания селекторов, которые выполняют вычисления
 * 
 * Пример использования:
 * const selectVisibleDevices = createMemoizedSelector(
 *   (state) => state.customizations,
 *   (customizations) => Object.entries(customizations).filter(([_, c]) => !c.isHidden)
 * )
 */
export function createMemoizedSelector<T, R>(
  selector: (state: AppState) => T,
  transform: (value: T) => R
): (state: AppState) => R {
  let lastValue: T;
  let lastResult: R;
  let hasBeenCalled = false;

  return (state: AppState): R => {
    const currentValue = selector(state);
    
    if (!hasBeenCalled || currentValue !== lastValue) {
      lastValue = currentValue;
      lastResult = transform(currentValue);
      hasBeenCalled = true;
    }
    
    return lastResult;
  };
}
