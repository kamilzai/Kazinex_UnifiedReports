/**
 * PowerAppsGridWrapper Component
 * 
 * Phase 2 Complete: Excel-like grid with specialized cell editors and full keyboard navigation.
 * 
 * This component:
 * - Receives same props as GlideDataGridWrapper (drop-in replacement)
 * - Shows grid with type-aware inline editing
 * - Full keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - Specialized editors for Text, Number, Date, Percent, Lookup
 * - Highlights edited cells and validation errors
 * - Preserves all existing features (tabs, save/cancel, validation)
 * 
 * Future: Will integrate with Power Apps Grid Control + Grid Customizer
 */

import * as React from 'react';
import type { GridColumn, CellPosition } from '../types/grid.types';
import { CellEditorManager, isColumnEditable } from './editors/CellEditorManager';
import { ImageThumbnailCell } from './ImageThumbnailCell';
import { useGridNavigation } from '../hooks/useGridNavigation';
import { useGridSelection } from '../hooks/useGridSelection';
import { SelectionOverlay } from './SelectionOverlay';
import { useCopyPaste } from '../hooks/useCopyPaste';
import { formatDateDisplay } from '../utils/dateFormatters';
import { createDebugLogger } from '../utils/debugLogger';

export interface PowerAppsGridWrapperProps {
  columns: GridColumn[];
  rows: Record<string, unknown>[];
  onCellEdit: (rowId: string, columnProp: string, newValue: unknown, oldValue: unknown) => void;
  editedCells: Map<string, { oldValue: unknown; newValue: unknown }>;
  validationErrors: Map<string, string>;
  onCellValidate?: (rowId: string, columnProp: string, value: unknown) => string | null;
  onDeleteRow?: (rowId: string) => void;
  isDeletingRow?: boolean;
  onCreateRows?: (pastedRows: Record<string, unknown>[]) => void; // Phase 3.4: Bulk row creation from paste
  sectionId?: string; // Phase 3.4: Current section ID for row creation
  selectedRowIds?: Set<string>; // Selected rows for delete operations
  onRowSelectionChange?: (selectedIds: Set<string>) => void; // Callback when selection changes
  showDummyRow?: boolean; // Whether to show the dummy row for adding new rows (default: true)
  onBulkImageUpload?: (files: File[], startRowIndex: number, columnName: string) => void; // Phase 4: Bulk image upload
  enableImageFunctionality?: boolean; // Whether to enable image display and upload features (default: true)
}

const gridDebugLog = createDebugLogger('PowerAppsGridWrapper');
const GRID_SCROLLBAR_STYLE_ID = 'kazinex-grid-scrollbar-style';
const GRID_SCROLLBAR_CLASS = 'kazinex-grid-scrollable';

const ensureGridScrollbarStyles = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(GRID_SCROLLBAR_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = GRID_SCROLLBAR_STYLE_ID;
  style.textContent = `
    .${GRID_SCROLLBAR_CLASS} {
      scrollbar-width: thin;
      scrollbar-color: #bab8b7 transparent;
    }
    .${GRID_SCROLLBAR_CLASS}::-webkit-scrollbar {
      width: 12px;
    }
    .${GRID_SCROLLBAR_CLASS}::-webkit-scrollbar-track {
      background: #f3f2f1;
    }
    .${GRID_SCROLLBAR_CLASS}::-webkit-scrollbar-thumb {
      background-color: #c8c6c4;
      border-radius: 8px;
      border: 3px solid #f3f2f1;
    }
    .${GRID_SCROLLBAR_CLASS}::-webkit-scrollbar-thumb:hover {
      background-color: #8a8886;
    }
  `;
  document.head.appendChild(style);
};

/**
 * PowerAppsGridWrapper Component
 * 
 * Drop-in replacement for GlideDataGridWrapper with identical interface.
 * Currently displays preview table. Future phases will integrate with
 * Power Apps Grid Control and Grid Customizer.
 */
export const PowerAppsGridWrapper: React.FC<PowerAppsGridWrapperProps> = ({
  columns,
  rows,
  onCellEdit,
  editedCells,
  validationErrors,
  onCellValidate,
  onDeleteRow,
  isDeletingRow,
  onCreateRows,
  sectionId,
  selectedRowIds: externalSelectedRowIds,
  onRowSelectionChange,
  showDummyRow = true,
  onBulkImageUpload,
  enableImageFunctionality = true,
}) => {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [editingCellKey, setEditingCellKey] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    ensureGridScrollbarStyles();
  }, []);
  
  // Excel three-mode system: Selection, Edit (F2), Replace (Type)
  type CellMode = 'selection' | 'edit' | 'replace';
  const [cellMode, setCellMode] = React.useState<CellMode>('selection');
  const [firstCharacter, setFirstCharacter] = React.useState<string>('');
  
  // Row height configuration
  type RowHeight = 'compact' | 'normal' | 'comfortable';
  const [rowHeight, setRowHeight] = React.useState<RowHeight>('normal');
  
  // Calculate padding and font size based on row height
  const getRowPadding = React.useCallback((): string => {
    switch (rowHeight) {
      case 'compact': return '4px 12px';
      case 'normal': return '6px 12px';
      case 'comfortable': return '10px 12px';
      default: return '6px 12px';
    }
  }, [rowHeight]);
  
  const getRowFontSize = React.useCallback((): string => {
    switch (rowHeight) {
      case 'compact': return '12px';
      case 'normal': return '14px';
      case 'comfortable': return '15px';
      default: return '14px';
    }
  }, [rowHeight]);

  // Helper function to check if column is editable considering image toggle
  const isColumnEditableHere = React.useCallback((col: GridColumn): boolean => {
    // If image functionality is disabled and this is an image column, make it read-only
    const isImageColumn = col.kazinex_datatype?.toLowerCase() === 'image' || col.kazinex_datatype?.toLowerCase() === '6';
    if (isImageColumn && !enableImageFunctionality) {
      return false; // Image column not editable when functionality disabled
    }
    
    // Otherwise use standard editability check
    return isColumnEditable(col);
  }, [enableImageFunctionality]);
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = React.useState<Map<string, number>>(new Map());
  const [resizingColumn, setResizingColumn] = React.useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = React.useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = React.useState<number>(0);
  
  // Row selection state for delete operations (controlled/uncontrolled)
  const [internalSelectedRowIds, setInternalSelectedRowIds] = React.useState<Set<string>>(new Set());
  const selectedRowIds = externalSelectedRowIds !== undefined ? externalSelectedRowIds : internalSelectedRowIds;
  const setSelectedRowIds = onRowSelectionChange || setInternalSelectedRowIds;
  
  // Row selection handlers
  const toggleRowSelection = React.useCallback((rowId: string) => {
    const updated = new Set(selectedRowIds);
    if (updated.has(rowId)) {
      updated.delete(rowId);
    } else {
      updated.add(rowId);
    }
    setSelectedRowIds(updated);
  }, [selectedRowIds, setSelectedRowIds]);

  const toggleAllRows = React.useCallback(() => {
    if (selectedRowIds.size === rows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map(r => r.id as string)));
    }
  }, [rows, selectedRowIds.size, setSelectedRowIds]);

  const clearSelection = React.useCallback(() => {
    setSelectedRowIds(new Set());
  }, [setSelectedRowIds]);

  // Column resize handlers
  const handleResizeStart = React.useCallback((columnProp: string, startX: number, currentWidth: number) => {
    setResizingColumn(columnProp);
    setResizeStartX(startX);
    setResizeStartWidth(currentWidth);
  }, []);

  const handleResizeMove = React.useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    
    const deltaX = e.clientX - resizeStartX;
    const newWidth = Math.max(80, Math.min(600, resizeStartWidth + deltaX)); // Min 80px, Max 600px
    
    setColumnWidths(prev => new Map(prev).set(resizingColumn, newWidth));
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const handleResizeEnd = React.useCallback(() => {
    setResizingColumn(null);
  }, []);

  // Add/remove mouse event listeners for column resizing
  React.useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);

  // Get column width (custom or default)
  const getColumnWidth = React.useCallback((col: GridColumn): number => {
    return columnWidths.get(col.prop) || col.size || 150;
  }, [columnWidths]);
  
  // Parse editing cell key into position and data
  const editingData = React.useMemo(() => {
    if (!editingCellKey) return null;
    
    const [rowId, columnProp, stableColumnId] = editingCellKey.split('|');
    const rowIndex = rows.findIndex(r => r.id === rowId);
    
    // CRITICAL FIX: Use stable column identifier (prop) for reliable matching
    // cellKey format: rowId|columnProp|columnProp
    // column.prop IS kazinex_columnname, provides stable database-level identifier
    const columnIndex = columns.findIndex(c => c.prop === stableColumnId);
    
    if (rowIndex === -1 || columnIndex === -1) {
      console.error(`[PowerAppsGridWrapper] editingData: Column not found!` +
        ` stableColumnId="${stableColumnId}", columnProp="${columnProp}",` +
        ` rowId="${rowId}"`);
      return null;
    }
    
    return {
      position: { row: rowIndex, col: columnIndex },
      rowId,
      columnProp,
      column: columns[columnIndex],
      value: rows[rowIndex][columnProp]
    };
  }, [editingCellKey, rows, columns]);

  // Grid navigation hook
  const navigation = useGridNavigation({
    totalRows: rows.length,
    totalCols: columns.length,
    onCellEdit: (position: CellPosition) => {
      // Start editing when navigation requests it
      const row = rows[position.row];
      const column = columns[position.col];
      if (row && column && isColumnEditableHere(column)) {
        const cellKey = `${row.id}|${column.prop}|${column.prop}`;
        setEditingCellKey(cellKey);
      }
    },
    onSaveEdit: () => {
      // Navigation requested save - editor will call handleSave
      // // console.log(...)
    },
    onCancelEdit: () => {
      // Navigation requested cancel
      setEditingCellKey(null);
    },
    isEditMode: editingCellKey !== null
  });

  // Grid selection hook (Phase 3: Copy/Paste)
  const selection = useGridSelection();
  
  // Phase 3.4: Handle bulk row creation from paste
  const handleCreateRowsFromPaste = React.useCallback((pastedRows: Record<string, unknown>[]) => {
    if (onCreateRows) {
      // // console.log(...)
      onCreateRows(pastedRows);
    }
  }, [onCreateRows]);
  
  const copyPaste = useCopyPaste({ 
    rows, 
    columns, 
    onCellEdit,
    onCreateRows: handleCreateRowsFromPaste 
  });
  
  // Column resizing removed - using auto layout for better column distribution
  
  // Log selection changes
  React.useEffect(() => {
    const count = selection.getSelectedCellCount();
    if (count > 0) {
      // // console.log(...)
    }
  }, [selection]);

  // Global keyboard shortcuts for selection and copy/paste
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if editing
      if (editingCellKey) return;

      // Ctrl+A / Cmd+A - Select all cells
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selection.selectAll(rows.length, columns.length);
        // // console.log(...)
      }

      // Ctrl+C / Cmd+C - Copy selected cells
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const selectedCells = selection.getSelectedCells();
        if (selectedCells.length > 0) {
          copyPaste.handleCopy(selectedCells);
          // // console.log(...)
        }
      }

      // Ctrl+V / Cmd+V - Paste clipboard data
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const selectedCells = selection.getSelectedCells();
        if (selectedCells.length > 0) {
          void copyPaste.handlePaste(selectedCells);
          // // console.log(...)
        }
      }

      // Shift+Arrow keys - Extend selection (Excel behavior)
      if (e.shiftKey && navigation.activeCell && !e.ctrlKey && !e.metaKey) {
        const { row, col } = navigation.activeCell;
        let newRow = row;
        let newCol = col;

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            newRow = Math.max(0, row - 1);
            selection.extendSelectionTo(newRow, col);
            navigation.setActiveCell({ row: newRow, col });
            break;
          case 'ArrowDown':
            e.preventDefault();
            newRow = Math.min(rows.length - 1, row + 1);
            selection.extendSelectionTo(newRow, col);
            navigation.setActiveCell({ row: newRow, col });
            break;
          case 'ArrowLeft':
            e.preventDefault();
            newCol = Math.max(0, col - 1);
            selection.extendSelectionTo(row, newCol);
            navigation.setActiveCell({ row, col: newCol });
            break;
          case 'ArrowRight':
            e.preventDefault();
            newCol = Math.min(columns.length - 1, col + 1);
            selection.extendSelectionTo(row, newCol);
            navigation.setActiveCell({ row, col: newCol });
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCellKey, rows.length, columns.length, selection, copyPaste, navigation]);

  // Excel behavior: Start editing when typing any printable character
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not already editing and have an active cell
      if (!editingCellKey && navigation.activeCell) {
        const { row: rowIndex, col: colIndex } = navigation.activeCell;
        
        // Check if the key is a printable character (not modifier keys)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const column = columns[colIndex];
          if (column && isColumnEditableHere(column)) {
            const row = rows[rowIndex];
            if (row) {
              const cellKey = `${row.id}|${column.prop}|${column.prop}`;
              setEditingCellKey(cellKey);
              // Start editing - the user's keypress will naturally enter the character
              navigation.startEditing({ row: rowIndex, col: colIndex });
              // // console.log(...)
            }
          }
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [editingCellKey, navigation, rows, columns]);

  // Handle paste event to detect bulk image uploads
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle if we have an active cell and bulk upload handler
      if (!navigation.activeCell || !onBulkImageUpload) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Collect all image files from clipboard
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      // If multiple images and active cell is an image column
      if (imageFiles.length > 1) {
        const { row: rowIndex, col: colIndex } = navigation.activeCell;
        const column = columns[colIndex];
        
        // Check if it's an image column (kazinex_datatype = "6" or "image")
        const isImageColumn = column && (
          column.kazinex_datatype === '6' || 
          column.kazinex_datatype?.toLowerCase() === 'image' ||
          column.kazinex_columntype?.toLowerCase() === 'image'
        );
        
        if (isImageColumn) {
          e.preventDefault();
          gridDebugLog(`[PowerAppsGridWrapper] Bulk image paste detected: ${imageFiles.length} images`);
          onBulkImageUpload(imageFiles, rowIndex, column.prop);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [navigation.activeCell, columns, onBulkImageUpload]);

  // Log rendering for debugging
  React.useEffect(() => {
    // // console.log('[PowerAppsGridWrapper] Rendering with:', {
    //   columns: columns.length,
    //   rows: rows.length,
    //   editedCells: editedCells.size,
    //   validationErrors: validationErrors.size,
    //   activeCell: navigation.activeCell,
    //   isEditing: navigation.isEditing
    // });
  }, [columns, rows, editedCells, validationErrors, navigation.activeCell, navigation.isEditing]);

  // Handle cell click - Excel behavior: single click selects, doesn't edit
  const handleCellClick = React.useCallback((rowIndex: number, colIndex: number, event: React.MouseEvent) => {
    const row = rows[rowIndex];
    const column = columns[colIndex];
    
    if (!row || !column) return;
    
    const cellKey = `${row.id}|${column.prop}|${column.prop}`;

    // Check if clicking within the SAME cell that's already being edited (edit or replace modes)
    if (editingCellKey === cellKey) {
      gridDebugLog(`[PowerAppsGridWrapper] Click within editing cell - staying in ${cellMode.toUpperCase()} mode`);
      // Already editing this cell - let the click pass through so editor controls receive the event
      return;
    }
    
    // Excel behavior: Single click ONLY selects cell, does NOT start editing
    gridDebugLog('[PowerAppsGridWrapper] Cell clicked - entering SELECTION mode');
    
    // Exit any active editing
    if (editingCellKey) {
      setEditingCellKey(null);
    }
    
    // Enter Selection mode
    setCellMode('selection');
    setFirstCharacter('');
    
    // Set active cell
    navigation.setActiveCell({ row: rowIndex, col: colIndex });
    
    // Handle selection (click, ctrl+click, shift+click)
    selection.handleCellMouseDown(rowIndex, colIndex, event);
  }, [rows, columns, navigation, selection, editingCellKey, cellMode]);

  // Handle cell double-click - Excel behavior: Enter EDIT mode with cursor at end
  const handleCellDoubleClick = React.useCallback((rowIndex: number, colIndex: number) => {
    const row = rows[rowIndex];
    const column = columns[colIndex];
    
    gridDebugLog('[PowerAppsGridWrapper] Cell double-clicked - entering EDIT mode');
    
    if (!row || !column) return;
    
    // Start editing on double-click if column is editable
    if (isColumnEditableHere(column)) {
      const cellKey = `${row.id}|${column.prop}|${column.prop}`;
      gridDebugLog(`[PowerAppsGridWrapper] EDIT mode with cellKey="${cellKey}"`);
      
      // Enter EDIT mode (not Replace!)
      setEditingCellKey(cellKey);
      setCellMode('edit');
      setFirstCharacter('');
      navigation.startEditing({ row: rowIndex, col: colIndex });
      
      // Focus with cursor at END, no text selection
      requestAnimationFrame(() => {
        const input = document.querySelector('[data-cell-key="' + cellKey + '"] input, [data-cell-key="' + cellKey + '"] textarea');
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
          input.focus();
          // Position cursor at END, do NOT select all
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      });
    }
  }, [rows, columns, navigation, isColumnEditableHere]);

  // Handle save from editor
  const handleSave = React.useCallback((newValue: unknown) => {
    if (!editingData) return;
    
    const { rowId, columnProp, value: oldValue, column } = editingData;
    
    gridDebugLog('[PowerAppsGridWrapper] handleSave called:' +
      ` rowId="${rowId}", columnProp="${columnProp}", column.name="${column?.name}",` +
      ` kazinex_columnname="${column?.kazinex_columnname}", kazinex_datatype="${column?.kazinex_datatype}",` +
      ` newValue length=${typeof newValue === 'string' ? newValue.length : 'N/A'}`);
    
    // // console.log(...)
    
    // For lookup columns, convert the saved ID back to {id, label} format for display
    let valueToSave = newValue;
    if (column && column.lookupOptions && typeof newValue === 'string') {
      const lookupOption = column.lookupOptions.find(opt => opt.id === newValue);
      if (lookupOption) {
        valueToSave = {
          id: lookupOption.id,
          label: lookupOption.label
        };
        // // console.log(...)
      }
    }
    
    // Validate if validator provided
    if (onCellValidate) {
      const error = onCellValidate(rowId, columnProp, newValue);
      if (error) {
        // // console.log(...)
        // Still call onCellEdit - let parent handle validation errors
      }
    }
    
    // Only call onCellEdit if value actually changed
    // For lookup, compare IDs
    const oldId = typeof oldValue === 'object' && oldValue !== null && 'id' in oldValue 
      ? (oldValue as { id: string }).id 
      : oldValue;
    const newId = typeof valueToSave === 'object' && valueToSave !== null && 'id' in valueToSave 
      ? (valueToSave as { id: string }).id 
      : valueToSave;
    
    // Normalize numeric values for comparison (handles comma-formatted numbers bidirectionally)
    const normalizeForComparison = (val: unknown): number | string | null | undefined => {
      if (val === null || val === undefined) return val;
      
      // If it's already a number, return it
      if (typeof val === 'number') return val;
      
      if (typeof val === 'string') {
        const trimmed = val.trim();
        // Check if it looks like a formatted number (e.g., "1,234" or "1,234.56" or "1234")
        if (/^-?[\d,]+\.?\d*$/.test(trimmed)) {
          const parsed = parseFloat(trimmed.replace(/,/g, ''));
          if (!isNaN(parsed)) return parsed;
        }
        // Not a number, return original string for non-numeric comparison
        return trimmed;
      }
      
      // For other types (objects, etc.), return as unknown
      return val as string | number;
    };
    
    const normalizedOld = normalizeForComparison(oldId);
    const normalizedNew = normalizeForComparison(newId);
    
    // Special handling for numeric comparison with floating point tolerance
    const areValuesEqual = () => {
      if (normalizedOld === normalizedNew) return true;
      
      // If both are numbers, use epsilon comparison
      if (typeof normalizedOld === 'number' && typeof normalizedNew === 'number') {
        return Math.abs(normalizedOld - normalizedNew) < Number.EPSILON;
      }
      
      return false;
    };
    
    if (!areValuesEqual()) {
      gridDebugLog('[PowerAppsGridWrapper] Calling onCellEdit:' +
        ` rowId="${rowId}", columnProp="${columnProp}", valueLength=${typeof valueToSave === 'string' ? valueToSave.length : 'N/A'}`);
      onCellEdit(rowId, columnProp, valueToSave, oldValue);
    }
    
    // Excel behavior: Save → Move → Selection mode (ready for type-to-replace)
    gridDebugLog('[PowerAppsGridWrapper] Saving cell - entering SELECTION mode');
    setEditingCellKey(null);
    setCellMode('selection');
    setFirstCharacter('');
    navigation.stopEditing(true);
    navigation.moveToNextCell();
    
    // Keep focus on grid after Tab navigation
    requestAnimationFrame(() => {
      if (gridRef.current) {
        gridRef.current.focus();
      }
    });
  }, [editingData, onCellEdit, onCellValidate, navigation]);

  // Handle cancel from editor
  const handleCancel = React.useCallback(() => {
    // // console.log(...)
    setEditingCellKey(null);
    setCellMode('selection');
    setFirstCharacter('');
    navigation.stopEditing(false);
  }, [navigation]);

  // Excel keyboard handler: F2 for Edit mode, typing for Replace mode
  const handleGridKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    const activeCell = navigation.activeCell;
    
    // Only handle if we're in Selection mode (not already editing)
    if (cellMode === 'selection' && activeCell && rows[activeCell.row] && columns[activeCell.col]) {
      const row = rows[activeCell.row];
      const column = columns[activeCell.col];
      
      // F2 - Enter EDIT mode (inline editing with cursor)
      if (e.key === 'F2' && isColumnEditableHere(column)) {
        e.preventDefault();
        e.stopPropagation();
        
        const cellKey = `${row.id}|${column.prop}|${column.prop}`;
        gridDebugLog(`[PowerAppsGridWrapper] F2 pressed - entering EDIT mode with cellKey="${cellKey}"`);
        
        setEditingCellKey(cellKey);
        setCellMode('edit');
        setFirstCharacter('');
        navigation.startEditing(activeCell);
        
        // Focus with cursor at end, no selection
        requestAnimationFrame(() => {
          const input = document.querySelector('[data-cell-key="' + cellKey + '"] input, [data-cell-key="' + cellKey + '"] textarea');
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        });
        return;
      }
      
      // Printable character - Enter REPLACE mode (type-to-replace)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && isColumnEditableHere(column)) {
        e.preventDefault();
        e.stopPropagation();
        
        const cellKey = `${row.id}|${column.prop}|${column.prop}`;
        gridDebugLog(`[PowerAppsGridWrapper] Character "${e.key}" typed - entering REPLACE mode with cellKey="${cellKey}"`);
        
        setEditingCellKey(cellKey);
        setCellMode('replace');
        setFirstCharacter(e.key); // Store first character for editor
        navigation.startEditing(activeCell);
        
        // Focus input - editor will handle initialization with first character
        requestAnimationFrame(() => {
          const input = document.querySelector('[data-cell-key="' + cellKey + '"] input, [data-cell-key="' + cellKey + '"] textarea');
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.focus();
            // Cursor will be positioned by editor based on firstCharacter
          }
        });
        return;
      }
    }
    
    // Let navigation handle all other keys (arrows, enter, tab, etc.)
    navigation.handleKeyDown(e);
  }, [cellMode, rows, columns, navigation, isColumnEditableHere]);

  return (
    <div 
      ref={gridRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '1px solid #edebe9',
      }}
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
    >
      {/* Row Height Selector */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #edebe9',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
      }}>
        <span style={{ color: '#605e5c', fontWeight: '500' }}>Row Height:</span>
        <button
          onClick={() => setRowHeight('compact')}
          style={{
            padding: '4px 12px',
            border: rowHeight === 'compact' ? '1px solid #0078d4' : '1px solid #d0d0d0',
            borderRadius: '4px',
            backgroundColor: rowHeight === 'compact' ? '#e8f3fe' : 'white',
            color: rowHeight === 'compact' ? '#0078d4' : '#323130',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: rowHeight === 'compact' ? '600' : '400',
          }}
          title="Compact row height"
        >
          Compact
        </button>
        <button
          onClick={() => setRowHeight('normal')}
          style={{
            padding: '4px 12px',
            border: rowHeight === 'normal' ? '1px solid #0078d4' : '1px solid #d0d0d0',
            borderRadius: '4px',
            backgroundColor: rowHeight === 'normal' ? '#e8f3fe' : 'white',
            color: rowHeight === 'normal' ? '#0078d4' : '#323130',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: rowHeight === 'normal' ? '600' : '400',
          }}
          title="Normal row height"
        >
          Normal
        </button>
        <button
          onClick={() => setRowHeight('comfortable')}
          style={{
            padding: '4px 12px',
            border: rowHeight === 'comfortable' ? '1px solid #0078d4' : '1px solid #d0d0d0',
            borderRadius: '4px',
            backgroundColor: rowHeight === 'comfortable' ? '#e8f3fe' : 'white',
            color: rowHeight === 'comfortable' ? '#0078d4' : '#323130',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: rowHeight === 'comfortable' ? '600' : '400',
          }}
          title="Comfortable row height"
        >
          Comfortable
        </button>
      </div>
      
      {/* Fluent Grid Container - Scrollable with visible scrollbars */}
      <div
        className={GRID_SCROLLBAR_CLASS}
        style={{ 
        width: '100%',
        height: '100%',
        overflowX: 'auto', // Horizontal scrollbar when needed
        overflowY: 'auto', // Show vertical scrollbar only when needed
        scrollbarGutter: 'stable',
        msOverflowStyle: 'auto',
        position: 'relative',
        backgroundColor: '#ffffff',
        padding: '0 16px 8px 16px', // No top padding - left/right/bottom only
      }}
      >
        <table style={{
          width: '100%',
          minWidth: 'max-content', // Allow table to be wider than container for horizontal scroll
          tableLayout: 'fixed', // Fixed layout to respect column widths
          borderCollapse: 'collapse',
          fontFamily: '"Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
          fontSize: getRowFontSize(), // Apply dynamic font size
        }}>
          <colgroup>
            {/* Fixed pixel width for checkbox column - always 50px */}
            <col style={{ width: '50px' }} />
            {/* Dynamic width columns based on calculated sizes or user resize */}
            {columns.map((col) => {
              return <col key={col.prop} style={{ width: `${getColumnWidth(col)}px` }} />;
            })}
          </colgroup>
          <thead>
            <tr style={{ 
              backgroundColor: '#faf9f8',
              position: 'sticky', 
              top: 0, 
              zIndex: 10,
            }}>
              {/* Checkbox column header - Frozen/Sticky */}
              <th style={{
                padding: '8px 4px',
                textAlign: 'center',
                borderBottom: '1px solid #edebe9',
                fontWeight: '600',
                fontSize: '14px',
                color: '#323130',
                backgroundColor: '#faf9f8',
                position: 'sticky',
                left: 0,
                zIndex: 11, // Higher than header row (10)
                borderRight: '2px solid #edebe9', // Visual separator
              }}>
                <input
                  type="checkbox"
                  checked={selectedRowIds.size === rows.length && rows.length > 0}
                  onChange={toggleAllRows}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                  }}
                  title={selectedRowIds.size === rows.length ? 'Deselect all' : 'Select all'}
                />
              </th>
              {columns.map((col) => {
                const colWidth = getColumnWidth(col);
                return (
                  <th key={col.prop} style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    borderBottom: '1px solid #edebe9',
                    fontWeight: '600',
                    fontSize: getRowFontSize(),
                    color: '#323130',
                    backgroundColor: '#faf9f8',
                    position: 'relative',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.name}
                    </div>
                    <div style={{ 
                      fontSize: rowHeight === 'compact' ? '10px' : '11px', 
                      color: '#605e5c', 
                      fontWeight: '400',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.columnType}
                    </div>
                    {/* Resize Handle */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '5px',
                        height: '100%',
                        cursor: 'col-resize',
                        backgroundColor: resizingColumn === col.prop ? '#0078d4' : 'transparent',
                        zIndex: 10,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleResizeStart(col.prop, e.clientX, colWidth);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#d1d1d1';
                      }}
                      onMouseLeave={(e) => {
                        if (resizingColumn !== col.prop) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowId = row.id as string;
              return (
                <tr 
                  key={rowId}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f2f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Checkbox cell - Frozen/Sticky */}
                  <td style={{
                    padding: '6px 4px',
                    textAlign: 'center',
                    borderBottom: '1px solid #edebe9',
                    backgroundColor: selectedRowIds.has(rowId) ? '#e8f3fe' : '#ffffff',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    borderRight: '2px solid #edebe9', // Visual separator
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedRowIds.has(rowId)}
                      onChange={() => toggleRowSelection(rowId)}
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                      }}
                      title={selectedRowIds.has(rowId) ? 'Deselect row' : 'Select row'}
                    />
                  </td>
                  {columns.map((col, colIndex) => {
                    const cellKey = `${rowId}|${col.prop}`;
                    const cellKeyForEditing = `${rowId}|${col.prop}|${col.prop}`;
                    const isEdited = editedCells.has(cellKey);
                    const hasError = validationErrors.has(cellKey);
                    const cellValue = row[col.prop];
                    const editInfo = editedCells.get(cellKey);
                    const isEditing = editingCellKey === cellKeyForEditing;
                    const isActive = navigation.activeCell.row === rowIndex && navigation.activeCell.col === colIndex;
                    const isSelected = selection.isCellSelected(rowIndex, colIndex);

                    // Format display value based on column type
                    const getDisplayValue = (value: unknown): string => {
                      if (value === null || value === undefined) return '';
                      
                      // For lookup cells, display the label
                      if (typeof value === 'object' && value !== null && 'label' in value) {
                        return (value as { label: string }).label;
                      }
                      
                      // For date columns, format as dd-mmm-yy
                      if (col.columnType === 'date') {
                        return formatDateDisplay(value);
                      }
                      
                      // For percent columns, normalize and display (0.5 → "50%", "50%" → "50%")
                      if (col.kazinex_columntype && col.kazinex_columntype.toLowerCase() === 'percent') {
                        // Clean % sign if present in the value
                        const valueStr = String(value).replace(/%/g, '').trim();
                        const num = Number(valueStr);
                        
                        if (!isNaN(num)) {
                          // If value is already a percentage (> 1), normalize it first
                          const decimal = num > 1 ? num / 100 : num;
                          const percent = decimal * 100;
                          // If decimal part exists, show 2 decimals; otherwise show whole number
                          const formatted = percent % 1 === 0 
                            ? String(Math.round(percent)) 
                            : percent.toFixed(2).replace(/\.?0+$/, '');
                          return formatted + '%';
                        }
                      }
                      
                      // For number columns (integer, decimal, currency), format with commas
                      const columnTypeLC = col.kazinex_columntype?.toLowerCase();
                      if (col.columnType === 'numeric' || 
                          columnTypeLC === 'number' ||
                          columnTypeLC === 'decimal' ||
                          columnTypeLC === 'integer' ||
                          columnTypeLC === 'currency') {
                        const num = Number(value);
                        if (!isNaN(num)) {
                          // Check if the original value (as string) contains a decimal point
                          const valueStr = String(value);
                          const hasDecimalInOriginal = valueStr.includes('.');
                          
                          // Check if number actually has non-zero decimal part
                          const hasNonZeroDecimals = (num % 1) !== 0;
                          
                          if (!hasDecimalInOriginal && !hasNonZeroDecimals) {
                            // Whole number - format with commas only, no decimals
                            return num.toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            });
                          } else {
                            // Has decimals in original OR has non-zero decimal part - format with 2 decimal places
                            return num.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            });
                          }
                        }
                      }
                      
                      return String(value);
                    };

                    return (
                      <td 
                        key={col.prop} 
                        style={{
                          padding: getRowPadding(),
                          fontSize: getRowFontSize(),
                          backgroundColor: hasError 
                            ? '#fef0f1' 
                            : isActive && !isEditing && !isSelected
                            ? '#f3f2f1' // Light background for active cell
                            : isSelected
                            ? '#e8f3fe'
                            : isEdited 
                            ? '#fff9e5' 
                            : '#ffffff',
                          borderBottom: '1px solid #edebe9',
                          borderLeft: isEdited 
                            ? '2px solid #ffb900' 
                            : hasError 
                            ? '2px solid #d13438' 
                            : 'none',
                          outline: isActive && !isEditing ? '2px solid #0078d4' : 'none',
                          outlineOffset: '-2px',
                          position: 'relative',
                          cursor: isEditing ? 'text' : 'pointer',
                          userSelect: 'none',
                          fontWeight: '400',
                          color: hasError ? '#a4262c' : '#323130',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          if (!isEditing && !isSelected && !hasError && !isEdited) {
                            e.currentTarget.style.backgroundColor = '#f3f2f1';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isEditing && !isSelected) {
                            e.currentTarget.style.backgroundColor = hasError 
                              ? '#fef0f1' 
                              : isEdited 
                              ? '#fff9e5' 
                              : '#ffffff';
                          }
                        }}
                        onClick={(e) => {
                          const rowIndex = rows.findIndex(r => r.id === rowId);
                          const colIndex = columns.findIndex(c => c.prop === col.prop);
                          if (rowIndex !== -1 && colIndex !== -1) {
                            handleCellClick(rowIndex, colIndex, e);
                          }
                        }}
                        onDoubleClick={() => {
                          const rowIndex = rows.findIndex(r => r.id === rowId);
                          const colIndex = columns.findIndex(c => c.prop === col.prop);
                          if (rowIndex !== -1 && colIndex !== -1) {
                            handleCellDoubleClick(rowIndex, colIndex);
                          }
                        }}
                        onMouseDown={(e) => {
                          const rowIndex = rows.findIndex(r => r.id === rowId);
                          const colIndex = columns.findIndex(c => c.prop === col.prop);
                          if (rowIndex !== -1 && colIndex !== -1) {
                            selection.handleCellMouseDown(rowIndex, colIndex, e);
                          }
                        }}
                        onMouseMove={(e) => {
                          // Only handle if the primary mouse button (left button) is pressed
                          // e.buttons & 1 means left button is down
                          if (e.buttons & 1) {
                            const rowIndex = rows.findIndex(r => r.id === rowId);
                            const colIndex = columns.findIndex(c => c.prop === col.prop);
                            if (rowIndex !== -1 && colIndex !== -1) {
                              selection.handleCellMouseMove(rowIndex, colIndex);
                            }
                          }
                        }}
                        onMouseUp={() => {
                          selection.handleCellMouseUp();
                        }}
                        title="Click to edit, Drag to select"
                      >
                        {isEditing ? (
                          <CellEditorManager
                            position={{ row: rows.findIndex(r => r.id === rowId), col: columns.indexOf(col) }}
                            column={col}
                            value={cellValue}
                            editMode={cellMode === 'selection' ? 'edit' : cellMode}
                            firstCharacter={firstCharacter}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            rowId={rowId}
                            validate={onCellValidate ? (value) => {
                              const error = onCellValidate(rowId, col.prop, value);
                              return error ? error : true;
                            } : undefined}
                            enableImageFunctionality={enableImageFunctionality}
                          />
                        ) : (() => {
                          const isImageColumn = col.kazinex_datatype?.toLowerCase() === 'image';
                          if (isImageColumn) {
                            gridDebugLog(`[Grid] Rendering ImageThumbnailCell for column "${col.name}" (${col.prop}), enableImageFunctionality=${enableImageFunctionality}`);
                          }
                          return enableImageFunctionality && isImageColumn;
                        })() ? (
                          // Render Image column with ImageThumbnailCell (only if image functionality is enabled)
                          <ImageThumbnailCell
                            value={cellValue as string | null}
                            recordId={rowId}
                            fieldName={col.prop}
                            onClick={() => {
                              const rowIndex = rows.findIndex(r => r.id === rowId);
                              const colIndex = columns.findIndex(c => c.prop === col.prop);
                              if (rowIndex !== -1 && colIndex !== -1) {
                                handleCellDoubleClick(rowIndex, colIndex);
                              }
                            }}
                            readonly={col.readonly || col.kazinex_readonly}
                          />
                        ) : (
                          <>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              overflow: 'hidden',
                            }}>
                              {isEdited && (
                                <span style={{ 
                                  color: '#ffb900', 
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  flexShrink: 0,
                                }}>●</span>
                              )}
                              {hasError && (
                                <span style={{ 
                                  color: '#e81123', 
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  flexShrink: 0,
                                }}>⚠</span>
                              )}
                              <span style={{ 
                                color: hasError ? '#a4262c' : '#323130',
                                fontSize: getRowFontSize(),
                                lineHeight: '1.4',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}
                              title={getDisplayValue(cellValue)}
                              >
                                {getDisplayValue(cellValue)}
                              </span>
                              {col.kazinex_columntype && col.kazinex_columntype.toLowerCase() === 'lookup' && isColumnEditableHere(col) && (
                                <span 
                                  style={{ 
                                    color: '#605e5c',
                                    fontSize: '10px',
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    userSelect: 'none',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rowIndex = rows.findIndex(r => r.id === rowId);
                                    const colIndex = columns.findIndex(c => c.prop === col.prop);
                                    if (rowIndex !== -1 && colIndex !== -1) {
                                      handleCellDoubleClick(rowIndex, colIndex);
                                    }
                                  }}
                                  title="Click to open dropdown"
                                >▼</span>
                              )}
                            </div>
                            {isEdited && editInfo && editInfo.oldValue !== null && editInfo.oldValue !== undefined && editInfo.oldValue !== '' && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#8a8886', 
                                marginTop: '6px',
                                paddingTop: '4px',
                                borderTop: '1px solid #edebe9',
                                fontStyle: 'italic',
                              }}>
                                Previous: {getDisplayValue(editInfo.oldValue)}
                              </div>
                            )}
                            {hasError && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#e81123', 
                                marginTop: '6px',
                                padding: '4px 8px',
                                backgroundColor: '#fff5f5',
                                borderRadius: '4px',
                                border: '1px solid #fde7e9',
                              }}>
                                {validationErrors.get(cellKey)}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            
            {/* Dummy row for bulk paste/row creation operations */}
            {showDummyRow && (
              <tr style={{ 
                borderTop: '1px dashed #d2d0ce', 
                backgroundColor: '#faf9f8',
              }}>
                {/* Empty checkbox cell for dummy row - Frozen/Sticky */}
                <td style={{
                  padding: '6px 4px',
                  backgroundColor: '#faf9f8',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  borderRight: '2px solid #edebe9', // Visual separator
                }}></td>
                {columns.map((col, colIndex) => {
                const dummyRowIndex = rows.length;
                const isSelected = selection.isCellSelected(dummyRowIndex, colIndex);
                
                return (
                  <td 
                    key={`dummy-${col.prop}`} 
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isSelected ? '#e8f3fe' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: '#605e5c',
                      fontStyle: 'italic',
                      fontSize: '12px',
                      userSelect: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseDown={(e) => {
                      selection.handleCellMouseDown(dummyRowIndex, colIndex, e);
                    }}
                    onMouseMove={(e) => {
                      // Only handle if the primary mouse button (left button) is pressed
                      if (e.buttons & 1) {
                        selection.handleCellMouseMove(dummyRowIndex, colIndex);
                      }
                    }}
                    onMouseUp={() => {
                      selection.handleCellMouseUp();
                    }}
                    title="Paste data here to create new rows"
                  >
                    <span style={{
                      textAlign: 'left',
                      display: 'block',
                    }}>
                      {colIndex === 0 ? '+ Paste here to add rows' : ''}
                    </span>
                  </td>
                );
              })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status Bar - Clean and minimal */}
      {(copyPaste.copyStatus || copyPaste.pasteStatus) && (
        <div style={{
          padding: '8px 20px',
          backgroundColor: '#faf9f8',
          borderTop: '1px solid #e1e1e1',
          fontSize: '12px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          {copyPaste.copyStatus && (
            <span style={{ 
              color: copyPaste.copyStatus.startsWith('✓') ? '#107c10' : '#d13438',
              fontWeight: 500,
            }}>
              {copyPaste.copyStatus}
            </span>
          )}
          {copyPaste.pasteStatus && (
            <span style={{ 
              color: copyPaste.pasteStatus.startsWith('✓') ? '#107c10' : copyPaste.pasteStatus.startsWith('⚠') ? '#8a6d3b' : '#d13438',
              fontWeight: 500,
            }}>
              {copyPaste.pasteStatus}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

