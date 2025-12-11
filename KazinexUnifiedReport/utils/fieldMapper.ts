/**
 * Field Mapper Utility
 * 
 * Maps logical field names to physical field names based on the current publisher prefix.
 * This allows the code to work with any prefix (kazinex_, cra59_, etc.) without hardcoding.
 * 
 * Usage:
 * const mapper = new FieldMapper();
 * const record = {
 *   [mapper.field('reportsliceid')]: '123',
 *   [mapper.field('name')]: 'My Report'
 * };
 */

import { getConfig } from '../config/EnvironmentConfig';

export type EntityType = 'reportslice' | 'reportsection' | 'reportstructure' | 'reportdata' | 'reportdesign' | 'project' | 'reportstructurelookup';

export class FieldMapper {
  private prefix: string;

  constructor() {
    this.prefix = getConfig().getTablePrefix();
  }

  /**
   * Build a field name with current prefix
   * Example: field('name') => 'kazinex_name' or 'cra59_name'
   */
  public field(baseName: string): string {
    return `${this.prefix}${baseName}`;
  }

  /**
   * Build a lookup field reference
   * Example: lookup('reportdesign') => '_kazinex_reportdesign_value'
   */
  public lookup(baseName: string): string {
    return `_${this.prefix}${baseName}_value`;
  }

  /**
   * Build an entity name
   * Example: entity('reportslice') => 'kazinex_reportslice'
   */
  public entity(entityType: EntityType): string {
    return `${this.prefix}${entityType}`;
  }

  /**
   * Extract base field name from prefixed field
   * Example: extractBase('kazinex_name') => 'name'
   * Returns null if field doesn't match current prefix
   */
  public extractBase(prefixedField: string): string | null {
    if (prefixedField.startsWith(this.prefix)) {
      return prefixedField.substring(this.prefix.length);
    }
    return null;
  }

  /**
   * Check if a field belongs to current prefix
   */
  public isCurrentPrefix(prefixedField: string): boolean {
    return prefixedField.startsWith(this.prefix);
  }

  /**
   * Get current prefix
   */
  public getPrefix(): string {
    return this.prefix;
  }
}

/**
 * Generic type mapper for Dataverse records
 * Maps records with any prefix to a normalized structure
 */
export class RecordMapper {
  private mapper: FieldMapper;

  constructor() {
    this.mapper = new FieldMapper();
  }

  /**
   * Map a Dataverse record to a normalized object
   * Handles fields with current prefix or alternative prefixes
   */
  public mapRecord<T>(record: Record<string, unknown>, fieldMap: Record<string, string>): T {
    const result: Record<string, unknown> = {};
    const prefix = this.mapper.getPrefix();

    for (const [logicalName, physicalBaseName] of Object.entries(fieldMap)) {
      // Try current prefix first
      const currentPrefixField = `${prefix}${physicalBaseName}`;
      if (currentPrefixField in record) {
        result[logicalName] = record[currentPrefixField];
        continue;
      }

      // Try without prefix (system fields like createdon, modifiedon)
      if (physicalBaseName in record) {
        result[logicalName] = record[physicalBaseName];
        continue;
      }

      // Try common alternative prefixes
      const alternativePrefixes = ['kazinex_', 'cra59_', 'new_'];
      for (const altPrefix of alternativePrefixes) {
        const altField = `${altPrefix}${physicalBaseName}`;
        if (altField in record) {
          result[logicalName] = record[altField];
          break;
        }
      }
    }

    return result as T;
  }

  /**
   * Get value from record with prefix-agnostic field lookup
   * Tries current prefix, then system field, then alternative prefixes
   */
  public getValue(record: Record<string, unknown>, baseFieldName: string): unknown {
    const prefix = this.mapper.getPrefix();

    // Try current prefix
    const currentField = `${prefix}${baseFieldName}`;
    if (currentField in record) {
      return record[currentField];
    }

    // Try without prefix (system fields)
    if (baseFieldName in record) {
      return record[baseFieldName];
    }

    // Try alternative prefixes
    const alternativePrefixes = ['kazinex_', 'cra59_', 'new_'];
    for (const altPrefix of alternativePrefixes) {
      const altField = `${altPrefix}${baseFieldName}`;
      if (altField in record) {
        return record[altField];
      }
    }

    return undefined;
  }

  /**
   * Set value in record with current prefix
   */
  public setValue(record: Record<string, unknown>, baseFieldName: string, value: unknown): void {
    const prefix = this.mapper.getPrefix();
    
    // System fields without prefix
    const systemFields = ['createdon', 'modifiedon', 'createdby', 'modifiedby', 'statecode', 'statuscode'];
    if (systemFields.includes(baseFieldName.toLowerCase())) {
      record[baseFieldName] = value;
    } else {
      record[`${prefix}${baseFieldName}`] = value;
    }
  }
}

/**
 * Singleton instances for convenience
 */
let fieldMapperInstance: FieldMapper | null = null;
let recordMapperInstance: RecordMapper | null = null;

export function getFieldMapper(): FieldMapper {
  if (!fieldMapperInstance) {
    fieldMapperInstance = new FieldMapper();
  }
  return fieldMapperInstance;
}

export function getRecordMapper(): RecordMapper {
  if (!recordMapperInstance) {
    recordMapperInstance = new RecordMapper();
  }
  return recordMapperInstance;
}

/**
 * Convenience function for field mapping
 */
export function f(baseName: string): string {
  return getFieldMapper().field(baseName);
}

/**
 * Convenience function for lookup mapping
 */
export function l(baseName: string): string {
  return getFieldMapper().lookup(baseName);
}

/**
 * Convenience function for entity mapping
 */
export function e(entityType: EntityType): string {
  return getFieldMapper().entity(entityType);
}
