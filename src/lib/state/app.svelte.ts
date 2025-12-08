import { browser } from '$app/environment';
import { LOCAL_STORAGE_KEYS } from '$utils/constants'; // Needs to be ported/created later
import { DEFAULT_THEME_MODE, DEFAULT_COLOR_SCHEME } from '$utils/defaults'; // Needs to be ported/created later
import type { ThemeDefinition, ColorScheme } from '$types';

// Svelte 5 Runes declarations
declare const $state: <T>(value: T) => T;
declare const $derived: {
    <T>(value: T): T;
    by<T>(fn: () => T): T;
};
declare const $effect: (fn: () => void | (() => void)) => void;

// Placeholder defaults - assume these are imported from config/defaults.ts later
const defaultThemeMode = 'auto'; 
const defaultColorScheme: ColorScheme = {
    light: { 
        dashboardBackgroundType: 'color', 
        dashboardBackgroundColor1: '#ffffff', 
        cardBackground: 'rgba(255,255,255,0.8)',
        cardBackgroundOn: 'rgba(255,255,255,1)',
        // ... rest of fields
    } as any, 
    dark: { 
        dashboardBackgroundType: 'color', 
        dashboardBackgroundColor1: '#000000',
        cardBackground: 'rgba(0,0,0,0.8)',
        cardBackgroundOn: 'rgba(50,50,50,1)',
        // ... rest of fields
    } as any 
};

class AppState {
    themeMode = $state<'day' | 'night' | 'auto' | 'schedule'>(defaultThemeMode);
    colorScheme = $state<ColorScheme>(defaultColorScheme);
    sidebarWidth = $state(320);
    isSidebarVisible = $state(true);
    
    // Derived state for current mode (handled by effects in layout typically, but logic here)
    isDark = $derived.by(() => {
        if (this.themeMode === 'night') return true;
        if (this.themeMode === 'day') return false;
        // Auto/Schedule logic would go here, requires window/time access
        return false; 
    });

    constructor() {
        if (browser) {
            // Hydrate from LocalStorage
            const storedThemeMode = localStorage.getItem('ha-theme-mode');
            if (storedThemeMode) this.themeMode = JSON.parse(storedThemeMode);
            
            const storedWidth = localStorage.getItem('ha-sidebar-width');
            if (storedWidth) this.sidebarWidth = JSON.parse(storedWidth);
        }

        // Persist to LocalStorage
        $effect(() => {
            if (browser) localStorage.setItem('ha-theme-mode', JSON.stringify(this.themeMode));
        });
        
        $effect(() => {
            if (browser) localStorage.setItem('ha-sidebar-width', JSON.stringify(this.sidebarWidth));
        });
    }

    setThemeMode(mode: 'day' | 'night' | 'auto' | 'schedule') {
        this.themeMode = mode;
    }
}

export const appState = new AppState();