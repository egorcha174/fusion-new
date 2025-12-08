
import { browser } from '$app/environment';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import { 
    DEFAULT_THEME_MODE, 
    DEFAULT_COLOR_SCHEME, 
    DEFAULT_SIDEBAR_WIDTH, 
    DEFAULT_SIDEBAR_VISIBLE,
} from '../utils/defaults';
import type { ColorScheme } from '../types';

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
    
    // Derived state for current mode
    isDark = $derived.by(() => {
        if (this.themeMode === 'night') return true;
        if (this.themeMode === 'day') return false;
        // Auto/Schedule logic would go here, requires window/time access.
        // For 'auto', we can check window matchMedia in browser env if not relying on separate store.
        if (this.themeMode === 'auto' && browser) {
             return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false; 
    });

    constructor() {
        if (browser) {
            // Hydrate from LocalStorage
            const storedThemeMode = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME_MODE);
            if (storedThemeMode) this.themeMode = JSON.parse(storedThemeMode);
            
            const storedWidth = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH);
            if (storedWidth) this.sidebarWidth = JSON.parse(storedWidth);
        }

        // Persist to LocalStorage
        $effect(() => {
            if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.THEME_MODE, JSON.stringify(this.themeMode));
        });
        
        $effect(() => {
            if (browser) localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, JSON.stringify(this.sidebarWidth));
        });
    }

    setThemeMode(mode: 'day' | 'night' | 'auto' | 'schedule') {
        this.themeMode = mode;
    }
}

export const appState = new AppState();
