/**
 * useGridState Hook
 * 
 * Custom React hook for managing grid editing state.
 * Tracks dirty changes, cell selection, and validation errors.
 * 
 * Day 4: Memory-first editing pattern
 */

import * as React from 'react';
import type { CellEdit } from '../types/grid.types';

/**
 * Hook result interface
 */
export interface UseGridStateResult {
  // Dirty changes tracking
  dirtyChanges: Map<string, CellEdit>;
  hasDirtyChanges: boolean;
  dirtyCount: number;
  
  // Actions
  recordEdit: (rowId: string, columnProp: string, oldValue: unknown, newValue: unknown) => void;
  clearDirtyChanges: () => void;
  clearDirtyChangesForRows: (rowIds: Set<string>) => void;
  getDirtyChangesArray: () => CellEdit[];
  
  // Validation
  validationErrors: Map<string, string>;
  hasValidationErrors: boolean;
  setValidationError: (cellKey: string, error: string) => void;
  clearValidationError: (cellKey: string) => void;
}

/**
 * Custom hook for managing grid editing state
 * 
 * @param sectionId - Current report section ID
 * @returns Grid state and actions
 */
export function useGridState(sectionId: string | null): UseGridStateResult {
  // Dirty changes - keyed by "rowId|columnProp"
  const [dirtyChanges, setDirtyChanges] = React.useState<Map<string, CellEdit>>(new Map());
  
  // Validation errors - keyed by "rowId|columnProp"
  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());

  // Clear dirty changes when section changes
  React.useEffect(() => {
    if (sectionId) {
      // // console.log(...)
      setDirtyChanges(new Map());
      setValidationErrors(new Map());
    }
  }, [sectionId]);

  /**
   * Record a cell edit
   */
  const recordEdit = React.useCallback(
    (rowId: string, columnProp: string, oldValue: unknown, newValue: unknown) => {
      // Skip if value hasn't actually changed
      if (oldValue === newValue) {
        // // console.log(...)
        return;
      }

      const cellKey = `${rowId}|${columnProp}`;
      // // console.log(...)

      setDirtyChanges((prev) => {
        const updated = new Map(prev);
        updated.set(cellKey, {
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
   * Clear all dirty changes
   */
  const clearDirtyChanges = React.useCallback(() => {
    // // console.log(...)
    setDirtyChanges(new Map());
    setValidationErrors(new Map());
  }, []);

  /**
   * Clear dirty changes for specific rows
   */
  const clearDirtyChangesForRows = React.useCallback((rowIds: Set<string>) => {
    // // console.log(...));
    setDirtyChanges((prev) => {
      const updated = new Map(prev);
      Array.from(prev.keys()).forEach(cellKey => {
        const rowId = cellKey.split('|')[0];
        if (rowIds.has(rowId)) {
          updated.delete(cellKey);
        }
      });
      return updated;
    });
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
   * Get dirty changes as array
   */
  const getDirtyChangesArray = React.useCallback((): CellEdit[] => {
    return Array.from(dirtyChanges.values());
  }, [dirtyChanges]);

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
  const hasDirtyChanges = dirtyChanges.size > 0;
  const dirtyCount = dirtyChanges.size;
  const hasValidationErrors = validationErrors.size > 0;

  return {
    // Dirty changes
    dirtyChanges,
    hasDirtyChanges,
    dirtyCount,
    
    // Actions
    recordEdit,
    clearDirtyChanges,
    clearDirtyChangesForRows,
    getDirtyChangesArray,
    
    // Validation
    validationErrors,
    hasValidationErrors,
    setValidationError,
    clearValidationError,
  };
}

