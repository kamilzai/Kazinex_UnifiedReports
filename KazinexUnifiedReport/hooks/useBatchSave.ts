import * as React from 'react';
import type { DataverseService } from '../services/DataverseService';
import type { CellEdit } from '../types/grid.types';
import type { DataUpdate, ReportData, ReportStructure } from '../types/dataverse.types';

/**
 * Batch Save Hook
 * 
 * Purpose: Handle saving multiple cell edits to Dataverse in a single batch operation
 * 
 * Features:
 * - Converts cell edits to Dataverse update format
 * - Batch API calls for performance
 * - Progress tracking during save
 * - Success/error state management
 * - Optimistic UI updates
 * 
 * Usage:
 * ```typescript
 * const { saveChanges, isSaving, saveError, saveSuccess } = useBatchSave(dataverseService);
 * 
 * // Save changes
 * await saveChanges(sectionId, dirtyChangesArray);
 * ```
 */

export interface SaveProgress {
  currentItem: number;
  totalItems: number;
  percentComplete: number;
  context?: string;
}

export interface UseBatchSaveResult {
  // Actions
  saveChanges: (
    sectionId: string, 
    sliceId: string | null, 
    changes: CellEdit[], 
    rowsData: Record<string, unknown>[],
    structures: ReportStructure[],
    onProgress?: (progress: SaveProgress) => void
  ) => Promise<void>;
  clearSaveState: () => void;
  
  // State
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  savedCount: number;
  saveProgress: SaveProgress | null;
}

export function useBatchSave(
  dataverseService: DataverseService | null
): UseBatchSaveResult {
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<boolean>(false);
  const [savedCount, setSavedCount] = React.useState<number>(0);
  const [saveProgress, setSaveProgress] = React.useState<SaveProgress | null>(null);

  /**
   * Convert cell edits to Dataverse update format
   * Each cell edit becomes a separate DataUpdate record
   * 
   * IMPORTANT: In EAV model, each cell has its own reportdata record ID stored in _eavRecordIds
   */
  const convertToDataverseUpdates = React.useCallback((
    changes: CellEdit[], 
    rowsData: Record<string, unknown>[],
    sectionId: string,
    sliceId: string | null,
    structures: ReportStructure[]  // NEW: Pass structures to always find structure IDs
  ): DataUpdate[] => {
    // // console.log(...)
    
    // Convert each cell edit to DataUpdate format
    const updates: DataUpdate[] = changes.map(change => {
      // Find the row data for this edit
      const rowData = rowsData.find(row => row.id === change.rowId || row.kazinex_reportdataid === change.rowId);
      
      // Check if EAV record exists for this specific cell
      let eavRecordId: string | null = null;
      let needsCreate = false;
      
      if (rowData && rowData._eavRecordIds) {
        const eavRecordIds = rowData._eavRecordIds as Record<string, string>;
        if (eavRecordIds[change.columnProp]) {
          eavRecordId = eavRecordIds[change.columnProp];
          // // console.log(...)
        } else {
          // Cell doesn't have an EAV record yet - needs CREATE
          needsCreate = true;
          console.log(`[useBatchSave] Cell ${change.rowId}|${change.columnProp} needs CREATE (no EAV record exists)`);
        }
      } else {
        // No _eavRecordIds at all - needs CREATE
        needsCreate = true;
        console.log(`[useBatchSave] Row ${change.rowId} has no _eavRecordIds - cell ${change.columnProp} needs CREATE`);
      }
      
      // Build the update object
      const update: DataUpdate = {
        kazinex_reportdataid: eavRecordId || change.rowId, // Use EAV record ID if exists, else logical row ID
        columnName: change.columnProp,
        value: change.newValue,
        previousValue: change.oldValue,
        needsCreate,
      };
      
      // If creating, add context needed for CREATE operation
      if (needsCreate && rowData) {
        // Find the structure (column definition) for this cell from passed structures
        const structure = structures.find((s: ReportStructure) => s.kazinex_columnname === change.columnProp);
        
        // CRITICAL: Get sectionId/sliceId from the row's stored metadata (extracted from existing cells during pivot)
        // These values come from the existing cells in THIS SPECIFIC ROW, not from UI context
        let actualSectionId = (rowData._actualSectionId as string) || sectionId;
        let actualSliceId = (rowData._actualSliceId as string | null) || sliceId;
        
        // Get group and groupSort from actual row data fields (not metadata fields)
        // These are the real fields that exist on the row, stored during pivoting
        // CRITICAL: Use kazinex_groupsort (the actual field) not _groupSort (metadata)
        const group = (rowData.kazinex_group as string) || (rowData._group as string) || '';
        const groupSort = (rowData.kazinex_groupsort as number) ?? (rowData._groupSort as number) ?? 0;
        
        console.log(`[useBatchSave] Creating cell ${change.columnProp} in row ${change.rowId}`);
        console.log(`[useBatchSave] - rowData.kazinex_groupsort=${rowData.kazinex_groupsort}, rowData._groupSort=${rowData._groupSort}`);
        console.log(`[useBatchSave] - final groupSort=${groupSort}, group=${group}`);
        console.log(`[useBatchSave] - section=${actualSectionId}, slice=${actualSliceId}`);
        console.log(`[useBatchSave] - structure=${structure?.kazinex_reportstructureid}`);
        
        if (!structure) {
          console.error(`[useBatchSave] Structure not found for column ${change.columnProp}!`);
        }
        
        update.createContext = {
          sectionId: actualSectionId,
          sliceId: actualSliceId,
          structureId: structure?.kazinex_reportstructureid || '',
          group: group,
          groupSort: groupSort,
        };
      }
      
      return update;
    });
    
    // // console.log(...)
    return updates;
  }, []);

  /**
   * Save changes to Dataverse
   * Handles both:
   * 1. New rows (creates EAV records)
   * 2. Edited cells (updates existing EAV records)
   */
  const saveChanges = React.useCallback(
    async (
      sectionId: string, 
      sliceId: string | null, 
      changes: CellEdit[], 
      rowsData: Record<string, unknown>[],
      structures: ReportStructure[],  // NEW: Need structures to find structure IDs
      onProgress?: (progress: SaveProgress) => void
    ) => {
      if (!dataverseService) {
        // // console.error(...)
        setSaveError('Data service not initialized');
        return;
      }

      if (changes.length === 0) {
        // // console.log(...)
        return;
      }

      // // console.log(...)
      
      // Reset state
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      setSavedCount(0);
      setSaveProgress(null);

      try {
        // Helper function to apply changes to a row
        const applyChangesToRow = (row: ReportData): ReportData => {
          const updatedRow = { ...row };
          const rowChanges = changes.filter(c => c.rowId === row.kazinex_reportdataid);
          
          rowChanges.forEach(change => {
            updatedRow[change.columnProp] = change.newValue;
          });
          
          // // console.log(...)
          return updatedRow;
        };

        // Step 1: Identify new rows (rows with _isNewRow flag)
        const newRowIds = new Set<string>();
        const newRowsToSave: { rowData: Record<string, unknown>; structures: unknown[] }[] = [];
        
        rowsData.forEach(row => {
          if (row._isNewRow && row.kazinex_reportdataid) {
            const rowId = row.kazinex_reportdataid as string;
            const hasChanges = changes.some(c => c.rowId === rowId);
            
            if (hasChanges) {
              newRowIds.add(rowId);
              // Apply changes to the row before passing to saveNewRows
              const updatedRow = applyChangesToRow(row as ReportData);
              newRowsToSave.push({
                rowData: updatedRow,
                structures: row._structures as unknown[]
              });
            }
          }
        });

        // // console.log(...)
        
        // Calculate total operations for progress tracking
        const totalOperations = changes.length;
        let completedOperations = 0;
        
        // Helper to update progress
        const updateProgress = async (current: number, context?: string) => {
          const progress: SaveProgress = {
            currentItem: current,
            totalItems: totalOperations,
            percentComplete: Math.round((current / totalOperations) * 100),
            context
          };
          setSaveProgress(progress);
          onProgress?.(progress);
          
          // Small delay to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 50));
        };

        // Step 2: Save new rows (create EAV records)
        if (newRowsToSave.length > 0) {
          // Count changes for new rows upfront
          const newRowChangesCount = changes.filter(c => newRowIds.has(c.rowId)).length;
          
          // // console.log(...)
          await updateProgress(0, 'Creating new rows...');
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await dataverseService.saveNewRows(sectionId, sliceId, newRowsToSave as any);
          
          completedOperations += newRowChangesCount;
          await updateProgress(completedOperations, `Created ${newRowsToSave.length} new rows`);
          
          // // console.log(...)
        }

        // Step 3: Filter changes - only update existing rows (exclude new rows)
        const updateChanges = changes.filter(change => !newRowIds.has(change.rowId));
        
        // // console.log(...)

        // Step 4: Update existing rows (or create missing cells)
        if (updateChanges.length > 0) {
          await updateProgress(completedOperations, `Updating ${updateChanges.length} cells...`);
          
          const updates = convertToDataverseUpdates(updateChanges, rowsData, sectionId, sliceId, structures);
          
          // // console.log(...)
          const result = await dataverseService.batchUpdateData(updates, (current, total) => {
            // Update progress as each cell is saved
            const itemsCompleted = (newRowsToSave.length > 0 ? changes.filter(c => newRowIds.has(c.rowId)).length : 0) + current;
            updateProgress(itemsCompleted, `Saving cell ${current} of ${total}...`);
          });
          
          completedOperations += updateChanges.length;
          await updateProgress(completedOperations, 'All changes saved');
          
          // // console.log(...)
        }
        
        // // console.log(...)
        
        // Update success state
        setSaveSuccess(true);
        setSavedCount(changes.length);
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
          setSavedCount(0);
        }, 3000);
        
      } catch (error) {
        // // console.error(...)
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to save changes';
        
        setSaveError(errorMessage);
        
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setSaveError(null);
        }, 5000);
        
      } finally {
        setIsSaving(false);
      }
    },
    [dataverseService, convertToDataverseUpdates]
  );

  /**
   * Clear save state (success/error messages)
   */
  const clearSaveState = React.useCallback(() => {
    // // console.log(...)
    setSaveError(null);
    setSaveSuccess(false);
    setSavedCount(0);
    setSaveProgress(null);
  }, []);

  return {
    saveChanges,
    clearSaveState,
    isSaving,
    saveError,
    saveSuccess,
    savedCount,
    saveProgress,
  };
}

