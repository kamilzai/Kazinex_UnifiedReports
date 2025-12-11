/**
 * Dataverse Entity Type Definitions
 * 
 * These interfaces match the Kazinex Dataverse entities:
 * - kazinex_reportslice
 * - kazinex_reportsection
 * - kazinex_reportstructure
 * - kazinex_reportdata
 */

/**
 * Report Slice Entity (kazinex_reportslice)
 * 
 * Represents a collection of related report sections.
 * Example: "Q4 2024 Financial Report"
 */
export interface ReportSlice {
  /** Primary key */
  kazinex_reportsliceid: string;
  
  /** Display name of the report slice */
  kazinex_name: string;
  
  /** Optional description */
  kazinex_description?: string;
  
  /** Creation timestamp */
  createdon: Date;
  
  /** Last modified timestamp */
  modifiedon: Date;
}

/**
 * Report Section Entity (kazinex_reportsection)
 * 
 * Represents a single tab/section within a report slice.
 * Example: "Income Statement", "Balance Sheet"
 */
export interface ReportSection {
  /** Primary key */
  kazinex_reportsectionid: string;
  
  /** Display name for the tab */
  kazinex_name: string;
  
  /** Foreign key to parent report slice */
  kazinex_reportsliceid: string;
  
  /** Display order (for tab ordering) */
  kazinex_ordernumber: number;
  
  /** Whether this section is currently active */
  kazinex_isactive: boolean;
  
  /** Whether this section allows multiple rows (grouping) */
  kazinex_grouping?: boolean;
}

/**
 * Report Structure Entity (kazinex_reportstructure)
 * 
 * Defines the column structure for a report section.
 * Each structure defines one column in the grid.
 */
export interface ReportStructure {
  /** Primary key */
  kazinex_reportstructureid: string;
  
  /** Foreign key to report section */
  kazinex_reportsectionid: string;
  
  /** Internal column name (used as property key) */
  kazinex_columnname: string;
  
  /** Display name shown in grid header */
  kazinex_columndisplayname: string;
  
  /** Column data type - THIS is the actual field from Dataverse (could be kazinex_columntype or cra59_datatype) */
  kazinex_columntype?: 'text' | 'number' | 'percent' | 'lookup' | 'date' | 'image' | 'Text' | 'Number' | 'Percent' | 'Lookup' | 'Date' | 'Image';
  
  /** Column data type - alternative field name (cra59_datatype from schema doc) */
  kazinex_datatype?: 'text' | 'number' | 'percent' | 'lookup' | 'date' | 'image' | 'Text' | 'Number' | 'Percent' | 'Lookup' | 'Date' | 'Image';
  cra59_datatype?: 'text' | 'number' | 'percent' | 'lookup' | 'date' | 'image' | 'Text' | 'Number' | 'Percent' | 'Lookup' | 'Date' | 'Image';
  
  /** Field name from Dataverse */
  kazinex_fieldname?: string;
  cra59_fieldname?: string;
  
  /** Whether column is calculated/readonly */
  kazinex_iscalculated?: boolean;
  
  /** Column display order (left to right) */
  kazinex_ordernumber: number;
  
  /** Whether users can edit this column */
  kazinex_iseditable: boolean;
  
  /** Optional: column width in pixels (deprecated - use columnsize instead) */
  kazinex_width?: number;
  
  /** Column size for proportional width calculation (decimal value) */
  kazinex_columnsize?: number;
  cra59_columnsize?: number;
  
  /** For lookup columns: the entity to lookup */
  kazinex_lookupentity?: string;
  
  /** For lookup columns: the field to display */
  kazinex_lookupdisplayfield?: string;
  
  /** For lookup columns: the ID field */
  kazinex_lookupidfield?: string;
  
  /** For lookup columns: available lookup options (populated at runtime) */
  lookupOptions?: { id: string; label: string }[];
}

/**
 * Report Data Entity (kazinex_reportdata)
 * 
 * Contains the actual data rows for a report section.
 * Data is stored in EAV (Entity-Attribute-Value) format in Dataverse:
 * - Each row in the table represents ONE cell value
 * - Multiple rows with same group+groupsort form one grid row
 * - reportstructure lookup indicates which column the value belongs to
 * - datainput field contains the actual cell value
 * 
 * This interface represents the PIVOTED grid format after transformation.
 * 
 * IMPORTANT: The kazinex_datainput field is multi-purpose:
 * - For Text columns (datatype=1): Plain text
 * - For Number columns (datatype=2): Numeric string
 * - For Date columns (datatype=3): ISO date string
 * - For Percent columns (datatype=4): Numeric string (0-1 range)
 * - For Lookup columns (datatype=5): GUID string
 * - For Image columns (datatype=6): Base64 data URL (e.g., "data:image/jpeg;base64,...")
 */
export interface ReportData {
  /** Primary key (from one of the EAV rows) */
  kazinex_reportdataid: string;
  
  /** Foreign key to report section */
  kazinex_reportsectionid: string;
  
  /** Critical: determines row display order (ascending) */
  kazinex_groupsort: number;
  
  /** Human-readable row identifier (e.g., "00.New Item", "1", "2") */
  kazinex_group: string;
  
  /** Multi-purpose data field - interpretation depends on kazinex_datatype
   * For images (datatype=6): Contains Base64 data URL string
   */
  kazinex_datainput?: string;
  
  /** Dynamic column fields based on report structures
   * Each structure's columnname becomes a property here
   * Example: "Forecast at Completion": "0", "Actual Payments": "0", etc.
   */
  [key: string]: unknown;
}

/**
 * Data Filter for querying report data
 */
export interface DataFilter {
  /** Filter by specific row identifiers */
  rowIdentifiers?: string[];
  
  /** Filter by groupSort range */
  groupSortMin?: number;
  groupSortMax?: number;
  
  /** Additional custom filters */
  [key: string]: unknown;
}

/**
 * Data Update for batch save operations
 */
export interface DataUpdate {
  /** ID of the EAV record to update (if exists), or logical row ID (if creating) */
  kazinex_reportdataid: string;
  
  /** Column name to update */
  columnName: string;
  
  /** New value */
  value: unknown;
  
  /** Old value (for conflict detection) */
  previousValue?: unknown;
  
  /** Whether this cell needs to be created (no EAV record exists yet) */
  needsCreate?: boolean;
  
  /** Context needed for CREATE operations (includes section/slice IDs from row metadata) */
  createContext?: {
    sectionId: string;
    sliceId: string | null;
    structureId: string;
    group: string;
    groupSort: number;
  };
}

/**
 * Batch Save Result
 */
export interface BatchResult {
  /** Whether the batch save was successful */
  success: boolean;
  
  /** Number of records updated */
  updatedCount: number;
  
  /** Any errors that occurred */
  errors: {
    recordId: string;
    columnName: string;
    error: string;
  }[];
  
  /** Server timestamp */
  timestamp: Date;
}

/**
 * Lookup Option (for lookup columns)
 */
export interface LookupOption {
  /** The ID value */
  id: string;
  
  /** The display text */
  displayValue: string;
  
  /** Optional: additional metadata */
  metadata?: Record<string, unknown>;
}
