/**
 * Type Definitions for "Copy from Previous Slice" Feature
 * 
 * These interfaces support the multi-step copy dialog workflow:
 * 1. Select Project
 * 2. Select Slice (with filters)
 * 3. Select Sections
 * 4. Execute Copy with progress tracking
 */

/**
 * Project with slice count
 * Used in Step 1: Project Selection
 * 
 * Based on schema: cra59_project table
 */
export interface ProjectWithSlices {
  /** Project ID (cra59_projectid) */
  projectId: string;
  
  /** Project Code - primary name (cra59_projectcode) */
  projectCode?: string;
  
  /** Project Name (cra59_projectname) */
  projectName?: string;
  
  /** Project Description */
  description?: string;
  
  /** Number of slices associated with this project */
  sliceCount: number;
}

/**
 * Slice information for selection
 * Used in Step 2: Slice Selection
 * 
 * Based on schema: cra59_reportslice table
 */
export interface SliceInfo {
  /** Report Slice ID (cra59_reportsliceid or kazinex_reportsliceid) */
  sliceId: string;
  
  /** Slice name/description */
  name?: string;
  
  /** Additional description */
  description?: string;
  
  /** Data date (cra59_datadate) - the date this slice represents */
  dataDate?: Date;
  
  /** Reference number (cra59_refno) */
  refNo?: string;
  
  /** Slice type (cra59_slicetype) - e.g., "Weekly", "Monthly" */
  sliceType?: string;
  
  /** Report Design ID (lookup: _cra59_reportdesign_value) - CRITICAL for filtering compatible slices */
  reportDesignId?: string;
  
  /** Parent project ID (lookup: _cra59_project_value) */
  projectId?: string;
  
  /** Parent project name (for display) */
  projectName?: string;
  
  /** Total number of data rows across all sections in this slice */
  rowCount: number;
  
  /** Creation timestamp */
  createdon?: Date;
  
  /** Last modified timestamp */
  modifiedon?: Date;
}

/**
 * Section information with row counts
 * Used in Step 3: Section Selection
 * 
 * Based on schema: cra59_reportsection table
 */
export interface SectionInfo {
  /** Report Section ID (cra59_reportsectionid or kazinex_reportsectionid) */
  sectionId: string;
  
  /** Section name (cra59_name or kazinex_name) */
  name: string;
  
  /** Section description */
  description?: string;
  
  /** Sort order (cra59_sortorder) */
  sortOrder?: number;
  
  /** Number of distinct rows (distinct groupsort values) in this section for the slice */
  rowCount: number;
  
  /** Number of columns/structures in this section (optional) */
  dataColumnCount?: number;
  
  /** Whether this section allows grouping (cra59_grouping) */
  grouping?: boolean;
}

/**
 * Filters for slice selection in Step 2
 */
export interface SliceFilters {
  /** CRITICAL: Filter by report design ID - ensures only compatible slices shown */
  reportDesignId?: string;
  
  /** Filter by project ID */
  projectId?: string;
  
  /** Filter by date range - from date */
  dateFrom?: Date;
  
  /** Filter by date range - to date */
  dateTo?: Date;
  
  /** Filter by reference number (cra59_refno) */
  refNo?: string;
  
  /** Search term - searches in name and description */
  search?: string;
}

/**
 * Progress callback data during copy operation
 */
export interface CopyProgress {
  /** Name of the section currently being copied */
  currentSectionName: string;
  
  /** Index of current section (1-based) */
  currentSectionIndex: number;
  
  /** Total number of sections to copy */
  totalSections: number;
  
  /** Current row being processed within the section */
  currentRow: number;
  
  /** Total rows in current section */
  totalRows: number;
  
  /** Overall percent complete (0-100) */
  percentComplete: number;
}

/**
 * Result of copy operation
 */
export interface CopyResult {
  /** Whether the overall operation was successful */
  success: boolean;
  
  /** Number of sections copied successfully */
  copiedSections: number;
  
  /** Number of rows copied */
  copiedRows: number;
  
  /** Number of individual cells copied */
  copiedCells: number;
  
  /** Error message if operation failed */
  error?: string;
  
  /** True if some sections copied but others failed */
  partialFailure?: boolean;
}

/**
 * Options for copy operation
 */
export interface CopyOptions {
  /** Source slice ID to copy from */
  sourceSliceId: string;
  
  /** Target slice ID to copy to */
  targetSliceId: string;
  
  /** Array of section IDs to copy. Empty array = copy all sections. */
  sectionIds: string[];
  
  /** Optional callback for progress updates */
  onProgress?: (progress: CopyProgress) => void;
}
