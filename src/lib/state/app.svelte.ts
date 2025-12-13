import { browser } from '$app/environment';
import { LOCAL_STORAGE_KEYS } from '$utils/constants';
import { 
    DEFAULT_THEME_MODE, 
    DEFAULT_COLOR_SCHEME, 
    DEFAULT_SIDEBAR_WIDTH, 
    DEFAULT_SIDEBAR_VISIBLE,
    defaultTemplates,
    DEFAULT_SENSOR_TEMPLATE_ID
} from '$utils/defaults';
import type { ColorScheme, Tab, CardTemplates, DeviceCustomizations, ThemeDefinition, BackgroundEffectType, Device, CardTemplate, DeviceType } from '$types';
import { nanoid } from 'nanoid';
import { loadAndMigrate } from '$utils/localStorage';

declare function $state<T>(value: T): T;
declare function $derived<T>(value: T): T;
declare namespace $derived {
    function by<T>(fn: () => T): T;
}
declare function $effect(fn: () => void | (() => void)): void;

class AppState {
    themeMode = $state<'day' | 'night' | 'auto' | 'schedule'>(DEFAULT_THEME_MODE);
    colorScheme = $state<ColorScheme>(DEFAULT_COLOR_SCHEME);
    sidebarWidth = $state(DEFAULT_SIDEBAR_WIDTH);
    isSidebarVisible = $state(DEFAULT_SIDEBAR_VISIBLE);
    backgroundEffect = $state<BackgroundEffectType>('none');
    
    // Data
    tabs = $state<Tab[]>([]);
    activeTabId = $state<string | null>(null);
    templates = $state<CardTemplates>(defaultTemplates);
    customizations = $state<DeviceCustomizations>({});

    isEditMode = $state(false);

    // Derived state for current mode
    isDark = $derived.by(() => {
        if (this.themeMode === 'night') return true;
        if (this.themeMode === 'day') return false;
        if (this.themeMode === 'auto' && browser) {
             return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false; 
    });

    // Derived: Current Active Tab
    activeTab = $derived.by(() => {
        return this.tabs.find(t => t.id === this.activeTabId) || null;
    });

    constructor() {
        if (browser) {
            this.themeMode = loadAndMigrate(LOCAL_STORAGE_KEYS.THEME_MODE, DEFAULT_THEME_MODE);
            this.sidebarWidth = loadAndMigrate(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH);
            this.tabs = loadAndMigrate(LOCAL_STORAGE_KEYS.TABS, []);
            this.activeTabId = loadAndMigrate(LOCAL_STORAGE_KEYS.ACTIVE_TAB, null);
            this.templates = loadAndMigrate(LOCAL_STORAGE_KEYS.CARD_TEMPLATES, defaultTemplates);
            this.customizations = loadAndMigrate(LOCAL_STORAGE_KEYS.CUSTOMIZATIONS, {});
            this.backgroundEffect = loadAndMigrate(LOCAL_STORAGE_KEYS.BACKGROUND_EFFECT, 'none');
        }

        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_MODE, JSON.stringify(this.themeMode)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, JSON.stringify(this.sidebarWidth)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.TABS, JSON.stringify(this.tabs)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(this.activeTabId)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.CARD_TEMPLATES, JSON.stringify(this.templates)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOMIZATIONS, JSON.stringify(this.customizations)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.BACKGROUND_EFFECT, JSON.stringify(this.backgroundEffect)); });
    }

    setThemeMode(mode: 'day' | 'night' | 'auto' | 'schedule') {
        this.themeMode = mode;
    }

    createDefaultTab(deviceIds: string[]) {
        if (this.tabs.length > 0) return;
        
        const cols = 8;
        const newLayout = deviceIds.map((id, index) => ({
            deviceId: id,
            col: index % cols,
            row: Math.floor(index / cols),
            width: 1,
            height: 1
        }));

        const newTab: Tab = {
            id: nanoid(),
            name: 'Главная',
            layout: newLayout,
            gridSettings: { cols, rows: Math.max(5, Math.ceil(deviceIds.length / cols)) }
        };

        this.tabs = [newTab];
        this.activeTabId = newTab.id;
    }

    getTemplateForDevice(device: Device | null): CardTemplate | null {
        if (!device) return null;
        const custom = this.customizations[device.id];
        let templateId = custom?.templateId;

        if (templateId === '') return null; // Explicitly no template

        if (!templateId) {
            // Very basic mapping for now, to expand later based on defaults.ts logic
            templateId = DEFAULT_SENSOR_TEMPLATE_ID;
        }
        return templateId ? this.templates[templateId] : null;
    }
}

export const appState = new AppState();