
import { browser } from '$app/environment';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import { 
    DEFAULT_THEME_MODE, 
    DEFAULT_COLOR_SCHEME, 
    DEFAULT_SIDEBAR_WIDTH, 
    DEFAULT_SIDEBAR_VISIBLE,
    defaultTemplates
} from '../utils/defaults';
import type { ColorScheme, Tab, CardTemplates, DeviceCustomizations } from '../types';
import { nanoid } from 'nanoid';

// Svelte 5 Runes declarations
declare const $state: <T>(value: T) => T;
declare const $derived: {
    <T>(value: T): T;
    by<T>(fn: () => T): T;
};
declare const $effect: (fn: () => void | (() => void)) => void;

class AppState {
    themeMode = $state<'day' | 'night' | 'auto' | 'schedule'>(DEFAULT_THEME_MODE);
    colorScheme = $state<ColorScheme>(DEFAULT_COLOR_SCHEME);
    sidebarWidth = $state(DEFAULT_SIDEBAR_WIDTH);
    isSidebarVisible = $state(DEFAULT_SIDEBAR_VISIBLE);
    
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
            const load = (key: string, def: any) => {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : def;
            };

            this.themeMode = load(LOCAL_STORAGE_KEYS.THEME_MODE, DEFAULT_THEME_MODE);
            this.sidebarWidth = load(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH);
            this.tabs = load(LOCAL_STORAGE_KEYS.TABS, []);
            this.activeTabId = load(LOCAL_STORAGE_KEYS.ACTIVE_TAB, null);
            this.templates = load(LOCAL_STORAGE_KEYS.CARD_TEMPLATES, defaultTemplates);
            this.customizations = load(LOCAL_STORAGE_KEYS.CUSTOMIZATIONS, {});

            // Initialize default tab if empty
            if (this.tabs.length === 0) {
               // We will let the HA state handler populate this if devices exist
            }
        }

        // Persistence Effects
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_MODE, JSON.stringify(this.themeMode)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, JSON.stringify(this.sidebarWidth)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.TABS, JSON.stringify(this.tabs)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(this.activeTabId)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.CARD_TEMPLATES, JSON.stringify(this.templates)); });
        $effect(() => { if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOMIZATIONS, JSON.stringify(this.customizations)); });
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
}

export const appState = new AppState();
