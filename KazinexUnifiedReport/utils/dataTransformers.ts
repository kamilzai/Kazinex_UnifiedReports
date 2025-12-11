/**
 * Data Transformers
 * 
 * Utilities to transform Dataverse entities into grid format.
 * Handles the mapping between Kazinex data model and grid display.
 * 
 * Day 4: Core transformation logic
 */

import type {
  ReportStructure,
  ReportData,
} from '../types/dataverse.types';
import type { GridColumn, GridRow } from '../types/grid.types';
import { calculateColumnWidths, applyCalculatedWidths } from './columnWidthCalculator';
import { createDebugLogger } from './debugLogger';

const transformersDebugLog = createDebugLogger('DataTransformers');

/**
 * Transform Dataverse ReportStructure entities into grid columns
 * 
 * @param structures - Array of report structure definitions
 * @param availableWidth - Optional available width for the grid (for proportional sizing)
 * @returns Array of grid column definitions
 */
export function transformStructuresToColumns(
  structures: ReportStructure[],
  availableWidth?: number
): GridColumn[] {
  // // console.log(...)

  // Sort by order number
  const sortedStructures = [...structures].sort(
    (a, b) => a.kazinex_ordernumber - b.kazinex_ordernumber
  );

  // Calculate column widths based on ColumnSize field
  const widthConfig = calculateColumnWidths(sortedStructures, availableWidth);
  const widthMap = new Map(widthConfig.columns.map(c => [c.prop, c.width]));

  const columns: GridColumn[] = sortedStructures.map((structure) => {
    // Get data type from any available field (try kazinex_datatype, kazinex_columntype, or cra59_datatype)
    const structureWithAltFields = structure as ReportStructure & { cra59_datatype?: string };
    const originalDataType = structure.kazinex_datatype || structure.kazinex_columntype || structureWithAltFields.cra59_datatype || 'Text';
    // Normalize to lowercase for comparison in switch statement
    const dataType = originalDataType.toLowerCase();
    
    // DEBUG: Log datatype detection for all columns
    transformersDebugLog(`[DataTransformers] Column "${structure.kazinex_columndisplayname}": ` +
      `kazinex_datatype="${structure.kazinex_datatype}", ` +
      `originalDataType="${originalDataType}", ` +
      `normalized="${dataType}"`);
    
    // Get calculated width or fall back to default
    const calculatedWidth = widthMap.get(structure.kazinex_columnname);
    
    // Use exact configured width (removed 0.9 multiplier for Excel-like behavior)
    const columnWidth = calculatedWidth || structure.kazinex_width || 150;
    
    // Base column configuration
    const column: GridColumn = {
      prop: structure.kazinex_columnname,
      name: structure.kazinex_columndisplayname,
      size: columnWidth,
      readonly: !structure.kazinex_iseditable,
      structureId: structure.kazinex_reportstructureid,
      isEditable: structure.kazinex_iseditable,
      isCalculated: structure.kazinex_iscalculated,
      // Store Dataverse field names for editor routing - KEEP ORIGINAL CASE
      kazinex_columnname: structure.kazinex_columnname,
      kazinex_datatype: originalDataType, // IMPORTANT: Store original datatype (e.g., "Image", "Number", "Text")
      kazinex_columntype: originalDataType, // Original case (e.g., "Number", "Text", "Date")
      kazinex_readonly: !structure.kazinex_iseditable,
      kazinex_iscalculated: structure.kazinex_iscalculated,
      kazinex_lookupentity: structure.kazinex_lookupentity,
      kazinex_lookupdisplayfield: structure.kazinex_lookupdisplayfield,
    };

    // // console.log(
    //   `[Transformers] Column "${column.name}": ` +
    //   `columnSize=${structure.kazinex_columnsize}, width=${column.size}px`
    // );

    // Configure column based on data type (from Report Structure: Text, Number, Date, Percent, Lookup, Image)
    switch (dataType) {
      case 'image':
        // Image columns use custom rendering (ImageThumbnailCell) and editing (ImageCellEditor)
        // Don't set columnType/editor - routing handled by CellEditorManager via kazinex_datatype
        column.columnType = 'text'; // Fallback for grid rendering
        transformersDebugLog(`[DataTransformers] ✅ IMAGE COLUMN DETECTED: "${column.name}" - kazinex_datatype="${column.kazinex_datatype}"`);
        break;

      case 'number':
        column.columnType = 'numeric';
        column.editor = 'numeric';
        break;

      case 'percent':
        column.columnType = 'numeric';
        column.editor = 'numeric';
        // Editors will handle percent formatting
        break;

      case 'date':
        column.columnType = 'date';
        column.editor = 'date';
        break;

      case 'lookup':
        column.columnType = 'select';
        column.editor = 'select';
        // Pass through lookup options if available (populated by useReportData hook)
        if ('lookupOptions' in structure) {
          column.lookupOptions = (structure as ReportStructure & { lookupOptions?: { id: string; label: string }[] }).lookupOptions;
          // // console.log(...)
        }
        break;

      case 'text':
      default:
        column.columnType = 'text';
        column.editor = 'text';
        break;
    }

    // // console.log(...)
    return column;
  });

  // // console.log(...).join(', '));
  // // console.log('[Transformers] Column details:', columns.map(c => ({
  //   name: c.name,
  //   prop: c.prop,
  //   readonly: c.readonly,
  //   isEditable: c.isEditable
  // })));
  return columns;
}

/**
 * Transform Dataverse ReportData entities into grid rows
 * 
 * @param dataRecords - Array of report data records
 * @param structures - Array of report structures (for column mapping)
 * @returns Array of grid row objects
 */
export function transformReportDataToRows(
  dataRecords: ReportData[],
  structures: ReportStructure[]
): GridRow[] {
  // // console.log(...)

  // Sort by groupSort to maintain report order
  const sortedData = [...dataRecords].sort(
    (a, b) => a.kazinex_groupsort - b.kazinex_groupsort
  );

  const rows: GridRow[] = sortedData.map((dataRecord) => {
    // Start with base row properties
    const row: GridRow = {
      id: dataRecord.kazinex_reportdataid,
      groupSort: dataRecord.kazinex_groupsort,
      rowIdentifier: dataRecord.kazinex_group as string,
    };

    // Map each structure's column to row data
    structures.forEach((structure) => {
      const columnProp = structure.kazinex_columnname;
      const rawValue = dataRecord[columnProp];

      // Get data type and normalize to lowercase (same as in transformStructuresToColumns)
      const structureWithAltFields = structure as ReportStructure & { cra59_datatype?: string };
      const originalDataType = structure.kazinex_datatype || structure.kazinex_columntype || structureWithAltFields.cra59_datatype || 'Text';
      const dataType = originalDataType.toLowerCase();

      // Transform value based on column type
      let displayValue: unknown = rawValue;

      switch (dataType) {
        case 'number':
          // Format numbers with commas
          if (typeof rawValue === 'number') {
            displayValue = rawValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          }
          break;

        case 'percent':
          // Format percentages
          if (typeof rawValue === 'number') {
            displayValue = `${rawValue.toFixed(2)}%`;
          }
          break;

        case 'date':
          // Format dates
          if (rawValue instanceof Date) {
            displayValue = rawValue.toLocaleDateString('en-US');
          } else if (typeof rawValue === 'string') {
            displayValue = new Date(rawValue).toLocaleDateString('en-US');
          }
          break;

        case 'image':
          // Image columns store Base64 data URL strings
          // Pass through as-is for ImageThumbnailCell to render
          displayValue = rawValue ?? null;
          break;

        case 'lookup': {
          // For lookup columns, we need to map the ID to the display label
          // The rawValue is the numeric ID (e.g., "1032", "1035") from Dataverse datainput field
          // IMPORTANT: Store BOTH the ID (for editing) and the label (for display)
          if (rawValue && structure.lookupOptions) {
            // Find the lookup option by ID (numeric ID like "1032")
            const lookupOption = structure.lookupOptions.find(
              opt => opt.id === String(rawValue)
            );
            
            if (lookupOption) {
              // Store as object with both id and label
              // This allows the editor to get the ID and the cell to display the label
              displayValue = {
                id: lookupOption.id,
                label: lookupOption.label
              };
              // // console.log(...)
            } else {
              // ID not found in options - show the raw ID value as both id and label
              displayValue = {
                id: String(rawValue),
                label: String(rawValue)
              };
              // // console.warn(...).join(', '));
            }
          } else {
            displayValue = rawValue || '';
          }
          break;
        }

        case 'text':
        default:
          // Use as-is for text
          displayValue = rawValue ?? '';
          break;
      }

      row[columnProp] = displayValue;
    });

    return row;
  });

  // // console.log(...)
  return rows;
}

/**
 * Extract unique lookup values from data for a specific column
 * 
 * @param dataRecords - Array of report data records
 * @param columnProp - Column property name
 * @returns Array of unique lookup options
 */
export function extractLookupOptions(
  dataRecords: ReportData[],
  columnProp: string
): { id: string; displayValue: string }[] {
  const displayFieldName = `${columnProp}_display`;
  const uniqueOptions = new Map<string, string>();

  dataRecords.forEach((record) => {
    const id = record[columnProp] as string;
    const displayValue = record[displayFieldName] as string;

    if (id && displayValue && !uniqueOptions.has(id)) {
      uniqueOptions.set(id, displayValue);
    }
  });

  return Array.from(uniqueOptions.entries()).map(([id, displayValue]) => ({
    id,
    displayValue,
  }));
}

/**
 * Calculate column statistics for display
 * 
 * @param dataRecords - Array of report data records
 * @param columnProp - Column property name
 * @returns Statistics object with sum, avg, min, max
 */
export function calculateColumnStats(
  dataRecords: ReportData[],
  columnProp: string
): {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
} {
  const values = dataRecords
    .map((record) => record[columnProp])
    .filter((val): val is number => typeof val === 'number');

  if (values.length === 0) {
    return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    sum,
    avg,
    min,
    max,
    count: values.length,
  };
}

