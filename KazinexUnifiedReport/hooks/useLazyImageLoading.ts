/**
 * Lazy Image Loading Hook
 * 
 * Uses Intersection Observer API to detect when image cells
 * become visible in the viewport. Only loads images when needed.
 * 
 * Features:
 * - Automatic viewport detection
 * - Configurable threshold and root margin
 * - Cleanup on unmount
 * - Performance optimized
 * 
 * @module useLazyImageLoading
 */

import { useEffect, useRef, useState } from 'react';

export interface UseLazyImageLoadingOptions {
  threshold?: number;        // 0-1, how much of element must be visible
  rootMargin?: string;       // CSS margin around viewport
  triggerOnce?: boolean;     // Only trigger visibility once
}

export interface UseLazyImageLoadingResult {
  isVisible: boolean;
  elementRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook for lazy loading images in grid cells
 * 
 * @param options - Configuration options
 * @returns Object with isVisible state and elementRef to attach to element
 * 
 * @example
 * ```tsx
 * const { isVisible, elementRef } = useLazyImageLoading({ threshold: 0.1 });
 * 
 * return (
 *   <div ref={elementRef}>
 *     {isVisible && <img src={thumbnailUrl} />}
 *   </div>
 * );
 * ```
 */
export function useLazyImageLoading(
  options: UseLazyImageLoadingOptions = {}
): UseLazyImageLoadingResult {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = false,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: assume always visible
      console.warn('[useLazyImageLoading] IntersectionObserver not supported, defaulting to visible');
      setIsVisible(true);
      return;
    }

    // Create observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);

            // If triggerOnce, disconnect observer after first visibility
            if (triggerOnce) {
              observer.disconnect();
            }
          } else if (!triggerOnce) {
            // Only reset visibility if not triggerOnce
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Start observing
    observer.observe(element);

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return {
    isVisible,
    elementRef,
  };
}

/**
 * Hook for lazy loading with manual trigger
 * Useful when you want to control when to start observing
 */
export function useLazyImageLoadingManual(
  options: UseLazyImageLoadingOptions = {}
): UseLazyImageLoadingResult & { startObserving: () => void } {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = false,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldObserve, setShouldObserve] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!shouldObserve) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);

            if (triggerOnce && observerRef.current) {
              observerRef.current.disconnect();
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [shouldObserve, threshold, rootMargin, triggerOnce]);

  const startObserving = () => {
    setShouldObserve(true);
  };

  return {
    isVisible,
    elementRef,
    startObserving,
  };
}

/**
 * Hook for batch lazy loading multiple elements
 * Returns a map of element IDs to visibility states
 */
export function useLazyImageLoadingBatch(
  elementIds: string[],
  options: UseLazyImageLoadingOptions = {}
): Map<string, boolean> {
  const {
    threshold = 0.1,
    rootMargin = '50px',
  } = options;

  const [visibilityMap, setVisibilityMap] = useState<Map<string, boolean>>(
    new Map(elementIds.map(id => [id, false]))
  );

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      // Fallback: mark all as visible
      setVisibilityMap(new Map(elementIds.map(id => [id, true])));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibilityMap((prevMap) => {
          const newMap = new Map(prevMap);
          entries.forEach((entry) => {
            const id = entry.target.getAttribute('data-element-id');
            if (id) {
              newMap.set(id, entry.isIntersecting);
            }
          });
          return newMap;
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Observe all elements with data-element-id attribute
    const elements = document.querySelectorAll('[data-element-id]');
    elements.forEach((element) => {
      const id = element.getAttribute('data-element-id');
      if (id && elementIds.includes(id)) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [elementIds, threshold, rootMargin]);

  return visibilityMap;
}
