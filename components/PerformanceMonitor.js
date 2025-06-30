
/**
 * Performance Monitor - Tracks and monitors app performance metrics
 */

import { PERFORMANCE_THRESHOLDS, MONITORING, WARNING_THRESHOLDS } from '../constants/performance.js';
import { getPerformanceTier, isMobile } from '../utils/deviceDetection.js';

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      loadTime: 0,
      stationCount: 0,
      frameCount: 0
    };
    
    this.warnings = new Set();
    this.isMonitoring = false;
    this.startTime = Date.now();
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    
    // Intervals
    this.fpsInterval = null;
    this.memoryInterval = null;
    this.reportInterval = null;
    
    // Performance observers
    this.performanceObserver = null;
    
    // Callbacks
    this.onWarningCallback = null;
    this.onReportCallback = null;
    
    // Device info
    this.deviceType = isMobile() ? 'mobile' : 'desktop';
    this.performanceTier = getPerformanceTier();
    
    this.initializePerformanceObserver();
  }

  /**
   * Initialize Performance Observer for paint timing
   */
  initializePerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'paint') {
              if (entry.name === 'first-contentful-paint') {
                this.metrics.loadTime = entry.startTime;
              }
            } else if (entry.entryType === 'measure') {
              if (entry.name.startsWith('render-')) {
                this.metrics.renderTime = entry.duration;
                this.checkRenderingPerformance();
              }
            }
          });
        });
        
        this.performanceObserver.observe({ entryTypes: ['paint', 'measure'] });
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Start monitoring performance
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    // FPS monitoring
    this.fpsInterval = setInterval(() => {
      this.calculateFPS();
    }, MONITORING.FPS_CHECK_INTERVAL_MS);
    
    // Memory monitoring
    this.memoryInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, MONITORING.MEMORY_CHECK_INTERVAL_MS);
    
    // Performance reports
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, MONITORING.PERFORMANCE_REPORT_INTERVAL_MS);
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Calculate FPS based on requestAnimationFrame
   */
  calculateFPS() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Calculate FPS over the last second
    this.metrics.fps = Math.round(1000 / delta);
    
    // Check FPS warnings
    if (this.metrics.fps < WARNING_THRESHOLDS.LOW_FPS_THRESHOLD) {
      this.addWarning('low-fps', `Low FPS detected: ${this.metrics.fps}`);
    }
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    if (performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
      this.metrics.memoryUsage = Math.round(memoryMB);
      
      // Check memory warnings
      if (this.metrics.memoryUsage > WARNING_THRESHOLDS.MEMORY_USAGE_MB) {
        this.addWarning('high-memory', `High memory usage: ${this.metrics.memoryUsage}MB`);
      }
      
      if (this.metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MAX_MEMORY_MB) {
        this.addWarning('critical-memory', `Critical memory usage: ${this.metrics.memoryUsage}MB`);
      }
    }
  }

  /**
   * Check rendering performance
   */
  checkRenderingPerformance() {
    if (this.metrics.renderTime > PERFORMANCE_THRESHOLDS.MAX_RENDER_TIME_MS) {
      this.addWarning('slow-render', `Slow rendering detected: ${this.metrics.renderTime}ms`);
    }
  }

  /**
   * Add a performance warning
   * @param {string} type - Warning type
   * @param {string} message - Warning message
   */
  addWarning(type, message) {
    if (!this.warnings.has(type)) {
      this.warnings.add(type);
      console.warn(`Performance Warning [${type}]:`, message);
      
      if (this.onWarningCallback) {
        this.onWarningCallback(type, message);
      }
    }
  }

  /**
   * Clear a specific warning
   * @param {string} type - Warning type to clear
   */
  clearWarning(type) {
    this.warnings.delete(type);
  }

  /**
   * Update station count metric
   * @param {number} count - Number of stations
   */
  updateStationCount(count) {
    this.metrics.stationCount = count;
    
    // Check station count warnings for mobile
    if (this.deviceType === 'mobile' && count > WARNING_THRESHOLDS.MOBILE_STATION_COUNT) {
      this.addWarning('too-many-stations', `Too many stations for mobile: ${count}`);
    }
  }

  /**
   * Start render timing measurement
   * @param {string} name - Measurement name
   */
  startRenderMeasure(name = 'render-frame') {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End render timing measurement
   * @param {string} name - Measurement name
   */
  endRenderMeasure(name = 'render-frame') {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // Silently ignore measurement errors
      }
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      deviceType: this.deviceType,
      performanceTier: this.performanceTier,
      uptime: Date.now() - this.startTime,
      metrics: { ...this.metrics },
      warnings: Array.from(this.warnings),
      recommendations: this.getRecommendations()
    };
    
    console.log('Performance Report:', report);
    
    if (this.onReportCallback) {
      this.onReportCallback(report);
    }
    
    return report;
  }

  /**
   * Get performance recommendations
   * @returns {Array} Array of recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.fps < PERFORMANCE_THRESHOLDS.MIN_FPS) {
      recommendations.push({
        type: 'fps',
        severity: 'high',
        message: 'Enable performance mode to improve frame rate',
        action: 'enable-performance-mode'
      });
    }
    
    if (this.metrics.memoryUsage > WARNING_THRESHOLDS.MEMORY_USAGE_MB) {
      recommendations.push({
        type: 'memory',
        severity: 'medium',
        message: 'Reduce number of visible stations to free memory',
        action: 'reduce-stations'
      });
    }
    
    if (this.metrics.renderTime > PERFORMANCE_THRESHOLDS.MAX_RENDER_TIME_MS) {
      recommendations.push({
        type: 'rendering',
        severity: 'medium',
        message: 'Enable viewport culling for better rendering performance',
        action: 'enable-culling'
      });
    }
    
    if (this.deviceType === 'mobile' && this.metrics.stationCount > WARNING_THRESHOLDS.MOBILE_STATION_COUNT) {
      recommendations.push({
        type: 'mobile-optimization',
        severity: 'high',
        message: 'Too many stations for mobile device. Enable clustering or reduce station count',
        action: 'enable-clustering'
      });
    }
    
    return recommendations;
  }

  /**
   * Set warning callback
   * @param {Function} callback - Callback function for warnings
   */
  onWarning(callback) {
    this.onWarningCallback = callback;
  }

  /**
   * Set report callback
   * @param {Function} callback - Callback function for reports
   */
  onReport(callback) {
    this.onReportCallback = callback;
  }

  /**
   * Get current metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get current warnings
   * @returns {Array} Current warnings
   */
  getWarnings() {
    return Array.from(this.warnings);
  }

  /**
   * Check if performance mode should be automatically enabled
   * @returns {boolean} True if performance mode should be enabled
   */
  shouldEnablePerformanceMode() {
    return (
      this.metrics.fps < PERFORMANCE_THRESHOLDS.MIN_FPS ||
      this.metrics.memoryUsage > WARNING_THRESHOLDS.MEMORY_USAGE_MB ||
      this.metrics.renderTime > PERFORMANCE_THRESHOLDS.MAX_RENDER_TIME_MS ||
      (this.deviceType === 'mobile' && this.metrics.stationCount > WARNING_THRESHOLDS.MOBILE_STATION_COUNT)
    );
  }

  /**
   * Reset all metrics and warnings
   */
  reset() {
    this.metrics = {
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      loadTime: 0,
      stationCount: 0,
      frameCount: 0
    };
    
    this.warnings.clear();
    this.frameCount = 0;
    this.startTime = Date.now();
    this.lastFrameTime = performance.now();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopMonitoring();
    this.onWarningCallback = null;
    this.onReportCallback = null;
  }
}