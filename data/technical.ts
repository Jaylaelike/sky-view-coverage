import Papa from 'papaparse'
import type { TechnicalData } from "@/types/map"

// Load technical data from CSV file
async function loadTechnicalDataFromCSV(): Promise<TechnicalData[]> {
  const response = await fetch('/data/technical_data.csv')
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`)
  }
  const csvText = await response.text()
  
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const technicalData: TechnicalData[] = results.data.map((row: any) => {
    // Validate required fields
    const stationName = row['ชื่อสถานี'] || row.stationNameThai || ''
    const longitude = parseFloat(row['Long'] || row.longitude || '0')
    const latitude = parseFloat(row['Lat'] || row.latitude || '0')
    
    return {
      id: row['ลำดับ'] || row.id || '',
      responsibleEntity: row['ผู้รับผิดชอบ Facility'] || row.responsibleEntity || '',
      stationNameEng: row['ชื่อสถานี (ENG)'] || row.stationNameEng || '',
      stationNameThai: stationName,
      address: row['ที่อยู่'] || row.address || '',
      owner: row['เจ้าของสถานที่'] || row.owner || '',
      engineeringCenter: row['ศูนย์วิศวกรรม'] || row.engineeringCenter || '',
      stationType: row['ประเภทสถานี'] || row.stationType || '',
      longitude: longitude,
      latitude: latitude,
      height: parseFloat(row['ht(m)'] || row.height || '0'),
      hrp: row['HRP'] || row.hrp || '',
      location: row['ที่ตั้งสถานี'] || row.location || '',
      antType1: row['Ant. Type 1'] || row.antType1 || '',
      antType2: row['Ant. Type 2'] || row.antType2 || '',
      beamTilt: row['Beam Tilt'] || row.beamTilt || '',
      feederLoss: parseFloat(row['Main Feeder Loss\n(dB)'] || row.feederLoss || '0'),
      antBrand: row['Ant. Brand'] || row.antBrand || '',
      maxERP: parseFloat(row[' Max ERP (kW)'] || row.maxERP || '0'),
    }
  }).filter((data: TechnicalData) => {
    // Filter out entries with invalid coordinates
    return data.latitude !== 0 && data.longitude !== 0 && data.stationNameThai
  })

  console.log(`Loaded ${technicalData.length} valid technical data entries`)
  return technicalData
}

// Cache for loaded technical data
let cachedTechnicalData: TechnicalData[] | null = null

// Function to get technical data (only from CSV)
export async function getTechnicalData(): Promise<TechnicalData[]> {
  // If we already have cached data, return it
  if (cachedTechnicalData) {
    return cachedTechnicalData
  }
  
  // Load from CSV only
  cachedTechnicalData = await loadTechnicalDataFromCSV()
  return cachedTechnicalData
}

// Export empty array as fallback for initial state
export const technicalData: TechnicalData[] = []
