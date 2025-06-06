export interface KMZData {
  name?: string
  description?: string
  type: "Point" | "LineString" | "Polygon"
  coordinates: number[] | number[][]
}

export interface ImageOverlayData {
  imageUrl: string
  bounds: [[number, number], [number, number]] // [[swLat, swLng], [neLat, neLng]]
  opacity: number
}

export interface Station {
  id: string
  name: string
  bounds: [[number, number], [number, number]] // [[swLat, swLng], [neLat, neLng]]
  imageUrl: string
  visible: boolean
}

export interface TechnicalData {
  id: string
  responsibleEntity: string
  stationNameEng: string
  stationNameThai: string
  address: string
  owner: string
  engineeringCenter: string
  stationType: string
  longitude: number
  latitude: number
  height: number
  hrp: string
  location: string
  antType1: string
  antType2: string
  beamTilt: string
  feederLoss: number
  antBrand: string
  maxERP: number
}

export interface CoverageLevel {
  level: string
  color: string
  description: string
}
