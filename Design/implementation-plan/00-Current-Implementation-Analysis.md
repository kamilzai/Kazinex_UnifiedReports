# Current Implementation Deep Dive Analysis

**Date:** December 11, 2025  
**Project:** Kazinex Unified Reports - PCF Control  
**Purpose:** Complete understanding before migration

---

## Executive Summary

Your current PCF control is a **sophisticated Excel-like reporting system** with:
- **EAV (Entity-Attribute-Value) data model** in Dataverse
- Multi-tab report interface with dynamic sections
- Type-aware cell editing (7 types: text, number, percent, date, lookup, image, calculated)
- Copy from previous slice functionality
- Bulk image upload and compression
- Real-time validation and dirty tracking
- Row-level operations (add, delete, bulk operations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              PowerApps PCF Control                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │        UnifiedGridContainer (Main)                │  │
│  │  - Tab bar (PremiumTabBar)                       │  │
│  │  - Toolbar (PremiumToolbar)                      │  │
│  │  - Grid (PowerAppsGridWrapper)                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    ↓ (DataverseService)
┌─────────────────────────────────────────────────────────┐
│              Dataverse WebAPI                            │
│  - kazinex_reportslice                                  │
│  - kazinex_reportsection (via reportdesign)             │
│  - kazinex_reportstructure                              │
│  - kazinex_reportdata (EAV format)                      │
│  - kazinex_reportstructurelookup                        │
│  - kazinex_reportdesign                                 │
│  - kazinex_project                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model Analysis

### Current Dataverse Schema

#### 1. **Report Design** (Template/Blueprint)
```
kazinex_reportdesign
├── reportdesignid (GUID, PK)
├── name (String)
├── description (String)
├── version (Integer)
└── isactive (Boolean)

One-to-Many → reportsection definitions
```

**Purpose:** Defines the template structure. Multiple slices can use same design.

---

#### 2. **Report Design Section** (Tab Templates)
```
kazinex_reportsection (Design-level)
├── reportsectionid (GUID, PK)
├── reportdesign (Lookup → reportdesign)
├── name (String) - Tab name
├── sortorder (Integer) - Tab order
└── grouping (Boolean) - Multi-row vs Single-row section
```

**Purpose:** Defines tabs/sections for a report design template.

---

#### 3. **Report Structure** (Column Definitions)
```
kazinex_reportstructure
├── reportstructureid (GUID, PK)
├── reportsection (Lookup → reportsection)
├── fieldname (String) - Internal column identifier
├── datatype (OptionSet) - text|number|percent|lookup|date|image|calculated
├── sortorder (Integer) - Column order
├── group (String) - For calculated fields
├── columnsize (Integer) - Width category
└── [validation rules, default values]
```

**Purpose:** Defines columns for each section. Reusable across slices.

**Data Types:**
- `text` - Free text entry
- `number` - Numeric values
- `percent` - Percentage (0-100)
- `date` - Date picker
- `lookup` - Dropdown from lookup table
- `image` - Image upload
- `calculated` - Formula-based (read-only)

---

#### 4. **Report Structure Lookup** (Dropdown Options)
```
kazinex_reportstructurelookup
├── reportstructurelookupid (GUID, PK)
├── reportstructure (Lookup → reportstructure)
├── id (AutoNumber) - Used as lookup key
├── name (String) - Display text
└── sortorder (Integer)
```

**Purpose:** Provides dropdown options for lookup columns.

**Example:** Account Types → "Asset", "Liability", "Equity", "Revenue", "Expense"

---

#### 5. **Report Slice** (Actual Report Instance)
```
kazinex_reportslice
├── reportsliceid (GUID, PK)
├── id (AutoNumber) - User-friendly ID
├── refno (String) - Reference number
├── datadate (Date) - Report period date
├── reportdesign (Lookup → reportdesign)
├── project (Lookup → project)
├── createdon (DateTime)
└── modifiedon (DateTime)
```

**Purpose:** Represents one actual report (e.g., "Q1 2025 Financial Report"). Uses a report design template.

**Relationship:**
- One Report Slice → One Report Design
- One Report Slice → One Project
- One Report Slice → Many Report Data rows

---

#### 6. **Report Data** (EAV - Cell Values)
```
kazinex_reportdata
├── reportdataid (GUID, PK)
├── reportsection (Lookup → reportsection)
├── reportslice (Lookup → reportslice) - CRITICAL for filtering
├── reportstructure (Lookup → reportstructure) - Which column
├── groupsort (Integer) - Row number
├── group (String) - Row identifier
└── datainput (String) - The actual cell value
```

**CRITICAL:** This is **EAV format** - each record represents **ONE CELL VALUE**, not a row!

**Example Data:**
```
| reportdataid | reportsection | reportslice | reportstructure | groupsort | group   | datainput |
|--------------|---------------|-------------|-----------------|-----------|---------|-----------|
| guid-001     | section-A     | slice-X     | structure-1     | 1         | row-001 | "Cash"    |
| guid-002     | section-A     | slice-X     | structure-2     | 1         | row-001 | "50000"   |
| guid-003     | section-A     | slice-X     | structure-3     | 1         | row-001 | "5.2"     |
| guid-004     | section-A     | slice-X     | structure-1     | 2         | row-002 | "Inventory" |
| guid-005     | section-A     | slice-X     | structure-2     | 2         | row-002 | "125000"  |
```

**Pivoted Grid View:**
```
| Row | Column1 (structure-1) | Column2 (structure-2) | Column3 (structure-3) |
|-----|-----------------------|-----------------------|-----------------------|
| 1   | Cash                  | 50000                 | 5.2                   |
| 2   | Inventory             | 125000                | (null)                |
```

**Key Points:**
- `groupsort` = row number (1, 2, 3...)
- `group` = row identifier (unique string)
- `reportstructure` = which column the value belongs to
- **MUST filter by BOTH `reportsection` AND `reportslice`** to avoid data leakage!

---

## Data Flow Analysis

### User Flow 1: View Report

```
1. User opens PCF control with sliceId
   ↓
2. UnifiedGridContainer.init()
   ↓
3. DataverseService.getReportSections(sliceId)
   - Gets reportdesign from reportslice
   - Gets sections for that design
   ↓
4. Auto-select first active section
   ↓
5. DataverseService.getReportStructures(sectionId)
   - Gets column definitions
   ↓
6. DataverseService.getReportData(sectionId, sliceId)
   - Gets EAV rows filtered by section AND slice
   - Pivots to grid format using pivotDataForGrid()
   ↓
7. transformStructuresToColumns(structures)
   - Maps structures to GridColumn objects
   ↓
8. transformReportDataToRows(data, structures)
   - Maps pivoted data to GridRow objects
   ↓
9. PowerAppsGridWrapper renders grid
```

---

### User Flow 2: Edit Cell

```
1. User clicks cell → enters edit mode
   ↓
2. CellEditorManager routes to appropriate editor:
   - TextCellEditor
   - NumberCellEditor
   - DateCellEditor
   - LookupCellEditor (dropdown from reportstructurelookup)
   - ImageCellEditor (upload to Dataverse)
   - PercentCellEditor
   ↓
3. User changes value, presses Enter/Tab
   ↓
4. PowerAppsGridWrapper.onCellEdit()
   ↓
5. useMultiSectionGridState.recordEdit()
   - Stores in dirty changes map
   - Key: sectionId → Map<cellKey, CellEdit>
   ↓
6. Grid cell highlights as edited (yellow background)
   ↓
7. Toolbar shows dirty count badge
```

---

### User Flow 3: Save Changes

```
1. User clicks Save button
   ↓
2. UnifiedGridContainer.handleSaveAll()
   ↓
3. useBatchSave.saveChanges()
   ↓
4. For each edited cell:
   a. Find existing reportdata record (by section, slice, structure, groupsort)
   b. If exists: UPDATE datainput field
   c. If not: CREATE new reportdata record
   ↓
5. DataverseService.batchUpdate()
   - Groups into batches of 10
   - Uses Dataverse batch API
   - Shows progress dialog
   ↓
6. On success:
   - Clear dirty changes
   - Show success notification
   - Refresh data
```

---

### User Flow 4: Copy from Previous Slice

```
1. User clicks "Copy from Previous Slice"
   ↓
2. CopyFromPreviousSliceDialog opens
   ↓
3. Step 1: Select source slice
   - Lists slices with same reportdesign and project
   - Shows row count per slice
   ↓
4. Step 2: Select sections to copy
   - Shows sections from source slice
   - Can select all or specific sections
   ↓
5. User clicks Copy
   ↓
6. SliceCopyService.copyFromPreviousSlice()
   - For each selected section:
     a. Get all reportdata from source slice/section
     b. Create new reportdata records for target slice/section
     c. Preserve groupsort, group, reportstructure
     d. Update reportslice to target
   ↓
7. Show progress (total records, current record)
   ↓
8. On complete: refresh data
```

---

### User Flow 5: Add Row

```
1. User clicks "+" or types in dummy row
   ↓
2. useRowOperations.addNewRow()
   ↓
3. Creates temporary row with:
   - New GUID as ID
   - groupsort = max(existing rows) + 1
   - group = new UUID
   - Empty values for all columns
   ↓
4. Adds to localRows state
   ↓
5. Grid shows new row (marked as new)
   ↓
6. When user edits cells:
   - Marked as dirty
   ↓
7. On save:
   - Creates reportdata records for each non-empty cell
```

---

### User Flow 6: Delete Rows

```
1. User selects rows (checkboxes)
   ↓
2. User clicks Delete button
   ↓
3. ConfirmDialog shows
   ↓
4. User confirms
   ↓
5. useRowOperations.deleteRow() for each selected row
   ↓
6. For each row:
   - Get all reportdata records matching:
     * reportsection = current section
     * reportslice = current slice
     * groupsort = row number
   - Delete all matching records
   ↓
7. Show progress dialog
   ↓
8. On complete: refresh data, clear selection
```

---

## Component Architecture

### Core Components

#### 1. **UnifiedGridContainer** (Main Orchestrator)
```typescript
Responsibilities:
- Load slice data (sections, structures, data)
- Manage active section (tab switching)
- Coordinate state hooks
- Handle toolbar actions (save, delete, copy)
- Show dialogs and notifications

State:
- sections: ReportSection[]
- activeSection: ReportSection
- structures: ReportStructure[]
- data: ReportData[]
- loading, error

Hooks:
- useReportData()
- useMultiSectionGridState()
- useBatchSave()
- useRowOperations()
- useCopyFromPreviousSlice()
```

---

#### 2. **PowerAppsGridWrapper** (Grid Display)
```typescript
Responsibilities:
- Render table with columns and rows
- Handle cell editing (inline)
- Keyboard navigation (Tab, Enter, Arrows)
- Cell selection
- Copy/paste
- Column resizing
- Row selection (checkboxes)

Features:
- Excel-like three-mode system (selection, edit, replace)
- Highlighted edited cells (yellow)
- Validation error display (red)
- Dummy row for adding (dashed border)
- Image thumbnail display
- Responsive column widths
```

---

#### 3. **CellEditorManager** (Editor Router)
```typescript
Routes editing to appropriate editor based on column type:

- kazinex_datatype === "Text" → TextCellEditor
- kazinex_datatype === "Number" → NumberCellEditor
- kazinex_datatype === "Percent" → PercentCellEditor
- kazinex_datatype === "Date" → DateCellEditor
- kazinex_datatype === "Lookup" → LookupCellEditor
- kazinex_datatype === "Image" → ImageCellEditor
- kazinex_iscalculated === true → Read-only
```

---

#### 4. **PremiumToolbar** (Action Bar)
```typescript
Buttons:
- Save All (shows dirty count badge)
- Cancel All
- Add Row (+ icon)
- Delete Selected (trash icon)
- Copy from Previous Slice
- Bulk Upload Images (if image column exists)

State indicators:
- Dirty count across all tabs
- Sections with changes count
- Validation errors
```

---

#### 5. **PremiumTabBar** (Section Tabs)
```typescript
Features:
- Shows all sections
- Highlights active section
- Shows dirty indicator (dot) on tabs with changes
- Preserves scroll position per tab
- Auto-selects first section
```

---

## Hook Architecture

### 1. **useReportData** - Data Loading
```typescript
Purpose: Load and manage report data

Methods:
- loadSections(sliceId) - Load sections for slice
- setActiveSection(sectionId) - Switch to section and load its data
- refresh() - Reload current section

Returns:
- sections, activeSection, structures, data
- loading, error
```

---

### 2. **useMultiSectionGridState** - Dirty Tracking
```typescript
Purpose: Track edits across multiple tabs

Data Structure:
Map<sectionId, Map<cellKey, CellEdit>>

Where:
- sectionId = kazinex_reportsectionid
- cellKey = `${rowId}|${columnProp}`
- CellEdit = { rowId, columnProp, oldValue, newValue, timestamp }

Methods:
- recordEdit(sectionId, rowId, columnProp, oldValue, newValue)
- getDirtyChangesForSection(sectionId)
- clearDirtyChangesForSection(sectionId)
- getTotalDirtyCount() - All tabs
```

**Key Feature:** Changes persist when switching tabs!

---

### 3. **useBatchSave** - Save Operations
```typescript
Purpose: Save dirty changes in batches

Process:
1. Get dirty changes for current section (or all)
2. Group into batches of 10
3. For each batch:
   - Build update requests
   - Call DataverseService.batchUpdate()
4. Show progress
5. On success: clear dirty changes

Returns:
- saveChanges(sectionId, dirtyChanges)
- isSaving, saveError, saveSuccess, savedCount
```

---

### 4. **useRowOperations** - Row CRUD
```typescript
Purpose: Add and delete rows

Methods:
- addNewRow(sectionId, sliceId, structures, currentRows)
  → Returns new row object with temp ID
  
- deleteRow(sectionId, sliceId, rowId)
  → Deletes all reportdata records for row

Returns:
- isAddingRow, isDeletingRow, operationError
```

---

### 5. **useCopyFromPreviousSlice** - Copy Feature
```typescript
Purpose: Copy data from another slice

Wizard State:
- Step 1: Select source slice
  - Filters by reportdesign and project
  - Shows row counts
- Step 2: Select sections
  - Shows sections from source
  - Can select all or specific

Process:
1. Get compatible slices (same design, same project)
2. User selects source slice
3. Load sections from source slice
4. User selects sections to copy
5. SliceCopyService.copyFromPreviousSlice()
   - Copies reportdata records
   - Updates reportslice reference
6. Refresh target data

Returns:
- Dialog state, methods, progress
```

---

## Service Layer

### 1. **DataverseService** - API Wrapper
```typescript
Key Methods:

// Read Operations
- getReportSlices(): Promise<ReportSlice[]>
- getReportSections(sliceId): Promise<ReportSection[]>
- getReportStructures(sectionId): Promise<ReportStructure[]>
- getReportData(sectionId, sliceId): Promise<ReportData[]>
- getReportStructureLookups(structureId): Promise<{id, label}[]>

// Utility
- pivotDataForGrid(eavRows, structures): ReportData[]
  → Converts EAV rows to grid format
- unpivotGridToData(gridRows, structures): EAV rows
  → Converts grid format to EAV rows

// Write Operations
- batchUpdate(updates): Promise<BatchResult>
- createReportData(data): Promise<string>
- deleteReportData(filter): Promise<number>

// Special
- getReportDesignIdForSlice(sliceId): Promise<string>
- getProjectIdForSlice(sliceId): Promise<string>
```

**Environment Handling:**
- Dynamically detects table prefix (kazinex_ vs cra59_)
- Uses FieldMapper for prefix-agnostic access
- Supports multiple environments

---

### 2. **SliceCopyService** - Copy Operations
```typescript
Methods:
- copyFromPreviousSlice(params)
  - sourceSliceId
  - targetSliceId
  - sectionIds[]
  - onProgress callback
  
Process:
1. For each section:
   - Query all reportdata where:
     * reportsection = sectionId
     * reportslice = sourceSliceId
   - Create new reportdata records:
     * Same groupsort, group, reportstructure, datainput
     * New reportslice = targetSliceId
     * New reportsection = mapped section in target
2. Show progress (records processed, total)
3. Return success/error
```

---

### 3. **ImageCompressionService** - Image Handling
```typescript
Methods:
- compressImage(file, maxSizeMB, maxWidthOrHeight)
- generateThumbnail(file, width, height)
- uploadToDataverse(file, entityName, recordId, fieldName)
```

---

## Key Features Deep Dive

### Feature 1: EAV Pivoting

**Challenge:** Dataverse stores one cell = one record (EAV)  
**Solution:** Pivot to grid format for display, unpivot for saving

```typescript
// EAV format (from Dataverse)
[
  { reportsection, reportslice, reportstructure, groupsort, group, datainput },
  { reportsection, reportslice, reportstructure, groupsort, group, datainput },
  ...
]

// Pivot logic
groupBy(groupsort + group) → rows
mapBy(reportstructure) → columns

// Grid format (for display)
[
  { id: "row-1", column1: "value1", column2: "value2", ... },
  { id: "row-2", column1: "value1", column2: "value2", ... },
  ...
]
```

---

### Feature 2: Multi-Section State

**Challenge:** Preserve edits when switching tabs  
**Solution:** Nested Map structure

```typescript
Map<sectionId, Map<cellKey, CellEdit>>

Example:
{
  "section-1": {
    "row-1|column-1": { oldValue: "100", newValue: "150" },
    "row-2|column-2": { oldValue: "200", newValue: "250" }
  },
  "section-2": {
    "row-1|column-1": { oldValue: "A", newValue: "B" }
  }
}
```

---

### Feature 3: Type-Aware Editing

**Challenge:** Different data types need different editors  
**Solution:** CellEditorManager + specialized editors

```typescript
Column Definition:
{
  kazinex_datatype: "Number",
  kazinex_columntype: "numeric",
  lookupOptions: [...], // for Lookup type
  ...
}

Editor Routing:
if (datatype === "Number") → NumberCellEditor
  - Numeric input
  - Comma formatting (1,234.56)
  - Validation

if (datatype === "Lookup") → LookupCellEditor
  - Dropdown/searchable select
  - Options from reportstructurelookup

if (datatype === "Image") → ImageCellEditor
  - File upload
  - Compression
  - Thumbnail display
```

---

### Feature 4: Bulk Operations

**Challenge:** Save/delete many records efficiently  
**Solution:** Batch API

```typescript
// Save: Group edits into batches of 10
const batches = chunkArray(dirtyChanges, 10);

for (const batch of batches) {
  await dataverse.batchUpdate(batch);
  updateProgress();
}

// Delete: Single OData delete with filter
await dataverse.webAPI.deleteRecord(
  "kazinex_reportdata",
  recordId
);
```

---

## Critical Implementation Details

### 1. **Table Prefix Handling**

Different environments use different prefixes:
- Development: `kazinex_`
- Production: `cra59_` or custom

**Solution:** EnvironmentConfig + FieldMapper
```typescript
// Auto-detect from first API call
const result = await webAPI.retrieveRecord(...);
const keys = Object.keys(result);
const prefix = keys[0].split('_')[0] + '_';

// Access fields prefix-agnostic
fieldMapper.field('reportsliceid') 
  → "kazinex_reportsliceid" or "cra59_reportsliceid"
```

---

### 2. **Critical Filtering**

**MUST filter by BOTH sectionId AND sliceId to avoid showing wrong data:**

```typescript
// WRONG - Will show data from ALL slices in section
filterClause = `_reportSection eq '${sectionId}'`

// CORRECT - Only shows data from current slice
filterClause = `_reportSection eq '${sectionId}' and _reportSlice eq '${sliceId}'`
```

---

### 3. **Grouping vs Non-Grouping Sections**

```typescript
if (section.kazinex_grouping === true) {
  // Multi-row section (e.g., line items)
  // Show all rows
  // Allow add/delete
} else {
  // Single-row section (e.g., header info)
  // Auto-create one row if empty
  // No add/delete buttons
  // Simplified UI
}
```

---

## Performance Considerations

### 1. **Virtual Scrolling**
- Not implemented in current grid
- Handles ~500 rows comfortably
- For more, need virtualization

### 2. **Lazy Loading**
- Images loaded on-demand (lazy)
- Lookup options cached per column
- Sections loaded on-demand (tab switch)

### 3. **Batch Optimization**
- Save: Groups of 10 records
- Copy: Streams records, shows progress
- Delete: Single API call per row (could be optimized)

---

## UI/UX Patterns

### 1. **Excel-like Grid**
- Tab for next cell
- Enter for next row
- Arrows for navigation
- F2 for edit mode
- Escape to cancel
- Click to select
- Double-click to edit

### 2. **Visual Feedback**
- Yellow background = edited cell
- Red border = validation error
- Blue border = selected cell
- Dashed border = dummy row
- Badge = dirty count
- Dot = tab has changes

### 3. **Responsive Design**
- Column widths based on content type
- Auto-resize on container change
- Horizontal scroll for many columns
- Fixed header row

---

## Migration Implications

### What to Keep:
1. ✅ EAV data model (efficient, flexible)
2. ✅ Multi-section architecture
3. ✅ Type-aware editing
4. ✅ Dirty tracking across tabs
5. ✅ Copy from previous slice concept
6. ✅ Batch operations
7. ✅ Excel-like UX patterns

### What to Improve:
1. 🔄 Replace Dataverse with Supabase (PostgreSQL EAV)
2. 🔄 Replace PowerApps grid with AG Grid
3. 🔄 Add admin UI for managing designs/structures
4. 🔄 Better image storage (Supabase Storage)
5. 🔄 Modern UI with Ant Design
6. 🔄 Virtual scrolling for large datasets
7. 🔄 Better offline support

### What to Remove:
1. ❌ PowerApps/Dataverse dependencies
2. ❌ PCF-specific code
3. ❌ Field prefix complexity (standardize on new schema)

---

## Next Document

[01-Domain-and-Architecture.md](01-Domain-and-Architecture.md) - Domain strategy and technical architecture

---

*This analysis forms the foundation for the implementation plan.*
