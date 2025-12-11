import * as React from 'react';
import { CellPosition } from './useGridSelection';

export interface GridColumn {
  prop: string;
  name: string;
  columnType?: string;
  lookupOptions?: { id: string; label: string }[];
}

export interface UseCopyPasteProps {
  rows: Record<string, unknown>[];
  columns: GridColumn[];
  onCellEdit: (rowId: string, columnProp: string, newValue: unknown, oldValue: unknown) => void;
  onCreateRows?: (newRows: Record<string, unknown>[]) => void; // NEW: Callback for bulk row creation
}

export interface UseCopyPasteReturn {
  handleCopy: (selectedCells: CellPosition[]) => void;
  handlePaste: (selectedCells: CellPosition[]) => Promise<void>;
  copyStatus: string | null;
  pasteStatus: string | null;
}

/**
 * Hook for handling copy/paste operations on grid cells
 * Phase 3.2: Copy operation with TSV format for Excel compatibility
 * Phase 3.3: Paste operation with type conversion and validation
 * Phase 3.4: Bulk row creation when pasting beyond existing rows
 */
export const useCopyPaste = ({ rows, columns, onCellEdit, onCreateRows }: UseCopyPasteProps): UseCopyPasteReturn => {
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);
  const [pasteStatus, setPasteStatus] = React.useState<string | null>(null);

  /**
   * Copy selected cells to clipboard in TSV format (Excel-compatible)
   * Handles single cells, ranges, and multi-selection
   */
  const handleCopy = React.useCallback((selectedCells: CellPosition[]) => {
    if (selectedCells.length === 0) {
      // // console.log(...)
      return;
    }

    // // console.log(...)

    // Group cells by row for TSV formatting
    const cellsByRow = new Map<number, Map<number, string>>();

    selectedCells.forEach((pos) => {
      if (!cellsByRow.has(pos.row)) {
        cellsByRow.set(pos.row, new Map());
      }

      const column = columns[pos.col];
      const row = rows[pos.row];

      if (!column || !row) {
        // // console.warn(...)
        return;
      }

      const cellValue = row[column.prop];

      // Convert to string based on value type
      let stringValue = '';

      if (cellValue === null || cellValue === undefined) {
        stringValue = '';
      } else if (typeof cellValue === 'object' && 'label' in cellValue) {
        // Lookup: use label for user-friendly Excel compatibility
        stringValue = String((cellValue as { label: string }).label);
      } else if (cellValue instanceof Date) {
        // Date: format to locale date string
        stringValue = cellValue.toLocaleDateString();
      } else if (typeof cellValue === 'number') {
        // Check if it's a percent column
        if (column.columnType === 'Percent') {
          // Format as percentage with % sign (0.5 → "50%")
          stringValue = String(cellValue * 100) + '%';
        } else {
          // Number: convert to string as-is
          stringValue = String(cellValue);
        }
      } else {
        // Text and everything else
        stringValue = String(cellValue);
      }

      // Excel-compatible format: Quote cells that contain special characters
      // If cell contains newlines, tabs, or quotes, wrap in double quotes and escape internal quotes
      if (stringValue.includes('\n') || stringValue.includes('\t') || stringValue.includes('"')) {
        stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
      }

      cellsByRow.get(pos.row)!.set(pos.col, stringValue);
    });

    // Convert to TSV (Tab-Separated Values) - Excel standard format
    const rowEntries = Array.from(cellsByRow.entries()).sort((a, b) => a[0] - b[0]);

    const tsv = rowEntries
      .map(([rowIndex, cols]) => {
        const colEntries = Array.from(cols.entries()).sort((a, b) => a[0] - b[0]);
        return colEntries.map(([_, value]) => value).join('\t');
      })
      .join('\n');

    // Copy to clipboard using Clipboard API
    void navigator.clipboard
      .writeText(tsv)
      .then(() => {
        // // console.log(...)
        // // console.log(...)

        // Show success feedback
        setCopyStatus(`✓ Copied ${selectedCells.length} cell${selectedCells.length > 1 ? 's' : ''}`);
        
        // Clear status after 2 seconds
        setTimeout(() => setCopyStatus(null), 2000);
        
        return undefined;
      })
      .catch((error: unknown) => {
        // // console.error(...)
        setCopyStatus('✗ Copy failed');
        setTimeout(() => setCopyStatus(null), 2000);
      });
  }, [rows, columns]);

  /**
   * Parse clipboard data (TSV/CSV format)
   * Handles Excel-compatible quoted format for multiline cells
   * Excel wraps cells containing newlines/tabs/quotes in double quotes
   */
  const parseClipboardData = React.useCallback((clipboardText: string): string[][] => {
    // Remove trailing newline if present
    const trimmed = clipboardText.replace(/\n$/, '');
    
    // Detect delimiter (tab for TSV/Excel, comma for CSV)
    const delimiter = trimmed.includes('\t') ? '\t' : ',';
    
    // If no delimiter found, treat as single cell
    if (!trimmed.includes(delimiter)) {
      return [[trimmed]];
    }
    
    // Parse TSV/CSV with proper handling of quoted multiline cells
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    let i = 0;
    
    while (i < trimmed.length) {
      const char = trimmed[i];
      const nextChar = trimmed[i + 1];
      
      if (insideQuotes) {
        // Inside quoted cell
        if (char === '"') {
          if (nextChar === '"') {
            // Escaped quote ("") -> add single quote to cell
            currentCell += '"';
            i += 2;
            continue;
          } else {
            // End of quoted cell
            insideQuotes = false;
            i++;
            continue;
          }
        } else {
          // Regular character inside quotes (including newlines and tabs)
          currentCell += char;
          i++;
        }
      } else {
        // Outside quotes
        if (char === '"' && currentCell === '') {
          // Start of quoted cell
          insideQuotes = true;
          i++;
        } else if (char === delimiter) {
          // Column separator
          currentRow.push(currentCell);
          currentCell = '';
          i++;
        } else if (char === '\n') {
          // Row separator
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
        } else {
          // Regular character
          currentCell += char;
          i++;
        }
      }
    }
    
    // Push last cell and row
    currentRow.push(currentCell);
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    return rows;
  }, []);

  /**
   * Convert pasted string value to appropriate data type based on column type
   */
  const convertValueForType = React.useCallback((
    value: string,
    columnType: string | undefined,
    lookupOptions?: { id: string; label: string }[]
  ): unknown => {
    const trimmed = value.trim();
    
    // Empty string
    if (trimmed === '') {
      return null;
    }
    
    switch(columnType) {
      case 'Number': {
        // Remove currency symbols ($ € £ ¥ ₹ ₽ ₩ ¢ ¤) and thousand separators
        let cleaned = trimmed.replace(/[$€£¥₹₽₩¢¤]/g, '');
        cleaned = cleaned.replace(/,/g, '');
        cleaned = cleaned.trim();
        
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      }
      
      case 'Percent': {
        // Handle both "50%" and "0.5" formats from Excel/clipboard
        const hasPercent = trimmed.includes('%');
        const cleaned = trimmed.replace(/%/g, '').replace(/,/g, '').trim();
        const percent = parseFloat(cleaned);
        
        if (!isNaN(percent)) {
          // If value has % sign, treat as percentage (50% → 0.5)
          // If no % sign but value > 1, assume percentage (50 → 0.5)
          // If no % sign and value <= 1, assume decimal (0.5 → 0.5)
          if (hasPercent || percent > 1) {
            return percent / 100;
          } else {
            return percent;
          }
        }
        return null;
      }
      
      case 'Date': {
        // Try to parse date
        const date = new Date(trimmed);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      
      case 'Lookup': {
        // Reverse lookup: find ID by label
        if (lookupOptions && lookupOptions.length > 0) {
          const option = lookupOptions.find(opt => 
            opt.label.toLowerCase() === trimmed.toLowerCase()
          );
          if (option) {
            return { id: option.id, label: option.label };
          }
        }
        // If no match found, return null (invalid lookup)
        return null;
      }
      
      case 'Text':
      default:
        return trimmed;
    }
  }, []);

  /**
   * Paste clipboard data into selected cells
   * Phase 3.3: Paste over existing cells with type conversion
   */
  const handlePaste = React.useCallback(async (selectedCells: CellPosition[]) => {
    if (selectedCells.length === 0) {
      // // console.log(...)
      setPasteStatus('⚠ Select a cell to paste');
      setTimeout(() => setPasteStatus(null), 2000);
      return;
    }

    try {
      // Read clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText || clipboardText.trim() === '') {
        // // console.log(...)
        setPasteStatus('⚠ Clipboard is empty');
        setTimeout(() => setPasteStatus(null), 2000);
        return;
      }

      // // console.log(...)
      // // console.log(...)

      // Parse clipboard data
      const pastedData = parseClipboardData(clipboardText);
      // // console.log(...)

      // Get start position (top-left of selection)
      const startPos = selectedCells.reduce((min, pos) => ({
        row: Math.min(min.row, pos.row),
        col: Math.min(min.col, pos.col)
      }), { row: selectedCells[0].row, col: selectedCells[0].col });

      let pastedCount = 0;
      let skippedCount = 0;
      const newRowsToCreate: Record<string, unknown>[] = [];

      // Paste data starting from top-left selection
      pastedData.forEach((rowData, rowOffset) => {
        const targetRowIndex = startPos.row + rowOffset;
        
        // Phase 3.4: Create new rows when pasting beyond existing rows
        if (targetRowIndex >= rows.length) {
          if (onCreateRows) {
            // // console.log(...)
            
            // Create new in-memory row structure
            const newRow: Record<string, unknown> = {
              // Temporary ID will be generated when added to grid
              _isPastedNewRow: true,
              _pastedData: {} as Record<string, unknown>
            };
            
            // Populate cells from pasted data
            rowData.forEach((cellValue, colOffset) => {
              const targetColIndex = startPos.col + colOffset;
              
              if (targetColIndex < columns.length) {
                const column = columns[targetColIndex];
                const convertedValue = convertValueForType(cellValue, column.columnType, column.lookupOptions);
                
                // Store pasted value in the new row
                (newRow._pastedData as Record<string, unknown>)[column.prop] = convertedValue;
                pastedCount++;
                
                // // console.log(...): "${cellValue}" → ${column.columnType} = ${JSON.stringify(convertedValue)}`);
              } else {
                skippedCount++;
              }
            });
            
            newRowsToCreate.push(newRow);
          } else {
            // // console.warn(...):', targetRowIndex);
            skippedCount += rowData.length;
          }
          return;
        }

        // Existing logic: Paste over existing cells
        rowData.forEach((cellValue, colOffset) => {
          const targetColIndex = startPos.col + colOffset;
          
          // Skip if beyond existing columns
          if (targetColIndex >= columns.length) {
            // // console.warn(...)
            skippedCount++;
            return;
          }

          const column = columns[targetColIndex];
          const row = rows[targetRowIndex];
          const rowId = row.id as string;
          const oldValue = row[column.prop];

          // Convert value based on column type
          const newValue = convertValueForType(cellValue, column.columnType, column.lookupOptions);

          // Only update if value changed
          if (newValue !== oldValue) {
            onCellEdit(rowId, column.prop, newValue, oldValue);
            pastedCount++;
            // // console.log(...): "${cellValue}" → ${column.columnType} = ${JSON.stringify(newValue)}`);
          }
        });
      });

      // Create new rows if any were detected
      if (newRowsToCreate.length > 0 && onCreateRows) {
        // // console.log(...)
        onCreateRows(newRowsToCreate);
      }

      // Show feedback
      if (pastedCount > 0 || newRowsToCreate.length > 0) {
        let message = '';
        
        if (newRowsToCreate.length > 0) {
          message = `✓ Pasted ${pastedCount} cell${pastedCount > 1 ? 's' : ''} + ${newRowsToCreate.length} new row${newRowsToCreate.length > 1 ? 's' : ''}`;
        } else if (skippedCount > 0) {
          message = `✓ Pasted ${pastedCount} cell${pastedCount > 1 ? 's' : ''} (${skippedCount} skipped)`;
        } else {
          message = `✓ Pasted ${pastedCount} cell${pastedCount > 1 ? 's' : ''}`;
        }
        
        setPasteStatus(message);
        // // console.log(...)
      } else {
        setPasteStatus('⚠ No cells were pasted');
      }
      
      setTimeout(() => setPasteStatus(null), 3000);

    } catch (error: unknown) {
      // // console.error(...)
      setPasteStatus('✗ Paste failed');
      setTimeout(() => setPasteStatus(null), 2000);
    }
  }, [rows, columns, onCellEdit, parseClipboardData, convertValueForType]);

  return {
    handleCopy,
    handlePaste,
    copyStatus,
    pasteStatus,
  };
};

