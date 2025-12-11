/**
 * Performance Monitor Utility
 * 
 * Tracks and reports performance metrics for image compression,
 * caching, rendering, and other operations.
 * 
 * Features:
 * - Operation timing
 * - Memory usage tracking
 * - Metric aggregation
 * - Console reporting
 * - Production-safe (minimal overhead)
 * 
 * @module performanceMonitor
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface AggregatedMetrics {
  operation: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecuted: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 200; // Keep last 200 metrics
  private enabled = true;   // Can be disabled in production

  /**
   * Start timing an operation
   * Returns a function to end the timer
   */
  startTimer(operation: string): (metadata?: Record<string, any>) => void {
    if (!this.enabled) {
      return () => {}; // No-op
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();

      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          memoryStart: startMemory,
          memoryEnd: endMemory,
          memoryDelta: endMemory - startMemory,
        },
      };

      this.recordMetric(metric);
    };
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endTimer = this.startTimer(operation);

    try {
      const result = await fn();
      endTimer({ ...metadata, success: true });
      return result;
    } catch (error) {
      endTimer({ ...metadata, success: false, error: String(error) });
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const endTimer = this.startTimer(operation);

    try {
      const result = fn();
      endTimer({ ...metadata, success: true });
      return result;
    } catch (error) {
      endTimer({ ...metadata, success: false, error: String(error) });
      throw error;
    }
  }

  /**
   * Record a metric manually
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.enabled) {
      return;
    }

    this.metrics.push(metric);

    // Trim old metrics if exceeding max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(
        `[Performance] Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`,
        metric.metadata
      );
    }
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance && typeof (performance as any).memory === 'object') {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * Get aggregated metrics for each operation type
   */
  getAggregatedMetrics(): AggregatedMetrics[] {
    const aggregated = new Map<string, AggregatedMetrics>();

    this.metrics.forEach(metric => {
      const existing = aggregated.get(metric.operation);

      if (existing) {
        existing.count++;
        existing.totalDuration += metric.duration;
        existing.avgDuration = existing.totalDuration / existing.count;
        existing.minDuration = Math.min(existing.minDuration, metric.duration);
        existing.maxDuration = Math.max(existing.maxDuration, metric.duration);
        existing.lastExecuted = Math.max(existing.lastExecuted, metric.timestamp);
      } else {
        aggregated.set(metric.operation, {
          operation: metric.operation,
          count: 1,
          totalDuration: metric.duration,
          avgDuration: metric.duration,
          minDuration: metric.duration,
          maxDuration: metric.duration,
          lastExecuted: metric.timestamp,
        });
      }
    });

    return Array.from(aggregated.values());
  }

  /**
   * Print performance report to console
   */
  printReport(): void {
    if (!this.enabled || this.metrics.length === 0) {
      console.log('[Performance] No metrics recorded');
      return;
    }

    console.log('=== Performance Report ===');
    console.log(`Total metrics: ${this.metrics.length}`);
    console.log('');

    const aggregated = this.getAggregatedMetrics();
    aggregated.sort((a, b) => b.totalDuration - a.totalDuration);

    console.table(
      aggregated.map(m => ({
        Operation: m.operation,
        Count: m.count,
        'Avg (ms)': m.avgDuration.toFixed(2),
        'Min (ms)': m.minDuration.toFixed(2),
        'Max (ms)': m.maxDuration.toFixed(2),
        'Total (s)': (m.totalDuration / 1000).toFixed(2),
      }))
    );

    // Show slowest operations
    const slowest = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    if (slowest.length > 0) {
      console.log('');
      console.log('=== Top 5 Slowest Operations ===');
      slowest.forEach((metric, index) => {
        console.log(
          `${index + 1}. ${metric.operation}: ${metric.duration.toFixed(2)}ms`,
          metric.metadata
        );
      });
    }

    console.log('=========================');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Get current state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    uniqueOperations: number;
    totalTime: number;
    avgOperationTime: number;
    memoryUsage: number;
  } {
    const totalTime = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const uniqueOps = new Set(this.metrics.map(m => m.operation)).size;

    return {
      totalOperations: this.metrics.length,
      uniqueOperations: uniqueOps,
      totalTime,
      avgOperationTime: this.metrics.length > 0 ? totalTime / this.metrics.length : 0,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      aggregated: this.getAggregatedMetrics(),
      metrics: this.metrics,
    }, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export class for testing
export { PerformanceMonitor };

// Development helper: expose to window for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).performanceMonitor = performanceMonitor;
}
