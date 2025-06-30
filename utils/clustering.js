/**
 * Clustering utilities for marker performance optimization
 */

import Supercluster from 'supercluster';
import { CLUSTERING_CONFIG } from '../constants/performance.js';

export class StationClusterer {
  constructor(options = {}) {
    this.cluster = new Supercluster({
      radius: options.radius || CLUSTERING_CONFIG.MAX_CLUSTER_RADIUS,
      maxZoom: options.maxZoom || CLUSTERING_CONFIG.DISABLE_CLUSTERING_AT_ZOOM,
      minPoints: options.minPoints || CLUSTERING_CONFIG.MIN_POINTS_TO_CLUSTER,
      extent: 512,
      nodeSize: 64,
      log: false,
      generateId: true,
      
      // Custom cluster properties
      reduce: (accumulated, props) => {
        accumulated.stationCount = (accumulated.stationCount || 0) + 1;
        accumulated.totalArea = (accumulated.totalArea || 0) + (props.area || 0);
        accumulated.stationNames = accumulated.stationNames || [];
        if (props.name && accumulated.stationNames.length < 3) {
          accumulated.stationNames.push(props.name);
        }
      },
      
      // Initial cluster properties
      initial: () => ({
        stationCount: 0,
        totalArea: 0,
        stationNames: []
      }),
      
      // Map station properties to GeoJSON properties
      map: (station) => ({
        id: station.id,
        name: station.name,
        visible: station.visible,
        area: this.calculateStationArea(station.bounds),
        imageUrl: station.imageUrl,
        compressedImageUrl: station.compressedImageUrl
      })
    });
    
    this.stations = [];
    this.currentZoom = 10;
  }

  /**
   * Calculate the area covered by a station's bounds
   * @param {Array} bounds - Station bounds [[lat1, lng1], [lat2, lng2]]
   * @returns {number} Area in square degrees
   */
  calculateStationArea(bounds) {
    if (!bounds || bounds.length !== 2) return 0;
    
    const [[lat1, lng1], [lat2, lng2]] = bounds;
    const latDiff = Math.abs(lat2 - lat1);
    const lngDiff = Math.abs(lng2 - lng1);
    
    return latDiff * lngDiff;
  }

  /**
   * Convert stations to GeoJSON points for clustering
   * @param {Array} stations - Array of station objects
   * @returns {Array} GeoJSON features
   */
  stationsToGeoJSON(stations) {
    return stations
      .filter(station => station.bounds && station.bounds.length === 2)
      .map(station => {
        const [[lat1, lng1], [lat2, lng2]] = station.bounds;
        const centerLat = (lat1 + lat2) / 2;
        const centerLng = (lng1 + lng2) / 2;
        
        return {
          type: 'Feature',
          properties: {
            id: station.id,
            name: station.name,
            visible: station.visible,
            area: this.calculateStationArea(station.bounds),
            imageUrl: station.imageUrl,
            compressedImageUrl: station.compressedImageUrl,
            bounds: station.bounds
          },
          geometry: {
            type: 'Point',
            coordinates: [centerLng, centerLat]
          }
        };
      });
  }

  /**
   * Load stations into the clusterer
   * @param {Array} stations - Array of station objects
   */
  loadStations(stations) {
    this.stations = stations;
    const geoJsonPoints = this.stationsToGeoJSON(
      stations.filter(station => station.visible)
    );
    
    this.cluster.load(geoJsonPoints);
    console.log(`Loaded ${geoJsonPoints.length} stations into clusterer`);
  }

  /**
   * Get clusters and points for current viewport
   * @param {Object} bounds - Map bounds {west, south, east, north}
   * @param {number} zoom - Current zoom level
   * @returns {Object} Object containing clusters and individual points
   */
  getClusters(bounds, zoom) {
    if (!bounds) return { clusters: [], points: [] };
    
    this.currentZoom = zoom;
    
    // Get all clusters/points in the bounding box
    const clusters = this.cluster.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom)
    );
    
    // Separate clusters from individual points
    const clusterData = {
      clusters: clusters.filter(f => f.properties.cluster),
      points: clusters.filter(f => !f.properties.cluster)
    };
    
    console.log(`Zoom ${zoom}: ${clusterData.clusters.length} clusters, ${clusterData.points.length} individual points`);
    
    return clusterData;
  }

  /**
   * Get all stations that belong to a specific cluster
   * @param {number} clusterId - Cluster ID
   * @returns {Array} Array of station features
   */
  getClusterStations(clusterId) {
    const stations = this.cluster.getLeaves(clusterId, Infinity);
    return stations;
  }

  /**
   * Create cluster marker HTML
   * @param {Object} cluster - Cluster feature
   * @returns {string} HTML string for cluster marker
   */
  createClusterMarkerHTML(cluster) {
    const count = cluster.properties.point_count;
    const stationNames = cluster.properties.stationNames || [];
    
    // Color based on cluster size
    let bgColor = '#3b82f6'; // blue
    let textColor = 'white';
    
    if (count >= 50) {
      bgColor = '#ef4444'; // red
    } else if (count >= 20) {
      bgColor = '#f97316'; // orange
    } else if (count >= 10) {
      bgColor = '#eab308'; // yellow
      textColor = 'black';
    }
    
    return `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        border: 3px solid white;
        border-radius: 50%;
        width: ${Math.min(60, 30 + Math.sqrt(count) * 2)}px;
        height: ${Math.min(60, 30 + Math.sqrt(count) * 2)}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${count >= 100 ? '11px' : '13px'};
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        position: relative;
        z-index: 1000;
      ">
        ${count}
        <div style="
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          display: none;
          z-index: 1001;
        " class="cluster-tooltip">
          ${stationNames.slice(0, 2).join(', ')}${stationNames.length > 2 ? '...' : ''}
        </div>
      </div>
      <style>
        .cluster-marker:hover .cluster-tooltip {
          display: block !important;
        }
      </style>
    `;
  }

  /**
   * Create individual station marker HTML
   * @param {Object} station - Station feature
   * @returns {string} HTML string for station marker
   */
  createStationMarkerHTML(station) {
    return `
      <div style="
        background-color: #10b981;
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        S
      </div>
    `;
  }

  /**
   * Check if clustering should be enabled at current zoom level
   * @param {number} zoom - Current zoom level
   * @returns {boolean} True if clustering should be enabled
   */
  shouldCluster(zoom) {
    return zoom < CLUSTERING_CONFIG.DISABLE_CLUSTERING_AT_ZOOM;
  }

  /**
   * Get clustering statistics
   * @returns {Object} Clustering statistics
   */
  getStats() {
    return {
      totalStations: this.stations.length,
      visibleStations: this.stations.filter(s => s.visible).length,
      currentZoom: this.currentZoom,
      clusteringEnabled: this.shouldCluster(this.currentZoom),
      clusterRadius: CLUSTERING_CONFIG.MAX_CLUSTER_RADIUS,
      minClusterSize: CLUSTERING_CONFIG.MIN_POINTS_TO_CLUSTER
    };
  }

  /**
   * Update clustering configuration
   * @param {Object} config - New configuration options
   */
  updateConfig(config) {
    // Create new clusterer with updated config
    const newOptions = {
      radius: config.radius || CLUSTERING_CONFIG.MAX_CLUSTER_RADIUS,
      maxZoom: config.maxZoom || CLUSTERING_CONFIG.DISABLE_CLUSTERING_AT_ZOOM,
      minPoints: config.minPoints || CLUSTERING_CONFIG.MIN_POINTS_TO_CLUSTER
    };
    
    const oldStations = this.stations;
    this.cluster = new Supercluster(newOptions);
    
    if (oldStations.length > 0) {
      this.loadStations(oldStations);
    }
    
    console.log('Clustering configuration updated:', newOptions);
  }

  /**
   * Clear all loaded data
   */
  clear() {
    this.stations = [];
    this.cluster.load([]);
  }
}