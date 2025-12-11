import * as React from 'react';
import { useCallback, useRef } from 'react';
import {
  DataEditor,
  DataEditorRef,
  GridColumn,
  GridCell,
  GridCellKind,
  Item,
  EditableGridCell,
  Theme
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { GridRow, GridColumn as KazinexGridColumn } from "../types/grid.types";

interface GlideDataGridWrapperProps {
  columns: KazinexGridColumn[];
  rows: GridRow[];
  onCellEdit?: (rowId: string, columnProp: string, newValue: unknown, oldValue: unknown) => void;
  editedCells?: Map<string, { oldValue: unknown; newValue: unknown }>;
  validationErrors?: Map<string, string>;
  onCellValidate?: (rowId: string, columnProp: string, value: unknown) => string | null;
}

export const GlideDataGridWrapper: React.FC<GlideDataGridWrapperProps> = ({
  columns,
  rows,
  onCellEdit,
  editedCells = new Map(),
  validationErrors = new Map(),
  onCellValidate
}) => {
  
  // Transform Kazinex columns to Glide columns
  const glideColumns: GridColumn[] = columns.map(col => ({
    title: col.name || col.prop,
    id: col.prop,
    width: col.size || 150
  }));

  // Debug logging for column editability and mapping
  React.useEffect(() => {
    // // console.log(...)
    columns.forEach(col => {
      // // console.log(...)
    });
    
    // // console.log(...)
    columns.forEach((col, idx) => {
      // // console.log(...)
    });
    
    // // console.log(...)
    glideColumns.forEach((col, idx) => {
      // // console.log(...)
    });
  }, [columns, glideColumns]);

  // Get cell content
  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const column = columns[col];
      const rowData = rows[row];
      
      // LOG: Track every getCellContent call
      // console.log('[GlideDataGridWrapper] getCellContent CALLED:', {
        col,
        row,
        columnName: column?.name,
        columnProp: column?.prop,
        rowId: rowData?.id
      });
      const cellKey = `${rowData.id}|${column.prop}`;
      
      if (!rowData || !column) {
        return {
          kind: GridCellKind.Text,
          data: "",
          displayData: "",
          allowOverlay: false
        };
      }

      const cellValue = rowData[column.prop];
      const displayValue = cellValue?.toString() || "";
      
      // Check if cell has validation error
      const hasError = validationErrors.has(cellKey);
      
      // Check if cell is edited
      const isEdited = editedCells.has(cellKey);

      // Determine cell kind based on column type
      let cellKind: GridCellKind = GridCellKind.Text;
      if (column.columnType === 'numeric') {
        cellKind = GridCellKind.Number;
      }

      // Build theme override for cell styling
      const themeOverride: Partial<Theme> = {};
      
      if (hasError) {
        // Red background for validation errors
        themeOverride.bgCell = "#ffebee";
        themeOverride.borderColor = "#c62828";
      } else if (isEdited) {
        // Orange background for edited cells
        themeOverride.bgCell = "#fff4e6";
        themeOverride.borderColor = "#ff9500";
      }

      const isReadonly = column.readonly !== false;

      if (cellKind === GridCellKind.Number) {
        return {
          kind: GridCellKind.Number,
          data: cellValue ? Number(cellValue) : 0,
          displayData: displayValue,
          allowOverlay: true,
          readonly: isReadonly,
          activationBehaviorOverride: "single-click",
          themeOverride: Object.keys(themeOverride).length > 0 ? themeOverride : undefined
        };
      }

      return {
        kind: GridCellKind.Text,
        data: displayValue,
        displayData: displayValue,
        allowOverlay: true,
        readonly: isReadonly,
        activationBehaviorOverride: "single-click",
        themeOverride: Object.keys(themeOverride).length > 0 ? themeOverride : undefined
      };
    },
    [columns, rows, editedCells, validationErrors]
  );

  // Handle cell edit
  const onCellEdited = useCallback(
    ([col, row]: Item, newValue: EditableGridCell): void => {
      const column = columns[col];
      const rowData = rows[row];
      
      if (!rowData || !column || !onCellEdit) return;

      const oldValue = rowData[column.prop];
      let extractedValue: unknown;

      if (newValue.kind === GridCellKind.Number) {
        extractedValue = newValue.data;
      } else if (newValue.kind === GridCellKind.Text) {
        extractedValue = newValue.data;
      } else {
        extractedValue = newValue.data;
      }

      // Validate if validator provided
      if (onCellValidate) {
        const error = onCellValidate(rowData.id, column.prop, extractedValue);
        if (error) {
          // // console.warn(...)
          // Still allow edit but will be marked with error
        }
      }

      onCellEdit(rowData.id, column.prop, extractedValue, oldValue);
    },
    [columns, rows, onCellEdit, onCellValidate]
  );

  // Custom theme - Microsoft Fluent UI inspired
  const theme: Partial<Theme> = {
    accentColor: "#0078d4", // Microsoft blue
    accentLight: "#deecf9",
    textDark: "#201f1e",
    textMedium: "#605e5c",
    textLight: "#8a8886",
    textBubble: "#ffffff",
    bgIconHeader: "#f3f2f1",
    fgIconHeader: "#201f1e",
    textHeader: "#201f1e",
    textGroupHeader: "#a19f9d",
    bgCell: "#ffffff",
    bgCellMedium: "#faf9f8",
    bgHeader: "#f3f2f1",
    bgHeaderHasFocus: "#edebe9",
    bgHeaderHovered: "#e1dfdd",
    bgBubble: "#ffffff",
    bgBubbleSelected: "#cfe4fa",
    bgSearchResult: "#fff4ce",
    borderColor: "#edebe9",
    drilldownBorder: "#0078d4",
    linkColor: "#0078d4",
    headerFontStyle: "600 13px",
    baseFontStyle: "13px",
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // Handle cell click for debugging
  const onCellClicked = useCallback(
    (cell: Item) => {
      const [col, row] = cell;
      const column = columns[col];
      const rowData = rows[row];
      
      // console.log('[GlideDataGridWrapper] Cell CLICKED:', {
        col,
        row,
        columnName: column?.name,
        columnProp: column?.prop,
        rowId: rowData?.id,
        cellValue: rowData?.[column?.prop]
      });
      
      return true; // Allow default behavior
    },
    [columns, rows]
  );

  // Create a ref for the DataEditor to access its container
  const gridRef = useRef<DataEditorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '500px', position: 'relative' }}>
        <DataEditor
          ref={gridRef}
          columns={glideColumns}
          rows={rows.length}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClicked}
          theme={theme}
          smoothScrollX={true}
          smoothScrollY={true}
          rowMarkers="number"
          freezeColumns={1}
          // Use the container as the overlay parent - CRITICAL for PowerApps
          overscrollX={0}
          overscrollY={0}
        />
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff4e6', border: '1px solid #ff9500', borderRadius: '4px' }}>
          <strong>Editing Instructions:</strong> <strong>CLICK</strong> on any cell to edit it. Press <strong>Enter</strong> to save or <strong>Esc</strong> to cancel.
        </div>
      </div>
      {/* Portal div MUST be outside the container and at root level for proper positioning */}
      <div id="portal" />
    </>
  );
};

