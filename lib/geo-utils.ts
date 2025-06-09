// Utility functions for geographic calculations

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface StationDistance {
  station: any
  distance: number
  bearing: number
  direction: string
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude)
  const dLon = toRadians(point2.longitude - point1.longitude)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate the bearing (compass direction) from point1 to point2
 * @param point1 Starting point
 * @param point2 End point
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(point1: Coordinates, point2: Coordinates): number {
  const dLon = toRadians(point2.longitude - point1.longitude)
  const lat1 = toRadians(point1.latitude)
  const lat2 = toRadians(point2.latitude)
  
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  
  const bearing = toDegrees(Math.atan2(y, x))
  return (bearing + 360) % 360 // Normalize to 0-360
}

/**
 * Convert bearing degrees to compass direction
 * @param bearing Bearing in degrees
 * @returns Compass direction string
 */
export function bearingToDirection(bearing: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ]
  
  const index = Math.round(bearing / 22.5) % 16
  return directions[index]
}

/**
 * Get detailed direction description
 * @param bearing Bearing in degrees
 * @returns Detailed direction description
 */
export function getDetailedDirection(bearing: number): string {
  const direction = bearingToDirection(bearing)
  return `${direction} (${Math.round(bearing)}°)`
}

/**
 * Find nearest stations to a given point
 * @param userLocation User's current location
 * @param stations Array of stations with coordinates
 * @param technicalData Array of technical data points
 * @param limit Maximum number of results to return
 * @returns Array of nearest stations with distance and bearing info
 */
export function findNearestStations(
  userLocation: Coordinates,
  stations: any[],
  technicalData: any[],
  limit: number = 5
): StationDistance[] {
  const allPoints: StationDistance[] = []
  
  // Process stations
  stations.forEach(station => {
    if (station.bounds && station.bounds.length >= 2) {
      // Use center of station bounds
      const centerLat = (station.bounds[0][0] + station.bounds[1][0]) / 2
      const centerLng = (station.bounds[0][1] + station.bounds[1][1]) / 2
      
      const distance = calculateDistance(userLocation, { latitude: centerLat, longitude: centerLng })
      const bearing = calculateBearing(userLocation, { latitude: centerLat, longitude: centerLng })
      const direction = getDetailedDirection(bearing)
      
      allPoints.push({
        station: { ...station, type: 'coverage', latitude: centerLat, longitude: centerLng },
        distance,
        bearing,
        direction
      })
    }
  })
  
  // Process technical data points
  technicalData.forEach(tech => {
    if (tech.latitude && tech.longitude && tech.latitude !== 0 && tech.longitude !== 0) {
      const distance = calculateDistance(userLocation, { latitude: tech.latitude, longitude: tech.longitude })
      const bearing = calculateBearing(userLocation, { latitude: tech.latitude, longitude: tech.longitude })
      const direction = getDetailedDirection(bearing)
      
      allPoints.push({
        station: { ...tech, type: 'technical' },
        distance,
        bearing,
        direction
      })
    }
  })
  
  // Sort by distance and return top results
  return allPoints
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}

/**
 * Calculate accessibility score for a station based on distance and other factors
 * @param station Station data
 * @param distance Distance in kilometers
 * @returns Accessibility score (0-100)
 */
export function calculateAccessibilityScore(station: any, distance: number): number {
  let score = 100
  
  // Distance penalty (closer is better)
  if (distance > 50) score -= 50
  else if (distance > 20) score -= 30
  else if (distance > 10) score -= 15
  else if (distance > 5) score -= 5
  
  // Station type bonus
  if (station.type === 'technical') {
    score += 10 // Technical stations get bonus for specific data
  }
  
  // Height/power bonus for technical stations
  if (station.height > 100) score += 5
  if (station.maxERP > 1000) score += 5
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Enhanced distance formatting with more precision
 * @param distance Distance in kilometers
 * @returns Formatted distance string with appropriate units
 */
export function formatDistanceDetailed(distance: number): string {
  if (distance < 0.1) {
    return `${Math.round(distance * 1000)}m`
  } else if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  } else if (distance < 10) {
    return `${distance.toFixed(2)}km`
  } else if (distance < 100) {
    return `${distance.toFixed(1)}km`
  } else {
    return `${Math.round(distance)}km`
  }
}

/**
 * Format distance for display (simple version)
 * @param distance Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`
  } else {
    return `${Math.round(distance)}km`
  }
}

/**
 * Get compass direction with Thai translation
 * @param bearing Bearing in degrees
 * @returns Object with English and Thai direction
 */
export function getCompassDirection(bearing: number): { en: string; th: string; bearing: number } {
  const directions = [
    { en: 'N', th: 'เหนือ' },
    { en: 'NNE', th: 'เหนือ-ตอ.เฉียงเหนือ' },
    { en: 'NE', th: 'ตะวันออกเฉียงเหนือ' },
    { en: 'ENE', th: 'ตอ.-ตอ.เฉียงเหนือ' },
    { en: 'E', th: 'ตะวันออก' },
    { en: 'ESE', th: 'ตอ.-ตอ.เฉียงใต้' },
    { en: 'SE', th: 'ตะวันออกเฉียงใต้' },
    { en: 'SSE', th: 'ใต้-ตอ.เฉียงใต้' },
    { en: 'S', th: 'ใต้' },
    { en: 'SSW', th: 'ใต้-ตต.เฉียงใต้' },
    { en: 'SW', th: 'ตะวันตกเฉียงใต้' },
    { en: 'WSW', th: 'ตต.-ตต.เฉียงใต้' },
    { en: 'W', th: 'ตะวันตก' },
    { en: 'WNW', th: 'ตต.-ตต.เฉียงเหนือ' },
    { en: 'NW', th: 'ตะวันตกเฉียงเหนือ' },
    { en: 'NNW', th: 'เหนือ-ตต.เฉียงเหนือ' }
  ]
  
  const index = Math.round(bearing / 22.5) % 16
  return {
    ...directions[index],
    bearing: Math.round(bearing)
  }
}

// Helper functions
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}
