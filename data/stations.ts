import Papa from 'papaparse'
import type { Station } from "@/types/map"

// Parse XML-like coordinates string to bounds array
function parseCoordinates(coordStr: string): [[number, number], [number, number]] {
  const northMatch = coordStr.match(/<north>([^<]+)<\/north>/)
  const southMatch = coordStr.match(/<south>([^<]+)<\/south>/)
  const eastMatch = coordStr.match(/<east>([^<]+)<\/east>/)
  const westMatch = coordStr.match(/<west>([^<]+)<\/west>/)

  if (!northMatch || !southMatch || !eastMatch || !westMatch) {
    throw new Error("Invalid coordinate format")
  }

  const north = Number.parseFloat(northMatch[1])
  const south = Number.parseFloat(southMatch[1])
  const east = Number.parseFloat(eastMatch[1])
  const west = Number.parseFloat(westMatch[1])

  return [
    [south, west], // Southwest
    [north, east], // Northeast
  ]
}

// Function to create station ID from Thai name
function createStationId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

// Load stations from CSV file
async function loadStationsFromCSV(): Promise<Station[]> {
  const response = await fetch('/data/station_cord.csv')
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`)
  }
  const csvText = await response.text()
  
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const stations: Station[] = results.data.map((row: any) => {
    // Handle both old and new CSV structure
    const stationId = row.id // New structure has ID column
    const stationName = row.staion || row.station // Handle potential typo in CSV header
    const coordinates = row.coord
    const imageUrl = row.url

    // Validate required fields
    if (!stationName || !coordinates) {
      console.warn('Skipping row with missing required fields:', row)
      return null
    }

    return {
      id: stationId ? String(stationId) : createStationId(stationName),
      name: stationName,
      bounds: parseCoordinates(coordinates),
      imageUrl: imageUrl || '',
      visible: false,
    }
  }).filter(Boolean) as Station[] // Remove null entries

  return stations
}

// Cache for loaded station data
let cachedStationData: Station[] | null = null

// Function to get station data (only from CSV)
export async function getStationData(): Promise<Station[]> {
  // If we already have cached data, return it
  if (cachedStationData) {
    return cachedStationData
  }
  
  // Load from CSV only
  cachedStationData = await loadStationsFromCSV()
  return cachedStationData
}

// Export empty array as fallback for initial state
export const stationData: Station[] = []

