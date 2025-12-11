/**
 * Grid-Specific Type Definitions
 * 
 * Types used for grid display and interaction.
 */

/**
 * Grid Row - Transformed data for grid display
 * 
 * Combines ReportData with grid-specific metadata.
 */
export interface GridRow {
  /** Unique row identifier (from kazinex_reportdataid) */
  id: string;
  
  /** Row display order (from kazinex_groupsort) */
  groupSort: number;
  
  /** Human-readable identifier (from kazinex_rowidentifier) */
  rowIdentifier: string;
  
  /** Dynamic column data */
  [columnProp: string]: unknown;
}

/**
 * Extended Column Definition
 * 
 * Grid column definition with Kazinex-specific metadata.
 */
export interface GridColumn {
  /** Internal column property name */
  prop: string;
  
  /** Display name in header */
  name: string;
  
  /** Column width in pixels */
  size?: number;
  
  /** Column data type */
  columnType?: 'text' | 'numeric' | 'date' | 'select';
  
  /** Editor type */
  editor?: 'text' | 'numeric' | 'date' | 'select';
  
  /** Whether column is readonly */
  readonly?: boolean;
  
  /** Kazinex-specific: original structure ID */
  structureId?: string;
  
  /** Kazinex-specific: whether column is editable */
  isEditable?: boolean;
  
  /** Kazinex-specific: whether column is calculated */
  isCalculated?: boolean;
  
  /** Kazinex-specific: for lookup columns */
  lookupOptions?: {
    id: string;
    label: string;
    displayValue?: string;
  }[];
  
  /** Dataverse column name */
  kazinex_columnname?: string;
  
  /** Dataverse data type (from Report Structure) */
  kazinex_datatype?: string;
  
  /** Dataverse column type */
  kazinex_columntype?: string;
  
  /** Dataverse readonly flag */
  kazinex_readonly?: boolean;
  
  /** Dataverse calculated flag */
  kazinex_iscalculated?: boolean;
  
  /** Dataverse lookup entity */
  kazinex_lookupentity?: string;
  
  /** Dataverse lookup display field */
  kazinex_lookupdisplayfield?: string;
  
  /** Validation: minimum value (for numbers) */
  min?: number;
  
  /** Validation: maximum value (for numbers) */
  max?: number;
  
  /** Validation: maximum length (for text) */
  maxLength?: number;
}

/**
 * Cell Selection
 * 
 * Represents a selected cell or range of cells.
 */
export interface CellSelection {
  /** Row ID */
  rowId: string;
  
  /** Column property name */
  columnProp: string;
  
  /** Current cell value */
  value: unknown;
}

/**
 * Cell Edit
 * 
 * Represents a single cell edit (dirty change) in memory.
 */
export interface CellEdit {
  /** Row ID */
  rowId: string;
  
  /** Column property name */
  columnProp: string;
  
  /** Original value (before edit) */
  oldValue: unknown;
  
  /** New value (after edit) */
  newValue: unknown;
  
  /** When the edit was made */
  timestamp: Date;
  
  /** User who made the edit (optional) */
  userId?: string;
}

/**
 * Grid State
 * 
 * Represents the current state of the grid.
 */
export interface GridState {
  /** Current columns */
  columns: GridColumn[];
  
  /** Current rows */
  rows: GridRow[];
  
  /** Dirty changes (unsaved edits) */
  dirtyChanges: Map<string, CellEdit>;
  
  /** Currently selected cells */
  selectedCells: CellSelection[];
  
  /** Whether grid is in edit mode */
  isEditing: boolean;
  
  /** Currently editing cell (if any) */
  editingCell?: {
    rowId: string;
    columnProp: string;
  };
}

/**
 * Cell Coordinate
 * 
 * Identifies a specific cell in the grid.
 */
export interface CellCoordinate {
  /** Row index (0-based) */
  rowIndex: number;
  
  /** Column index (0-based) */
  columnIndex: number;
  
  /** Row ID */
  rowId: string;
  
  /** Column property name */
  columnProp: string;
}

/**
 * Grid Event Data
 * 
 * Data passed in grid events.
 */
export interface GridEventData {
  /** Row index */
  rowIndex?: number;
  
  /** Column property */
  columnProp?: string;
  
  /** Row ID */
  rowId?: string;
  
  /** Cell value */
  value?: unknown;
  
  /** Previous value */
  previousValue?: unknown;
  
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Range Selection
 * 
 * Represents a range of selected cells.
 */
export interface RangeSelection {
  /** Starting cell */
  start: CellCoordinate;
  
  /** Ending cell */
  end: CellCoordinate;
  
  /** All cells in range */
  cells: CellCoordinate[];
}

/**
 * Copy/Paste Data
 * 
 * Data structure for clipboard operations.
 */
export interface ClipboardData {
  /** Copied cells */
  cells: {
    rowId: string;
    columnProp: string;
    value: unknown;
  }[];
  
  /** Copy timestamp */
  timestamp: Date;
  
  /** Source selection range */
  sourceRange?: RangeSelection;
}

/**
 * Column Resize Event
 */
export interface ColumnResizeEvent {
  /** Column property that was resized */
  columnProp: string;
  
  /** New width in pixels */
  newWidth: number;
  
  /** Previous width in pixels */
  previousWidth?: number;
}

/**
 * Sort Configuration
 */
export interface SortConfig {
  /** Column to sort by */
  columnProp: string;
  
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Filter Configuration
 */
export interface FilterConfig {
  /** Column to filter */
  columnProp: string;
  
  /** Filter type */
  type: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  
  /** Filter value */
  value: unknown;
}

/**
 * Cell Editor Props
 * 
 * Common props for all cell editors.
 */
export interface CellEditorProps {
  /** Current cell value */
  value: unknown;
  
  /** Excel edit mode: 'edit' (F2, inline with cursor) or 'replace' (type-to-replace) */
  editMode?: 'edit' | 'replace';
  
  /** First character typed in replace mode */
  firstCharacter?: string;
  
  /** Callback when value is saved */
  onSave: (newValue: unknown) => void;
  
  /** Callback when edit is cancelled */
  onCancel: () => void;
  
  /** Column definition (for context like lookup options) */
  columnDef: GridColumn;
  
  /** Row ID being edited */
  rowId?: string;
  
  /** Validation function (optional) */
  validate?: (value: unknown) => boolean | string;
}

/**
 * Cell Position
 * 
 * Identifies a specific cell in the grid by row and column indices.
 */
export interface CellPosition {
  /** Row index (0-based) */
  row: number;
  rowIndex?: number; // Alias for row (optional, computed from row if not provided)
  
  /** Column index (0-based) */
  col: number;
}

/**
 * Cell Range
 * 
 * Represents a rectangular range of cells.
 */
export interface CellRange {
  /** Starting cell (top-left) */
  start: CellPosition;
  
  /** Ending cell (bottom-right) */
  end: CellPosition;
}

/**
 * Grid Navigation State
 * 
 * Tracks active cell and editing state for keyboard navigation.
 */
export interface GridNavigationState {
  /** Currently active cell */
  activeCell: CellPosition;
  
  /** Whether a cell is currently being edited */
  isEditing: boolean;
  
  /** Cell being edited (if any) */
  editingCell?: CellPosition;
}
