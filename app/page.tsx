"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ImageIcon, MapPin, AlertCircle } from "lucide-react"
import MapComponent from "@/components/map-component"
import StationSelector from "@/components/station-selector"
import CoverageLegend from "@/components/coverage-legend"
import { stationData, getStationData } from "@/data/stations"
import type { ImageOverlayData, Station } from "@/types/map"

export default function HomePage() {
  const [overlayData, setOverlayData] = useState<ImageOverlayData | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load CSV data when component mounts
  useEffect(() => {
    const loadStations = async () => {
      try {
        setIsLoading(true)
        const csvStations = await getStationData()
        setStations(csvStations)
        console.log('Loaded stations from CSV:', csvStations)
      } catch (error) {
        console.error('Failed to load stations:', error)
        setError('Failed to load station data')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadStations()
  }, [])

  // Form state
  const [imageUrl, setImageUrl] = useState(
    "https://nr7t6rfqta.ufs.sh/f/VK654lgqwb6rs8cifq1FEr3YKvRVfXoLx2IZs87gMTPzA6ui",
  )
  const [swLat, setSwLat] = useState("7.263421835225775")
  const [swLng, setSwLng] = useState("95.87121093657444")
  const [neLat, setNeLat] = useState("13.78782685349949")
  const [neLng, setNeLng] = useState("102.5150760215263")
  const [opacity, setOpacity] = useState("0.6")

  const handleAddOverlay = () => {
    setError(null)

    // Validate inputs
    if (!imageUrl.trim()) {
      setError("Please enter an image URL")
      return
    }

    const swLatNum = Number.parseFloat(swLat)
    const swLngNum = Number.parseFloat(swLng)
    const neLatNum = Number.parseFloat(neLat)
    const neLngNum = Number.parseFloat(neLng)
    const opacityNum = Number.parseFloat(opacity)

    if (isNaN(swLatNum) || isNaN(swLngNum) || isNaN(neLatNum) || isNaN(neLngNum)) {
      setError("Please enter valid coordinates")
      return
    }

    if (isNaN(opacityNum) || opacityNum < 0 || opacityNum > 1) {
      setError("Opacity must be between 0 and 1")
      return
    }

    if (swLatNum >= neLatNum || swLngNum >= neLngNum) {
      setError("Southwest coordinates must be less than northeast coordinates")
      return
    }

    setIsLoading(true)

    // Simulate loading delay
    setTimeout(() => {
      const newOverlay: ImageOverlayData = {
        imageUrl: imageUrl.trim(),
        bounds: [
          [swLatNum, swLngNum], // Southwest
          [neLatNum, neLngNum], // Northeast
        ],
        opacity: opacityNum,
      }

      setOverlayData(newOverlay)
      setIsLoading(false)
    }, 500)
  }

  const clearOverlay = () => {
    setOverlayData(null)
    setError(null)
  }

  const handleStationChange = (updatedStations: Station[]) => {
    setStations(updatedStations)
  }

  const handleCompareStations = (stationIds: string[]) => {
    const updatedStations = stations.map((station) => ({
      ...station,
      visible: stationIds.includes(station.id),
    }))
    setStations(updatedStations)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">แผนที่ความครอบคลุมสัญญาณ</h1>
          <p className="text-muted-foreground">ระบบแสดงพื้นที่ครอบคลุมสัญญาณของสถานีส่งต่างๆ</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <StationSelector
              stations={stations}
              onStationChange={handleStationChange}
              onCompareStations={handleCompareStations}
            />
          
          </div>

          <div className="lg:col-span-3">
            <Card className="h-[600px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  แผนที่ความครอบคลุมสัญญาณ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-60px)] relative">
                <MapComponent stations={stations} overlayData={overlayData} isLoading={isLoading} />
                <CoverageLegend />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
