import { useState, useEffect, useCallback } from "react"
import { getStationData } from "@/data/stations"
import { getTechnicalData } from "@/data/technical"
import type { Station, TechnicalData } from "@/types/map"

interface UseMapDataReturn {
  stations: Station[]
  technicalData: TechnicalData[]
  isLoading: boolean
  isStationsLoading: boolean
  isTechnicalLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMapData(): UseMapDataReturn {
  const [stations, setStations] = useState<Station[]>([])
  const [technicalData, setTechnicalData] = useState<TechnicalData[]>([])
  const [isStationsLoading, setIsStationsLoading] = useState(true)
  const [isTechnicalLoading, setIsTechnicalLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setError(null)
    
    try {
      // Load both datasets in parallel for better performance
      const [stationsData, technicalDataResult] = await Promise.allSettled([
        getStationData(),
        getTechnicalData()
      ])

      // Handle stations data
      if (stationsData.status === 'fulfilled') {
        setStations(stationsData.value)
        console.log(`✅ Loaded ${stationsData.value.length} stations`)
      } else {
        console.error('❌ Failed to load stations:', stationsData.reason)
        setError('Failed to load station data')
      }
      setIsStationsLoading(false)

      // Handle technical data
      if (technicalDataResult.status === 'fulfilled') {
        setTechnicalData(technicalDataResult.value)
        console.log(`✅ Loaded ${technicalDataResult.value.length} technical data points`)
      } else {
        console.error('❌ Failed to load technical data:', technicalDataResult.reason)
        setError('Failed to load technical data')
      }
      setIsTechnicalLoading(false)

    } catch (error) {
      console.error('❌ Unexpected error loading map data:', error)
      setError('Failed to load map data')
      setIsStationsLoading(false)
      setIsTechnicalLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    stations,
    technicalData,
    isLoading: isStationsLoading || isTechnicalLoading,
    isStationsLoading,
    isTechnicalLoading,
    error,
    refetch: loadData
  }
}
