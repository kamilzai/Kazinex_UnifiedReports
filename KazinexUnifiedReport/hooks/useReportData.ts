/**
 * useReportData Hook
 * 
 * Custom React hook for loading and managing report data.
 * Handles loading sections, structures, and data from Dataverse.
 */

import * as React from 'react';
import { DataverseService } from '../services/DataverseService';
import type {
  ReportSlice,
  ReportSection,
  ReportStructure,
  ReportData,
} from '../types/dataverse.types';

/**
 * Hook result interface
 */
export interface UseReportDataResult {
  // Data
  slices: ReportSlice[];
  sections: ReportSection[];
  activeSection: ReportSection | null;
  structures: ReportStructure[];
  data: ReportData[];

  // State
  loading: boolean;
  error: Error | null;

  // Actions
  loadSections: (sliceId: string) => Promise<void>;
  setActiveSection: (sectionId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing report data
 * 
 * @param dataverseService - The Dataverse service instance
 * @param sliceId - The report slice ID to load
 * @returns Report data and actions
 */
export function useReportData(
  dataverseService: DataverseService | null,
  sliceId: string | null
): UseReportDataResult {
  // State
  const [slices, setSlices] = React.useState<ReportSlice[]>([]);
  const [sections, setSections] = React.useState<ReportSection[]>([]);
  const [activeSection, setActiveSectionState] = React.useState<ReportSection | null>(null);
  const [structures, setStructures] = React.useState<ReportStructure[]>([]);
  const [data, setData] = React.useState<ReportData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  /**
   * Load sections for a report slice
   */
  const loadSections = React.useCallback(
    async (newSliceId: string) => {
      if (!dataverseService) {
        // // console.warn(...)
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // // console.log(...)

        const loadedSections = await dataverseService.getReportSections(newSliceId);
        // // console.log(...)

        setSections(loadedSections);

        // Auto-select first active section and load its data immediately
        const firstActive = loadedSections.find((s) => s.kazinex_isactive);
        if (firstActive) {
          // // console.log(...)
          
          // Load data for first section
          setActiveSectionState(firstActive);
          
          const [sectionStructures, sectionData] = await Promise.all([
            dataverseService.getReportStructures(firstActive.kazinex_reportsectionid),
            dataverseService.getReportData(firstActive.kazinex_reportsectionid, newSliceId),  // CRITICAL: Pass sliceId
          ]);

          // // console.log(...)
          // // console.log(...)

          // Load lookup options for lookup columns
          const structuresWithLookups = await Promise.all(
            sectionStructures.map(async (structure) => {
              // Check for lookup type using both kazinex_columntype and cra59_datatype
              const structureWithAlt = structure as ReportStructure & { cra59_datatype?: string };
              const dataType = (structure.kazinex_columntype || structureWithAlt.cra59_datatype || '').toLowerCase();
              
              if (dataType === 'lookup') {
                // // console.log(...)
                const lookupOptions = await dataverseService.getReportStructureLookups(structure.kazinex_reportstructureid);
                return {
                  ...structure,
                  lookupOptions
                };
              }
              return structure;
            })
          );

          // // console.log('[useReportData] Lookup options loaded for columns:', 
          //   structuresWithLookups.filter(s => s.lookupOptions).map(s => s.kazinex_columnname)
          // );

          setStructures(structuresWithLookups);
          setData(sectionData);
        }
      } catch (err) {
        const error = err as Error;
        // // console.error(...)
        setError(error);
      } finally {
        setLoading(false);
      }
    },
    [dataverseService]
  );

  /**
   * Set active section and load its data
   */
  const setActiveSection = React.useCallback(
    async (sectionId: string) => {
      if (!dataverseService) {
        // // console.warn(...)
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // // console.log(...)

        // Find the section in current sections state
        setSections((currentSections) => {
          const section = currentSections.find((s) => s.kazinex_reportsectionid === sectionId);
          if (section) {
            setActiveSectionState(section);
          }
          return currentSections;
        });

        // Load structures and data in parallel
        // // console.log(...)
        const [loadedStructures, loadedData] = await Promise.all([
          dataverseService.getReportStructures(sectionId),
          dataverseService.getReportData(sectionId, sliceId),  // CRITICAL: Pass sliceId
        ]);

        // // console.log(
        //   '[useReportData] Loaded',
        //   loadedStructures.length,
        //   'structures and',
        //   loadedData.length,
        //   'data rows'
        // );

        // Load lookup options for lookup columns
        const structuresWithLookups = await Promise.all(
          loadedStructures.map(async (structure) => {
            // Check for lookup type using both kazinex_columntype and cra59_datatype
            const structureWithAlt = structure as ReportStructure & { cra59_datatype?: string };
            const dataType = (structure.kazinex_columntype || structureWithAlt.cra59_datatype || '').toLowerCase();
            
            if (dataType === 'lookup') {
              // // console.log(...)
              const lookupOptions = await dataverseService.getReportStructureLookups(structure.kazinex_reportstructureid);
              return {
                ...structure,
                lookupOptions
              };
            }
            return structure;
          })
        );

        // // console.log('[useReportData] Lookup options loaded for columns:', 
        //   structuresWithLookups.filter(s => s.lookupOptions).map(s => s.kazinex_columnname)
        // );

        setStructures(structuresWithLookups);
        setData(loadedData);
      } catch (err) {
        const error = err as Error;
        // // console.error(...)
        setError(error);
      } finally {
        setLoading(false);
      }
    },
    [dataverseService]
  );

  /**
   * Refresh current section data
   */
  const refresh = React.useCallback(async () => {
    if (activeSection) {
      // // console.log(...)
      await setActiveSection(activeSection.kazinex_reportsectionid);
    }
  }, [activeSection, setActiveSection]);

  /**
   * Initial load effect
   */
  React.useEffect(() => {
    if (dataverseService && sliceId) {
      // // console.log(...)
      loadSections(sliceId);
    }
  }, [dataverseService, sliceId, loadSections]);

  return {
    // Data
    slices,
    sections,
    activeSection,
    structures,
    data,

    // State
    loading,
    error,

    // Actions
    loadSections,
    setActiveSection,
    refresh,
  };
}

