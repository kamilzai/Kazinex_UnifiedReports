/**
 * useRowOperations Hook
 * 
 * Custom React hook for managing row add/delete operations.
 * Handles both in-memory (unsaved) and persisted (Dataverse) rows.
 */

import * as React from 'react';
import type { DataverseService } from '../services/DataverseService';
import type { ReportData, ReportStructure } from '../types/dataverse.types';
import { createDebugLogger } from '../utils/debugLogger';

const rowOpsDebugLog = createDebugLogger('useRowOperations');

export interface UseRowOperationsResult {
  // State
  isAddingRow: boolean;
  isDeletingRow: boolean;
  operationError: string | null;
  
  // Actions
  addNewRow: (sectionId: string, sliceId: string | null, structures: ReportStructure[], currentRows: ReportData[]) => ReportData | null;
  deleteRow: (sectionId: string, row: ReportData) => Promise<boolean>;
  clearError: () => void;
}

export function useRowOperations(
  dataverseService: DataverseService | null
): UseRowOperationsResult {
  const [isAddingRow, setIsAddingRow] = React.useState(false);
  const [isDeletingRow, setIsDeletingRow] = React.useState(false);
  const [operationError, setOperationError] = React.useState<string | null>(null);

  /**
   * Add a new row to the grid IN MEMORY
   * Row is only saved to Dataverse when user clicks Save button
   */
  const addNewRow = React.useCallback(
    (
      sectionId: string,
      sliceId: string | null,
      structures: ReportStructure[],
      currentRows: ReportData[]
    ): ReportData | null => {
      if (!dataverseService) {
        setOperationError('Data service not initialized');
        return null;
      }

      // // console.log(...)
      setIsAddingRow(true);
      setOperationError(null);

      try {
        // Calculate next groupsort (max + 1)
        const maxGroupSort = currentRows.length > 0
          ? Math.max(...currentRows.map(r => r.kazinex_groupsort as number))
          : 0;
        
        const newGroupSort = maxGroupSort + 1;
        
        // // console.log(...)

        // Create the new row in memory only (no Dataverse call)
        const newRow = dataverseService.createNewRowInMemory(
          sectionId,
          sliceId,
          structures,
          newGroupSort
        );

        // // console.log(...)
        return newRow;
      } catch (error) {
        const errorMsg = (error as Error).message;
        // // console.error(...)
        setOperationError(errorMsg);
        return null;
      } finally {
        setIsAddingRow(false);
      }
    },
    [dataverseService]
  );

  /**
   * Delete a row from the grid
   * Handles both unsaved (in-memory) and saved (Dataverse) rows
   */
  const deleteRow = React.useCallback(
    async (sectionId: string, row: ReportData): Promise<boolean> => {
      if (!dataverseService) {
        setOperationError('Data service not initialized');
        return false;
      }

      // Check if this is a new row that hasn't been saved yet (has temp ID)
      const isNewUnsavedRow = row._isNewRow === true || String(row.kazinex_reportdataid).startsWith('temp-row-');
      
      if (isNewUnsavedRow) {
        // New row that hasn't been saved - no need to delete from Dataverse
        rowOpsDebugLog(`[useRowOperations] Skipping Dataverse delete for new unsaved row ${row.kazinex_reportdataid}`);
        return true; // Success - just remove from UI
      }

      // // console.log(...)
      setIsDeletingRow(true);
      setOperationError(null);

      try {
        const groupSort = row.kazinex_groupsort as number;
        const group = row.kazinex_group as string;
        const sliceId = (row._actualSliceId as string | null) || null;

        // // console.log(...)

        // Delete all EAV records for this row from Dataverse
        const result = await dataverseService.deleteRow(sectionId, groupSort, group, sliceId);

        if (result.success) {
          // // console.log(...)
          return true;
        } else {
          setOperationError(result.error || 'Delete failed');
          return false;
        }
      } catch (error) {
        const errorMsg = (error as Error).message;
        // // console.error(...)
        setOperationError(errorMsg);
        return false;
      } finally {
        setIsDeletingRow(false);
      }
    },
    [dataverseService]
  );

  const clearError = React.useCallback(() => {
    setOperationError(null);
  }, []);

  return {
    isAddingRow,
    isDeletingRow,
    operationError,
    addNewRow,
    deleteRow,
    clearError,
  };
}

