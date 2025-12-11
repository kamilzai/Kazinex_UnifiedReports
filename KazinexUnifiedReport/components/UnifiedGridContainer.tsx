/**
 * UnifiedGridContainer Component
 * 
 * Main orchestrator component that:
 * - Manages report data loading
 * - Coordinates between tabs and grid
 * - Handles state management
 * 
 * Day 3: Basic integration with mock data
 * Day 4: Add tab navigation and transformers
 * Day 5: Add action bar and save functionality
 */

import * as React from 'react';
import { PowerAppsGridWrapper } from './PowerAppsGridWrapper';
import { PremiumToolbar } from './PremiumToolbar';
import { PremiumTabBar } from './PremiumTabBar';
import { LoadingSpinner } from './LoadingSpinner';
import { BulkImageUploadHandler } from './editors/BulkImageUploadHandler';
import { ImageBulkUploadZone } from './ImageBulkUploadZone';
import { ConfirmDialog } from './ConfirmDialog';
import { DataverseService } from '../services/DataverseService';
import { SliceCopyService } from '../services/SliceCopyService';
import { useReportData } from '../hooks/useReportData';
import { useMultiSectionGridState } from '../hooks/useMultiSectionGridState';
import { useBatchSave } from '../hooks/useBatchSave';
import { useRowOperations } from '../hooks/useRowOperations';
import { useCopyFromPreviousSlice } from '../hooks/useCopyFromPreviousSlice';
import { CopyFromPreviousSliceDialog } from './dialogs/CopyFromPreviousSliceDialog';
import { OperationProgressDialog } from './dialogs/OperationProgressDialog';
import type { OperationProgress } from './dialogs/OperationProgressDialog';
import { transformStructuresToColumns, transformReportDataToRows } from '../utils/dataTransformers';
import type { IInputs } from '../generated/ManifestTypes';
import type { ReportData } from '../types/dataverse.types';
import { createDebugLogger } from '../utils/debugLogger';

interface UnifiedGridContainerProps {
  context: ComponentFramework.Context<IInputs>;
  width: number;
  height: number;
  containerHeight?: string;
}

const containerDebugLog = createDebugLogger('UnifiedGridContainer');

/**
 * Main container component for the unified report grid
 */
export const UnifiedGridContainer: React.FC<UnifiedGridContainerProps> = ({
  context,
  width,
  height,
  containerHeight = '60vh', // Default to 60vh
}) => {
  // Initialize Dataverse service
  const dataverseService = React.useMemo(() => {
    // // console.log(...)
    return new DataverseService(context);
  }, [context]);

  // Initialize SliceCopy service
  const sliceCopyService = React.useMemo(() => {
    return new SliceCopyService(context);
  }, [context]);

  // Get configuration from context parameters
  const enableImageFunctionality = React.useMemo(() => {
    return context.parameters.enableImageFunctionality?.raw ?? true; // Default to true if not set
  }, [context.parameters.enableImageFunctionality]);

  const enableBulkUpload = React.useMemo(() => {
    return context.parameters.enableBulkUpload?.raw ?? true; // Default to true if not set
  }, [context.parameters.enableBulkUpload]);

  // Get slice ID with Canvas App compatibility
  // Priority order:
  // 1. Input property (reportSliceId) - for Canvas Apps and explicit binding
  // 2. Form context (entity record ID) - for Model-Driven Apps on form
  // 3. Dataset context - for Model-Driven Apps on grid
  const sliceId = React.useMemo(() => {
    // PRIORITY 1: Try input property first (Canvas App compatibility)
    // Canvas apps must provide slice GUID via reportSliceId property
    const inputSliceId = context.parameters.reportSliceId?.raw;
    if (inputSliceId) {
      containerDebugLog('[UnifiedGridContainer] Using slice ID from input property (Canvas/explicit):', inputSliceId);
      return inputSliceId;
    }
    
    // PRIORITY 2: Try form context (Model-Driven App on form)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contextWithMode = context as any;
    const recordId = contextWithMode.mode?.contextInfo?.entityId;
    if (recordId) {
      containerDebugLog('[UnifiedGridContainer] Using slice ID from form context (Model-Driven):', recordId);
      return recordId;
    }
    
    // PRIORITY 3: Try dataset context (Model-Driven App on grid)
    const datasetContext = context.parameters.reportDataSet;
    if (datasetContext && !datasetContext.loading) {
      const records = datasetContext.records;
      const recordIds = datasetContext.sortedRecordIds;
      if (recordIds && recordIds.length > 0) {
        const firstRecordId = recordIds[0];
        containerDebugLog('[UnifiedGridContainer] Using slice ID from dataset context:', firstRecordId);
        return firstRecordId;
      }
    }
    
    containerDebugLog('[UnifiedGridContainer] No slice ID found. Ensure reportSliceId is provided (Canvas) or control is on Report Slice form/grid (Model-Driven).');
    return null;
  }, [context]);

  const {
    sections,
    activeSection,
    structures,
    data,
    loading,
    error,
    setActiveSection,
    refresh,
  } = useReportData(dataverseService, sliceId);

  // Use multi-section grid state hook for dirty tracking across all tabs
  const gridState = useMultiSectionGridState();

  // Use batch save hook
  const {
    saveChanges,
    isSaving,
    saveError,
    saveSuccess,
    savedCount,
  } = useBatchSave(dataverseService);

  // Use row operations hook
  const {
    addNewRow,
    deleteRow,
    isAddingRow,
    isDeletingRow,
    operationError,
  } = useRowOperations(dataverseService);

  // State for current report design (needed for filtering compatible slices)
  const [currentReportDesignId, setCurrentReportDesignId] = React.useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null);

  // Use copy from previous slice hook
  const copyHook = useCopyFromPreviousSlice({
    currentSliceId: sliceId,
    currentReportDesignId: currentReportDesignId,
    currentProjectId: currentProjectId,
    dataverseService: dataverseService,
    sliceCopyService: sliceCopyService,
    onCopyComplete: () => {
      // Refresh data after copy
      refresh();
    }
  });

  // Local state to track rows including newly added ones
  const [localRows, setLocalRows] = React.useState<ReportData[]>([]);

  // Row selection state for delete operations
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());

  // Delete confirmation dialog state
  const [deleteConfirmDialog, setDeleteConfirmDialog] = React.useState<{
    isOpen: boolean;
    rowCount: number;
    onConfirm: () => void;
  }>({
    isOpen: false,
    rowCount: 0,
    onConfirm: () => {},
  });
  
  // Save progress state
  const [saveProgress, setSaveProgress] = React.useState<OperationProgress | null>(null);
  const [showSaveProgress, setShowSaveProgress] = React.useState(false);
  
  // Delete progress state
  const [deleteProgress, setDeleteProgress] = React.useState<OperationProgress | null>(null);
  const [showDeleteProgress, setShowDeleteProgress] = React.useState(false);

  // Bulk image upload state
  const [bulkImageUpload, setBulkImageUpload] = React.useState<{
    visible: boolean;
    files: File[];
    startRowIndex: number;
    columnName: string;
  } | null>(null);

  // Scroll position preservation per section
  const scrollPositions = React.useRef<Map<string, { top: number; left: number }>>(new Map());
  const gridContentRef = React.useRef<HTMLDivElement>(null);

  // Get dirty count across ALL sections (for Save All / Cancel All)
  const currentSectionId = activeSection?.kazinex_reportsectionid || '';
  const totalDirtyCount = gridState.getTotalDirtyCount(); // All tabs
  const currentSectionDirtyCount = gridState.getDirtyCountForSection(currentSectionId); // Current tab only
  const hasDirtyChanges = gridState.hasDirtyChanges;
  
  // Count how many sections have dirty changes (for multi-tab indication)
  const sectionsWithChangesCount = React.useMemo(() => {
    return sections.filter(section => 
      gridState.hasDirtyChangesForSection(section.kazinex_reportsectionid)
    ).length;
  }, [sections, gridState, totalDirtyCount]); // Re-compute when dirty count changes

  // Update local rows when data changes
  React.useEffect(() => {
    setLocalRows(data);
  }, [data]);

  // Auto-create empty row for single-row sections (grouping = false)
  React.useEffect(() => {
    if (!activeSection || !currentSectionId || !sliceId || !structures || structures.length === 0) {
      return;
    }

    const isSingleRowSection = activeSection.kazinex_grouping === false;
    const hasNoRows = localRows.length === 0;

    if (isSingleRowSection && hasNoRows) {
      containerDebugLog('[UnifiedGridContainer] Auto-creating empty row for single-row section:', activeSection.kazinex_name);
      
      // Create an empty row (will become dirty when user edits, just like normal Add Row)
      const newRow = addNewRow(currentSectionId, sliceId, structures, localRows);
      if (newRow) {
        setLocalRows([newRow]);
      }
    }
  }, [activeSection, currentSectionId, sliceId, structures, localRows.length]);

  // Clear selection when switching sections
  React.useEffect(() => {
    setSelectedRowIds(new Set());
  }, [currentSectionId]);

  // Load report design ID when slice changes
  React.useEffect(() => {
    const loadReportDesignId = async () => {
      containerDebugLog('[UnifiedGridContainer] loadReportDesignId effect running:', { sliceId, hasDataverseService: !!dataverseService });
      
      if (!sliceId || !dataverseService) {
        containerDebugLog('[UnifiedGridContainer] Missing sliceId or dataverseService, setting reportDesignId to null');
        setCurrentReportDesignId(null);
        return;
      }

      try {
        // Use DataverseService method which handles table prefix correctly
        const reportDesignId = await dataverseService.getReportDesignIdForSlice(sliceId);
        
        containerDebugLog('[UnifiedGridContainer] Loaded report design ID:', reportDesignId, 'from slice:', sliceId);
        
        setCurrentReportDesignId(reportDesignId);
      } catch (error) {
        console.error('[UnifiedGridContainer] Error loading report design:', error);
        setCurrentReportDesignId(null);
      }
    };

    loadReportDesignId();
  }, [sliceId, dataverseService, context]);

  // Load project ID when slice changes
  React.useEffect(() => {
    const loadProjectId = async () => {
      containerDebugLog('[UnifiedGridContainer] loadProjectId effect running:', { sliceId, hasDataverseService: !!dataverseService });
      
      if (!sliceId || !dataverseService) {
        containerDebugLog('[UnifiedGridContainer] Missing sliceId or dataverseService, setting projectId to null');
        setCurrentProjectId(null);
        return;
      }

      try {
        // Use DataverseService method which handles table prefix correctly
        const projectId = await dataverseService.getProjectIdForSlice(sliceId);
        
        containerDebugLog('[UnifiedGridContainer] Loaded project ID:', projectId, 'from slice:', sliceId);
        
        setCurrentProjectId(projectId);
      } catch (error) {
        console.error('[UnifiedGridContainer] Error loading project ID:', error);
        setCurrentProjectId(null);
      }
    };

    loadProjectId();
  }, [sliceId, dataverseService, context]);

  // Transform data for grid display
  const gridColumns = React.useMemo(() => {
    if (structures.length === 0) return [];
    // // console.log(...)
    
    // Calculate available width (viewport width minus margins and scrollbar)
    const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 100 : undefined;
    
    return transformStructuresToColumns(structures, availableWidth);
  }, [structures]);

  const gridRows = React.useMemo(() => {
    if (localRows.length === 0 || structures.length === 0) return [];
    // // console.log(...)
    return transformReportDataToRows(localRows, structures);
  }, [localRows, structures]);

  // Check if current section has any image columns
  const imageColumn = React.useMemo(() => {
    if (structures.length === 0) return null;
    
    containerDebugLog('[UnifiedGridContainer] Checking for image columns in structures:', structures.map(s => ({
      columnName: s.kazinex_columnname,
      displayName: s.kazinex_columndisplayname,
      datatype: s.kazinex_datatype,
      cra59: s.cra59_datatype,
      columntype: s.kazinex_columntype
    })));
    
    const imgCol = structures.find(s => {
      const dataType = (s.kazinex_datatype || s.cra59_datatype || '').toString().toLowerCase();
      const columnType = (s.kazinex_columntype || '').toString().toLowerCase();
      const isImage = dataType === 'image' || dataType === '6' || columnType === 'image';
      
      if (isImage) {
        containerDebugLog('[UnifiedGridContainer] Found image column:', s.kazinex_columnname, {
          displayName: s.kazinex_columndisplayname,
          dataType,
          columnType,
          match: isImage
        });
      }
      
      return isImage;
    });
    
    if (!imgCol || !imgCol.kazinex_columnname) {
      containerDebugLog('[UnifiedGridContainer] No image column found or missing column name');
      return null;
    }
    
    const result = {
      name: imgCol.kazinex_columnname,
      displayName: imgCol.kazinex_columndisplayname || imgCol.kazinex_columnname,
    };
    
    containerDebugLog('[UnifiedGridContainer] ✅ Image column detected:', result);
    return result;
  }, [structures]);

  // Handle cell edit
  const handleCellEdit = React.useCallback(
    (rowId: string, columnProp: string, newValue: unknown, oldValue: unknown) => {
      if (!currentSectionId) return;
      // // console.log(...)
      gridState.recordEdit(currentSectionId, rowId, columnProp, oldValue, newValue);
    },
    [currentSectionId, gridState]
  );

  // Handle cell validation
  const handleCellValidate = React.useCallback(
    (rowId: string, columnProp: string, value: unknown): string | null => {
      // Find column definition
      const column = gridColumns.find(col => col.prop === columnProp);
      if (!column) return null;

      // Type-aware validation
      if (column.columnType === 'numeric') {
        if (typeof value === 'string' && value.trim() !== '' && isNaN(Number(value))) {
          return 'Must be a valid number';
        }
      }

      // Add more validation as needed (e.g., for date columns)
      if (column.columnType === 'date') {
        // Date validation can be added here
      }

      return null;
    },
    [gridColumns]
  );

  // Handle validation errors
  const handleValidationError = React.useCallback(
    (cellKey: string, error: string | null) => {
      // // console.log(...)
      
      if (error) {
        gridState.setValidationError(cellKey, error);
      } else {
        gridState.clearValidationError(cellKey);
      }
    },
    [gridState]
  );

  // Apply edited values to rows before passing to grid
  const rowsWithEdits = React.useMemo(() => {
    if (!currentSectionId || gridRows.length === 0) return gridRows;
    
    const changes = gridState.getDirtyChangesForSection(currentSectionId);
    if (changes.length === 0) return gridRows;
    
    // Create a map of changes by rowId
    const changesByRow = new Map<string, Map<string, unknown>>();
    changes.forEach(change => {
      if (!changesByRow.has(change.rowId)) {
        changesByRow.set(change.rowId, new Map());
      }
      changesByRow.get(change.rowId)!.set(change.columnProp, change.newValue);
    });
    
    // Apply changes to rows
    return gridRows.map(row => {
      const rowChanges = changesByRow.get(row.id as string);
      if (!rowChanges) return row;
      
      const updatedRow = { ...row };
      rowChanges.forEach((value, prop) => {
        updatedRow[prop] = value;
      });
      return updatedRow;
    });
  }, [currentSectionId, gridRows, gridState, hasDirtyChanges]);

  // Create set of edited cell keys for visual indicators
  // Compute edited cells for current section with old/new values for tooltips
  const editedCells = React.useMemo(() => {
    if (!currentSectionId) return new Map<string, { oldValue: unknown; newValue: unknown }>();
    
    const changes = gridState.getDirtyChangesForSection(currentSectionId);
    const cellMap = new Map<string, { oldValue: unknown; newValue: unknown }>();
    
    changes.forEach(change => {
      const cellKey = `${change.rowId}|${change.columnProp}`;
      cellMap.set(cellKey, {
        oldValue: change.oldValue,
        newValue: change.newValue
      });
    });
    
    // // console.log(...)
    return cellMap;
  }, [currentSectionId, gridState, hasDirtyChanges]); // Include hasDirtyChanges to trigger updates

  // Save scroll position before switching sections
  const saveScrollPosition = React.useCallback(() => {
    if (currentSectionId && gridContentRef.current) {
      const scrollTop = gridContentRef.current.scrollTop;
      const scrollLeft = gridContentRef.current.scrollLeft;
      scrollPositions.current.set(currentSectionId, { top: scrollTop, left: scrollLeft });
      // // console.log(...)
    }
  }, [currentSectionId]);

  // Restore scroll position after switching sections
  React.useEffect(() => {
    if (currentSectionId && gridContentRef.current) {
      const savedPosition = scrollPositions.current.get(currentSectionId);
      if (savedPosition) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (gridContentRef.current) {
            gridContentRef.current.scrollTop = savedPosition.top;
            gridContentRef.current.scrollLeft = savedPosition.left;
            // // console.log(...)
          }
        });
      } else {
        // New section, scroll to top
        requestAnimationFrame(() => {
          if (gridContentRef.current) {
            gridContentRef.current.scrollTop = 0;
            gridContentRef.current.scrollLeft = 0;
            // // console.log(...)
          }
        });
      }
    }
  }, [currentSectionId]);

  // Handle section change
  const handleSectionChange = React.useCallback(
    (sectionId: string) => {
      // // console.log(...)
      // Save current scroll position before switching
      saveScrollPosition();
      setActiveSection(sectionId);
    },
    [currentSectionId, saveScrollPosition, setActiveSection]
  );

  // Handle save button
  const handleSave = React.useCallback(async () => {
    // Block save if there are validation errors
    if (gridState.hasValidationErrors) {
      // // console.log(...)
      return;
    }
    
    // // console.log(...)
    
    // Get all sections with dirty changes
    const sectionsWithChanges = sections.filter(section => 
      gridState.hasDirtyChangesForSection(section.kazinex_reportsectionid)
    );
    
    if (sectionsWithChanges.length === 0) {
      // // console.log(...)
      return;
    }
    
    // // console.log(...)`);
    
    // Show progress dialog
    setShowSaveProgress(true);
    
    try {
      // Save each section sequentially
      for (const section of sectionsWithChanges) {
        const sectionId = section.kazinex_reportsectionid;
        const changes = gridState.getDirtyChangesForSection(sectionId);
        
        // // console.log(...)
        
        // Get rows for this section (we need to pass the relevant rows)
        const sectionRows = currentSectionId === sectionId ? localRows : [];
        
        // Progress callback to update dialog
        const onProgress = (progress: { currentItem: number; totalItems: number; percentComplete: number; context?: string }) => {
          setSaveProgress({
            ...progress,
            context: progress.context || `Saving ${section.kazinex_name || 'section'}...`
          });
        };
        
        await saveChanges(sectionId, sliceId, changes, sectionRows, structures, onProgress);
        
        // If save was successful, clear dirty changes for this section
        if (!saveError) {
          gridState.clearDirtyChangesForSection(sectionId);
        } else {
          // // console.error(...)
          break; // Stop saving if one fails
        }
      }
      
      // Refresh data to reload from Dataverse (which now includes newly created rows)
      if (!saveError) {
        // // console.log(...)
        refresh();
      }
    } finally {
      // Hide progress dialog after a short delay
      setTimeout(() => {
        setShowSaveProgress(false);
        setSaveProgress(null);
      }, 500);
    }
  }, [sections, gridState, saveChanges, saveError, refresh, sliceId, currentSectionId, localRows, structures]);

  // Handle cancel button - cancel ALL changes across ALL tabs
  const handleCancel = React.useCallback(() => {
    // // console.log(...)
    
    // Clear all dirty changes across all sections
    gridState.clearAllDirtyChanges();
    
    // Remove new rows (not yet saved) from localRows
    setLocalRows(prev => prev.filter(row => !row._isNewRow));
    
    // Refresh data to revert to original values
    refresh();
  }, [gridState, refresh]);

  // Handle add new row (in-memory only, saved when user clicks Save)
  const handleAddRow = React.useCallback(() => {
    if (!currentSectionId || structures.length === 0) return;
    
    // Check if multiline is allowed (grouping = Yes)
    const allowsMultipleRows = activeSection?.kazinex_grouping !== false;
    
    if (!allowsMultipleRows && localRows.length > 0) {
      // // console.warn(...)
      return;
    }
    
    // // console.log(...)
    
    const newRow = addNewRow(currentSectionId, sliceId, structures, localRows);
    
    if (newRow) {
      // Add to local rows immediately
      setLocalRows(prev => [...prev, newRow]);
      // // console.log(...)
    }
  }, [currentSectionId, structures, localRows, addNewRow, activeSection]);

  // Phase 3.4: Handle bulk row creation from paste
  const handleCreateRowsFromPaste = React.useCallback((pastedRows: Record<string, unknown>[]) => {
    if (!currentSectionId || !structures) {
      // // console.warn(...)
      return;
    }

    // Check if multiline is allowed (grouping = Yes)
    const allowsMultipleRows = activeSection?.kazinex_grouping !== false;
    
    if (!allowsMultipleRows) {
      // Only allow pasting 1 row when grouping is No
      if (pastedRows.length > 1) {
        // // console.warn(...)
        alert('This section allows only one row. Please paste one row at a time.');
        return;
      }
      
      // If a row already exists, don't allow paste
      if (localRows.length > 0) {
        // // console.warn(...)
        alert('This section already has a row and allows only one row. Please delete the existing row first.');
        return;
      }
    }

    // // console.log(...)

    // Calculate starting groupsort
    const maxGroupSort = localRows.length > 0
      ? Math.max(...localRows.map(r => r.kazinex_groupsort as number))
      : 0;

    const newRows: ReportData[] = [];

    pastedRows.forEach((pastedRow, index) => {
      const newGroupSort = maxGroupSort + index + 1;
      
      // Create new in-memory row using the same pattern as addNewRow
      const newRow = addNewRow(currentSectionId, sliceId, structures, [...localRows, ...newRows]);
      
      if (newRow) {
        const rowId = newRow.kazinex_reportdataid as string;
        
        // Populate the row with pasted data
        const pastedData = pastedRow._pastedData as Record<string, unknown>;
        
        Object.keys(pastedData).forEach(columnProp => {
          const oldValue = newRow[columnProp];
          const newValue = pastedData[columnProp];
          
          newRow[columnProp] = newValue;
          
          // Mark cell as edited to trigger dirty state (IMPORTANT!)
          handleCellEdit(rowId, columnProp, newValue, oldValue);
        });
        
        // Update groupsort for the new row
        newRow.kazinex_groupsort = newGroupSort;
        newRow.kazinex_group = String(newGroupSort);
        
        newRows.push(newRow as ReportData);
        
        // // console.log(...)
      }
    });

    if (newRows.length > 0) {
      // Add all new rows to local state
      setLocalRows(prev => [...prev, ...newRows] as ReportData[]);
      // // console.log(...)');
    }
  }, [currentSectionId, structures, localRows, addNewRow, handleCellEdit, activeSection]);

  // Handle delete selected rows with confirmation
  const handleDeleteSelectedRows = React.useCallback(async () => {
    if (!currentSectionId || selectedRowIds.size === 0) return;
    
    // Show confirmation dialog
    const rowCount = selectedRowIds.size;
    
    setDeleteConfirmDialog({
      isOpen: true,
      rowCount,
      onConfirm: async () => {
        // Close dialog
        setDeleteConfirmDialog({ isOpen: false, rowCount: 0, onConfirm: () => {} });
        
        // // console.log(...)
        
        // Show progress dialog
        setShowDeleteProgress(true);
        
        try {
          // Delete all selected rows
          const rowsToDelete = localRows.filter(r => selectedRowIds.has(r.kazinex_reportdataid));
          let successCount = 0;
          const deletedNewRowIds = new Set<string>(); // Track deleted new rows
          const totalRows = rowsToDelete.length;
          
          for (let i = 0; i < rowsToDelete.length; i++) {
            const row = rowsToDelete[i];
            
            // Update progress
            setDeleteProgress({
              currentItem: i + 1,
              totalItems: totalRows,
              percentComplete: Math.round(((i + 1) / totalRows) * 100),
              context: `Deleting row ${i + 1} of ${totalRows}...`
            });
            
            // Check if this is a new unsaved row
            const isNewRow = row._isNewRow === true;
            
            const success = await deleteRow(currentSectionId, row);
            if (success) {
              successCount++;
              
              if (isNewRow) {
                deletedNewRowIds.add(row.kazinex_reportdataid);
                // // console.log(...)
              }
              
              // Clear any dirty changes for this row
              const changes = gridState.getDirtyChangesForSection(currentSectionId);
              const rowChanges = changes.filter(c => c.rowId === row.kazinex_reportdataid);
              rowChanges.forEach(change => {
                const cellKey = `${change.rowId}|${change.columnProp}`;
                gridState.clearValidationError(cellKey);
              });
            }
          }
          
          if (successCount > 0) {
            // Remove deleted rows from local state
            setLocalRows(prev => prev.filter(r => !selectedRowIds.has(r.kazinex_reportdataid)));
            setSelectedRowIds(new Set()); // Clear selection
            
            // If we deleted new unsaved rows, clear their dirty changes to remove the dirty marker
            if (deletedNewRowIds.size > 0) {
              // // console.log(...)
              gridState.clearDirtyChangesForRows(currentSectionId, deletedNewRowIds);
            }
            
            // // console.log(...)
          }
        } finally {
          // Hide progress dialog after a short delay
          setTimeout(() => {
            setShowDeleteProgress(false);
            setDeleteProgress(null);
          }, 500);
        }
      },
    });
  }, [currentSectionId, selectedRowIds, localRows, deleteRow, gridState]);

  // Handle bulk image upload completion
  const handleBulkImageUploadComplete = React.useCallback((
    results: Array<{ rowIndex: number; base64: string }>
  ) => {
    if (!bulkImageUpload || !currentSectionId) return;

    containerDebugLog('[UnifiedGridContainer] Bulk upload complete:', results.length, 'images');

    const newRows: ReportData[] = [];

    // Process each image result
    for (const result of results) {
      const existingRow = localRows[result.rowIndex];

      if (existingRow) {
        // Row exists - just update the image column
        containerDebugLog('[UnifiedGridContainer] Updating existing row', result.rowIndex, 'with image');
        handleCellEdit(
          existingRow.kazinex_reportdataid,
          bulkImageUpload.columnName,
          result.base64,
          existingRow[bulkImageUpload.columnName] || null
        );
      } else {
        // Row doesn't exist - create new row with image
        containerDebugLog('[UnifiedGridContainer] Creating new row', result.rowIndex, 'with image');
        
        // Create new in-memory row using the same pattern as handleAddRow
        const newRow = addNewRow(currentSectionId, sliceId, structures, [...localRows, ...newRows]);
        
        if (newRow) {
          const rowId = newRow.kazinex_reportdataid as string;
          
          // Set the image data
          newRow[bulkImageUpload.columnName] = result.base64;
          
          // Mark cell as edited to trigger dirty state
          handleCellEdit(rowId, bulkImageUpload.columnName, result.base64, null);
          
          newRows.push(newRow);
        }
      }
    }

    // Add all new rows to local state
    if (newRows.length > 0) {
      setLocalRows(prev => [...prev, ...newRows]);
      containerDebugLog('[UnifiedGridContainer] Added', newRows.length, 'new rows with images');
    }

    // Close bulk upload dialog
    setBulkImageUpload(null);

    containerDebugLog('[UnifiedGridContainer] ✅ Bulk images added to grid. Click Save to persist to Dataverse.');
  }, [bulkImageUpload, localRows, handleCellEdit, currentSectionId, addNewRow, sliceId, structures]);

  // Handle bulk image upload cancellation
  const handleBulkImageUploadCancel = React.useCallback(() => {
    containerDebugLog('[UnifiedGridContainer] Bulk upload cancelled');
    setBulkImageUpload(null);
  }, []);

  // IMPORTANT: Compute dirty count by section BEFORE any conditional returns
  // This must stay after all hooks to comply with Rules of Hooks
  const dirtyCountBySection = React.useMemo(() => {
    const map = new Map<string, number>();
    sections.forEach(section => {
      const count = gridState.getDirtyCountForSection(section.kazinex_reportsectionid);
      map.set(section.kazinex_reportsectionid, count);
    });
    return map;
  }, [sections, gridState, hasDirtyChanges]);

  // Render loading state
  if (loading && sections.length === 0) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Connecting to Dataverse and loading report structure..." size="large" overlay={false} />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'Segoe UI, sans-serif',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '20px', color: '#d13438' }}>❌</div>
        <div style={{ fontSize: '18px', color: '#d13438', marginBottom: '10px' }}>
          Error Loading Data
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          {error.message}
        </div>
        <button
          onClick={refresh}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Render main content
  return (
    <div
      style={{
        width: '100%',
        height: containerHeight, // Use containerHeight from manifest (default 60vh)
        padding: '16px', // Overall control padding
        display: 'flex',
        flexDirection: 'column',
        gap: '12px', // Spacing between sections
        fontFamily: 'Segoe UI, sans-serif',
        backgroundColor: '#f5f5f5',
        border: '1px solid #edebe9',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        overflow: 'visible', // Allow sections to show properly
        boxSizing: 'border-box', // Include padding in width calculation
      }}
    >
      {/* Premium Toolbar - Embossed Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        border: '1px solid #e0e0e0',
        flexShrink: 0,
      }}>
        <PremiumToolbar
        hasDirtyChanges={hasDirtyChanges}
        dirtyCount={gridState.getTotalDirtyCount()}
        sectionsWithChangesCount={sectionsWithChangesCount}
        validationErrorCount={gridState.validationErrors.size}
        hasValidationErrors={gridState.hasValidationErrors}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        saveError={saveError}
        isAddingRow={isAddingRow}
        isDeletingRow={isDeletingRow}
        operationError={operationError}
        selectedRowCount={selectedRowIds.size}
        canAddRow={activeSection?.kazinex_grouping !== false}
        canCopyFromPrevious={copyHook.canCopy}
        onCopyFromPrevious={copyHook.openDialog}
        onSave={handleSave}
        onCancel={handleCancel}
        onAddRow={handleAddRow}
        onDeleteRows={handleDeleteSelectedRows}
      />
      </div>

      {/* Premium Tab Navigation - Embossed Section */}
      {sections.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          border: '1px solid #e0e0e0',
          flexShrink: 0,
        }}>
          <PremiumTabBar
            sections={sections}
            activeSection={currentSectionId}
            onSectionChange={handleSectionChange}
            dirtyCountBySection={dirtyCountBySection}
          />
        </div>
      )}

      {/* Grid Content - Embossed Section */}
      <div 
        ref={gridContentRef}
        style={{ 
          flex: 1, 
          overflow: 'visible', // Allow grid's scrollbars to be visible
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          border: '1px solid #e0e0e0',
          position: 'relative',
          minHeight: 0, // Important for flex shrinking
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Grid or Empty State */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {activeSection && gridColumns.length > 0 ? (
            <>
              {/* Grid - Always show when structure exists, even with 0 rows (dummy row will show) */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <PowerAppsGridWrapper
                  columns={gridColumns}
                  rows={rowsWithEdits}
                  onCellEdit={handleCellEdit}
                  editedCells={editedCells}
                  validationErrors={gridState.validationErrors}
                  onCellValidate={handleCellValidate}
                  isDeletingRow={isDeletingRow}
                  onCreateRows={handleCreateRowsFromPaste}
                  sectionId={currentSectionId}
                  selectedRowIds={selectedRowIds}
                  onRowSelectionChange={setSelectedRowIds}
                  showDummyRow={activeSection?.kazinex_grouping !== false}
                  onBulkImageUpload={(files, startRowIndex, columnName) => {
                    setBulkImageUpload({
                      visible: true,
                      files,
                      startRowIndex,
                      columnName,
                    });
                  }}
                  enableImageFunctionality={enableImageFunctionality}
                />
              </div>
            </>
          ) : loading ? (
            <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSpinner message="Loading section data..." size="large" overlay={false} />
            </div>
          ) : (
            // No structure loaded
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#605e5c',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📋</div>
                <div style={{ fontSize: '16px' }}>
                  {sections.length === 0
                    ? 'No sections available'
                    : 'Select a section to view data'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Image Bulk Upload Zone */}
        {enableBulkUpload && imageColumn && activeSection && (
          <div
            style={{
              flexShrink: 0,
              padding: '12px 16px 16px 16px',
              borderTop: '1px solid #edebe9',
              backgroundColor: '#ffffff',
            }}
          >
            <ImageBulkUploadZone
              imageColumnName={imageColumn.name}
              imageColumnDisplayName={imageColumn.displayName}
              startRowIndex={localRows.length}
              onFilesSelected={(files, startRowIndex, columnName) => {
                containerDebugLog('[UnifiedGridContainer] Drop zone files selected:', files.length, 'files');
                setBulkImageUpload({
                  visible: true,
                  files,
                  startRowIndex,
                  columnName,
                });
              }}
              isProcessing={bulkImageUpload !== null}
            />
          </div>
        )}
      </div>

      {/* Bulk Image Upload Dialog */}
      {bulkImageUpload && (
        <BulkImageUploadHandler
          files={bulkImageUpload.files}
          startRowIndex={bulkImageUpload.startRowIndex}
          columnName={bulkImageUpload.columnName}
          onComplete={handleBulkImageUploadComplete}
          onCancel={handleBulkImageUploadCancel}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        title="Delete Rows"
        message={
          deleteConfirmDialog.rowCount === 1
            ? 'Are you sure you want to delete this row? This action cannot be undone.'
            : `Are you sure you want to delete ${deleteConfirmDialog.rowCount} rows? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteConfirmDialog.onConfirm}
        onCancel={() => setDeleteConfirmDialog({ isOpen: false, rowCount: 0, onConfirm: () => {} })}
        isDangerous={true}
      />

      {/* Copy from Previous Slice Dialog */}
      <CopyFromPreviousSliceDialog
        isOpen={copyHook.dialogOpen}
        step={copyHook.step}
        slices={copyHook.slices}
        sections={copyHook.sections}
        currentSliceId={sliceId}
        selectedSlice={copyHook.selectedSlice}
        selectedSections={copyHook.selectedSections}
        copyAllSections={copyHook.copyAllSections}
        isLoadingSlices={copyHook.isLoading && copyHook.step === 'slice'}
        isLoadingSections={copyHook.isLoading && copyHook.step === 'section'}
        isCopying={copyHook.isCopying}
        copyProgress={copyHook.copyProgress}
        totalRowsSelected={copyHook.totalRowsSelected}
        canProceed={copyHook.canProceed}
        sliceFilters={copyHook.sliceFilters}
        onFiltersChange={copyHook.setSliceFilters}
        errorMessage={copyHook.errorMessage}
        successMessage={copyHook.successMessage}
        onDismissError={copyHook.dismissError}
        onClose={copyHook.closeDialog}
        onBack={copyHook.goToPreviousStep}
        onNext={copyHook.goToNextStep}
        onSliceSelect={copyHook.setSelectedSlice}
        onCopyAllChange={copyHook.handleCopyAllToggle}
        onSectionToggle={copyHook.handleSectionToggle}
        onCopy={copyHook.executeCopy}
      />
      
      {/* Save Progress Dialog */}
      <OperationProgressDialog
        isOpen={showSaveProgress}
        progress={saveProgress}
        operationType="save"
        useSpinner={true}
      />
      
      {/* Delete Progress Dialog */}
      <OperationProgressDialog
        isOpen={showDeleteProgress}
        progress={deleteProgress}
        operationType="delete"
      />
    </div>
  );
};

