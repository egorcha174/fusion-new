
import CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid';
import { browser } from '$app/environment';

const KEY_STORAGE_NAME = 'ha-device-key';

// Generates or retrieves a unique key for this device to encrypt local data.
const getDeviceKey = () => {
    if (!browser) return '';
    let key = localStorage.getItem(KEY_STORAGE_NAME);
    if (!key) {
        key = nanoid(32);
        localStorage.setItem(KEY_STORAGE_NAME, key);
    }
    return key;
};

export const saveSecure = (key: string, value: any): void => {
    if (!browser) return;
    try {
        const deviceKey = getDeviceKey();
        const stringData = JSON.stringify(value);
        const encrypted = CryptoJS.AES.encrypt(stringData, deviceKey).toString();
        localStorage.setItem(key, encrypted);
    } catch (e) {
        console.error(`Failed to save secure data for key "${key}"`, e);
    }
};

export const loadSecure = <T>(key: string, defaultValue: T): T => {
    if (!browser) return defaultValue;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;

    try {
        const deviceKey = getDeviceKey();
        const bytes = CryptoJS.AES.decrypt(raw, deviceKey);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        
        if (decryptedData) {
            return JSON.parse(decryptedData);
        }
    } catch (e) {
        // Fallback: Try parsing as plaintext (migration from older versions)
        try {
            return JSON.parse(raw);
        } catch (e2) {
            console.warn(`Failed to parse data for key "${key}"`, e2);
        }
    }
    return defaultValue;
};
