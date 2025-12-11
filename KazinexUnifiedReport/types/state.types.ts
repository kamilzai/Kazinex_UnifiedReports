/**
 * State Management Type Definitions
 * 
 * Types for managing application state, including tabs, loading states, and errors.
 */

import type { ReportSection, ReportStructure, ReportData } from './dataverse.types';
import type { GridColumn, GridRow, CellEdit } from './grid.types';

/**
 * Tab Information
 * 
 * Represents a single tab in the tab navigation.
 */
export interface TabInfo {
  /** Tab ID (from report section ID) */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Display order */
  order: number;
  
  /** Whether tab is currently active */
  isActive: boolean;
  
  /** Whether tab is enabled/disabled */
  isEnabled: boolean;
  
  /** Whether tab has unsaved changes */
  isDirty: boolean;
  
  /** Number of dirty cells in this tab */
  dirtyCount?: number;
}

/**
 * Tab State
 * 
 * Preserved state for a specific tab.
 */
export interface TabState {
  /** Tab/section ID */
  sectionId: string;
  
  /** Grid columns */
  columns: GridColumn[];
  
  /** Grid rows */
  rows: GridRow[];
  
  /** Dirty changes for this tab */
  dirtyChanges: Map<string, CellEdit>;
  
  /** Scroll position */
  scrollPosition?: {
    x: number;
    y: number;
  };
  
  /** Selected cells */
  selectedCells?: {
    rowId: string;
    columnProp: string;
  }[];
  
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Loading State
 * 
 * Represents the loading status of async operations.
 */
export interface LoadingState {
  /** Whether currently loading */
  isLoading: boolean;
  
  /** What is being loaded */
  loadingType?: 'sections' | 'structures' | 'data' | 'save' | 'refresh';
  
  /** Loading progress (0-100) */
  progress?: number;
  
  /** Loading message */
  message?: string;
}

/**
 * Error State
 * 
 * Represents error information.
 */
export interface ErrorState {
  /** Whether there is an error */
  hasError: boolean;
  
  /** Error type */
  errorType?: 'network' | 'validation' | 'permission' | 'unknown';
  
  /** Error message (user-friendly) */
  message: string;
  
  /** Detailed error (for logging) */
  details?: string;
  
  /** Error timestamp */
  timestamp: Date;
  
  /** Whether error is recoverable */
  isRecoverable: boolean;
}

/**
 * Save State
 * 
 * Represents the state of save operations.
 */
export interface SaveState {
  /** Whether currently saving */
  isSaving: boolean;
  
  /** Number of changes being saved */
  savingCount?: number;
  
  /** Save progress (0-100) */
  progress?: number;
  
  /** Last save timestamp */
  lastSaveTime?: Date;
  
  /** Last save result */
  lastSaveResult?: {
    success: boolean;
    updatedCount: number;
    errors: string[];
  };
}

/**
 * Report State
 * 
 * Overall state of the report control.
 */
export interface ReportState {
  /** Current report slice ID */
  sliceId: string | null;
  
  /** All available sections */
  sections: ReportSection[];
  
  /** Currently active section */
  activeSection: ReportSection | null;
  
  /** Report structures for active section */
  structures: ReportStructure[];
  
  /** Report data for active section */
  data: ReportData[];
  
  /** Tab information */
  tabs: TabInfo[];
  
  /** Tab states (preserved when switching) */
  tabStates: Map<string, TabState>;
  
  /** Loading state */
  loading: LoadingState;
  
  /** Error state */
  error: ErrorState | null;
  
  /** Save state */
  save: SaveState;
  
  /** Whether control is initialized */
  isInitialized: boolean;
}

/**
 * Action Result
 * 
 * Result of an action operation.
 */
export interface ActionResult<T = unknown> {
  /** Whether action was successful */
  success: boolean;
  
  /** Result data (if successful) */
  data?: T;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Detailed error (for logging) */
  errorDetails?: unknown;
}

/**
 * Validation Result
 * 
 * Result of data validation.
 */
export interface ValidationResult {
  /** Whether data is valid */
  isValid: boolean;
  
  /** Validation errors */
  errors: {
    rowId?: string;
    columnProp?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }[];
}

/**
 * Cache Entry
 * 
 * Cached data entry.
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  
  /** When cached */
  timestamp: Date;
  
  /** Cache TTL (time to live) in milliseconds */
  ttl: number;
  
  /** Whether cache is still valid */
  isValid: boolean;
}

/**
 * User Action
 * 
 * Represents a user action for undo/redo.
 */
export interface UserAction {
  /** Action type */
  type: 'edit' | 'delete' | 'insert' | 'move';
  
  /** Action timestamp */
  timestamp: Date;
  
  /** Action data */
  data: unknown;
  
  /** Reverse action (for undo) */
  reverseAction?: UserAction;
}

/**
 * History State
 * 
 * State for undo/redo functionality.
 */
export interface HistoryState {
  /** Past actions (undo stack) */
  past: UserAction[];
  
  /** Future actions (redo stack) */
  future: UserAction[];
  
  /** Current action */
  present?: UserAction;
  
  /** Maximum history size */
  maxSize: number;
}

/**
 * Context State
 * 
 * PCF context and environment information.
 */
export interface ContextState {
  /** PCF mode (read-only, edit, etc.) */
  mode: 'view' | 'edit' | 'disabled';
  
  /** Allocated width */
  allocatedWidth: number;
  
  /** Allocated height */
  allocatedHeight: number;
  
  /** Whether running in canvas app */
  isCanvas: boolean;
  
  /** Whether running in model-driven app */
  isModelDriven: boolean;
  
  /** User language */
  userLanguage: string;
  
  /** User timezone */
  userTimezone: string;
}
