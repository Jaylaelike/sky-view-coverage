/**
 * Performance-related constants for the Sky View Coverage app
 */

// Mobile device marker limits
export const MOBILE_MARKER_LIMITS = {
  LOW_END: 20,
  STANDARD: 50,
  TABLET: 100
};

// Desktop marker limits
export const DESKTOP_MARKER_LIMITS = {
  STANDARD: 500,
  HIGH_END: 1000
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  MIN_FPS: 30,
  MAX_MEMORY_MB: 100,
  MAX_LOAD_TIME_MS: 3000,
  MAX_RENDER_TIME_MS: 16 // ~60 FPS
};

// Viewport culling settings
export const VIEWPORT_SETTINGS = {
  BUFFER_PERCENTAGE: 0.2, // 20% buffer around visible area
  UPDATE_DEBOUNCE_MS: 150,
  MIN_ZOOM_FOR_CULLING: 8
};

// Clustering configuration
export const CLUSTERING_CONFIG = {
  MAX_CLUSTER_RADIUS: 80,
  MIN_POINTS_TO_CLUSTER: 2,
  DISABLE_CLUSTERING_AT_ZOOM: 15,
  CLUSTER_ICON_SIZE: [40, 40]
};

// Progressive loading settings
export const PROGRESSIVE_LOADING = {
  INITIAL_BATCH_SIZE: 20,
  BATCH_SIZE: 10,
  LOAD_DELAY_MS: 100,
  MAX_CONCURRENT_LOADS: 3
};

// Performance monitoring intervals
export const MONITORING = {
  FPS_CHECK_INTERVAL_MS: 1000,
  MEMORY_CHECK_INTERVAL_MS: 5000,
  PERFORMANCE_REPORT_INTERVAL_MS: 30000
};

// Warning thresholds
export const WARNING_THRESHOLDS = {
  MOBILE_STATION_COUNT: 100,
  MEMORY_USAGE_MB: 80,
  LOW_FPS_THRESHOLD: 20
};

// Cache settings
export const CACHE_SETTINGS = {
  MAX_CACHED_IMAGES: 50,
  CACHE_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
  MAX_CACHE_SIZE_MB: 50
};

// Animation settings based on performance
export const ANIMATION_SETTINGS = {
  DISABLED: {
    duration: 0,
    easing: 'linear'
  },
  REDUCED: {
    duration: 200,
    easing: 'ease-out'
  },
  FULL: {
    duration: 500,
    easing: 'ease-in-out'
  }
};