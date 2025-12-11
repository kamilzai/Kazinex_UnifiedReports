/**
 * Lightweight debug logging helper used to keep production consoles quiet.
 *
 * Usage:
 *   import { createDebugLogger } from '../utils/debugLogger';
 *   const log = createDebugLogger('PowerAppsGridWrapper');
 *   log('message'); // Logs only when debug mode is enabled
 *
 * Debug mode rules:
 * - Enabled automatically when NODE_ENV !== 'production'
 * - In browsers, can be toggled by setting window.__kazinexDebug to:
 *      true  -> enable all scopes
 *      false -> disable all scopes (even in dev)
 *      '*'   -> enable all scopes
 *      'scope1,scope2' -> comma-separated scopes
 *      ['scope1','scope2'] -> array of scopes
 */

const envIsDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

type DebugSetting = boolean | string | string[] | undefined;

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __kazinexDebug?: DebugSetting;
  }
}

const normalizeSetting = (setting: DebugSetting): string[] | boolean | undefined => {
  if (setting === undefined) {
    return undefined;
  }

  if (setting === true || setting === false) {
    return setting;
  }

  if (setting === '*') {
    return true;
  }

  if (Array.isArray(setting)) {
    return setting;
  }

  if (typeof setting === 'string') {
    return setting
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return undefined;
};

export const isDebugScopeEnabled = (scope: string): boolean => {
  if (typeof window === 'undefined') {
    return envIsDevelopment;
  }

  const normalized = normalizeSetting(window.__kazinexDebug);

  if (normalized === true) {
    return true;
  }

  if (normalized === false) {
    return false;
  }

  if (Array.isArray(normalized)) {
    return normalized.includes(scope);
  }

  // Fallback to env default when no explicit flag is provided
  return envIsDevelopment;
};

export const createDebugLogger = (scope: string) => {
  return (...args: unknown[]): void => {
    if (isDebugScopeEnabled(scope)) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };
};
