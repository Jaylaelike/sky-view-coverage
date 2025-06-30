# Sky View Coverage - Mobile Performance Optimization Guide

## Project Overview
Sky View Coverage is a map overlay application that displays coverage stations. The app crashes on mobile devices when users select all coverage stations from the hamburger menu due to memory overload and rendering performance issues.

## Critical Issue
**Problem**: App crashes on mobile when selecting all coverage stations
**Root Cause**: Too many map overlays cause memory exhaustion and rendering bottlenecks on mobile devices

## Required Fixes

### 1. Implement Viewport Culling
Only render stations that are visible in the current map viewport to reduce memory usage.

**Implementation**:
- Add viewport bounds checking before rendering markers
- Remove off-screen markers from the map
- Re-render markers when map moves or zooms

### 2. Add Marker Clustering
Group nearby stations into clusters to reduce the number of rendered elements.

**Requirements**:
- Use a clustering library (e.g., `supercluster` or native map clustering)
- Clusters should expand on zoom
- Show count badges on clusters

### 3. Mobile Detection and Limits
Implement device-specific limits for performance optimization.

**Implementation**:
```javascript
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const MAX_VISIBLE_MARKERS = isMobile ? 50 : 500;
```

### 4. Progressive Loading
Load stations in batches to prevent UI freezing.

**Features**:
- Initial load: nearest 20 stations
- Load more as user zooms/pans
- Show loading indicator

### 5. Performance Mode Toggle
Add a setting for users to enable performance mode on mobile.

**Features**:
- Reduce marker complexity
- Disable animations
- Limit concurrent overlays

## Code Structure Requirements

### Station Manager Class
Create a `StationManager` class to handle:
- Station data storage
- Viewport filtering
- Clustering logic
- Progressive loading

### Performance Monitor
Add performance monitoring:
- Track render times
- Monitor memory usage
- Auto-enable performance mode if needed

### UI Updates
- Add warning dialog when selecting all stations on mobile
- Show station count in UI
- Add performance mode toggle in settings

## Testing Requirements

### Mobile Testing
- Test on low-end Android devices (2GB RAM)
- Test with 100+ stations selected
- Verify smooth pan/zoom operations
- Ensure no crashes occur

### Performance Metrics
- Map interaction should remain above 30 FPS
- Initial load time < 3 seconds
- Memory usage < 100MB for mobile

## Implementation Priority

1. **Immediate** (Prevents crashes):
   - Viewport culling
   - Mobile marker limits
   - Basic performance mode

2. **Important** (Improves UX):
   - Marker clustering
   - Progressive loading
   - Performance monitoring

3. **Enhancement** (Better experience):
   - Advanced clustering algorithms
   - Caching mechanisms
   - Offline support

## File Structure Expected

```
src/
├── components/
│   ├── Map/
│   │   ├── Map.jsx
│   │   ├── StationManager.js
│   │   └── PerformanceMonitor.js
│   ├── Settings/
│   │   └── PerformanceSettings.jsx
│   └── UI/
│       └── StationSelector.jsx
├── utils/
│   ├── deviceDetection.js
│   ├── mapHelpers.js
│   └── clustering.js
└── constants/
    └── performance.js
```

## Key Considerations

1. **Memory Management**:
   - Properly dispose of markers when removed
   - Use object pooling for marker instances
   - Clear references to prevent memory leaks

2. **Rendering Optimization**:
   - Debounce map movement events
   - Use requestAnimationFrame for updates
   - Batch DOM operations

3. **User Experience**:
   - Maintain responsiveness during loading
   - Provide clear feedback on limitations
   - Allow manual override with warnings

## API Compatibility
Ensure compatibility with:
- Google Maps API
- Mapbox GL JS
- Leaflet

## Success Criteria
- No crashes on mobile devices with 100+ stations
- Smooth map interaction (30+ FPS)
- Memory usage under control (< 100MB)
- Load time under 3 seconds

## Additional Notes
- Consider using Web Workers for heavy computations
- Implement lazy loading for station details
- Add telemetry to track performance issues in production