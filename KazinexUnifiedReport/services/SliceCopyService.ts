/**
 * SliceCopyService
 * 
 * Handles copying data from one slice to another.
 * Maintains EAV structure, grouping, and relationships.
 * 
 * Phase 1: Skeleton structure with method signatures
 * Phase 2: Implementation of copy logic (to be done next)
 */

import type { CopyOptions, CopyResult, CopyProgress } from '../types/slice-copy.types';
import { FieldMapper, getRecordMapper } from '../utils/fieldMapper';

export class SliceCopyService {
  private context: ComponentFramework.Context<any>;
  private fieldMapper: FieldMapper;

  constructor(context: ComponentFramework.Context<any>) {
    this.context = context;
    this.fieldMapper = new FieldMapper();
  }

  /**
   * Copy data from source slice to target slice
   * 
   * Main orchestration method that:
   * 1. Determines which sections to copy
   * 2. Iterates through each section
   * 3. Calls copySectionData for each section
   * 4. Aggregates results and handles partial failures
   * 5. Reports progress throughout the operation
   * 
   * @param options - Copy operation options
   * @returns Result of copy operation
   */
  public async copySliceData(options: CopyOptions): Promise<CopyResult> {
    const { sourceSliceId, targetSliceId, sectionIds, onProgress } = options;
    
    console.log('[SliceCopyService] Starting copy operation', {
      sourceSliceId,
      targetSliceId,
      sectionCount: sectionIds.length
    });

    let copiedSections = 0;
    let copiedRows = 0;
    let copiedCells = 0;
    let partialFailure = false;

    try {
      // Step 1: Determine sections to copy
      let sectionsToProcess: string[] = sectionIds;
      
      if (sectionIds.length === 0) {
        // User wants to copy all sections - get all sections that have data in source slice
        const allSections = await this.getSectionsWithData(sourceSliceId);
        sectionsToProcess = allSections.map(s => s.sectionId);
      }

      if (sectionsToProcess.length === 0) {
        console.log('[SliceCopyService] No sections to copy');
        return {
          success: true,
          copiedSections: 0,
          copiedRows: 0,
          copiedCells: 0
        };
      }

      console.log('[SliceCopyService] Processing sections:', sectionsToProcess.length);

      // Step 2: Process each section
      for (let i = 0; i < sectionsToProcess.length; i++) {
        const sectionId = sectionsToProcess[i];
        
        try {
          // Get section name for progress reporting
          const sectionName = await this.getSectionName(sectionId);
          
          console.log(`[SliceCopyService] Copying section ${i + 1}/${sectionsToProcess.length}: ${sectionName}`);
          
          // Copy this section
          const sectionResult = await this.copySectionData(
            sourceSliceId,
            targetSliceId,
            sectionId,
            (currentRow, totalRows) => {
              if (onProgress) {
                // Calculate overall progress
                const percentComplete = Math.round(
                  ((i + (currentRow / totalRows)) / sectionsToProcess.length) * 100
                );
                
                onProgress({
                  currentSectionName: sectionName,
                  currentSectionIndex: i + 1,
                  totalSections: sectionsToProcess.length,
                  currentRow,
                  totalRows,
                  percentComplete
                });
              }
            }
          );

          // Aggregate results
          copiedSections++;
          copiedRows += sectionResult.rowCount;
          copiedCells += sectionResult.cellCount;
          
        } catch (error) {
          console.error(`[SliceCopyService] Error copying section ${sectionId}:`, error);
          partialFailure = true;
          // Continue with next section instead of failing completely
          // This allows partial recovery if one section has issues
        }
      }

      // Step 3: Return aggregated results
      console.log('[SliceCopyService] Copy operation complete', {
        copiedSections,
        copiedRows,
        copiedCells,
        partialFailure
      });

      return {
        success: !partialFailure || copiedSections > 0,
        copiedSections,
        copiedRows,
        copiedCells,
        partialFailure,
        error: partialFailure ? 'Some sections failed to copy' : undefined
      };

    } catch (error) {
      console.error('[SliceCopyService] Copy operation failed:', error);
      return {
        success: false,
        copiedSections,
        copiedRows,
        copiedCells,
        error: (error as Error).message
      };
    }
  }

  /**
   * Copy data for a single section from source to target slice
   * 
   * Process:
   * 1. Query all EAV records for the section from source slice
   * 2. Group by row (groupsort)
   * 3. Create new EAV records in target slice with proper lookups
   * 4. Report progress via callback
   */
  private async copySectionData(
    sourceSliceId: string,
    targetSliceId: string,
    sectionId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ rowCount: number; cellCount: number }> {
    
    const f = this.fieldMapper.field.bind(this.fieldMapper);
    const l = this.fieldMapper.lookup.bind(this.fieldMapper);
    const e = this.fieldMapper.entity.bind(this.fieldMapper);
    const recordMapper = getRecordMapper();

    // Step 1: Get all EAV records for this section from source slice
    const sourceRecords = await this.context.webAPI.retrieveMultipleRecords(
      e('reportdata'),
      `?$filter=${l('reportslice')} eq '${sourceSliceId}' and ${l('reportsection')} eq '${sectionId}'` +
      `&$select=${f('groupsort')},${f('group')},${f('datainput')},${l('reportstructure')}` +
      `&$orderby=${f('groupsort')} asc`
    );

    console.log(`[SliceCopyService] Found ${sourceRecords.entities.length} cells in section ${sectionId}`);

    if (sourceRecords.entities.length === 0) {
      return { rowCount: 0, cellCount: 0 };
    }

    // Step 2: Group by row (groupsort)
    const rowsMap = new Map<number, Array<{
      group: string;
      datainput: string;
      structureId: string;
    }>>();

    for (const record of sourceRecords.entities) {
      const groupSort = recordMapper.getValue(record, 'groupsort') as number;
      
      if (!rowsMap.has(groupSort)) {
        rowsMap.set(groupSort, []);
      }

      // Get structure ID directly from the lookup field
      const structureId = record[l('reportstructure')] as string;
      
      console.log(`[SliceCopyService] Record data:`, {
        groupSort,
        structureId,
        lookupField: l('reportstructure')
      });
      
      rowsMap.get(groupSort)!.push({
        group: (recordMapper.getValue(record, 'group') as string) || '',
        datainput: (recordMapper.getValue(record, 'datainput') as string) || '',
        structureId: structureId
      });
    }

    // Step 3: Copy each row
    let currentRow = 0;
    const totalRows = rowsMap.size;
    let cellCount = 0;

    for (const [groupSort, cells] of rowsMap.entries()) {
      // Create EAV records for each cell in the row
      for (const cell of cells) {
        try {
          console.log(`[SliceCopyService] Creating cell - groupSort: ${groupSort}, structureId: ${cell.structureId}`);
          await this.createCell(
            targetSliceId,
            sectionId,
            cell.structureId,
            groupSort,
            cell.group,
            cell.datainput
          );
          cellCount++;
          console.log(`[SliceCopyService] Cell created successfully`);
        } catch (cellError) {
          console.error(`[SliceCopyService] Error creating cell:`, {
            groupSort,
            structureId: cell.structureId,
            error: cellError
          });
          throw cellError; // Re-throw to fail the section
        }
      }

      currentRow++;
      if (onProgress) {
        onProgress(currentRow, totalRows);
      }
    }

    console.log(`[SliceCopyService] Copied ${totalRows} rows, ${cellCount} cells for section ${sectionId}`);
    return { rowCount: totalRows, cellCount };
  }

  /**
   * Get sections that have data in a slice
   * Queries all distinct section IDs that have data records for the given slice
   */
  private async getSectionsWithData(sliceId: string): Promise<Array<{ sectionId: string }>> {
    const l = this.fieldMapper.lookup.bind(this.fieldMapper);
    const e = this.fieldMapper.entity.bind(this.fieldMapper);
    
    const result = await this.context.webAPI.retrieveMultipleRecords(
      e('reportdata'),
      `?$filter=${l('reportslice')} eq '${sliceId}'` +
      `&$select=${l('reportsection')}` +
      `&$apply=groupby((${l('reportsection')}))`
    );

    const recordMapper = getRecordMapper();
    return result.entities.map(e => ({
      sectionId: recordMapper.getValue(e, 'reportsection_value') as string
    }));
  }

  /**
   * Get section name by ID
   * Used for progress reporting during copy operation
   */
  private async getSectionName(sectionId: string): Promise<string> {
    try {
      const f = this.fieldMapper.field.bind(this.fieldMapper);
      const e = this.fieldMapper.entity.bind(this.fieldMapper);
      const recordMapper = getRecordMapper();
      
      const section = await this.context.webAPI.retrieveRecord(
        e('reportsection'),
        sectionId,
        `?$select=${f('name')}`
      );
      
      return (recordMapper.getValue(section, 'name') as string) || 'Unknown Section';
    } catch (error) {
      console.error('[SliceCopyService] Error getting section name:', error);
      return 'Unknown Section';
    }
  }

  /**
   * Create a single EAV cell record in the target slice
   * 
   * Process:
   * 1. Create basic record with scalar fields (groupsort, group, datainput)
   * 2. Update with lookup relationships (slice, section, structure)
   * 
   * Note: Dataverse requires two-step process for lookups
   */
  private async createCell(
    targetSliceId: string,
    sectionId: string,
    structureId: string,
    groupSort: number,
    group: string,
    dataInput: string
  ): Promise<string> {
    const f = this.fieldMapper.field.bind(this.fieldMapper);
    const l = this.fieldMapper.lookup.bind(this.fieldMapper);
    const e = this.fieldMapper.entity.bind(this.fieldMapper);
    
    // Use same pattern as DataverseService - navigation properties with plural entity names
    const prefix = this.fieldMapper.getPrefix();
    const createData = {
      [f('groupsort')]: groupSort,
      [f('group')]: group,
      [f('datainput')]: dataInput,
      [`${prefix}ReportSlice@odata.bind`]: `/${prefix}reportslices(${targetSliceId})`,
      [`${prefix}ReportSection@odata.bind`]: `/${prefix}reportsections(${sectionId})`,
      [`${prefix}ReportStructure@odata.bind`]: `/${prefix}reportstructures(${structureId})`
    };
    
    console.log('[SliceCopyService] createCell data:', {
      entity: e('reportdata'),
      fieldNames: Object.keys(createData),
      data: createData
    });
    
    try {
      // Create record with both scalar fields and lookup relationships in one call
      // Using lookup field names with @odata.bind
      const newRecord = await this.context.webAPI.createRecord(
        e('reportdata'),
        createData
      );

      const recordId = typeof newRecord === 'string' ? newRecord : newRecord.id;
      console.log('[SliceCopyService] Record created with ID:', recordId);
      return recordId;
    } catch (error) {
      console.error('[SliceCopyService] createRecord failed:', error);
      throw error;
    }
  }
}
