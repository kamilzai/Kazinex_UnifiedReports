/**
 * Cell Validation Utility
 * 
 * Provides validation functions for different column types
 * to ensure data integrity before saving to Dataverse.
 * 
 * Day 5: Cell-level validation
 */

import type { GridColumn } from '../types/grid.types';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validate cell value based on column type
 * 
 * @param value - The value to validate
 * @param column - The column definition with type information
 * @returns Validation result with error message if invalid
 */
export function validateCellValue(value: unknown, column: GridColumn): ValidationResult {
  // Allow empty values unless column is required
  if (value === null || value === undefined || value === '') {
    // For now, no required field validation
    return { isValid: true };
  }

  const columnType = column.columnType || 'text';
  
  switch (columnType) {
    case 'numeric':
      return validateNumeric(value);
    
    case 'date':
      return validateDate(value);
    
    case 'select':
      return validateSelect(value, column);
    
    case 'text':
    default:
      return validateText(value);
  }
}

/**
 * Validate numeric values
 * - Must be a valid number
 * - Can be negative
 * - Can have decimals
 */
function validateNumeric(value: unknown): ValidationResult {
  const valueStr = String(value).trim();
  
  // Remove commas for formatted numbers like "1,234.56"
  const cleanValue = valueStr.replace(/,/g, '');
  
  // Check if it's a valid number
  if (cleanValue === '' || isNaN(Number(cleanValue))) {
    return {
      isValid: false,
      errorMessage: 'Must be a valid number'
    };
  }
  
  return { isValid: true };
}

/**
 * Validate date values
 * - Must be a valid date
 * - Accepts ISO format, common date formats
 */
function validateDate(value: unknown): ValidationResult {
  const valueStr = String(value).trim();
  
  // Try to parse as date
  const date = new Date(valueStr);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Must be a valid date'
    };
  }
  
  return { isValid: true };
}

/**
 * Validate select/lookup values
 * - Must be one of the allowed options (if options provided)
 */
function validateSelect(value: unknown, column: GridColumn): ValidationResult {
  const valueStr = String(value).trim();
  
  // If no options defined, any value is valid
  if (!column.lookupOptions || column.lookupOptions.length === 0) {
    return { isValid: true };
  }
  
  // Check if value matches any option ID or display value
  const isValid = column.lookupOptions.some(
    option => option.id === valueStr || option.displayValue === valueStr
  );
  
  if (!isValid) {
    return {
      isValid: false,
      errorMessage: 'Must be a valid option'
    };
  }
  
  return { isValid: true };
}

/**
 * Validate text values
 * - Currently allows any text
 * - Future: Add max length, pattern matching, etc.
 */
function validateText(value: unknown): ValidationResult {
  // For now, accept any text value
  return { isValid: true };
}

/**
 * Validate multiple cells at once
 * 
 * @param cellValues - Map of cellKey to value
 * @param columns - Array of column definitions
 * @returns Map of cellKey to error message (only invalid cells)
 */
export function validateMultipleCells(
  cellValues: Map<string, unknown>,
  columns: GridColumn[]
): Map<string, string> {
  const errors = new Map<string, string>();
  
  // Create a map of column prop to column for quick lookup
  const columnMap = new Map<string, GridColumn>();
  columns.forEach(col => columnMap.set(col.prop, col));
  
  // Validate each cell
  cellValues.forEach((value, cellKey) => {
    const [, columnProp] = cellKey.split('|');
    const column = columnMap.get(columnProp);
    
    if (column) {
      const result = validateCellValue(value, column);
      if (!result.isValid && result.errorMessage) {
        errors.set(cellKey, result.errorMessage);
      }
    }
  });
  
  return errors;
}
