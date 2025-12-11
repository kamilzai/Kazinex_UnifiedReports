// Database types matching Supabase schema

export type UserRole = 'admin' | 'editor' | 'viewer';

export type ColumnType = 'text' | 'number' | 'percent' | 'date' | 'lookup' | 'image' | 'calculated';

export type ColumnSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface ReportDesign {
  id: string;
  name: string;
  description: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  id: string;
  report_design_id: string;
  name: string;
  sort_order: number;
  enable_grouping: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportStructure {
  id: string;
  report_section_id: string;
  field_name: string;
  display_name: string;
  data_type: ColumnType;
  sort_order: number;
  column_size: ColumnSize;
  is_editable: boolean;
  is_calculated: boolean;
  calculation_formula: string | null;
  calculation_group: string | null;
  lookup_entity: string | null;
  lookup_display_field: string | null;
  validation_rules: Record<string, any> | null;
  default_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportStructureLookup {
  id: string;
  report_structure_id: string;
  lookup_key: string;
  lookup_label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ReportSlice {
  id: string;
  ref_no: string | null;
  name: string | null;
  data_date: string | null;
  report_design_id: string;
  project_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportData {
  id: string;
  report_slice_id: string;
  report_section_id: string;
  report_structure_id: string;
  row_number: number;
  row_group: string;
  data_value: string | null;
  created_at: string;
  updated_at: string;
}

// Grid types
export interface GridRow {
  rowId: string;
  rowNumber: number;
  [key: string]: any; // Dynamic columns
}

export interface CellEdit {
  rowId: string;
  rowNumber: number;
  field: string;
  value: any;
  originalValue: any;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Form types
export interface CreateReportDesignInput {
  name: string;
  description?: string;
  version?: number;
}

export interface CreateReportSectionInput {
  report_design_id: string;
  name: string;
  sort_order: number;
  enable_grouping?: boolean;
}

export interface CreateReportStructureInput {
  report_section_id: string;
  field_name: string;
  display_name: string;
  data_type: ColumnType;
  sort_order: number;
  column_size?: ColumnSize;
  is_editable?: boolean;
  is_calculated?: boolean;
  lookup_entity?: string;
  validation_rules?: Record<string, any>;
}

export interface CreateReportSliceInput {
  ref_no?: string;
  name?: string;
  data_date?: string;
  report_design_id: string;
  project_id: string;
}

export interface SaveCellValueInput {
  report_slice_id: string;
  report_section_id: string;
  report_structure_id: string;
  row_number: number;
  row_group: string;
  data_value: string;
}
