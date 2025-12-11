import * as React from 'react';
import { defineCustomElements } from '@revolist/revogrid/loader';
import type { HTMLRevoGridElement } from '../types/revogrid';
import type { GridColumn, GridRow } from '../types/grid.types';
import { validateCellValue } from '../utils/cellValidation';
import './RevoGridStyles.css';

// Define custom element for RevoGrid
defineCustomElements();

interface CellEditInfo {
  oldValue: unknown;
  newValue: unknown;
}

interface RevoGridWrapperProps {
  width?: number;
  height?: number;
  columns?: GridColumn[]; // Dynamic columns from Dataverse
  rows?: GridRow[]; // Dynamic rows from Dataverse
  onCellEdit?: (rowId: string, columnProp: string, oldValue: unknown, newValue: unknown) => void;
  onValidationError?: (cellKey: string, error: string | null) => void; // Validation error callback
  editedCells?: Map<string, CellEditInfo>; // Map of cellKey to edit info with old/new values
  validationErrors?: Map<string, string>; // Map of cellKey to error message
  sectionId?: string; // Current section ID to track section changes
}

/**
 * RevoGrid Wrapper Component
 * 
 * Purpose: Integrate RevoGrid web components with React for PCF
 * 
 * Day 4 Update: Now accepts dynamic columns and rows from Dataverse
 * 
 * Features:
 * - Dynamic column configuration
 * - Dynamic data binding
 * - Event handling
 * - Excel-like functionality
 */
export const RevoGridWrapper: React.FC<RevoGridWrapperProps> = ({ 
  width = 1000, 
  height = 600,
  columns = [],
  rows = [],
  onCellEdit,
  onValidationError,
  editedCells = new Map<string, CellEditInfo>(),
  validationErrors = new Map<string, string>(),
  sectionId
}) => {
  const gridRef = React.useRef<HTMLRevoGridElement>(null);
  const [renderTime, setRenderTime] = React.useState<number>(0);
  const [memoryUsage, setMemoryUsage] = React.useState<string>('N/A');
  const lastSectionId = React.useRef<string | undefined>(undefined);

  // Tooltip state and refs
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [tooltipContent, setTooltipContent] = React.useState('');
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const tooltipTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Store event handlers as refs to avoid recreating them
  const afterEditHandler = React.useRef<EventListener | undefined>(undefined);
  const beforeEditHandler = React.useRef<EventListener | undefined>(undefined);
  const beforeRangeEditHandler = React.useRef<EventListener | undefined>(undefined);
  const afterColumnResizeHandler = React.useRef<EventListener | undefined>(undefined);
  
  // Track original value before edit starts (RevoGrid's oldVal is unreliable)
  const originalValueBeforeEdit = React.useRef<{ rowId: string; prop: string; value: unknown } | null>(null);
  
  // Track if grid has been initialized to avoid resetting data
  const isInitialized = React.useRef<boolean>(false);

  // Set up grid properties when component mounts or data changes
  React.useEffect(() => {
    if (gridRef.current && columns.length > 0 && rows.length > 0) {
      const startConfig = performance.now();
      // // console.log(...)
      
      const grid = gridRef.current;
      
      // Only set data if not initialized or if section changed
      // This prevents overwriting edited values when just editedCells changes
      const sectionChanged = sectionId !== lastSectionId.current;
      if (!isInitialized.current || sectionChanged) {
        // Set basic columns and data (cellProperties will be added in separate effect)
        grid.columns = columns;
        grid.source = rows;
        isInitialized.current = true;
        lastSectionId.current = sectionId;
        // // console.log(...)
      } else {
        // Just update the source data to reflect edited values
        grid.source = rows;
        // // console.log(...)
      }
      
      // Enable features
      grid.range = true;  // Range selection
      grid.resize = true;  // Column resizing
      grid.readonly = false;  // Enable editing
      grid.canFocus = true;  // Keyboard navigation
      
      // Remove old event listeners if they exist
      if (beforeEditHandler.current) {
        grid.removeEventListener('beforeedit', beforeEditHandler.current);
      }
      if (afterEditHandler.current) {
        grid.removeEventListener('afteredit', afterEditHandler.current);
      }
      if (beforeRangeEditHandler.current) {
        grid.removeEventListener('beforerangeedit', beforeRangeEditHandler.current);
      }
      if (afterColumnResizeHandler.current) {
        grid.removeEventListener('aftercolumnresize', afterColumnResizeHandler.current);
      }
      
      // Create and store new event handlers
      beforeEditHandler.current = ((e: CustomEvent) => {
        // // console.log(...)
        
        // Capture original value before edit starts (RevoGrid's afteredit.oldVal is unreliable)
        if (e.detail) {
          const { prop, model, value } = e.detail;
          const rowId = model?.id as string;
          if (rowId && prop) {
            // Use 'value' not 'val' - 'value' is the actual cell value, 'val' is user input
            originalValueBeforeEdit.current = { rowId, prop, value };
            // // console.log(...)
          }
        }
      }) as EventListener;
      
      afterEditHandler.current = ((e: CustomEvent) => {
        // // console.log(...)
        
        // Call onCellEdit callback if provided
        if (onCellEdit && e.detail) {
          const { prop, model, val } = e.detail;
          const rowId = model?.id as string;
          
          // Get the original value from beforeedit (RevoGrid's oldVal is unreliable)
          let actualOldValue: unknown = undefined;
          if (originalValueBeforeEdit.current &&
              originalValueBeforeEdit.current.rowId === rowId &&
              originalValueBeforeEdit.current.prop === prop) {
            actualOldValue = originalValueBeforeEdit.current.value;
          }
          
          // Normalize values for comparison (handle formatted numbers)
          const normalizeValue = (value: unknown): string => {
            if (value === null || value === undefined) return '';
            // Remove commas and whitespace for number comparison
            return String(value).replace(/,/g, '').trim();
          };
          
          const normalizedVal = normalizeValue(val);
          const normalizedOldVal = normalizeValue(actualOldValue);
          
          // console.log('[RevoGrid] Comparing values:', {
            rowId,
            prop,
            oldValue: actualOldValue,
            newValue: val,
            normalizedOld: normalizedOldVal,
            normalizedNew: normalizedVal,
            isChanged: normalizedVal !== normalizedOldVal
          });
          
          // Only trigger edit if value actually changed
          if (rowId && prop && normalizedVal !== normalizedOldVal) {
            // Find the column definition for validation
            const column = columns.find(c => c.prop === prop);
            const cellKey = `${rowId}|${prop}`;
            
            if (column) {
              // Validate the new value
              const validationResult = validateCellValue(val, column);
              
              if (!validationResult.isValid) {
                // Validation failed - notify parent
                // // console.log(...)
                if (onValidationError) {
                  onValidationError(cellKey, validationResult.errorMessage || 'Invalid value');
                }
              } else {
                // Validation passed - clear any previous error
                // // console.log(...)
                if (onValidationError) {
                  onValidationError(cellKey, null);
                }
              }
            }
            
            // Always trigger edit callback (even if validation failed, to track the change)
            onCellEdit(rowId, prop, actualOldValue, val);
          } else {
            // // console.log(...)
          }
          
          // Clear captured original value
          originalValueBeforeEdit.current = null;
        }
      }) as EventListener;
      
      beforeRangeEditHandler.current = ((e: CustomEvent) => {
        // // console.log(...)
      }) as EventListener;

      afterColumnResizeHandler.current = ((e: CustomEvent) => {
        // // console.log(...)
      }) as EventListener;
      
      // Add event listeners
      grid.addEventListener('beforeedit', beforeEditHandler.current);
      grid.addEventListener('afteredit', afterEditHandler.current);
      grid.addEventListener('beforerangeedit', beforeRangeEditHandler.current);
      grid.addEventListener('aftercolumnresize', afterColumnResizeHandler.current);

      const endConfig = performance.now();
      const configTime = endConfig - startConfig;
      setRenderTime(configTime);
      
      // // console.log(...)}ms`);
      
      // Measure memory if available (Chrome only)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((performance as any).memory) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memoryMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        setMemoryUsage(`${memoryMB} MB`);
        // // console.log(...)
      }
    }
  }, [columns, rows, onCellEdit, onValidationError, sectionId]);

  // Tooltip mouse event handlers
  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tooltipAttr = target.getAttribute?.('data-tooltip');
      
      if (tooltipAttr && editedCells.size > 0) {
        // Show tooltip after a small delay
        if (tooltipTimerRef.current) {
          clearTimeout(tooltipTimerRef.current);
        }
        
        tooltipTimerRef.current = setTimeout(() => {
          setTooltipContent(tooltipAttr);
          setTooltipPosition({ x: e.clientX, y: e.clientY - 40 });
          setTooltipVisible(true);
        }, 500); // 500ms delay
      } else {
        // Hide tooltip
        if (tooltipTimerRef.current) {
          clearTimeout(tooltipTimerRef.current);
          tooltipTimerRef.current = null;
        }
        setTooltipVisible(false);
      }
    };

    const handleMouseLeave = () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
      setTooltipVisible(false);
    };

    grid.addEventListener('mousemove', handleMouseMove as EventListener);
    grid.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      grid.removeEventListener('mousemove', handleMouseMove as EventListener);
      grid.removeEventListener('mouseleave', handleMouseLeave);
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, [editedCells]);

  // Apply visual indicators by updating columns with cellProperties when editedCells changes
  React.useEffect(() => {
    if (!gridRef.current || !isInitialized.current) return;

      // // console.log(...)
      // // console.log(...)));    const grid = gridRef.current;
    
    // Re-create columns with updated cellProperties functions
    const columnsWithProperties = columns.map(col => ({
      ...col,
      cellProperties: (props: { model: GridRow }) => {
        const model = props.model;
        const cellKey = `${model.id}|${col.prop}`;
        
        // Base cell styles - CRITICAL for preventing overflow in PowerApps iframe
        const baseCellStyles = {
          overflow: 'hidden',           // Prevent content overflow into adjacent cells
          textOverflow: 'ellipsis',     // Show ellipsis for long text
          whiteSpace: 'nowrap',         // Prevent text wrapping
          boxSizing: 'border-box',      // Include border in width calculation
          display: 'block',             // Ensure proper box model
          width: '100%',                // Take full cell width
          padding: '4px 8px',           // Consistent padding
          lineHeight: '1.5'             // Consistent line height
        };
        
        // Debug: Log first few cell checks
        if (editedCells.size > 0 && Math.random() < 0.01) {
          // // console.log(...));
        }
        
        // Apply inline styles for edited cells
        if (validationErrors.has(cellKey)) {
          // // console.log(...)
          return {
            style: {
              ...baseCellStyles,            // Include base styles
              backgroundColor: '#ffebee',
              border: '2px solid #c62828',
              boxShadow: 'inset 0 0 3px rgba(198, 40, 40, 0.3)'
            }
          };
        } else if (editedCells.has(cellKey)) {
          const editInfo = editedCells.get(cellKey)!;
          const formattedOldValue = editInfo.oldValue !== null && editInfo.oldValue !== undefined 
            ? String(editInfo.oldValue) 
            : '(empty)';
          
          // // console.log(...)
          return {
            style: {
              ...baseCellStyles,            // Include base styles
              backgroundColor: '#fff4e6',
              border: '1px solid #ff9500',
              position: 'relative',
              cursor: 'help'
            },
            class: 'cell-with-tooltip',
            'data-tooltip': `Original: ${formattedOldValue}`
          };
        }
        
        // Even for non-edited cells, apply base styles to ensure consistency
        return {
          style: baseCellStyles
        };
      }
    }));

    // Update columns to trigger re-render
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grid.columns = columnsWithProperties as any;
    
    // // console.log(...)
  }, [editedCells, validationErrors, columns]);

  // Show empty state if no data
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div style={{ 
        padding: '40px',
        textAlign: 'center',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#666'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>�</div>
        <div style={{ fontSize: '16px' }}>
          {columns.length === 0 ? 'No columns configured' : 'No data available'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%',
      height: '100%',
      fontFamily: 'Segoe UI, sans-serif',
      position: 'relative'
    }}>
      {/* RevoGrid Web Component Container */}
      <div
        style={{ width: '100%', height: '100%' }}
        ref={(el) => {
          if (el && !el.querySelector('revo-grid')) {
            const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
            grid.setAttribute('theme', 'default');
            grid.style.width = '100%';
            grid.style.height = '100%';
            grid.style.display = 'block';
            el.appendChild(grid);
            // Use type assertion to assign to ref (required for React 17 compatibility)
            (gridRef as React.MutableRefObject<HTMLRevoGridElement | null>).current = grid;
          }
        }}
      />
      
      {/* Tooltip for edited cells */}
      {tooltipVisible && (
        <div
          className="revogrid-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            fontFamily: 'Segoe UI, sans-serif'
          }}
        >
          <span className="revogrid-tooltip-value">{tooltipContent}</span>
        </div>
      )}
    </div>
  );
};

// TypeScript declarations are in ../types/revogrid.d.ts

