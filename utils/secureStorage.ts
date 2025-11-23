import CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid';

const KEY_STORAGE_NAME = 'ha-device-key';

// Generates or retrieves a unique key for this device to encrypt local data.
// This prevents plain-text storage of secrets in localStorage.
const getDeviceKey = () => {
    let key = localStorage.getItem(KEY_STORAGE_NAME);
    if (!key) {
        key = nanoid(32);
        localStorage.setItem(KEY_STORAGE_NAME, key);
    }
    return key;
};

/**
 * Encrypts and saves a value to localStorage.
 * @param key - The localStorage key.
 * @param value - The value to encrypt and save (will be stringified).
 */
export const saveSecure = (key: string, value: any): void => {
    try {
        const deviceKey = getDeviceKey();
        const stringData = JSON.stringify(value);
        const encrypted = CryptoJS.AES.encrypt(stringData, deviceKey).toString();
        localStorage.setItem(key, encrypted);
    } catch (e) {
        console.error(`Failed to save secure data for key "${key}"`, e);
    }
};

/**
 * Loads and decrypts a value from localStorage.
 * Handles migration from plaintext automatically: if decryption fails, assumes plaintext JSON.
 * @param key - The localStorage key.
 * @param defaultValue - Value to return if not found.
 */
export const loadSecure = <T>(key: string, defaultValue: T): T => {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;

    try {
        // Attempt to decrypt
        const deviceKey = getDeviceKey();
        const bytes = CryptoJS.AES.decrypt(raw, deviceKey);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        
        if (decryptedData) {
            return JSON.parse(decryptedData);
        }
    } catch (e) {
        // Decryption failed, likely because data is not encrypted (legacy/plaintext)
    }

    // Fallback: Try parsing as plaintext (migration scenario)
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`Failed to parse data for key "${key}", returning default.`);
        return defaultValue;
    }
};
