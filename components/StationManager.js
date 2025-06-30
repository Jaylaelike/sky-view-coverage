/**
 * Station Manager - Handles station data, viewport culling, and performance optimization
 */

import { MOBILE_MARKER_LIMITS, DESKTOP_MARKER_LIMITS, VIEWPORT_SETTINGS, PROGRESSIVE_LOADING, CLUSTERING_CONFIG } from '../constants/performance.js';
import { getDeviceType, getPerformanceTier, getRecommendedSettings } from '../utils/deviceDetection.js';
import { StationClusterer } from '../utils/clustering.js';

export class StationManager {
  constructor(mapInstance) {
    this.map = mapInstance;
    this.stations = [];
    this.visibleStations = new Set();
    this.renderedStations = new Set();
    this.overlayRefs = new Map();
    this.clusterMarkerRefs = new Map();
    this.loadingQueue = [];
    this.isProcessing = false;
    
    // Performance settings
    this.settings = getRecommendedSettings();
    this.deviceType = getDeviceType();
    this.performanceTier = getPerformanceTier();
    
    // Clustering
    this.clusterer = new StationClusterer();
    this.clusteringEnabled = this.settings.enableClustering;
    this.currentZoom = 10;
    
    // Viewport tracking
    this.currentBounds = null;
    this.updateTimer = null;
    
    // Bind methods
    this.onMapMove = this.onMapMove.bind(this);
    this.onMapZoom = this.onMapZoom.bind(this);
    this.onClusterClick = this.onClusterClick.bind(this);
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup map event listeners for viewport tracking
   */
  setupEventListeners() {
    if (!this.map) return;
    
    this.map.on('moveend', this.onMapMove);
    this.map.on('zoomend', this.onMapZoom);
    this.map.on('resize', this.onMapMove);
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    if (this.map) {
      this.map.off('moveend', this.onMapMove);
      this.map.off('zoomend', this.onMapZoom);
      this.map.off('resize', this.onMapMove);
    }
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    this.clearAllMarkers();
    this.clusterer.clear();
  }

  /**
   * Handle map movement events
   */
  onMapMove() {
    this.debouncedUpdate();
  }

  /**
   * Handle map zoom events
   */
  onMapZoom() {
    this.currentZoom = this.map.getZoom();
    this.debouncedUpdate();
  }

  /**
   * Debounced update to prevent excessive calls during map interaction
   */
  debouncedUpdate() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    this.updateTimer = setTimeout(() => {
      this.updateVisibleStations();
    }, this.settings.debounceDelay);
  }

  /**
   * Set stations data
   * @param {Array} stations - Array of station objects
   */
  setStations(stations) {
    this.stations = stations;
    
    // Load stations into clusterer if clustering is enabled
    if (this.clusteringEnabled) {
      this.clusterer.loadStations(stations);
    }
    
    this.updateVisibleStations();
  }

  /**
   * Get current map bounds with buffer
   * @returns {Object|null} Bounds object with buffer
   */
  getCurrentBounds() {
    if (!this.map) return null;
    
    const bounds = this.map.getBounds();
    const buffer = VIEWPORT_SETTINGS.BUFFER_PERCENTAGE;
    
    const latDiff = bounds.getNorth() - bounds.getSouth();
    const lngDiff = bounds.getEast() - bounds.getWest();
    
    return {
      north: bounds.getNorth() + (latDiff * buffer),
      south: bounds.getSouth() - (latDiff * buffer),
      east: bounds.getEast() + (lngDiff * buffer),
      west: bounds.getWest() - (lngDiff * buffer)
    };
  }

  /**
   * Check if a station is within the viewport bounds
   * @param {Object} station - Station object
   * @param {Object} bounds - Bounds object
   * @returns {boolean} True if station is within bounds
   */
  isStationInBounds(station, bounds) {
    if (!station.bounds || !bounds) return false;
    
    const [[lat1, lng1], [lat2, lng2]] = station.bounds;
    const centerLat = (lat1 + lat2) / 2;
    const centerLng = (lng1 + lng2) / 2;
    
    return (
      centerLat >= bounds.south &&
      centerLat <= bounds.north &&
      centerLng >= bounds.west &&
      centerLng <= bounds.east
    );
  }

  /**
   * Update visible stations based on viewport and performance limits
   */
  updateVisibleStations() {
    const bounds = this.getCurrentBounds();
    if (!bounds) return;
    
    this.currentBounds = bounds;
    this.currentZoom = this.map.getZoom();
    
    // Clear existing markers
    this.clearAllMarkers();
    
    if (this.clusteringEnabled && this.clusterer.shouldCluster(this.currentZoom)) {
      // Use clustering
      this.updateClusters(bounds);
    } else {
      // Use individual station rendering
      this.updateIndividualStations(bounds);
    }
  }
  
  /**
   * Update clusters for current viewport
   * @param {Object} bounds - Viewport bounds
   */
  updateClusters(bounds) {
    const clusterData = this.clusterer.getClusters(bounds, this.currentZoom);
    
    // Render clusters
    this.renderClusters(clusterData.clusters);
    
    // Render individual points (stations not in clusters)
    this.renderIndividualPoints(clusterData.points);
    
    console.log(`Clustering: ${clusterData.clusters.length} clusters, ${clusterData.points.length} individual stations`);
  }
  
  /**
   * Update individual stations (non-clustered)
   * @param {Object} bounds - Viewport bounds
   */
  updateIndividualStations(bounds) {
    // Filter stations that are both visible and in viewport
    const candidateStations = this.stations.filter(station => 
      station.visible && this.isStationInBounds(station, bounds)
    );
    
    // Apply performance limits
    const maxStations = this.getMaxVisibleStations();
    const stationsToShow = this.prioritizeStations(candidateStations, maxStations);
    
    // Update visible stations set
    const newVisibleStations = new Set(stationsToShow.map(s => s.id));
    
    // Handle station additions and removals
    this.handleStationUpdates(newVisibleStations);
    
    console.log(`Individual stations: ${stationsToShow.length}/${candidateStations.length} stations visible (limit: ${maxStations})`);
  }

  /**
   * Get maximum number of visible stations based on device capabilities
   * @returns {number} Maximum number of stations
   */
  getMaxVisibleStations() {
    const mobile = this.deviceType === 'mobile';
    const tablet = this.deviceType === 'tablet';
    
    if (mobile) {
      return this.performanceTier === 'low' 
        ? MOBILE_MARKER_LIMITS.LOW_END 
        : MOBILE_MARKER_LIMITS.STANDARD;
    }
    
    if (tablet) {
      return MOBILE_MARKER_LIMITS.TABLET;
    }
    
    return DESKTOP_MARKER_LIMITS.STANDARD;
  }

  /**
   * Prioritize stations based on distance to viewport center and other factors
   * @param {Array} stations - Candidate stations
   * @param {number} maxCount - Maximum number of stations
   * @returns {Array} Prioritized stations
   */
  prioritizeStations(stations, maxCount) {
    if (stations.length <= maxCount) return stations;
    
    const bounds = this.currentBounds;
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    
    // Calculate distance from viewport center for each station
    const stationsWithDistance = stations.map(station => {
      const [[lat1, lng1], [lat2, lng2]] = station.bounds;
      const stationLat = (lat1 + lat2) / 2;
      const stationLng = (lng1 + lng2) / 2;
      
      const distance = Math.sqrt(
        Math.pow(stationLat - centerLat, 2) + 
        Math.pow(stationLng - centerLng, 2)
      );
      
      return { ...station, distanceFromCenter: distance };
    });
    
    // Sort by distance (closest first) and return top maxCount
    return stationsWithDistance
      .sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
      .slice(0, maxCount);
  }

  /**
   * Handle station visibility updates
   * @param {Set} newVisibleStations - Set of station IDs that should be visible
   */
  handleStationUpdates(newVisibleStations) {
    // Remove stations that are no longer visible
    for (const stationId of this.renderedStations) {
      if (!newVisibleStations.has(stationId)) {
        this.removeStationOverlay(stationId);
      }
    }
    
    // Add new stations that should be visible
    for (const stationId of newVisibleStations) {
      if (!this.renderedStations.has(stationId)) {
        const station = this.stations.find(s => s.id === stationId);
        if (station) {
          this.addStationToQueue(station);
        }
      }
    }
    
    // Process loading queue if not already processing
    if (!this.isProcessing && this.loadingQueue.length > 0) {
      this.processLoadingQueue();
    }
  }

  /**
   * Add station to loading queue for progressive loading
   * @param {Object} station - Station object
   */
  addStationToQueue(station) {
    this.loadingQueue.push(station);
  }

  /**
   * Process loading queue with progressive loading
   */
  async processLoadingQueue() {
    if (this.isProcessing || this.loadingQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.loadingQueue.length > 0) {
        const batch = this.loadingQueue.splice(0, PROGRESSIVE_LOADING.BATCH_SIZE);
        
        // Process batch concurrently
        const promises = batch.map(station => this.addStationOverlay(station));
        await Promise.allSettled(promises);
        
        // Small delay between batches to prevent UI blocking
        if (this.loadingQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, PROGRESSIVE_LOADING.LOAD_DELAY_MS));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Add station overlay to map
   * @param {Object} station - Station object
   */
  async addStationOverlay(station) {
    if (!station.imageUrl || this.renderedStations.has(station.id)) return;
    
    try {
      const L = await import('leaflet');
      
      // Use compressed image if available
      let imageUrl = station.imageUrl;
      if (station.compressedImageUrl) {
        imageUrl = station.compressedImageUrl;
      }
      
      const imageOverlay = L.imageOverlay(imageUrl, station.bounds, {
        opacity: 0.6,
        interactive: false,
        crossOrigin: 'anonymous',
        className: `station-overlay-${station.id}`,
        pane: 'overlayPane',
        bubblingMouseEvents: false
      });
      
      imageOverlay.on('load', () => {
        console.log(`Overlay loaded: ${station.name}`);
      });
      
      imageOverlay.on('error', (e) => {
        console.error(`Failed to load overlay for ${station.name}:`, e);
        this.removeStationOverlay(station.id);
      });
      
      imageOverlay.addTo(this.map);
      this.overlayRefs.set(station.id, imageOverlay);
      this.renderedStations.add(station.id);
      
    } catch (error) {
      console.error(`Error adding overlay for ${station.name}:`, error);
    }
  }

  /**
   * Remove station overlay from map
   * @param {string} stationId - Station ID
   */
  removeStationOverlay(stationId) {
    const overlay = this.overlayRefs.get(stationId);
    if (overlay) {
      this.map.removeLayer(overlay);
      this.overlayRefs.delete(stationId);
    }
    this.renderedStations.delete(stationId);
  }

  /**
   * Clear all overlays from map
   */
  clearAllOverlays() {
    for (const [stationId, overlay] of this.overlayRefs) {
      this.map.removeLayer(overlay);
    }
    this.overlayRefs.clear();
    this.renderedStations.clear();
    this.loadingQueue = [];
  }
  
  /**
   * Clear all markers (overlays and clusters) from map
   */
  clearAllMarkers() {
    // Clear station overlays
    this.clearAllOverlays();
    
    // Clear cluster markers
    for (const [clusterId, marker] of this.clusterMarkerRefs) {
      this.map.removeLayer(marker);
    }
    this.clusterMarkerRefs.clear();
  }
  
  /**
   * Render cluster markers
   * @param {Array} clusters - Array of cluster features
   */
  async renderClusters(clusters) {
    const L = await import('leaflet');
    
    for (const cluster of clusters) {
      const [lng, lat] = cluster.geometry.coordinates;
      const clusterId = cluster.properties.cluster_id;
      
      const clusterIcon = L.divIcon({
        className: 'cluster-marker',
        html: this.clusterer.createClusterMarkerHTML(cluster),
        iconSize: CLUSTERING_CONFIG.CLUSTER_ICON_SIZE,
        iconAnchor: [CLUSTERING_CONFIG.CLUSTER_ICON_SIZE[0] / 2, CLUSTERING_CONFIG.CLUSTER_ICON_SIZE[1] / 2]
      });
      
      const marker = L.marker([lat, lng], {
        icon: clusterIcon,
        title: `${cluster.properties.point_count} stations`
      }).addTo(this.map);
      
      marker.on('click', () => this.onClusterClick(clusterId));
      
      this.clusterMarkerRefs.set(clusterId, marker);
    }
  }
  
  /**
   * Render individual station points (from clustering)
   * @param {Array} points - Array of individual station features
   */
  async renderIndividualPoints(points) {
    for (const point of points) {
      const station = this.stations.find(s => s.id === point.properties.id);
      if (station) {
        await this.addStationOverlay(station);
      }
    }
  }
  
  /**
   * Handle cluster click event
   * @param {number} clusterId - ID of clicked cluster
   */
  onClusterClick(clusterId) {
    // Get cluster expansion zoom
    const expansionZoom = this.clusterer.cluster.getClusterExpansionZoom(clusterId);
    
    // Get cluster center
    const clusterMarker = this.clusterMarkerRefs.get(clusterId);
    if (clusterMarker) {
      const latlng = clusterMarker.getLatLng();
      
      // Zoom to expansion level
      this.map.flyTo(latlng, Math.min(expansionZoom, this.map.getMaxZoom()), {
        duration: 0.5
      });
    }
  }

  /**
   * Force update all visible stations (used when station visibility changes)
   */
  forceUpdate() {
    this.clearAllMarkers();
    
    // Reload stations into clusterer if clustering is enabled
    if (this.clusteringEnabled) {
      this.clusterer.loadStations(this.stations);
    }
    
    this.updateVisibleStations();
  }
  
  /**
   * Enable or disable clustering
   * @param {boolean} enabled - Whether to enable clustering
   */
  setClusteringEnabled(enabled) {
    this.clusteringEnabled = enabled;
    
    if (enabled) {
      this.clusterer.loadStations(this.stations);
    } else {
      this.clusterer.clear();
    }
    
    this.forceUpdate();
    console.log(`Clustering ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    const clusterStats = this.clusteringEnabled ? this.clusterer.getStats() : null;
    
    return {
      totalStations: this.stations.length,
      visibleStations: this.visibleStations.size,
      renderedStations: this.renderedStations.size,
      renderedClusters: this.clusterMarkerRefs.size,
      queuedStations: this.loadingQueue.length,
      deviceType: this.deviceType,
      performanceTier: this.performanceTier,
      maxVisibleStations: this.getMaxVisibleStations(),
      clusteringEnabled: this.clusteringEnabled,
      currentZoom: this.currentZoom,
      clustering: clusterStats,
      settings: this.settings
    };
  }

  /**
   * Check if performance mode should be enabled
   * @returns {boolean} True if performance mode should be enabled
   */
  shouldEnablePerformanceMode() {
    const stats = this.getPerformanceStats();
    return (
      this.deviceType === 'mobile' ||
      this.performanceTier === 'low' ||
      stats.totalStations > 100
    );
  }
}