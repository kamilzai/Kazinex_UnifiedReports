/**
 * Column Width Calculator
 * 
 * Calculates proportional column widths based on ColumnSize field from ReportStructure.
 * 
 * Algorithm:
 * 1. Sum all ColumnSize values for the section
 * 2. Calculate each column's percentage: (columnSize / total) * 100
 * 3. Apply to available grid width
 * 4. Handle edge cases (no ColumnSize, zero total, etc.)
 * 
 * Example:
 * Column 1: 10 -> (10/210) * 100 = 4.76%
 * Column 2: 50 -> (50/210) * 100 = 23.81%
 * Column 3: 80 -> (80/210) * 100 = 38.10%
 * Column 4: 60 -> (60/210) * 100 = 28.57%
 * Column 5: 10 -> (10/210) * 100 = 4.76%
 * Total: 210
 */

import type { ReportStructure } from '../types/dataverse.types';
import type { GridColumn } from '../types/grid.types';

export interface ColumnWidthConfig {
  /** Column property name */
  prop: string;
  
  /** Calculated width in pixels */
  width: number;
  
  /** Percentage of total width */
  percentage: number;
  
  /** Original column size value (if available) */
  columnSize?: number;
}

export interface WidthCalculationResult {
  /** Array of column width configurations */
  columns: ColumnWidthConfig[];
  
  /** Total width used */
  totalWidth: number;
  
  /** Whether calculation was based on ColumnSize or even distribution */
  calculationMethod: 'columnSize' | 'evenDistribution';
  
  /** Sum of all ColumnSize values (if used) */
  totalColumnSize?: number;
}

/**
 * Default column width when no other information available
 */
const DEFAULT_COLUMN_WIDTH = 150;

/**
 * Minimum column width to ensure readability
 */
const MIN_COLUMN_WIDTH = 80;

/**
 * Maximum column width to prevent overflow
 */
const MAX_COLUMN_WIDTH = 600;

/**
 * Get column size from structure (supports multiple field names)
 */
function getColumnSize(structure: ReportStructure): number | undefined {
  // Try all possible field names for column size
  const structureWithAltFields = structure as ReportStructure & { 
    cra59_columnsize?: number;
  };
  
  return structure.kazinex_columnsize || structureWithAltFields.cra59_columnsize;
}

/**
 * Calculate proportional column widths based on ColumnSize values
 * 
 * @param structures - Array of report structures for the section
 * @param availableWidth - Total available width for the grid (optional, defaults to viewport)
 * @returns Calculation result with column widths
 */
export function calculateColumnWidths(
  structures: ReportStructure[],
  availableWidth?: number
): WidthCalculationResult {
  // // console.log(...)
  
  // Use viewport width if not provided (leave some margin for scrollbars and padding)
  const containerWidth = availableWidth || (typeof window !== 'undefined' ? window.innerWidth - 100 : 1200);
  
  // Use 90% of available width to ensure all columns fit within grid frame
  // Reserve 10% for padding, borders, and prevent horizontal scroll on initial load
  const gridWidth = Math.floor(containerWidth * 0.9);
  
  // // console.log(...)`);
  
  // Extract column sizes
  const columnSizes = structures.map(s => ({
    prop: s.kazinex_columnname,
    size: getColumnSize(s),
    structure: s
  }));
  
  // Check if any structures have ColumnSize defined
  const hasColumnSizes = columnSizes.some(c => c.size !== undefined && c.size > 0);
  
  if (!hasColumnSizes) {
    // No ColumnSize values - distribute evenly
    // // console.log(...)
    return calculateEvenDistribution(columnSizes, gridWidth);
  }
  
  // Calculate total of all ColumnSize values
  const totalColumnSize = columnSizes.reduce((sum, c) => sum + (c.size || 0), 0);
  
  if (totalColumnSize === 0) {
    // All sizes are zero - distribute evenly
    // // console.log(...)
    return calculateEvenDistribution(columnSizes, gridWidth);
  }
  
  // Convert column size directly to percentage (e.g., 30 → 30%, 15 → 15%, 10 → 10%)
  const columns: ColumnWidthConfig[] = columnSizes.map(({ prop, size, structure }) => {
    const columnSize = size || 0;
    // Column size IS the percentage (e.g., 30 means 30%)
    const percentage = columnSize;
    let width = (percentage / 100) * gridWidth;
    
    // Apply minimum constraint only (allow overflow for large percentages)
    width = Math.max(MIN_COLUMN_WIDTH, width);
    
    // // console.log(
    //   `[ColumnWidthCalculator] ${prop}: size=${columnSize}, ` +
    //   `percentage=${percentage.toFixed(2)}%, width=${Math.round(width)}px`
    // );
    
    return {
      prop,
      width: Math.round(width),
      percentage,
      columnSize
    };
  });
  
  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
  
  // // console.log(
  //   `[ColumnWidthCalculator] Total: ${totalColumnSize} (size), ` +
  //   `${totalWidth}px (width), method=columnSize`
  // );
  
  return {
    columns,
    totalWidth,
    calculationMethod: 'columnSize',
    totalColumnSize
  };
}

/**
 * Calculate even distribution when no ColumnSize values available
 */
function calculateEvenDistribution(
  columnSizes: { prop: string; size?: number; structure: ReportStructure }[],
  gridWidth: number
): WidthCalculationResult {
  const columnCount = columnSizes.length;
  const evenWidth = Math.floor(gridWidth / columnCount);
  const constrainedWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, evenWidth));
  
  const columns: ColumnWidthConfig[] = columnSizes.map(({ prop }) => ({
    prop,
    width: constrainedWidth,
    percentage: 100 / columnCount,
    columnSize: undefined
  }));
  
  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
  
  // // console.log(
  //   `[ColumnWidthCalculator] Even distribution: ${constrainedWidth}px per column, ` +
  //   `total=${totalWidth}px`
  // );
  
  return {
    columns,
    totalWidth,
    calculationMethod: 'evenDistribution'
  };
}

/**
 * Apply calculated widths to grid columns
 * 
 * @param gridColumns - Array of grid columns to update
 * @param widthConfig - Width calculation result
 * @returns Updated grid columns with calculated widths
 */
export function applyCalculatedWidths(
  gridColumns: GridColumn[],
  widthConfig: WidthCalculationResult
): GridColumn[] {
  const widthMap = new Map(widthConfig.columns.map(c => [c.prop, c.width]));
  
  return gridColumns.map(column => ({
    ...column,
    size: widthMap.get(column.prop) || column.size || DEFAULT_COLUMN_WIDTH
  }));
}

/**
 * Get available grid width from container element
 * 
 * @param containerElement - Grid container DOM element
 * @returns Available width in pixels
 */
export function getAvailableGridWidth(containerElement?: HTMLElement): number {
  if (!containerElement) {
    // Fallback to viewport width minus margins
    return typeof window !== 'undefined' ? window.innerWidth - 100 : 1200;
  }
  
  const rect = containerElement.getBoundingClientRect();
  return rect.width - 20; // Subtract padding/scrollbar width
}

/**
 * Recalculate widths when container resizes
 * 
 * @param structures - Report structures
 * @param containerWidth - New container width
 * @param gridColumns - Current grid columns
 * @returns Updated grid columns
 */
export function recalculateOnResize(
  structures: ReportStructure[],
  containerWidth: number,
  gridColumns: GridColumn[]
): GridColumn[] {
  const widthConfig = calculateColumnWidths(structures, containerWidth);
  return applyCalculatedWidths(gridColumns, widthConfig);
}

