/**
 * useMultiSectionGridState Hook
 * 
 * Custom React hook for managing grid editing state across multiple sections.
 * Unlike useGridState, this preserves changes when switching tabs.
 * 
 * Day 5: Multi-section dirty tracking
 */

import * as React from 'react';
import type { CellEdit } from '../types/grid.types';

/**
 * Hook result interface
 */
export interface UseMultiSectionGridStateResult {
  // Dirty changes tracking per section
  getDirtyChangesForSection: (sectionId: string) => CellEdit[];
  getDirtyCountForSection: (sectionId: string) => number;
  hasDirtyChangesForSection: (sectionId: string) => boolean;
  getTotalDirtyCount: () => number;
  hasDirtyChanges: boolean;
  
  // Actions
  recordEdit: (sectionId: string, rowId: string, columnProp: string, oldValue: unknown, newValue: unknown) => void;
  clearDirtyChangesForSection: (sectionId: string) => void;
  clearDirtyChangesForRows: (sectionId: string, rowIds: Set<string>) => void;
  clearAllDirtyChanges: () => void;
  
  // Validation
  validationErrors: Map<string, string>;
  hasValidationErrors: boolean;
  setValidationError: (cellKey: string, error: string) => void;
  clearValidationError: (cellKey: string) => void;
}

/**
 * Normalize values for comparison
 * Handles numbers with comma formatting (e.g., "1,234" vs 1234)
 */
function normalizeValue(value: unknown): unknown {
  // Handle null/undefined
  if (value === null || value === undefined) return value;
  
  // If it's a string that looks like a number with commas, parse it
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Check if it looks like a formatted number (e.g., "1,234" or "1,234.56")
    if (/^-?[\d,]+\.?\d*$/.test(trimmed)) {
      const parsed = parseFloat(trimmed.replace(/,/g, ''));
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  
  return value;
}

/**
 * Check if two values are equal, with special handling for numbers
 */
function valuesAreEqual(value1: unknown, value2: unknown): boolean {
  const norm1 = normalizeValue(value1);
  const norm2 = normalizeValue(value2);
  
  // Direct comparison after normalization
  if (norm1 === norm2) return true;
  
  // Special case: both are numbers (after normalization)
  if (typeof norm1 === 'number' && typeof norm2 === 'number') {
    // Check if they're the same within floating point precision
    return Math.abs(norm1 - norm2) < Number.EPSILON;
  }
  
  return false;
}

/**
 * Custom hook for managing grid editing state across multiple sections
 * 
 * @returns Multi-section grid state and actions
 */
export function useMultiSectionGridState(): UseMultiSectionGridStateResult {
  // Dirty changes per section - Map<sectionId, Map<cellKey, CellEdit>>
  const [dirtyChangesBySection, setDirtyChangesBySection] = React.useState<
    Map<string, Map<string, CellEdit>>
  >(new Map());
  
  // Validation errors - keyed by "sectionId|rowId|columnProp"
  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());

  /**
   * Record a cell edit for a specific section
   */
  const recordEdit = React.useCallback(
    (sectionId: string, rowId: string, columnProp: string, oldValue: unknown, newValue: unknown) => {
      // Skip if value hasn't actually changed (with normalization for numbers)
      if (valuesAreEqual(oldValue, newValue)) {
        // // console.log(...), skipping edit:', oldValue, '===', newValue);
        return;
      }

      const cellKey = `${rowId}|${columnProp}`;
      // // console.log(...)

      setDirtyChangesBySection((prev) => {
        const updated = new Map(prev);
        
        // Get or create section's dirty changes map
        let sectionChanges = updated.get(sectionId);
        if (!sectionChanges) {
          sectionChanges = new Map();
          updated.set(sectionId, sectionChanges);
        }
        
        // Add/update the cell edit
        sectionChanges.set(cellKey, {
          rowId,
          columnProp,
          oldValue,
          newValue,
          timestamp: new Date(),
        });
        
        return updated;
      });
    },
    []
  );

  /**
   * Get dirty changes for a specific section as array
   */
  const getDirtyChangesForSection = React.useCallback(
    (sectionId: string): CellEdit[] => {
      const sectionChanges = dirtyChangesBySection.get(sectionId);
      if (!sectionChanges) return [];
      return Array.from(sectionChanges.values());
    },
    [dirtyChangesBySection]
  );

  /**
   * Get dirty count for a specific section
   */
  const getDirtyCountForSection = React.useCallback(
    (sectionId: string): number => {
      const sectionChanges = dirtyChangesBySection.get(sectionId);
      return sectionChanges ? sectionChanges.size : 0;
    },
    [dirtyChangesBySection]
  );

  /**
   * Check if a section has dirty changes
   */
  const hasDirtyChangesForSection = React.useCallback(
    (sectionId: string): boolean => {
      return getDirtyCountForSection(sectionId) > 0;
    },
    [getDirtyCountForSection]
  );

  /**
   * Get total dirty count across all sections
   */
  const getTotalDirtyCount = React.useCallback((): number => {
    let total = 0;
    dirtyChangesBySection.forEach((sectionChanges) => {
      total += sectionChanges.size;
    });
    return total;
  }, [dirtyChangesBySection]);

  /**
   * Clear dirty changes for a specific section
   */
  const clearDirtyChangesForSection = React.useCallback((sectionId: string) => {
    // // console.log(...)
    
    // Get the cell keys from the section before deleting
    const sectionChanges = dirtyChangesBySection.get(sectionId);
    const cellKeysInSection = sectionChanges ? Array.from(sectionChanges.keys()) : [];
    
    // Clear dirty changes for section
    setDirtyChangesBySection((prev) => {
      const updated = new Map(prev);
      updated.delete(sectionId);
      return updated;
    });
    
    // Clear validation errors for cells in this section
    if (cellKeysInSection.length > 0) {
      setValidationErrors((prev) => {
        const updated = new Map(prev);
        cellKeysInSection.forEach(cellKey => {
          updated.delete(cellKey);
        });
        return updated;
      });
    }
  }, [dirtyChangesBySection]);

  /**
   * Clear dirty changes for specific rows in a section
   */
  const clearDirtyChangesForRows = React.useCallback((sectionId: string, rowIds: Set<string>) => {
    // // console.log(...));
    
    setDirtyChangesBySection((prev) => {
      const sectionChanges = prev.get(sectionId);
      if (!sectionChanges) return prev;
      
      const updated = new Map(prev);
      const updatedSection = new Map(sectionChanges);
      
      // Remove changes for specified rows
      Array.from(updatedSection.keys()).forEach(cellKey => {
        const rowId = cellKey.split('|')[0];
        if (rowIds.has(rowId)) {
          updatedSection.delete(cellKey);
        }
      });
      
      if (updatedSection.size === 0) {
        updated.delete(sectionId);
      } else {
        updated.set(sectionId, updatedSection);
      }
      
      return updated;
    });
    
    // Clear validation errors for these rows
    setValidationErrors((prev) => {
      const updated = new Map(prev);
      Array.from(prev.keys()).forEach(cellKey => {
        const rowId = cellKey.split('|')[0];
        if (rowIds.has(rowId)) {
          updated.delete(cellKey);
        }
      });
      return updated;
    });
  }, []);

  /**
   * Clear all dirty changes across all sections
   */
  const clearAllDirtyChanges = React.useCallback(() => {
    // // console.log(...)
    setDirtyChangesBySection(new Map());
    setValidationErrors(new Map());
  }, []);

  /**
   * Set validation error for a cell
   */
  const setValidationError = React.useCallback((cellKey: string, error: string) => {
    // // console.log(...)
    setValidationErrors((prev) => {
      const updated = new Map(prev);
      updated.set(cellKey, error);
      return updated;
    });
  }, []);

  /**
   * Clear validation error for a cell
   */
  const clearValidationError = React.useCallback((cellKey: string) => {
    setValidationErrors((prev) => {
      const updated = new Map(prev);
      updated.delete(cellKey);
      return updated;
    });
  }, []);

  // Computed values
  const hasDirtyChanges = getTotalDirtyCount() > 0;
  const hasValidationErrors = validationErrors.size > 0;

  return {
    // Dirty changes per section
    getDirtyChangesForSection,
    getDirtyCountForSection,
    hasDirtyChangesForSection,
    getTotalDirtyCount,
    hasDirtyChanges,
    
    // Actions
    recordEdit,
    clearDirtyChangesForSection,
    clearDirtyChangesForRows,
    clearAllDirtyChanges,
    
    // Validation
    validationErrors,
    hasValidationErrors,
    setValidationError,
    clearValidationError,
  };
}

