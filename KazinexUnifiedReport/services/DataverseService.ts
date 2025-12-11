/**
 * Dataverse Service
 * 
 * Service layer for interacting with Dataverse WebAPI.
 * Handles all data loading and saving operations.
 * 
 * Phase 2 Day 3: Using mock data for development.
 * Phase 2 Day 5: Replace with real Dataverse WebAPI calls.
 */

import type { IInputs } from '../generated/ManifestTypes';
import type {
  ReportSlice,
  ReportSection,
  ReportStructure,
  ReportData,
  DataFilter,
  DataUpdate,
  BatchResult,
} from '../types/dataverse.types';
import { EnvironmentConfig } from '../config/EnvironmentConfig';
import { FieldMapper, getRecordMapper } from '../utils/fieldMapper';

export class DataverseService {
  private context: ComponentFramework.Context<IInputs>;
  private useMockData = false; // NOW USING REAL DATAVERSE!
  private mockDataStore = new Map<string, ReportData[]>(); // Persistent mock data cache (for fallback only)
  
  // Environment configuration for dynamic prefix resolution
  private readonly envConfig: EnvironmentConfig;
  private readonly fieldMapper: FieldMapper;
  
  // Table name prefix - now dynamically resolved from environment config
  private get tablePrefix(): string {
    return this.envConfig.getTablePrefix();
  }

  constructor(context: ComponentFramework.Context<IInputs>) {
    this.context = context;
    
    // Initialize environment configuration with context
    this.envConfig = EnvironmentConfig.initialize(context);
    this.fieldMapper = new FieldMapper();
    
    // // console.log(...)
    // // console.log(...)
    // // console.log(...));
    // // console.log(...)
  }

  /**
   * Get all report slices
   */
  public async getReportSlices(): Promise<ReportSlice[]> {
    // // console.log(...) called');

    if (this.useMockData) {
      return this.getMockSlices();
    }

    try {
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          `${this.tablePrefix}reportslice`,
          `?$select=${this.tablePrefix}reportsliceid,${this.tablePrefix}id,${this.tablePrefix}refno,${this.tablePrefix}datadate,createdon,modifiedon` +
          '&$orderby=modifiedon desc'
        )
      );
      
      // // console.log(...)
      return result.entities as ReportSlice[];
    } catch (error) {
      return this.handleError(error as Error, 'getReportSlices');
    }
  }

  /**
   * Get all sections for a report slice
   * Note: Sections are linked to Report Design, so we need to:
   * 1. Get the Report Design from the Report Slice
   * 2. Get sections for that Report Design
   */
  public async getReportSections(sliceId: string): Promise<ReportSection[]> {
    // // console.log(...) called with sliceId:', sliceId);

    if (this.useMockData) {
      return this.getMockSections(sliceId);
    }

    try {
      const f = this.fieldMapper.field.bind(this.fieldMapper);
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      const recordMapper = getRecordMapper();

      // First, get the Report Slice to find its Report Design
      const sliceResult = await this.retry(() =>
        this.context.webAPI.retrieveRecord(
          e('reportslice'),
          sliceId,
          `?$select=${l('reportdesign')}`
        )
      );
      
      const reportDesignId = recordMapper.getValue(sliceResult, 'reportdesign_value') || sliceResult[l('reportdesign')];
      // // console.log(...)
      
      if (!reportDesignId) {
        // // console.warn(...)
        return [];
      }
      
      // Now get sections for that Report Design
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          e('reportsection'),
          `?$filter=${l('reportdesign')} eq '${reportDesignId}'` +
          `&$select=${f('reportsectionid')},${f('name')},${l('reportdesign')},${f('sortorder')},${f('grouping')}` +
          `&$orderby=${f('sortorder')} asc`
        )
      );
      
      // // console.log(...)
      
      // Map field names using record mapper for prefix-agnostic access
      return result.entities.map(entity => ({
        kazinex_reportsectionid: recordMapper.getValue(entity, 'reportsectionid'),
        kazinex_name: recordMapper.getValue(entity, 'name'),
        kazinex_reportsliceid: recordMapper.getValue(entity, 'reportdesign_value') || reportDesignId,
        kazinex_ordernumber: recordMapper.getValue(entity, 'sortorder') || 0,
        kazinex_isactive: true, // Default to true
        kazinex_grouping: recordMapper.getValue(entity, 'grouping') || false
      })) as ReportSection[];
    } catch (error) {
      return this.handleError(error as Error, 'getReportSections');
    }
  }

  /**
   * Get all structures (column definitions) for a section
   */
  public async getReportStructures(sectionId: string): Promise<ReportStructure[]> {
    // // console.log(...) called with sectionId:', sectionId);

    if (this.useMockData) {
      return this.getMockStructures(sectionId);
    }

    try {
      const f = this.fieldMapper.field.bind(this.fieldMapper);
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      const recordMapper = getRecordMapper();

      // Use correct field names from schema: FieldName, DataType, SortOrder
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          e('reportstructure'),
          `?$filter=${l('reportsection')} eq '${sectionId}'` +
          `&$select=${f('reportstructureid')},${l('reportsection')},${f('fieldname')},` +
          `${f('datatype')},${f('sortorder')},${f('group')},${f('columnsize')}` +
          `&$orderby=${f('sortorder')} asc`
        )
      );
      
      // // console.log(...)
      
      // Map field names using record mapper for prefix-agnostic access
      return result.entities.map(entity => ({
        kazinex_reportstructureid: recordMapper.getValue(entity, 'reportstructureid'),
        kazinex_reportsectionid: recordMapper.getValue(entity, 'reportsection_value') || sectionId,
        kazinex_columnname: recordMapper.getValue(entity, 'fieldname'),
        kazinex_columndisplayname: recordMapper.getValue(entity, 'fieldname'), // Use same as column name
        kazinex_columntype: recordMapper.getValue(entity, 'datatype') as 'text' | 'number' | 'percent' | 'lookup' | 'date',
        kazinex_ordernumber: recordMapper.getValue(entity, 'sortorder') || 0,
        kazinex_columnsize: recordMapper.getValue(entity, 'columnsize') as number | undefined,
        kazinex_iseditable: true, // Default to editable
        kazinex_width: 150 // Default width (deprecated - will be calculated from columnsize)
      })) as ReportStructure[];
    } catch (error) {
      return this.handleError(error as Error, 'getReportStructures');
    }
  }

  /**
   * Get lookup options for a specific report structure (column)
   * Fetches from Report Structure Lookup table
   */
  public async getReportStructureLookups(structureId: string): Promise<{ id: string; label: string }[]> {
    // // console.log(...) called with structureId:', structureId);

    if (this.useMockData) {
      return this.getMockLookupOptions(structureId);
    }

    try {
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          `${this.tablePrefix}reportstructurelookup`,
          `?$filter=_${this.tablePrefix}reportstructure_value eq '${structureId}'` +
          `&$select=${this.tablePrefix}reportstructurelookupid,${this.tablePrefix}id,${this.tablePrefix}name,${this.tablePrefix}sortorder` +
          `&$orderby=${this.tablePrefix}sortorder asc`
        )
      );
      
      // // console.log(...)
      
      // Use the ID field (autonumber) as the lookup key, not the GUID
      return result.entities.map(entity => ({
        id: String(entity[`${this.tablePrefix}id`]), // Use the ID field (e.g., "1032", "1035")
        label: entity[`${this.tablePrefix}name`]
      }));
    } catch (error) {
      // // console.error(...)
      return []; // Return empty array on error to not break the grid
    }
  }

  /**
   * Get all data rows for a section and slice
   * NOTE: Data is stored in EAV format - one row per cell value, not as wide table
   * CRITICAL: Must filter by BOTH sectionId AND sliceId to avoid showing wrong data
   */
  public async getReportData(sectionId: string, sliceId: string | null, filters?: DataFilter): Promise<ReportData[]> {
    // // console.log(...) called with sectionId:', sectionId, 'sliceId:', sliceId, 'filters:', filters);

    if (this.useMockData) {
      return this.getMockData(sectionId, filters);
    }

    try {
      // Get structures to know column definitions for pivoting
      const structures = await this.getReportStructures(sectionId);
      // // console.log(...)
      
      // Query EAV data with fixed columns only
      // Each row in cra59_reportdata represents ONE cell value
      const selectClause = [
        `${this.tablePrefix}reportdataid`,
        `_${this.tablePrefix}reportsection_value`,
        `_${this.tablePrefix}reportslice_value`,  // CRITICAL: Need slice for filtering
        `_${this.tablePrefix}reportstructure_value`, // Which column (structure) this value belongs to
        `${this.tablePrefix}groupsort`,
        `${this.tablePrefix}group`,
        `${this.tablePrefix}datainput`  // The actual cell value
      ].join(',');
      
      // Build filter clause - CRITICAL: Filter by BOTH section AND slice
      let filterClause = `_${this.tablePrefix}reportsection_value eq '${sectionId}'`;
      
      // CRITICAL FIX: Add slice filter to prevent showing data from wrong slices
      if (sliceId) {
        filterClause += ` and _${this.tablePrefix}reportslice_value eq '${sliceId}'`;
      } else {
        // If no slice, only show records with null slice
        filterClause += ` and _${this.tablePrefix}reportslice_value eq null`;
      }
      
      if (filters?.rowIdentifiers && filters.rowIdentifiers.length > 0) {
        const rowFilters = filters.rowIdentifiers.map(id => `${this.tablePrefix}group eq '${id}'`).join(' or ');
        filterClause += ` and (${rowFilters})`;
      }
      
      if (filters?.groupSortMin !== undefined) {
        filterClause += ` and ${this.tablePrefix}groupsort ge ${filters.groupSortMin}`;
      }
      
      if (filters?.groupSortMax !== undefined) {
        filterClause += ` and ${this.tablePrefix}groupsort le ${filters.groupSortMax}`;
      }
      
      // // console.log(...)
      
      // Execute query to get EAV rows
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          `${this.tablePrefix}reportdata`,
          `?$filter=${filterClause}` +
          `&$select=${selectClause}` +
          `&$orderby=${this.tablePrefix}groupsort asc,${this.tablePrefix}group asc`
        )
      );
      
      // // console.log(...)
      
      // Pivot EAV data into grid format
      const gridData = this.pivotDataForGrid(result.entities, structures, sectionId);
      // // console.log(...)
      
      return gridData;
    } catch (error) {
      return this.handleError(error as Error, 'getReportData');
    }
  }

  /**
   * Pivot EAV (Entity-Attribute-Value) data into grid format
   * Each input row represents one cell value. We group by (group + groupsort) to create grid rows,
   * then map structure IDs to column names to populate cell values.
   * 
   * IMPORTANT: For each cell, we store the EAV reportdata ID so we can update the correct record later
   */
  private pivotDataForGrid(eavRows: ComponentFramework.WebApi.Entity[], structures: ReportStructure[], sectionId: string): ReportData[] {
    // // console.log(...)

    // Create a map: (group + groupsort) → grid row object
    const rowMap = new Map<string, Record<string, unknown>>();

    for (const row of eavRows) {
      const group = row[`${this.tablePrefix}group`];
      const groupSort = row[`${this.tablePrefix}groupsort`];
      const rowKey = `${group}|${groupSort}`;
      
      // Initialize row if this is the first time seeing this group+groupsort combination
      if (!rowMap.has(rowKey)) {
        // Extract section/slice IDs from this EAV record (all cells in same row share these)
        const actualSectionId = row[`_${this.tablePrefix}reportsection_value`] || sectionId;
        const actualSliceId = row[`_${this.tablePrefix}reportslice_value`] || null;
        
        rowMap.set(rowKey, {
          kazinex_reportdataid: row[`${this.tablePrefix}reportdataid`],  // This is just for compatibility, not used for updates
          kazinex_reportsectionid: actualSectionId,
          kazinex_group: group,
          kazinex_groupsort: groupSort,
          _eavRecordIds: {},  // Store EAV record IDs for each column
          _actualSectionId: actualSectionId,  // Store actual section ID for CREATE operations
          _actualSliceId: actualSliceId  // Store actual slice ID for CREATE operations
        });
      }

      // Find which structure (column) this value belongs to
      const structureId = row[`_${this.tablePrefix}reportstructure_value`];
      const structure = structures.find(s => s.kazinex_reportstructureid === structureId);

      if (structure) {
        const gridRow = rowMap.get(rowKey)!;
        // Set the cell value using the structure's column name as the property key
        gridRow[structure.kazinex_columnname] = row[`${this.tablePrefix}datainput`];
        // Store the EAV record ID for this specific cell so we can update it later
        (gridRow._eavRecordIds as Record<string, string>)[structure.kazinex_columnname] = row[`${this.tablePrefix}reportdataid`];
      } else {
        // // console.warn(...)
      }
    }

    // Convert map to sorted array
    const result = Array.from(rowMap.values()).sort((a, b) => {
      const aSort = a.kazinex_groupsort as number;
      const bSort = b.kazinex_groupsort as number;
      return aSort - bSort;
    });
    
    // // console.log(...)
    return result as ReportData[];
  }

  /**
   * Batch update data rows in EAV model
   * In EAV, each cell is a separate record in cra59_reportdata, so we need to:
   * 1. Find the specific reportdata record for each column/structure
   * 2. Update only the cra59_datainput field for that record
   */
  public async batchUpdateData(
    updates: DataUpdate[],
    onProgress?: (current: number, total: number) => void
  ): Promise<BatchResult> {
    // // console.log(...) called with', updates.length, 'updates');

    if (this.useMockData) {
      return this.mockBatchSave(updates);
    }

    const errors: { recordId: string; columnName: string; error: string; }[] = [];
    let updatedCount = 0;

    try {
      // For each update, check if it needs CREATE or UPDATE
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        try {
          // Convert value to string for Dataverse (datainput field is text type)
          let valueToSave: string;
          if (update.value === null || update.value === undefined || update.value === '') {
            valueToSave = '';  // Empty string for null/undefined
          } else if (update.value instanceof Date) {
            valueToSave = update.value.toISOString();  // ISO format for dates
          } else if (typeof update.value === 'object' && 'id' in update.value) {
            // For lookup values stored as {id, label}, save only the ID
            valueToSave = String((update.value as { id: string }).id);
          } else {
            valueToSave = String(update.value);  // Convert everything else to string
          }

          // Check if this cell needs to be CREATED (no EAV record exists yet)
          if (update.needsCreate && update.createContext) {
            console.log(`[DataverseService] CREATING new EAV record for cell ${update.columnName}`);
            console.log(`[DataverseService] Context: section=${update.createContext.sectionId}, slice=${update.createContext.sliceId}, structure=${update.createContext.structureId}, group=${update.createContext.group}, groupSort=${update.createContext.groupSort}`);
            
            // Use the section/slice/structure IDs from createContext (already extracted from existing cells during pivot)
            const sectionId = update.createContext.sectionId;
            const sliceId = update.createContext.sliceId;
            
            // Step 1: Create the EAV record with basic fields
            const newEavRecord = {
              [`${this.tablePrefix}group`]: update.createContext.group,
              [`${this.tablePrefix}groupsort`]: update.createContext.groupSort,
              [`${this.tablePrefix}datainput`]: valueToSave,
            };

            const createdRecord = await this.retry(() =>
              this.context.webAPI.createRecord(
                `${this.tablePrefix}reportdata`,
                newEavRecord
              )
            );

            const recordId = typeof createdRecord === 'string' ? createdRecord : createdRecord.id;
            console.log(`[DataverseService] Created EAV record ${recordId} for ${update.columnName}`);
            
            // Step 2: Update to set lookup relationships (using fetched or provided IDs)
            const lookupUpdate: Record<string, string> = {
              [`${this.tablePrefix}ReportSection@odata.bind`]: `/${this.tablePrefix}reportsections(${sectionId})`,
              [`${this.tablePrefix}ReportStructure@odata.bind`]: `/${this.tablePrefix}reportstructures(${update.createContext.structureId})`
            };
            
            if (sliceId) {
              lookupUpdate[`${this.tablePrefix}ReportSlice@odata.bind`] = `/${this.tablePrefix}reportslices(${sliceId})`;
            }
            
            await this.retry(() =>
              this.context.webAPI.updateRecord(
                `${this.tablePrefix}reportdata`,
                recordId,
                lookupUpdate
              )
            );
            
            updatedCount++;
          } else {
            // UPDATE existing EAV record
            console.log(`[DataverseService] UPDATING existing EAV record ${update.kazinex_reportdataid} for ${update.columnName}`);
            
            const updatePayload = {
              [`${this.tablePrefix}datainput`]: valueToSave
            };

            await this.retry(() =>
              this.context.webAPI.updateRecord(
                `${this.tablePrefix}reportdata`,
                update.kazinex_reportdataid as string,
                updatePayload
              )
            );

            updatedCount++;
          }
          
          // Report progress after each update
          if (onProgress) {
            onProgress(i + 1, updates.length);
          }
        } catch (error) {
          const errorMsg = (error as Error).message;
          console.error(`[DataverseService] Error processing ${update.columnName}:`, errorMsg);
          
          errors.push({
            recordId: update.kazinex_reportdataid as string,
            columnName: update.columnName,
            error: errorMsg
          });
        }
      }

      const result: BatchResult = {
        success: errors.length === 0,
        updatedCount,
        errors,
        timestamp: new Date(),
      };

      // // console.log(...)
      return result;
    } catch (error) {
      return this.handleError(error as Error, 'batchUpdateData');
    }
  }

  /**
   * Create a new row IN MEMORY for a section
   * Does NOT save to Dataverse - row is saved when user clicks Save button
   * 
   * @param sectionId - The report section ID
   * @param structures - Array of column structures
   * @param groupSort - The groupsort value (determines row order)
   * @returns The new row data object (in-memory only)
   */
  public createNewRowInMemory(
    sectionId: string,
    sliceId: string | null,
    structures: ReportStructure[],
    groupSort: number
  ): ReportData {
    // // console.log(...) called', { sectionId, sliceId, structures: structures.length, groupSort });

    // Generate temporary ID for in-memory row
    const tempRowId = `temp-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newRowData: Record<string, unknown> = {
      kazinex_reportdataid: tempRowId,
      kazinex_reportsectionid: sectionId,
      kazinex_groupsort: groupSort,
      kazinex_group: String(groupSort), // Use groupsort as group identifier
    };

    // Initialize all columns with empty values
    structures.forEach(structure => {
      newRowData[structure.kazinex_columnname] = '';
    });

    // Mark as new row (not yet saved to Dataverse)
    newRowData._isNewRow = true;
    newRowData._structures = structures; // Store structures for later save
    
    // CRITICAL: Store section/slice metadata for CREATE operations
    // This ensures cells created later have the correct lookups
    newRowData._actualSectionId = sectionId;
    newRowData._actualSliceId = sliceId;
    newRowData._group = String(groupSort);
    newRowData._groupSort = groupSort;
    newRowData._eavRecordIds = {}; // Empty map since no cells exist yet

    // // console.log(...)
    return newRowData as ReportData;
  }

  /**
   * Save new rows to Dataverse (creates EAV records)
   * Called during batch save operation
   * 
   * @param sectionId - The report section ID
   * @param sliceId - The report slice ID
   * @param newRows - Array of new rows to create
   * @returns Map of temp IDs to created EAV record IDs
   */
  public async saveNewRows(
    sectionId: string,
    sliceId: string | null,
    newRows: { rowData: ReportData; structures: ReportStructure[] }[]
  ): Promise<Map<string, Map<string, string>>> {
    // // console.log(...) called', { sectionId, newRows: newRows.length });

    const rowEavIds = new Map<string, Map<string, string>>();

    for (const { rowData, structures } of newRows) {
      const groupSort = rowData.kazinex_groupsort as number;
      const group = rowData.kazinex_group as string;
      const tempRowId = rowData.kazinex_reportdataid as string;
      
      const eavRecordIds = new Map<string, string>();

      // // console.log(...)

      // Create one EAV record per column
      for (const structure of structures) {
        const cellValue = rowData[structure.kazinex_columnname];
        
        // Only create EAV record if cell has a value (skip empty cells)
        if (cellValue === '' || cellValue === null || cellValue === undefined) {
          // // console.log(...)
          continue;
        }

        // PCF createRecord doesn't support @odata.bind for lookup fields
        // Workaround: Create record first with only regular fields, then update to set lookups
        const newEavRecord = {
          [`${this.tablePrefix}group`]: group,
          [`${this.tablePrefix}groupsort`]: groupSort,
          [`${this.tablePrefix}datainput`]: String(cellValue),
        };

        // // console.log(...)

        try {
          // Step 1: Create record without lookup fields
          const createdRecord = await this.retry(() =>
            this.context.webAPI.createRecord(
              `${this.tablePrefix}reportdata`,
              newEavRecord
            )
          );

          const recordId = typeof createdRecord === 'string' ? createdRecord : createdRecord.id;
          // // console.log(...)
          
          // Step 2: Update record to set lookup fields using @odata.bind
          const lookupUpdate: Record<string, string> = {
            [`${this.tablePrefix}ReportSection@odata.bind`]: `/${this.tablePrefix}reportsections(${sectionId})`,
            [`${this.tablePrefix}ReportStructure@odata.bind`]: `/${this.tablePrefix}reportstructures(${structure.kazinex_reportstructureid})`
          };
          
          // Add report slice if provided
          if (sliceId) {
            lookupUpdate[`${this.tablePrefix}ReportSlice@odata.bind`] = `/${this.tablePrefix}reportslices(${sliceId})`;
          }
          
          await this.retry(() =>
            this.context.webAPI.updateRecord(
              `${this.tablePrefix}reportdata`,
              recordId,
              lookupUpdate
            )
          );
          
          eavRecordIds.set(structure.kazinex_columnname, recordId);
          
          // // console.log(...)
        } catch (error) {
          // // console.error(...)
          throw error;
        }
      }

      rowEavIds.set(tempRowId, eavRecordIds);
    }

    // // console.log(...)
    return rowEavIds;
  }

  /**
   * Delete a row (all EAV records with matching group and groupsort)
   * 
   * @param sectionId - The report section ID
   * @param groupSort - The groupsort value identifying the row
   * @param group - The group value (optional, defaults to groupsort as string)
   * @returns Success status
   */
  public async deleteRow(
    sectionId: string,
    groupSort: number,
    group?: string | null,
    sliceId?: string | null
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    // // console.log(...) called', { sectionId, groupSort, group, sliceId });

    const groupValue = (group !== null && group !== undefined && group !== '') ? group : String(groupSort);

    if (this.useMockData) {
      return this.mockDeleteRow(sectionId, groupSort, groupValue);
    }

    try {
      // First, find all EAV records for this row
      // FIX: Delete based on sectionId + sliceId + groupSort (not group field)
      // This ensures ALL cells in the row are deleted regardless of which cells have data
      // AND only deletes from the correct slice
      let filter = 
        `_${this.tablePrefix}reportsection_value eq '${sectionId}'` +
        ` and ${this.tablePrefix}groupsort eq ${groupSort}`;
      
      // CRITICAL: Add slice filter to prevent deleting rows from other slices
      if (sliceId) {
        filter += ` and _${this.tablePrefix}reportslice_value eq '${sliceId}'`;
      } else {
        filter += ` and _${this.tablePrefix}reportslice_value eq null`;
      }

      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          `${this.tablePrefix}reportdata`,
          `?$filter=${filter}&$select=${this.tablePrefix}reportdataid`
        )
      );

      // // console.log(...)

      // Delete each EAV record
      let deletedCount = 0;
      for (const entity of result.entities) {
        const recordId = entity[`${this.tablePrefix}reportdataid`];
        
        await this.retry(() =>
          this.context.webAPI.deleteRecord(
            `${this.tablePrefix}reportdata`,
            recordId
          )
        );
        
        deletedCount++;
      }

      // // console.log(...)
      return { success: true, deletedCount };
    } catch (error) {
      const errorMsg = (error as Error).message;
      // // console.error(...)
      return { success: false, deletedCount: 0, error: errorMsg };
    }
  }

  /**
   * Clear any cached data
   */
  public clearCache(): void {
    // // console.log(...) called');
    // TODO Day 5: Implement cache clearing
  }

  /**
   * Refresh data for a specific section
   */
  public async refreshSection(sectionId: string): Promise<void> {
    // // console.log(...) called for sectionId:', sectionId);
    // TODO Day 5: Clear cache and reload section data
  }

  // ==================== MOCK DATA METHODS ====================
  // These will be removed in Day 5 when WebAPI is implemented

  private getMockSlices(): ReportSlice[] {
    return [
      {
        kazinex_reportsliceid: 'slice-001',
        kazinex_name: 'Q4 2024 Financial Report',
        kazinex_description: 'Quarterly financial report for Q4 2024',
        createdon: new Date('2024-10-01'),
        modifiedon: new Date('2024-11-01'),
      },
    ];
  }

  private getMockSections(sliceId: string): ReportSection[] {
    // Return 3 sections (tabs) for testing
    return [
      {
        kazinex_reportsectionid: 'section-001',
        kazinex_name: 'Income Statement',
        kazinex_reportsliceid: sliceId,
        kazinex_ordernumber: 1,
        kazinex_isactive: true,
      },
      {
        kazinex_reportsectionid: 'section-002',
        kazinex_name: 'Balance Sheet',
        kazinex_reportsliceid: sliceId,
        kazinex_ordernumber: 2,
        kazinex_isactive: true,
      },
      {
        kazinex_reportsectionid: 'section-003',
        kazinex_name: 'Cash Flow',
        kazinex_reportsliceid: sliceId,
        kazinex_ordernumber: 3,
        kazinex_isactive: true,
      },
    ];
  }

  private getMockStructures(sectionId: string): ReportStructure[] {
    // Return different structures based on section
    // For now, return a common structure for all sections
    return [
      {
        kazinex_reportstructureid: 'struct-001',
        kazinex_reportsectionid: sectionId,
        kazinex_columnname: 'lineitem',
        kazinex_columndisplayname: 'Line Item',
        kazinex_columntype: 'text',
        kazinex_ordernumber: 1,
        kazinex_iseditable: false,
        kazinex_width: 250,
      },
      {
        kazinex_reportstructureid: 'struct-002',
        kazinex_reportsectionid: sectionId,
        kazinex_columnname: 'category',
        kazinex_columndisplayname: 'Category',
        kazinex_columntype: 'text',
        kazinex_ordernumber: 2,
        kazinex_iseditable: false,
        kazinex_width: 150,
      },
      {
        kazinex_reportstructureid: 'struct-003',
        kazinex_reportsectionid: sectionId,
        kazinex_columnname: 'actual',
        kazinex_columndisplayname: 'Actual',
        kazinex_columntype: 'number',
        kazinex_ordernumber: 3,
        kazinex_iseditable: true,
        kazinex_width: 120,
      },
      {
        kazinex_reportstructureid: 'struct-004',
        kazinex_reportsectionid: sectionId,
        kazinex_columnname: 'budget',
        kazinex_columndisplayname: 'Budget',
        kazinex_columntype: 'number',
        kazinex_ordernumber: 4,
        kazinex_iseditable: true,
        kazinex_width: 120,
      },
      {
        kazinex_reportstructureid: 'struct-005',
        kazinex_reportsectionid: sectionId,
        kazinex_columnname: 'variance',
        kazinex_columndisplayname: 'Variance %',
        kazinex_columntype: 'percent',
        kazinex_ordernumber: 5,
        kazinex_iseditable: false,
        kazinex_width: 120,
      },
    ];
  }

  private getMockLookupOptions(structureId: string): { id: string; label: string }[] {
    // Mock lookup options for testing
    return [
      { id: 'lookup-001', label: 'Option 1' },
      { id: 'lookup-002', label: 'Option 2' },
      { id: 'lookup-003', label: 'Option 3' }
    ];
  }

  private getMockData(sectionId: string, filters?: DataFilter): ReportData[] {
    // Check if we have cached data for this section
    if (!this.mockDataStore.has(sectionId)) {
      // Generate initial mock data for this section
      const mockData: ReportData[] = [];
      const lineItems = [
        'Revenue',
        'Cost of Goods Sold',
        'Gross Profit',
        'Operating Expenses',
        'Salaries',
        'Marketing',
        'R&D',
        'Operating Income',
        'Interest Expense',
        'Net Income',
      ];

      const categories = [
        'Revenue',
        'Cost',
        'Margin',
        'Expense',
        'Expense',
        'Expense',
        'Expense',
        'Income',
        'Expense',
        'Income',
      ];

      lineItems.forEach((item, index) => {
        const actual = Math.round(Math.random() * 1000000);
        const budget = Math.round(Math.random() * 1000000);
        const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;

        mockData.push({
          kazinex_reportdataid: `data-${sectionId}-${index + 1}`,
          kazinex_reportsectionid: sectionId,
          kazinex_groupsort: (index + 1) * 10, // Ensure proper ordering
          kazinex_group: `ROW-${index + 1}`,
          lineitem: item,
          category: categories[index],
          actual: actual,
          budget: budget,
          variance: Math.round(variance * 100) / 100,
        });
      });
      
      // Cache the generated data
      this.mockDataStore.set(sectionId, mockData);
      // // console.log(...)
    }
    
    // Get data from cache
    const cachedData = this.mockDataStore.get(sectionId)!;

    // Apply filters if provided
    if (filters?.rowIdentifiers) {
      return cachedData.filter((row) => filters.rowIdentifiers!.includes(row.kazinex_group as string));
    }

    if (filters?.groupSortMin !== undefined || filters?.groupSortMax !== undefined) {
      return cachedData.filter((row) => {
        const gs = row.kazinex_groupsort;
        const min = filters.groupSortMin ?? -Infinity;
        const max = filters.groupSortMax ?? Infinity;
        return gs >= min && gs <= max;
      });
    }

    return cachedData;
  }

  private mockBatchSave(updates: DataUpdate[]): BatchResult {
    // Simulate successful batch save and update cached data
    // // console.log(...)

    // Apply updates to cached data
    updates.forEach(update => {
      // Find which section this row belongs to
      for (const [sectionId, cachedData] of this.mockDataStore.entries()) {
        const row = cachedData.find(r => r.kazinex_reportdataid === update.kazinex_reportdataid);
        if (row) {
          // Update the field value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (row as any)[update.columnName] = update.value;
          // // console.log(...)
          break;
        }
      }
    });

    return {
      success: true,
      updatedCount: updates.length,
      errors: [],
      timestamp: new Date(),
    };
  }

  // Mock implementation removed - createNewRowInMemory doesn't need mock version (it's already in-memory)

  private mockDeleteRow(
    sectionId: string,
    groupSort: number,
    group: string
  ): { success: boolean; deletedCount: number; error?: string } {
    // // console.log(...)

    const cachedData = this.mockDataStore.get(sectionId) || [];
    const initialCount = cachedData.length;
    
    // FIX: Filter out rows matching sectionId + groupSort only (ignore group field)
    // This ensures ALL cells in the row are deleted regardless of which cells have data
    const filtered = cachedData.filter(
      row => !(row.kazinex_groupsort === groupSort)
    );
    
    const deletedCount = initialCount - filtered.length;
    this.mockDataStore.set(sectionId, filtered);

    return { success: true, deletedCount };
  }

  /**
   * COPY FROM PREVIOUS SLICE FEATURE METHODS
   * Phase 1: Foundation methods for copy dialog
   */

  /**
   * Get all projects with their slice counts
   * Used in Step 1 of copy dialog
   * 
   * @param reportDesignId - Optional report design filter to count only compatible slices
   * @returns Array of projects with slice counts
   */
  public async getProjectsWithSlices(reportDesignId?: string): Promise<Array<{
    projectId: string;
    projectCode: string;
    projectName?: string;
    description?: string;
    sliceCount: number;
  }>> {
    try {
      const f = this.fieldMapper.field.bind(this.fieldMapper);
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      const recordMapper = getRecordMapper();

      console.log('[DataverseService] getProjectsWithSlices called with reportDesignId:', reportDesignId);
      console.log('[DataverseService] Table prefix:', this.tablePrefix);
      console.log('[DataverseService] Report design lookup field:', l('reportdesign'));

      // Build filter clause to optionally filter by report design
      const filterClause = reportDesignId 
        ? `?$filter=${l('reportdesign')} eq '${reportDesignId}'&$select=${l('project')}`
        : `?$select=${l('project')}`;

      console.log('[DataverseService] Filter clause:', filterClause);

      // Build navigation property name from lookup field
      // Lookup: _cr214_project_value -> Navigation: cr214_Project
      const projectLookup = l('project'); // e.g., "_cr214_project_value"
      const baseName = projectLookup
        .replace(/^_/, '')        // Remove leading underscore
        .replace(/_value$/, '');  // Remove trailing _value -> "cr214_project"
      
      // Split by underscore, capitalize last part: "cr214_project" -> "cr214_Project"
      const parts = baseName.split('_');
      if (parts.length > 1) {
        parts[parts.length - 1] = parts[parts.length - 1].charAt(0).toUpperCase() + 
                                    parts[parts.length - 1].slice(1);
      }
      const navigationProperty = parts.join('_');
      
      console.log('[DataverseService] Lookup field:', projectLookup, '-> Navigation property:', navigationProperty);

      // Query all report slices with their project lookups
      // Note: We expand the project but don't specify fields - this gets the primary name field
      const slices = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          e('reportslice'),
          `${filterClause}` +
          `&$expand=${navigationProperty}`
        )
      );

      console.log('[DataverseService] Found', slices.entities.length, 'slices');
      
      // Group by project and count slices
      const projectMap = new Map<string, {
        projectId: string;
        projectCode: string;
        projectName?: string;
        description?: string;
        sliceCount: number;
      }>();
      
      for (const slice of slices.entities) {
        // Debug: Log what's in the slice
        console.log('[DataverseService] Slice keys:', Object.keys(slice));
        console.log('[DataverseService] Slice data sample:', {
          projectLookup: projectLookup,
          lookupValue: slice[projectLookup],
          navigationProperty: navigationProperty,
          expandedData: slice[navigationProperty]
        });
        
        // The projectId is in the lookup field (e.g., "_cr214_project_value")
        const projectId = slice[projectLookup] as string;
        
        // Get expanded project data using the same navigation property
        const projectData = slice[navigationProperty];
        
        if (projectId && projectData) {
          console.log('[DataverseService] Project data keys:', Object.keys(projectData));
          console.log('[DataverseService] Project data:', projectData);
          
          // According to schema (field names are lowercase):
          // - Project Primary Name field: cra59_projectcode (base: 'projectcode')
          // - Project Name field: cra59_projectname (base: 'projectname')
          // RecordMapper will handle the prefix automatically
          const projectCode = recordMapper.getValue(projectData, 'projectcode') as string ||
                             'Unknown';
          
          const projectName = recordMapper.getValue(projectData, 'projectname') as string ||
                             undefined;
          
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              projectId,
              projectCode,
              projectName,
              description: recordMapper.getValue(projectData, 'description') as string | undefined,
              sliceCount: 0
            });
          }
          projectMap.get(projectId)!.sliceCount++;
        }
      }
      
      // Sort by project code
      const result = Array.from(projectMap.values()).sort((a, b) => 
        a.projectCode.localeCompare(b.projectCode)
      );
      
      console.log('[DataverseService] Returning', result.length, 'projects with slices:', result);
      return result;
    } catch (error) {
      console.error('[DataverseService] Error in getProjectsWithSlices:', error);
      return [];
    }
  }

  /**
   * Get slices for a project with optional filters
   * Used in Step 2 of copy dialog
   * 
   * @param projectId - The project ID to filter by
   * @param filters - Optional filters (date range, ref no, search, reportDesignId)
   * @returns Array of slice information with row counts
   */
  public async getSlicesForProject(
    projectId: string,
    filters?: {
      reportDesignId?: string;   // CRITICAL: Filter by report design for compatibility
      dateFrom?: Date;
      dateTo?: Date;
      refNo?: string;
      search?: string;
    }
  ): Promise<Array<{
    sliceId: string;
    name?: string;
    description?: string;
    dataDate?: Date;
    refNo?: string;
    sliceType?: string;
    reportDesignId?: string;
    projectId?: string;
    projectName?: string;
    rowCount: number;
    createdon?: Date;
    modifiedon?: Date;
  }>> {
    try {
      const f = this.fieldMapper.field.bind(this.fieldMapper);
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      const recordMapper = getRecordMapper();

      // Build filter clause
      let filterClause = `${l('project')} eq '${projectId}'`;
      
      // CRITICAL: Filter by report design if provided (ensures only compatible slices)
      if (filters?.reportDesignId) {
        filterClause += ` and ${l('reportdesign')} eq '${filters.reportDesignId}'`;
      }
      
      if (filters?.dateFrom) {
        const isoDate = filters.dateFrom.toISOString().split('T')[0]; // YYYY-MM-DD
        filterClause += ` and ${f('datadate')} ge ${isoDate}`;
      }
      
      if (filters?.dateTo) {
        const isoDate = filters.dateTo.toISOString().split('T')[0]; // YYYY-MM-DD
        filterClause += ` and ${f('datadate')} le ${isoDate}`;
      }
      
      if (filters?.refNo) {
        filterClause += ` and ${f('refno')} eq '${filters.refNo}'`;
      }
      
      console.log('[DataverseService] Querying slices with filter:', filterClause);
      
      // Query slices - use ID field (autonumber) for unique identification
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          e('reportslice'),
          `?$filter=${filterClause}` +
          `&$select=${f('reportsliceid')},${f('id')},` +
          `${f('datadate')},${f('refno')},${l('reportdesign')},createdon,modifiedon` +
          `&$orderby=${f('datadate')} desc,createdon desc`
        )
      );
      
      console.log('[DataverseService] Found slices:', result.entities.length);
      
      // For each slice, count total rows (distinct groupsort values)
      const slicesWithCounts: Array<{
        sliceId: string;
        name?: string;
        description?: string;
        dataDate?: Date;
        refNo?: string;
        sliceType?: string;
        reportDesignId?: string;
        projectId?: string;
        rowCount: number;
        createdon?: Date;
        modifiedon?: Date;
      }> = [];
      
      for (const slice of result.entities) {
        const sliceId = recordMapper.getValue(slice, 'reportsliceid') as string;
        const sliceID = recordMapper.getValue(slice, 'id') as string | undefined; // Autonumber ID
        
        // Count distinct groupsort values (rows) for this slice
        const countResult = await this.retry(() =>
          this.context.webAPI.retrieveMultipleRecords(
            e('reportdata'),
            `?$filter=${l('reportslice')} eq '${sliceId}'` +
            `&$select=${f('groupsort')}` +
            `&$apply=groupby((${f('groupsort')}))`
          )
        );
        
        const dataDate = recordMapper.getValue(slice, 'datadate') as string | undefined;
        const refNo = recordMapper.getValue(slice, 'refno') as string | undefined;
        
        // Use ID as the display name, fallback to RefNo or date
        const displayName = sliceID ? `#${sliceID}` : (refNo || (dataDate ? new Date(dataDate).toLocaleDateString() : `Slice ${sliceId.substring(0, 8)}`));
        
        console.log('[DataverseService] Slice:', {
          id: sliceID,
          guid: sliceId.substring(0, 8),
          displayName,
          refNo,
          dataDate,
          rowCount: countResult.entities.length
        });
        
        slicesWithCounts.push({
          sliceId,
          name: displayName, // Use ID or fallback
          description: undefined, // Report Slice doesn't have description field
          dataDate: dataDate ? new Date(dataDate) : undefined,
          refNo: refNo,
          sliceType: undefined, // SliceType field doesn't exist in this environment
          reportDesignId: recordMapper.getValue(slice, 'reportdesign_value') as string | undefined,
          projectId,
          rowCount: countResult.entities.length,
          createdon: slice.createdon ? new Date(slice.createdon) : undefined,
          modifiedon: slice.modifiedon ? new Date(slice.modifiedon) : undefined
        });
      }
      
      // Apply client-side search filter if provided
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return slicesWithCounts.filter(s => 
          s.name?.toLowerCase().includes(searchLower) ||
          s.refNo?.toLowerCase().includes(searchLower) ||
          (s.dataDate && s.dataDate.toLocaleDateString().toLowerCase().includes(searchLower))
        );
      }
      
      return slicesWithCounts;
    } catch (error) {
      console.error('[DataverseService] Error in getSlicesForProject:', error);
      return [];
    }
  }

  /**
   * Get sections for a slice with row counts
   * Used in Step 3 of copy dialog
   * 
   * @param sliceId - The slice ID to get sections for
   * @returns Array of sections with row counts
   */
  public async getSectionsForSlice(sliceId: string): Promise<Array<{
    sectionId: string;
    name: string;
    description?: string;
    sortOrder?: number;
    rowCount: number;
    grouping?: boolean;
  }>> {
    try {
      const f = this.fieldMapper.field.bind(this.fieldMapper);
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      const recordMapper = getRecordMapper();

      console.log('[DataverseService] getSectionsForSlice called with:', sliceId);

      // Get all report data for this slice to determine which sections have data
      const dataResult = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          e('reportdata'),
          `?$filter=${l('reportslice')} eq '${sliceId}'` +
          `&$select=${l('reportsection')},${f('groupsort')}`
        )
      );
      
      console.log('[DataverseService] Found report data records:', dataResult.entities.length);
      
      // Group by section and count distinct groupsort (rows)
      const sectionRowCounts = new Map<string, Set<number>>();
      
      for (const record of dataResult.entities) {
        const sectionId = recordMapper.getValue(record, `_${this.tablePrefix}reportsection_value`) as string;
        const groupSort = recordMapper.getValue(record, 'groupsort') as number;
        
        console.log('[DataverseService] Record:', {sectionId, groupSort});
        
        if (sectionId) {
          if (!sectionRowCounts.has(sectionId)) {
            sectionRowCounts.set(sectionId, new Set());
          }
          sectionRowCounts.get(sectionId)!.add(groupSort);
        }
      }
      
      console.log('[DataverseService] Section row counts:', Array.from(sectionRowCounts.entries()).map(([id, set]) => ({id, count: set.size})));
      
      // Now get section details for sections that have data
      const sectionsWithData: Array<{
        sectionId: string;
        name: string;
        sortOrder?: number;
        rowCount: number;
        grouping?: boolean;
      }> = [];
      
      for (const [sectionId, groupSorts] of sectionRowCounts.entries()) {
        try {
          console.log('[DataverseService] Fetching section details for:', sectionId);
          const sectionResult = await this.retry(() =>
            this.context.webAPI.retrieveRecord(
              e('reportsection'),
              sectionId,
              `?$select=${f('name')},${f('sortorder')},${f('grouping')}`
            )
          );
          
          console.log('[DataverseService] Got section details:', sectionResult);
          
          sectionsWithData.push({
            sectionId,
            name: (recordMapper.getValue(sectionResult, 'name') as string) || 'Unnamed Section',
            sortOrder: recordMapper.getValue(sectionResult, 'sortorder') as number | undefined,
            rowCount: groupSorts.size,
            grouping: recordMapper.getValue(sectionResult, 'grouping') as boolean | undefined
          });
          
          console.log('[DataverseService] Added section to array:', sectionsWithData[sectionsWithData.length - 1]);
        } catch (sectionError) {
          console.error('[DataverseService] Error fetching section:', sectionId, sectionError);
          // Continue with other sections even if one fails
        }
      }
      
      console.log('[DataverseService] Total sections with data:', sectionsWithData.length);
      
      // Sort by sort order
      return sectionsWithData.sort((a, b) => 
        (a.sortOrder || 0) - (b.sortOrder || 0)
      );
    } catch (error) {
      console.error('[DataverseService] Error in getSectionsForSlice:', error);
      return [];
    }
  }

  /**
   * Check if a slice has any data
   * Used to enable/disable "Copy from Previous" button
   * 
   * @param sliceId - The slice ID to check
   * @returns True if slice has at least one data record
   */
  public async sliceHasData(sliceId: string): Promise<boolean> {
    try {
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      
      const result = await this.retry(() =>
        this.context.webAPI.retrieveMultipleRecords(
          e('reportdata'),
          `?$filter=${l('reportslice')} eq '${sliceId}'` +
          `&$select=${this.fieldMapper.field('reportdataid')}` +
          `&$top=1`
        )
      );
      
      return result.entities.length > 0;
    } catch (error) {
      console.error('[DataverseService] Error checking slice data:', error);
      return false;
    }
  }

  /**
   * Get the report design ID for a given slice
   * Used for the copy feature to filter projects by report design.
   * 
   * @param sliceId - The slice ID
   * @returns The report design ID if found, null otherwise
   */
  public async getReportDesignIdForSlice(sliceId: string): Promise<string | null> {
    try {
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      
      console.log('[DataverseService] getReportDesignIdForSlice called with:', { sliceId, tablePrefix: this.tablePrefix });
      
      const slice = await this.retry(() =>
        this.context.webAPI.retrieveRecord(
          e('reportslice'),
          sliceId,
          `?$select=${l('reportdesign')}`
        )
      );
      
      console.log('[DataverseService] Retrieved slice:', slice);
      console.log('[DataverseService] Available keys:', Object.keys(slice));
      
      const lookupField = l('reportdesign');
      const reportDesignId = (slice as any)[lookupField];
      
      console.log('[DataverseService] Lookup field name:', lookupField, 'value:', reportDesignId);
      
      return reportDesignId || null;
    } catch (error) {
      console.error('[DataverseService] Error getting report design ID for slice:', error);
      return null;
    }
  }

  /**
   * Get the project ID for a given slice.
   * Similar to getReportDesignIdForSlice but for project lookup.
   * @param sliceId - The ID of the slice to get the project for
   * @returns The project ID or null if not found
   */
  public async getProjectIdForSlice(sliceId: string): Promise<string | null> {
    try {
      const l = this.fieldMapper.lookup.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      
      console.log('[DataverseService] getProjectIdForSlice called with:', { sliceId, tablePrefix: this.tablePrefix });
      
      const slice = await this.retry(() =>
        this.context.webAPI.retrieveRecord(
          e('reportslice'),
          sliceId,
          `?$select=${l('project')}`
        )
      );
      
      console.log('[DataverseService] Retrieved slice for project:', slice);
      console.log('[DataverseService] Available keys:', Object.keys(slice));
      
      const lookupField = l('project');
      const projectId = (slice as any)[lookupField];
      
      console.log('[DataverseService] Project lookup field name:', lookupField, 'value:', projectId);
      
      return projectId || null;
    } catch (error) {
      console.error('[DataverseService] Error getting project ID for slice:', error);
      return null;
    }
  }

  /**
   * Error handling helper
   */
  private handleError(error: Error, operation: string): never {
    // // console.error(...)
    throw new Error(`Dataverse operation failed: ${operation}. ${error.message}`);
  }

  /**
   * Retry helper for network operations
   */
  private async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        // // console.warn(...)

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
}

