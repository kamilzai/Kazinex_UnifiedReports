/**
 * Environment Configuration
 * 
 * Manages environment-specific settings, primarily the publisher prefix
 * used for Dataverse entity field names.
 * 
 * This allows the same PCF control to work across different environments
 * with different publisher prefixes without code changes.
 * 
 * Usage:
 * 1. Set via PCF property in Power Apps: publisherPrefix="cra59"
 * 2. Fallback to environment variable: PUBLISHER_PREFIX
 * 3. Default fallback: "kazinex"
 */

import type { IInputs } from '../generated/ManifestTypes';

export interface EnvironmentSettings {
  /** 
   * Publisher prefix used for Dataverse entities
   * Example: 'kazinex', 'cra59', 'contoso', etc.
   * This will be used to build field names like: {prefix}_reportslice
   */
  publisherPrefix: string;
  
  /** Full prefix with underscore for convenience */
  tablePrefix: string;
  
  /** Environment name (dev, test, prod) - optional metadata */
  environmentName?: string;
  
  /** Debug mode flag */
  debug: boolean;
}

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private settings: EnvironmentSettings;

  /**
   * Default publisher prefix - used only when none is provided
   * In production, publisherPrefix should ALWAYS be set via PCF property
   */
  private static readonly DEFAULT_PREFIX = '';

  private constructor(context?: ComponentFramework.Context<IInputs>) {
    // Priority order:
    // 1. PCF property (configured in Power Apps) - REQUIRED in production
    // 2. Environment variable (if available) - for development/testing
    // 3. Auto-detect from first query - fallback for backward compatibility
    
    const publisherPrefix = this.resolvePublisherPrefix(context);
    
    this.settings = {
      publisherPrefix,
      tablePrefix: `${publisherPrefix}_`,
      debug: this.isDebugMode()
    };

    if (this.settings.debug) {
      // // console.log(...)
    }
  }

  /**
   * Get singleton instance
   * Call initialize() first to set context-specific settings
   */
  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Initialize or update with PCF context
   * Should be called from index.ts init() and updateView()
   */
  public static initialize(context: ComponentFramework.Context<IInputs>): EnvironmentConfig {
    EnvironmentConfig.instance = new EnvironmentConfig(context);
    return EnvironmentConfig.instance;
  }

  /**
   * Resolve publisher prefix from multiple sources
   */
  private resolvePublisherPrefix(context?: ComponentFramework.Context<IInputs>): string {
    // 1. Try PCF property (highest priority)
    if (context?.parameters?.publisherPrefix) {
      const prefixValue = context.parameters.publisherPrefix.raw;
      if (prefixValue && typeof prefixValue === 'string' && prefixValue.trim()) {
        // // console.log(...)
        return this.validatePrefix(prefixValue.trim());
      }
    }

    // 2. Try environment variable (if available)
    // Note: In browser context, this won't work, but useful for Node.js tests
    if (typeof process !== 'undefined' && process.env?.PUBLISHER_PREFIX) {
      const envPrefix = process.env.PUBLISHER_PREFIX;
      // // console.log(...)
      return this.validatePrefix(envPrefix);
    }

    // 3. ERROR - No prefix provided!
    // // console.error(
    //   '[EnvironmentConfig] ⚠️ CRITICAL: No publisher prefix configured!\n' +
    //   'Please set the "Publisher Prefix" property in Power Apps.\n' +
    //   'Example: cra59, kazinex, contoso, etc.\n' +
    //   'The control will attempt to auto-detect, but this is not recommended for production.'
    // );
    
    // Return empty string - will be auto-detected from first query
    return '';
  }

  /**
   * Validate publisher prefix format
   * Must be 2-8 characters, alphanumeric, start with letter
   */
  private validatePrefix(prefix: string): string {
    const cleaned = prefix.toLowerCase().replace(/_/g, ''); // Remove underscores if present
    
    if (!/^[a-z][a-z0-9]{1,7}$/.test(cleaned)) {
      // // console.error(
      //   `[EnvironmentConfig] Invalid prefix format: "${prefix}". ` +
      //   `Must be 2-8 characters, alphanumeric, start with letter.`
      // );
      // Return empty for auto-detection
      return '';
    }

    return cleaned;
  }

  /**
   * Check if debug mode is enabled
   */
  private isDebugMode(): boolean {
    // Check for debug flag in URL or local storage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('debug') === 'true') {
        return true;
      }
      
      if (localStorage.getItem('pcf_debug') === 'true') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get current environment settings
   */
  public getSettings(): Readonly<EnvironmentSettings> {
    return { ...this.settings };
  }

  /**
   * Get publisher prefix (without underscore)
   * Example: 'kazinex', 'cra59'
   */
  public getPublisherPrefix(): string {
    return this.settings.publisherPrefix;
  }

  /**
   * Get table prefix (with underscore)
   * Example: 'kazinex_', 'cra59_'
   */
  public getTablePrefix(): string {
    return this.settings.tablePrefix;
  }

  /**
   * Build a field name with the current prefix
   * Example: buildFieldName('reportslice') => 'kazinex_reportslice'
   */
  public buildFieldName(baseName: string): string {
    return `${this.settings.tablePrefix}${baseName}`;
  }

  /**
   * Build a lookup field name (with underscore prefix and _value suffix)
   * Example: buildLookupField('reportdesign') => '_kazinex_reportdesign_value'
   */
  public buildLookupField(baseName: string): string {
    return `_${this.settings.tablePrefix}${baseName}_value`;
  }

  /**
   * Get entity logical name
   * Example: getEntityName('reportslice') => 'kazinex_reportslice'
   */
  public getEntityName(entityBaseName: string): string {
    return this.buildFieldName(entityBaseName);
  }

  /**
   * Enable/disable debug mode at runtime
   */
  public setDebugMode(enabled: boolean): void {
    this.settings.debug = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pcf_debug', enabled ? 'true' : 'false');
    }
    // // console.log(...)
  }

  /**
   * Check if debug mode is enabled
   */
  public isDebug(): boolean {
    return this.settings.debug;
  }

  /**
   * Update environment name metadata
   */
  public setEnvironmentName(name: string): void {
    this.settings.environmentName = name;
  }

  /**
   * Get configuration summary for logging
   */
  public getSummary(): string {
    return `Publisher: ${this.settings.publisherPrefix}, ` +
           `Prefix: ${this.settings.tablePrefix}, ` +
           `Debug: ${this.settings.debug}, ` +
           `Env: ${this.settings.environmentName || 'unknown'}`;
  }
}

/**
 * Convenience function to get configuration instance
 */
export function getConfig(): EnvironmentConfig {
  return EnvironmentConfig.getInstance();
}

/**
 * Convenience function to get table prefix
 */
export function getTablePrefix(): string {
  return EnvironmentConfig.getInstance().getTablePrefix();
}

/**
 * Convenience function to build field name
 */
export function buildField(baseName: string): string {
  return EnvironmentConfig.getInstance().buildFieldName(baseName);
}

/**
 * Convenience function to build lookup field name
 */
export function buildLookup(baseName: string): string {
  return EnvironmentConfig.getInstance().buildLookupField(baseName);
}

