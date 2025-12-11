/**
 * Grid Selection Hook
 * 
 * Manages cell and range selection for the grid, supporting:
 * - Single cell selection (click)
 * - Range selection (drag)
 * - Extended selection (Shift+Click)
 * - Multi-selection (Ctrl+Click)
 * - Select all (Ctrl+A)
 * 
 * Selection is tracked as an array of ranges, where each range has:
 * - startRow/startCol: Beginning of the range
 * - endRow/endCol: End of the range (inclusive)
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface GridSelectionState {
  /** Array of selected ranges */
  ranges: CellRange[];
  
  /** Is user currently dragging to select */
  isDragging: boolean;
  
  /** Anchor cell for Shift+Click extended selection */
  anchorCell: CellPosition | null;
}

export interface UseGridSelectionReturn {
  /** Current selection state */
  selection: GridSelectionState;
  
  /** Handle mouse down on a cell */
  handleCellMouseDown: (row: number, col: number, event: React.MouseEvent) => void;
  
  /** Handle mouse move over a cell (for drag selection) */
  handleCellMouseMove: (row: number, col: number) => void;
  
  /** Handle mouse up (end drag selection) */
  handleCellMouseUp: () => void;
  
  /** Clear all selections */
  clearSelection: () => void;
  
  /** Select all cells in the grid */
  selectAll: (totalRows: number, totalCols: number) => void;
  
  /** Extend selection to a cell (for Shift+Arrow navigation) */
  extendSelectionTo: (row: number, col: number) => void;
  
  /** Check if a specific cell is selected */
  isCellSelected: (row: number, col: number) => boolean;
  
  /** Get count of selected cells */
  getSelectedCellCount: () => number;
  
  /** Get all selected cell positions as flat array */
  getSelectedCells: () => CellPosition[];
}

export const useGridSelection = (): UseGridSelectionReturn => {
  const [selection, setSelection] = useState<GridSelectionState>({
    ranges: [],
    isDragging: false,
    anchorCell: null,
  });
  
  // Track if mouse button is currently down
  const isMouseDownRef = useRef(false);

  const handleCellMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
    const ctrlKey = event.ctrlKey || event.metaKey; // Support Cmd on Mac
    const shiftKey = event.shiftKey;
    
    // Mark that mouse is down
    isMouseDownRef.current = true;

    if (ctrlKey) {
      // Ctrl+Click: Add new range to selection
      setSelection(prev => ({
        ...prev,
        ranges: [
          ...prev.ranges,
          { startRow: row, startCol: col, endRow: row, endCol: col }
        ],
        anchorCell: { row, col },
        isDragging: false,
      }));
    } else if (shiftKey && selection.anchorCell) {
      // Shift+Click: Extend from anchor to clicked cell
      const { row: anchorRow, col: anchorCol } = selection.anchorCell;
      setSelection(prev => ({
        ...prev,
        ranges: [
          {
            startRow: Math.min(anchorRow, row),
            startCol: Math.min(anchorCol, col),
            endRow: Math.max(anchorRow, row),
            endCol: Math.max(anchorCol, col),
          }
        ],
        isDragging: false,
      }));
    } else {
      // Normal click: Start new selection but don't set dragging yet
      // Dragging will only start when mouse actually moves
      setSelection({
        ranges: [
          { startRow: row, startCol: col, endRow: row, endCol: col }
        ],
        anchorCell: { row, col },
        isDragging: false, // Don't start dragging until mouse moves
      });
    }
  }, [selection.anchorCell]);

  const handleCellMouseMove = useCallback((row: number, col: number) => {
    setSelection(prev => {
      // Only handle if mouse button is down AND we have an anchor
      if (!isMouseDownRef.current || !prev.anchorCell) {
        return prev;
      }
      
      // If we have an anchor cell but not dragging yet, start dragging now
      if (!prev.isDragging) {
        // Check if mouse moved to a different cell
        if (prev.anchorCell.row !== row || prev.anchorCell.col !== col) {
          return {
            ...prev,
            isDragging: true,
            ranges: [
              {
                startRow: Math.min(prev.anchorCell.row, row),
                startCol: Math.min(prev.anchorCell.col, col),
                endRow: Math.max(prev.anchorCell.row, row),
                endCol: Math.max(prev.anchorCell.col, col),
              }
            ],
          };
        }
        return prev; // Same cell, don't start dragging
      }
      
      // Already dragging, update the range
      const { row: anchorRow, col: anchorCol } = prev.anchorCell;
      return {
        ...prev,
        ranges: [
          {
            startRow: Math.min(anchorRow, row),
            startCol: Math.min(anchorCol, col),
            endRow: Math.max(anchorRow, row),
            endCol: Math.max(anchorCol, col),
          }
        ],
      };
    });
  }, []);

  const handleCellMouseUp = useCallback(() => {
    // Mark mouse as up
    isMouseDownRef.current = false;
    
    setSelection(prev => ({
      ...prev,
      isDragging: false,
    }));
  }, []);
  
  // Global mouseup handler to stop dragging even when mouse released outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false;
      setSelection(prev => ({
        ...prev,
        isDragging: false,
      }));
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({
      ranges: [],
      isDragging: false,
      anchorCell: null,
    });
  }, []);

  const selectAll = useCallback((totalRows: number, totalCols: number) => {
    setSelection({
      ranges: [
        {
          startRow: 0,
          startCol: 0,
          endRow: totalRows - 1,
          endCol: totalCols - 1,
        }
      ],
      isDragging: false,
      anchorCell: { row: 0, col: 0 },
    });
  }, []);

  // Extend selection to a new cell (for Shift+Arrow navigation)
  const extendSelectionTo = useCallback((row: number, col: number) => {
    setSelection(prev => {
      // If no anchor, set this as anchor and single selection
      if (!prev.anchorCell) {
        return {
          ranges: [{ startRow: row, startCol: col, endRow: row, endCol: col }],
          anchorCell: { row, col },
          isDragging: false,
        };
      }

      // Extend from anchor to new position
      const { row: anchorRow, col: anchorCol } = prev.anchorCell;
      return {
        ...prev,
        ranges: [
          {
            startRow: Math.min(anchorRow, row),
            startCol: Math.min(anchorCol, col),
            endRow: Math.max(anchorRow, row),
            endCol: Math.max(anchorCol, col),
          }
        ],
        isDragging: false,
      };
    });
  }, []);

  const isCellSelected = useCallback((row: number, col: number): boolean => {
    return selection.ranges.some(range =>
      row >= range.startRow &&
      row <= range.endRow &&
      col >= range.startCol &&
      col <= range.endCol
    );
  }, [selection.ranges]);

  const getSelectedCellCount = useCallback((): number => {
    return selection.ranges.reduce((count, range) => {
      const rowCount = range.endRow - range.startRow + 1;
      const colCount = range.endCol - range.startCol + 1;
      return count + (rowCount * colCount);
    }, 0);
  }, [selection.ranges]);

  const getSelectedCells = useCallback((): CellPosition[] => {
    const cells: CellPosition[] = [];
    
    selection.ranges.forEach(range => {
      for (let row = range.startRow; row <= range.endRow; row++) {
        for (let col = range.startCol; col <= range.endCol; col++) {
          cells.push({ row, col });
        }
      }
    });
    
    return cells;
  }, [selection.ranges]);

  return {
    selection,
    handleCellMouseDown,
    handleCellMouseMove,
    handleCellMouseUp,
    clearSelection,
    selectAll,
    extendSelectionTo,
    isCellSelected,
    getSelectedCellCount,
    getSelectedCells,
  };
};
