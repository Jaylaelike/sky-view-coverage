/**
 * Device detection utilities for performance optimization
 */

/**
 * Detect if the device is mobile
 * @returns {boolean} True if mobile device
 */
export const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Detect if the device is low-end based on hardware specs
 * @returns {boolean} True if low-end device
 */
export const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 4;
  return cores <= 4 || memory <= 2;
};

/**
 * Get device type classification
 * @returns {'mobile'|'tablet'|'desktop'} Device type
 */
export const getDeviceType = () => {
  if (typeof navigator === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent;
  
  if (/iPad|Android.*(?!Mobile)|Tablet/i.test(userAgent)) {
    return 'tablet';
  }
  
  if (/Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
};

/**
 * Get performance tier based on device capabilities
 * @returns {'high'|'medium'|'low'} Performance tier
 */
export const getPerformanceTier = () => {
  if (typeof navigator === 'undefined') return 'high';
  
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 4;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  // Check for low-end indicators
  if (cores <= 2 || memory <= 1) return 'low';
  if (cores <= 4 || memory <= 2) return 'medium';
  
  // Check connection speed
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'low';
    if (effectiveType === '3g') return 'medium';
  }
  
  return 'high';
};

/**
 * Check if device supports Web Workers
 * @returns {boolean} True if Web Workers supported
 */
export const supportsWebWorkers = () => {
  return typeof Worker !== 'undefined';
};

/**
 * Get recommended settings based on device capabilities
 * @returns {Object} Recommended performance settings
 */
export const getRecommendedSettings = () => {
  const deviceType = getDeviceType();
  const performanceTier = getPerformanceTier();
  const mobile = isMobile();
  
  return {
    maxVisibleMarkers: mobile ? (performanceTier === 'low' ? 20 : 50) : 500,
    enableClustering: mobile || performanceTier !== 'high',
    enableProgressiveLoading: mobile || performanceTier === 'low',
    enableAnimations: performanceTier !== 'low',
    compressionQuality: performanceTier === 'low' ? 0.3 : 0.5,
    maxZoomLevel: mobile ? 16 : 18,
    tileLoadTimeout: performanceTier === 'low' ? 5000 : 10000,
    preferCanvas: true,
    debounceDelay: performanceTier === 'low' ? 300 : 150
  };
};