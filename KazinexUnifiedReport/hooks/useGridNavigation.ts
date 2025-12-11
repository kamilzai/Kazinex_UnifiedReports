/**
 * Grid Navigation Hook
 * 
 * Manages keyboard navigation across the entire grid with Excel-like behavior.
 * Handles Tab, Shift+Tab, Arrow keys, Enter, Escape, and Ctrl shortcuts.
 */

import * as React from 'react';
import { CellPosition, GridNavigationState } from '../types/grid.types';

interface UseGridNavigationProps {
  totalRows: number;
  totalCols: number;
  onCellEdit?: (position: CellPosition) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  isEditMode?: boolean;
}

interface UseGridNavigationReturn extends GridNavigationState {
  setActiveCell: (position: CellPosition) => void;
  startEditing: (position?: CellPosition) => void;
  stopEditing: (save: boolean) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  moveToNextCell: () => void;
  moveToPreviousCell: () => void;
  moveUp: () => void;
  moveDown: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  moveToFirstCell: () => void;
  moveToLastCell: () => void;
  moveToFirstCellInRow: () => void;
  moveToLastCellInRow: () => void;
}

export const useGridNavigation = ({
  totalRows,
  totalCols,
  onCellEdit,
  onSaveEdit,
  onCancelEdit,
  isEditMode = false
}: UseGridNavigationProps): UseGridNavigationReturn => {
  
  const [activeCell, setActiveCell] = React.useState<CellPosition>({ row: 0, col: 0 });
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingCell, setEditingCell] = React.useState<CellPosition | null>(null);

  // Move to next cell (right, wrap to next row)
  const moveToNextCell = React.useCallback((andEdit = false) => {
    setActiveCell(prev => {
      const nextCol = prev.col + 1;
      let nextPos: CellPosition;
      
      if (nextCol < totalCols) {
        nextPos = { row: prev.row, col: nextCol };
      } else if (prev.row + 1 < totalRows) {
        // Wrap to next row
        nextPos = { row: prev.row + 1, col: 0 };
      } else {
        return prev; // Stay at last cell
      }
      
      // Trigger editing on the new cell if requested
      if (andEdit && onCellEdit) {
        // Use setTimeout to ensure state update happens first
        setTimeout(() => onCellEdit(nextPos), 0);
      }
      
      return nextPos;
    });
  }, [totalCols, totalRows, onCellEdit]);

  // Move to previous cell (left, wrap to previous row)
  const moveToPreviousCell = React.useCallback((andEdit = false) => {
    setActiveCell(prev => {
      const prevCol = prev.col - 1;
      let nextPos: CellPosition;
      
      if (prevCol >= 0) {
        nextPos = { row: prev.row, col: prevCol };
      } else if (prev.row > 0) {
        // Wrap to previous row, last column
        nextPos = { row: prev.row - 1, col: totalCols - 1 };
      } else {
        return prev; // Stay at first cell
      }
      
      // Trigger editing on the new cell if requested
      if (andEdit && onCellEdit) {
        setTimeout(() => onCellEdit(nextPos), 0);
      }
      
      return nextPos;
    });
  }, [totalCols, onCellEdit]);

  // Move up one row
  const moveUp = React.useCallback(() => {
    setActiveCell(prev => {
      if (prev.row > 0) {
        return { row: prev.row - 1, col: prev.col };
      }
      return prev;
    });
  }, []);

  // Move down one row
  const moveDown = React.useCallback(() => {
    setActiveCell(prev => {
      if (prev.row + 1 < totalRows) {
        return { row: prev.row + 1, col: prev.col };
      }
      return prev;
    });
  }, [totalRows]);

  // Move left one column
  const moveLeft = React.useCallback(() => {
    setActiveCell(prev => {
      if (prev.col > 0) {
        return { row: prev.row, col: prev.col - 1 };
      }
      return prev;
    });
  }, []);

  // Move right one column
  const moveRight = React.useCallback(() => {
    setActiveCell(prev => {
      if (prev.col + 1 < totalCols) {
        return { row: prev.row, col: prev.col + 1 };
      }
      return prev;
    });
  }, [totalCols]);

  // Move to first cell (A1)
  const moveToFirstCell = React.useCallback(() => {
    setActiveCell({ row: 0, col: 0 });
  }, []);

  // Move to last cell
  const moveToLastCell = React.useCallback(() => {
    setActiveCell({ row: totalRows - 1, col: totalCols - 1 });
  }, [totalRows, totalCols]);

  // Move to first cell in current row
  const moveToFirstCellInRow = React.useCallback(() => {
    setActiveCell(prev => ({ row: prev.row, col: 0 }));
  }, []);

  // Move to last cell in current row
  const moveToLastCellInRow = React.useCallback(() => {
    setActiveCell(prev => ({ row: prev.row, col: totalCols - 1 }));
  }, [totalCols]);

  // Start editing a cell
  const startEditing = React.useCallback((position?: CellPosition) => {
    const cellToEdit = position || activeCell;
    // // console.log(...)
    setIsEditing(true);
    setEditingCell(cellToEdit);
    if (position) {
      setActiveCell(position);
    }
    if (onCellEdit) {
      onCellEdit(cellToEdit);
    }
  }, [activeCell, onCellEdit]);

  // Stop editing a cell
  const stopEditing = React.useCallback((save: boolean) => {
    // // console.log(...)
    
    if (save && onSaveEdit) {
      onSaveEdit();
    } else if (!save && onCancelEdit) {
      onCancelEdit();
    }
    
    setIsEditing(false);
    setEditingCell(null);
  }, [onSaveEdit, onCancelEdit]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    // If external edit mode is active (e.g., inline editor), don't handle navigation
    if (isEditMode || isEditing) {
      // Let editor handle its own keys
      return;
    }

    const { key, ctrlKey, shiftKey } = e;

    switch (key) {
      case 'Enter':
        e.preventDefault();
        moveDown(); // Excel behavior: Enter moves down, doesn't edit
        break;

      case 'Tab':
        e.preventDefault();
        if (shiftKey) {
          moveToPreviousCell(false); // Tab backwards - Excel behavior: move only, don't edit
        } else {
          moveToNextCell(false); // Tab forward - Excel behavior: move only, don't edit
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        moveUp();
        break;

      case 'ArrowDown':
        e.preventDefault();
        moveDown();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        moveLeft();
        break;

      case 'ArrowRight':
        e.preventDefault();
        moveRight();
        break;

      case 'Home':
        e.preventDefault();
        if (ctrlKey) {
          moveToFirstCell();
        } else {
          moveToFirstCellInRow();
        }
        break;

      case 'End':
        e.preventDefault();
        if (ctrlKey) {
          moveToLastCell();
        } else {
          moveToLastCellInRow();
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (isEditing) {
          stopEditing(false);
        }
        break;

      default:
        // Excel-like behavior: Any printable character starts editing
        // Check if it's a printable character (not ctrl/alt/meta keys)
        if (!ctrlKey && !e.altKey && !e.metaKey && key.length === 1) {
          e.preventDefault();
          // Start editing with the typed character
          // The editor will be initialized with this character
          startEditing(activeCell);
        }
        break;
    }
  }, [
    isEditMode,
    isEditing,
    activeCell,
    startEditing,
    moveToNextCell,
    moveToPreviousCell,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
    moveToFirstCell,
    moveToLastCell,
    moveToFirstCellInRow,
    moveToLastCellInRow,
    stopEditing
  ]);

  // Update active cell when editing stops
  React.useEffect(() => {
    if (!isEditing && editingCell) {
      setActiveCell(editingCell);
    }
  }, [isEditing, editingCell]);

  return {
    activeCell,
    isEditing,
    editingCell: editingCell || undefined,
    setActiveCell,
    startEditing,
    stopEditing,
    handleKeyDown,
    moveToNextCell,
    moveToPreviousCell,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
    moveToFirstCell,
    moveToLastCell,
    moveToFirstCellInRow,
    moveToLastCellInRow
  };
};

