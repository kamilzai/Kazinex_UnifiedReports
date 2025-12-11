/**
 * Cell Editor Manager
 * 
 * Routes to the appropriate cell editor based on column data type.
 * Central component for managing all inline editing operations.
 */

import * as React from 'react';
import { CellEditorProps, GridColumn, CellPosition } from '../../types/grid.types';
import { TextCellEditor } from './TextCellEditor';
import { NumberCellEditor } from './NumberCellEditor';
import { DateCellEditor } from './DateCellEditor';
import { PercentCellEditor } from './PercentCellEditor';
import { LookupCellEditor } from './LookupCellEditor';
import { ImageCellEditor } from './ImageCellEditor';

interface CellEditorManagerProps {
  position: CellPosition;
  column: GridColumn;
  value: unknown;
  editMode?: 'edit' | 'replace'; // Excel mode: 'edit' (F2) or 'replace' (type-to-replace)
  firstCharacter?: string; // First character typed in replace mode
  onSave: (value: unknown) => void;
  onCancel: () => void;
  rowId?: string;
  validate?: (value: unknown) => boolean | string;
  enableImageFunctionality?: boolean; // Whether image editing is enabled
}
/**
 * CellEditorManager - Routes to correct editor based on column type
 * 
 * Supported types:
 * - Text: TextCellEditor
 * - Number: NumberCellEditor
 * - Date: DateCellEditor
 * - Percent: PercentCellEditor
 * - Lookup: LookupCellEditor
 * - Image: ImageCellEditor (kazinex_datatype = 6 / 'Image')
 * 
 * Falls back to TextCellEditor for unknown types
 */
export const CellEditorManager: React.FC<CellEditorManagerProps> = ({
  position,
  column,
  value,
  editMode = 'edit',
  firstCharacter = '',
  onSave,
  onCancel,
  rowId,
  validate,
  enableImageFunctionality = true,
}) => {
  // // console.log('[CellEditorManager] Rendering editor for:', {
  //   position,
  //   columnType: column.kazinex_columntype || column.columnType,
  //   columnName: column.kazinex_columnname,
  //   value
  // });

  // Prepare common props for all editors
  const editorProps: CellEditorProps = {
    value,
    editMode,
    firstCharacter,
    onSave,
    onCancel,
    columnDef: column,
    rowId,
    validate
  };
  // Check for Image data type first (uses kazinex_datatype instead of columnType)
  const dataType = column.kazinex_datatype?.toLowerCase();
  console.log(`[CellEditorManager] Editor requested for column "${column.name}": ` +
    `kazinex_datatype="${column.kazinex_datatype}", ` +
    `normalized="${dataType}", ` +
    `columnType="${column.columnType}", ` +
    `enableImageFunctionality="${enableImageFunctionality}"`);
  
  if ((dataType === 'image' || dataType === '6') && enableImageFunctionality) {
    const imageColumnName = column.kazinex_columnname || column.prop || '';
    console.log(`[CellEditorManager] ✅ RENDERING ImageCellEditor for column "${column.name}"` +
      ` - kazinex_columnname="${column.kazinex_columnname}", prop="${column.prop}", using="${imageColumnName}"`);
    
    return <ImageCellEditor 
      value={value as string | null}
      readonly={column.readonly || column.kazinex_readonly}
      rowIndex={position.rowIndex ?? position.row}
      columnName={imageColumnName}
      onSave={(base64Value: string) => {
        console.log(`[CellEditorManager] ImageCellEditor onSave called for column "${imageColumnName}" - Base64 length: ${base64Value?.length || 0}`);
        onSave(base64Value);
      }}
      onCancel={onCancel}
    />;
  }

  // Get column type - support both kazinex_columntype (Dataverse) and columnType (local)
  const columnType = (column.kazinex_columntype || column.columnType || 'text').toLowerCase();

  // Route to appropriate editor based on type
  switch (columnType) {
    case 'number':
    case 'decimal':
    case 'integer':
    case 'currency':
      return <NumberCellEditor {...editorProps} />;

    case 'date':
    case 'datetime':
      return <DateCellEditor {...editorProps} />;

    case 'percent':
    case 'percentage':
      return <PercentCellEditor {...editorProps} />;

    case 'lookup':
    case 'reference':
    case 'entityreference':
      return <LookupCellEditor {...editorProps} />;

    case 'text':
    case 'string':
    case 'multiline':
    default:
      // Default to text editor for unknown types
      return <TextCellEditor {...editorProps} />;
  }
};

/**
 * Helper function to determine if a column is editable
 */
export const isColumnEditable = (column: GridColumn): boolean => {
  // Check if column has explicit readonly flag
  if (column.readonly === true || column.kazinex_readonly === true) {
    return false;
  }

  // Check if column is a calculated field
  if (column.isCalculated === true || column.kazinex_iscalculated === true) {
    return false;
  }

  // Check if column is a system field
  const systemFields = [
    'createdon',
    'createdby',
    'modifiedon',
    'modifiedby',
    'versionnumber'
  ];
  
  const columnName = (column.kazinex_columnname || column.prop || '').toLowerCase();
  if (systemFields.includes(columnName)) {
    return false;
  }

  return true;
};

/**
 * Helper function to get editor type for a column
 */
export const getEditorType = (column: GridColumn): string => {
  // Check for Image data type first (uses kazinex_datatype)
  const dataType = column.kazinex_datatype?.toLowerCase();
  if (dataType === 'image' || dataType === '6') {
    return 'image';
  }

  const columnType = (column.kazinex_columntype || column.columnType || 'text').toLowerCase();
  
  switch (columnType) {
    case 'number':
    case 'decimal':
    case 'integer':
    case 'currency':
      return 'number';
    
    case 'date':
    case 'datetime':
      return 'date';
    
    case 'percent':
    case 'percentage':
      return 'percent';
    
    case 'lookup':
    case 'reference':
    case 'entityreference':
      return 'lookup';
    
    case 'text':
    case 'string':
    case 'multiline':
    default:
      return 'text';
  }
};

