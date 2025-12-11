/**
 * useCopyFromPreviousSlice Hook
 * 
 * Manages state and logic for the "Copy from Previous Slice" feature.
 * Handles:
 * - Dialog state (open/close)
 * - Step navigation (project → slice → section)
 * - Data loading (projects, slices, sections)
 * - Copy operation execution
 * - Progress tracking
 * 
 * Phase 3: Hook implementation with complete state management
 */

import * as React from 'react';
import type { DataverseService } from '../services/DataverseService';
import type { SliceCopyService } from '../services/SliceCopyService';
import type {
  SliceFilters,
  CopyProgress
} from '../types/slice-copy.types';

export interface UseCopyFromPreviousSliceOptions {
  currentSliceId: string | null;
  currentReportDesignId: string | null;
  currentProjectId: string | null;
  dataverseService: DataverseService | null;
  sliceCopyService: SliceCopyService | null;
  onCopyComplete: () => void;
}

export interface UseCopyFromPreviousSliceReturn {
  // Dialog state
  dialogOpen: boolean;
  canCopy: boolean;
  step: 'slice' | 'section';
  
  // Selection
  selectedSlice: string | null;
  selectedSections: Set<string>;
  copyAllSections: boolean;
  
  // Data
  slices: Array<{
    sliceId: string;
    name?: string;
    description?: string;
    dataDate?: Date;
    refNo?: string;
    sliceType?: string;
    projectId?: string;
    projectName?: string;
    rowCount: number;
    createdon?: Date;
    modifiedon?: Date;
  }>;
  sections: Array<{
    sectionId: string;
    name: string;
    description?: string;
    sortOrder?: number;
    rowCount: number;
    grouping?: boolean;
  }>;
  
  // Loading state
  isLoading: boolean;
  isCopying: boolean;
  copyProgress: CopyProgress | null;
  
  // Error and success state
  errorMessage: string | null;
  successMessage: string | null;
  dismissError: () => void;
  
  // Filters
  sliceFilters: SliceFilters;
  setSliceFilters: (filters: SliceFilters) => void;
  
  // Calculated values
  totalRowsSelected: number;
  canProceed: boolean;
  
  // Actions
  openDialog: () => void;
  closeDialog: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setSelectedSlice: (sliceId: string | null) => void;
  handleCopyAllToggle: (checked: boolean) => void;
  handleSectionToggle: (sectionId: string) => void;
  executeCopy: () => Promise<void>;
}

export function useCopyFromPreviousSlice({
  currentSliceId,
  currentReportDesignId,
  currentProjectId,
  dataverseService,
  sliceCopyService,
  onCopyComplete
}: UseCopyFromPreviousSliceOptions): UseCopyFromPreviousSliceReturn {
  
  // ========== STATE VARIABLES ==========
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [step, setStep] = React.useState<'slice' | 'section'>('slice');
  
  // Debug: Log step changes
  React.useEffect(() => {
    console.log('[useCopyFromPreviousSlice] Step changed to:', step);
  }, [step]);
  
  // Selection state
  const [selectedSlice, setSelectedSlice] = React.useState<string | null>(null);
  const [selectedSections, setSelectedSections] = React.useState<Set<string>>(new Set());
  const [copyAllSections, setCopyAllSections] = React.useState(true);
  
  // Data state (projects removed - we use currentProjectId prop instead)
  
  const [slices, setSlices] = React.useState<Array<{
    sliceId: string;
    name?: string;
    description?: string;
    dataDate?: Date;
    refNo?: string;
    sliceType?: string;
    projectId?: string;
    projectName?: string;
    rowCount: number;
    createdon?: Date;
    modifiedon?: Date;
  }>>([]);
  
  const [sections, setSections] = React.useState<Array<{
    sectionId: string;
    name: string;
    description?: string;
    sortOrder?: number;
    rowCount: number;
    grouping?: boolean;
  }>>([]);
  
  // Debug: Log sections state changes
  React.useEffect(() => {
    console.log('[useCopyFromPreviousSlice] Sections state updated:', sections.length, sections);
  }, [sections]);
  
  // Loading state
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  
  // Progress state
  const [copyProgress, setCopyProgress] = React.useState<CopyProgress | null>(null);
  
  // Error and success state
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  
  // Filter state
  const [sliceFilters, setSliceFilters] = React.useState<SliceFilters>({});
  
  // Can copy state (current slice has no data)
  const [canCopy, setCanCopy] = React.useState(false);
  
  // ========== EFFECTS ==========
  
  /**
   * Check if copy is enabled when slice or service changes
   * Copy is only enabled if current slice has NO data
   */
  React.useEffect(() => {
    const checkCanCopy = async () => {
      if (!currentSliceId || !dataverseService) {
        setCanCopy(false);
        return;
      }
      
      try {
        const hasData = await dataverseService.sliceHasData(currentSliceId);
        setCanCopy(!hasData);
      } catch (error) {
        console.error('[useCopyFromPreviousSlice] Error checking slice data:', error);
        setCanCopy(false);
      }
    };
    
    checkCanCopy();
  }, [currentSliceId, dataverseService]);
  
  /**
   * Load slices when dialog opens and we're on slice step
   * Now loads slices immediately using currentProjectId and currentReportDesignId
   */
  React.useEffect(() => {
    console.log('[useCopyFromPreviousSlice] Effect check:', {
      dialogOpen,
      step,
      slicesLength: slices.length,
      hasDataverseService: !!dataverseService,
      currentReportDesignId,
      currentProjectId
    });
    
    if (dialogOpen && step === 'slice' && slices.length === 0 && dataverseService && currentReportDesignId && currentProjectId) {
      console.log('[useCopyFromPreviousSlice] Conditions met - loading slices now');
      
      // Inline load slices filtered by both project and report design
      setIsLoading(true);
      const filters: SliceFilters = {
        ...sliceFilters,
        reportDesignId: currentReportDesignId
      };
      
      dataverseService.getSlicesForProject(currentProjectId, filters)
        .then(sliceList => {
          console.log('[useCopyFromPreviousSlice] Loaded slices:', sliceList.length);
          setSlices(sliceList);
        })
        .catch(error => {
          console.error('[useCopyFromPreviousSlice] Error loading slices:', error);
          setSlices([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      console.log('[useCopyFromPreviousSlice] Conditions NOT met for loading slices');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, step, slices.length, dataverseService, currentReportDesignId, currentProjectId, sliceFilters]);
  
  /**
   * Load sections when slice is selected and we're on section step
   */
  React.useEffect(() => {
    console.log('[useCopyFromPreviousSlice] Section load effect check:', {
      selectedSlice,
      step,
      hasDataverseService: !!dataverseService
    });
    
    if (selectedSlice && step === 'section' && dataverseService) {
      console.log('[useCopyFromPreviousSlice] Effect triggering loadSections');
      // Inline the section loading to avoid dependency issues
      setIsLoading(true);
      dataverseService.getSectionsForSlice(selectedSlice)
        .then(sectionList => {
          console.log('[useCopyFromPreviousSlice] Got section list from service:', sectionList.length, sectionList);
          setSections(sectionList);
          console.log('[useCopyFromPreviousSlice] Loaded sections - setSections called with:', sectionList.length);
          
          // Pre-select all sections if copyAllSections is true
          if (copyAllSections) {
            setSelectedSections(new Set(sectionList.map(s => s.sectionId)));
          }
        })
        .catch(error => {
          console.error('[useCopyFromPreviousSlice] Error loading sections:', error);
          setSections([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedSlice, step, dataverseService]);
  
  // ========== DATA LOADING CALLBACKS ==========
  
  /**
   * Load sections for selected slice
   */
  const loadSections = React.useCallback(async (sliceId: string) => {
    if (!dataverseService) return;
    
    setIsLoading(true);
    try {
      console.log('[useCopyFromPreviousSlice] Loading sections for slice:', sliceId);
      const sectionList = await dataverseService.getSectionsForSlice(sliceId);
      console.log('[useCopyFromPreviousSlice] Got section list from service:', sectionList.length, sectionList);
      setSections(sectionList);
      console.log('[useCopyFromPreviousSlice] Loaded sections - setSections called with:', sectionList.length);
      
      // Pre-select all sections if copyAllSections is true
      if (copyAllSections) {
        setSelectedSections(new Set(sectionList.map(s => s.sectionId)));
      }
    } catch (error) {
      console.error('[useCopyFromPreviousSlice] Error loading sections:', error);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [dataverseService, copyAllSections]);
  
  // ========== DIALOG CONTROL ==========
  
  /**
   * Open the copy dialog
   * Resets all state to initial values
   */
  const openDialog = React.useCallback(() => {
    if (!canCopy) {
      console.warn('[useCopyFromPreviousSlice] Cannot open dialog - copy not enabled');
      return;
    }
    
    console.log('[useCopyFromPreviousSlice] Opening copy dialog - starting at slice step');
    setDialogOpen(true);
    setStep('slice');
    setSelectedSlice(null);
    setSelectedSections(new Set());
    setCopyAllSections(true);
    setSliceFilters({});
    setSlices([]);
    setSections([]);
  }, [canCopy]);
  
  /**
   * Close the copy dialog
   * Cleans up all state
   */
  const closeDialog = React.useCallback(() => {
    console.log('[useCopyFromPreviousSlice] Closing copy dialog');
    setDialogOpen(false);
    setStep('slice');
    setSelectedSlice(null);
    setSelectedSections(new Set());
    setCopyProgress(null);
    setSlices([]);
    setSections([]);
  }, []);
  
  // ========== STEP NAVIGATION ==========
  
  /**
   * Go to next step if current step has valid selection
   */
  const goToNextStep = React.useCallback(() => {
    console.log('[useCopyFromPreviousSlice] goToNextStep called', { step, selectedSlice });
    if (step === 'slice' && selectedSlice) {
      console.log('[useCopyFromPreviousSlice] Moving to section selection - calling setStep(section)');
      setStep('section');
      console.log('[useCopyFromPreviousSlice] setStep(section) called');
    } else {
      console.log('[useCopyFromPreviousSlice] Cannot proceed to next step', { step, selectedSlice });
    }
  }, [step, selectedSlice]);
  
  /**
   * Go back to previous step
   * Clears selection for current step
   */
  const goToPreviousStep = React.useCallback(() => {
    if (step === 'section') {
      console.log('[useCopyFromPreviousSlice] Moving back to slice selection');
      setStep('slice');
      setSelectedSections(new Set());
      setSections([]);
    }
  }, [step]);
  
  // ========== SELECTION HANDLERS ==========
  
  /**
   * Handle "Copy All Sections" checkbox toggle
   */
  const handleCopyAllToggle = React.useCallback((checked: boolean) => {
    console.log('[useCopyFromPreviousSlice] Copy all sections:', checked);
    setCopyAllSections(checked);
    if (checked) {
      // Select all sections
      setSelectedSections(new Set(sections.map(s => s.sectionId)));
    } else {
      // Deselect all
      setSelectedSections(new Set());
    }
  }, [sections]);
  
  /**
   * Handle individual section checkbox toggle
   */
  const handleSectionToggle = React.useCallback((sectionId: string) => {
    console.log('[useCopyFromPreviousSlice] Toggle section:', sectionId);
    setSelectedSections(prev => {
      const next = new Set(prev);
      const isCurrentlySelected = prev.has(sectionId);
      
      if (isCurrentlySelected) {
        next.delete(sectionId);
        // If user unchecks a section, also uncheck "Copy All"
        setCopyAllSections(false);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  // ========== COPY EXECUTION ==========
  
  /**
   * Execute the copy operation
   * Validates, calls SliceCopyService, handles progress and completion
   */
  const executeCopy = React.useCallback(async () => {
    if (!currentSliceId || !selectedSlice || !sliceCopyService) {
      console.error('[useCopyFromPreviousSlice] Cannot execute copy - missing required data');
      return;
    }
    
    if (selectedSections.size === 0) {
      console.error('[useCopyFromPreviousSlice] Cannot execute copy - no sections selected');
      return;
    }
    
    console.log('[useCopyFromPreviousSlice] Starting copy operation', {
      sourceSliceId: selectedSlice,
      targetSliceId: currentSliceId,
      sectionCount: selectedSections.size
    });
    
    setIsCopying(true);
    setCopyProgress({
      currentSectionName: 'Starting...',
      currentSectionIndex: 0,
      totalSections: selectedSections.size,
      currentRow: 0,
      totalRows: 0,
      percentComplete: 0
    });
    
    try {
      const result = await sliceCopyService.copySliceData({
        sourceSliceId: selectedSlice,
        targetSliceId: currentSliceId,
        sectionIds: Array.from(selectedSections),
        onProgress: (progress) => {
          setCopyProgress(progress);
        }
      });
      
      console.log('[useCopyFromPreviousSlice] Copy operation result:', result);
      
      if (result.success) {
        console.log('[useCopyFromPreviousSlice] Copy completed successfully', {
          sections: result.copiedSections,
          rows: result.copiedRows,
          cells: result.copiedCells
        });
        
        // Show success message
        const message = result.partialFailure
          ? `Copy completed with warnings: ${result.copiedSections} section(s), ${result.copiedRows} row(s), ${result.copiedCells} cell(s). Some sections failed to copy.`
          : `Successfully copied ${result.copiedSections} section(s), ${result.copiedRows} row(s), ${result.copiedCells} cell(s).`;
        
        setSuccessMessage(message);
        
        // Close dialog and notify parent after a brief delay to show success
        setTimeout(() => {
          setSuccessMessage(null);
          closeDialog();
          onCopyComplete();
        }, 2000);
      } else {
        console.error('[useCopyFromPreviousSlice] Copy failed:', result.error);
        const errorMsg = result.error || 'An unknown error occurred during the copy operation.';
        setErrorMessage(`Copy failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('[useCopyFromPreviousSlice] Copy operation error:', error);
      setErrorMessage(`Copy error: ${(error as Error).message || 'An unexpected error occurred.'}`);
    } finally {
      setIsCopying(false);
      setCopyProgress(null);
    }
  }, [currentSliceId, selectedSlice, selectedSections, sliceCopyService, onCopyComplete, closeDialog]);
  
  /**
   * Dismiss error message
   */
  const dismissError = React.useCallback(() => {
    setErrorMessage(null);
  }, []);
  
  // ========== CALCULATED VALUES ==========
  
  /**
   * Calculate total rows selected for copy
   */
  const totalRowsSelected = React.useMemo(() => {
    return sections
      .filter(s => selectedSections.has(s.sectionId))
      .reduce((sum, s) => sum + s.rowCount, 0);
  }, [sections, selectedSections]);
  
  /**
   * Check if user can proceed to next step
   */
  const canProceed = React.useMemo(() => {
    if (step === 'slice') {
      return !!selectedSlice;
    } else { // step === 'section'
      return selectedSections.size > 0;
    }
  }, [step, selectedSlice, selectedSections]);
  
  // ========== RETURN ==========
  
  return {
    // Dialog state
    dialogOpen,
    canCopy,
    step,
    
    // Selection
    selectedSlice,
    selectedSections,
    copyAllSections,
    
    // Data
    slices,
    sections,
    
    // Loading
    isLoading,
    isCopying,
    copyProgress,
    
    // Error and success
    errorMessage,
    successMessage,
    dismissError,
    
    // Filters
    sliceFilters,
    setSliceFilters,
    
    // Calculated
    totalRowsSelected,
    canProceed,
    
    // Actions
    openDialog,
    closeDialog,
    goToNextStep,
    goToPreviousStep,
    setSelectedSlice,
    handleCopyAllToggle,
    handleSectionToggle,
    executeCopy
  };
}
