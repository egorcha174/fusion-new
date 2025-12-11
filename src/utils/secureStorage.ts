/**
 * Secure Storage Utility for sensitive data (tokens, credentials)
 * 
 * WARNING: This is a basic client-side obfuscation, NOT true encryption.
 * For production, consider:
 * 1. Server-side token storage with session-based auth
 * 2. OAuth/JWT token rotation
 * 3. Hardware-backed encryption (Web Crypto API with secure origin)
 * 
 * This implementation provides basic protection against casual inspection
 * but should NOT be relied upon for high-security scenarios.
 */

// Simple XOR-based obfuscation (NOT cryptographically secure!)
function simpleObfuscate(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result); // Base64 encode
}

function simpleDeobfuscate(encoded: string, key: string): string {
  try {
    const decoded = atob(encoded); // Base64 decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch (e) {
    console.error('Failed to deobfuscate data:', e);
    return '';
  }
}

// Generate a simple key based on browser fingerprint
function getBrowserKey(): string {
  const nav = navigator;
  const screen = window.screen;
  return btoa(
    `${nav.userAgent.slice(0, 20)}_${screen.width}x${screen.height}_${nav.language}`
  ).slice(0, 32);
}

/**
 * Secure Storage API
 */
export const secureStorage = {
  /**
   * Set a value in secure storage
   * @param key Storage key
   * @param value Value to store (will be obfuscated)
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return; // SSR safety
    
    try {
      const browserKey = getBrowserKey();
      const obfuscated = simpleObfuscate(value, browserKey);
      sessionStorage.setItem(`__sec_${key}`, obfuscated);
    } catch (e) {
      console.error(`Failed to store ${key}:`, e);
    }
  },

  /**
   * Get a value from secure storage
   * @param key Storage key
   * @returns Deobfuscated value or null
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null; // SSR safety
    
    try {
      const browserKey = getBrowserKey();
      const obfuscated = sessionStorage.getItem(`__sec_${key}`);
      if (!obfuscated) return null;
      
      return simpleDeobfuscate(obfuscated, browserKey);
    } catch (e) {
      console.error(`Failed to retrieve ${key}:`, e);
      return null;
    }
  },

  /**
   * Remove a value from secure storage
   * @param key Storage key
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(`__sec_${key}`);
  },

  /**
   * Clear all secure storage
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    
    // Remove only our secure items
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('__sec_')) {
        sessionStorage.removeItem(key);
      }
    });
  },

  /**
   * Check if a key exists
   * @param key Storage key
   * @returns true if key exists
   */
  has(key: string): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(`__sec_${key}`) !== null;
  }
};

/**
 * Legacy localStorage wrapper with warning
 * Use this to gradually migrate from localStorage to secureStorage
 */
export const legacyStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem(key);
    if (value) {
      console.warn(
        `[SECURITY] Reading unencrypted data from localStorage: ${key}. ` +
        'Consider migrating to secureStorage.'
      );
    }
    return value;
  },
  
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

// Export default for convenience
export default secureStorage;
