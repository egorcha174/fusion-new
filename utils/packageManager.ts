
import { ThemePackage, ThemeDefinition, CardTemplate, CardTemplates } from '../types';

export const PACKAGE_SCHEMA_VERSION = 1;

/**
 * Generates a standardized theme package JSON structure.
 */
export const generatePackage = async (
  theme: ThemeDefinition,
  author: string = 'User',
  description: string = ''
): Promise<ThemePackage> => {
  return {
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    manifest: {
      name: theme.name,
      version: '1.0.0', // Basic versioning for export
      author,
      description,
      generatedAt: new Date().toISOString(),
    },
    theme,
  };
};

/**
 * Computes SHA-256 checksum for the package content.
 * Useful for integrity checks.
 */
export const computeChecksum = async (content: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validates if the imported JSON object matches the ThemePackage structure.
 */
export const validatePackage = (data: any): data is ThemePackage => {
  if (!data || typeof data !== 'object') return false;
  
  // Check required top-level fields
  if (typeof data.schemaVersion !== 'number') return false;
  if (!data.manifest || typeof data.manifest.name !== 'string') return false;
  if (!data.theme || !data.theme.scheme) return false;
  
  // Templates are optional, but if they exist, they must be an array.
  if (data.templates !== undefined && !Array.isArray(data.templates)) return false;

  return true;
};
