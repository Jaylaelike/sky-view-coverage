"use client"

import { useEffect, useRef, useState } from "react"
import type { Station, TechnicalData } from "@/types/map"
import { technicalData, getTechnicalData } from "@/data/technical"
import TechnicalModal from "@/components/technical-modal" // Assuming TechnicalModal is defined elsewhere
import CoverageLegend from "@/components/coverage-legend"

interface LeafletMapProps {
  stations: Station[]
}

export default function LeafletMap({ stations }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlayRefs = useRef<Record<string, any>>({})
  const markerRefs = useRef<Record<string, any>>({})
  const technicalMarkerRefs = useRef<Record<string, any>>({})
  const [isMapReady, setIsMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTechnical, setSelectedTechnical] = useState<TechnicalData | null>(null)
  const [technicalModalOpen, setTechnicalModalOpen] = useState(false)
  const [currentTechnicalData, setCurrentTechnicalData] = useState<TechnicalData[]>([])

  // Load technical data from CSV when component mounts
  useEffect(() => {
    const loadTechnicalData = async () => {
      try {
        const csvTechnicalData = await getTechnicalData()
        setCurrentTechnicalData(csvTechnicalData)
        console.log('Loaded technical data from CSV:', csvTechnicalData)
      } catch (error) {
        console.error('Failed to load technical data:', error)
        setError('Failed to load technical data')
      }
    }
    
    loadTechnicalData()
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import("leaflet")

        if (!mounted || !mapRef.current) return

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        // Initialize map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
        }

        const map = L.map(mapRef.current).setView([10.5, 100], 6) // Center on Thailand with wider view

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        mapInstanceRef.current = map
        setIsMapReady(true)
        setError(null)
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setError("Failed to initialize map. Please try refreshing the page.")
      }
    }

    initializeMap()

    return () => {
      mounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    const updateOverlays = async () => {
      try {
        const L = await import("leaflet")

        // Process each station
        for (const station of stations) {
          // Remove existing overlay if it exists
          if (overlayRefs.current[station.id]) {
            map.removeLayer(overlayRefs.current[station.id])
            delete overlayRefs.current[station.id]
          }

          // Add new overlay if station is visible
          if (station.visible) {
            console.log(`Adding overlay for station: ${station.name}`)
            const imageOverlay = L.imageOverlay(station.imageUrl, station.bounds, {
              opacity: 0.6,
              interactive: false,
              crossOrigin: "anonymous",
            })

            imageOverlay.on("load", () => {
              console.log(`Overlay for ${station.name} loaded successfully`)
            })

            imageOverlay.on("error", (e: any) => {
              console.error(`Failed to load overlay for ${station.name}:`, e)
              setError(`Failed to load image for ${station.name}. Please check the URL.`)
            })

            imageOverlay.addTo(map)
            overlayRefs.current[station.id] = imageOverlay
          }
        }

        // Fit bounds to visible stations
        const visibleStations = stations.filter((s) => s.visible)
        if (visibleStations.length > 0) {
          const bounds = L.latLngBounds([])
          visibleStations.forEach((station) => {
            bounds.extend(station.bounds[0])
            bounds.extend(station.bounds[1])
          })
          map.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch (error) {
        console.error("Error updating overlays:", error)
        setError("Error displaying overlays on map")
      }
    }

    updateOverlays()
  }, [stations, isMapReady])

  // Add technical data markers when data is loaded and map is ready
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || currentTechnicalData.length === 0) return

    const map = mapInstanceRef.current
    
    const updateTechnicalMarkers = async () => {
      try {
        const L = await import("leaflet")

        // Clear existing technical markers
        Object.values(technicalMarkerRefs.current).forEach((marker: any) => {
          map.removeLayer(marker)
        })
        technicalMarkerRefs.current = {}

        // Add new technical data markers
        currentTechnicalData.forEach((data: TechnicalData) => {
          // Skip if coordinates are invalid
          if (!data.latitude || !data.longitude || data.latitude === 0 || data.longitude === 0) {
            console.warn(`Skipping technical data with invalid coordinates:`, data)
            return
          }

          const marker = L.marker([data.latitude, data.longitude], {
            title: data.stationNameThai || data.stationNameEng,
          }).addTo(map)

          marker.bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #333;"><strong>${data.stationNameThai || data.stationNameEng}</strong></h3>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${data.stationType}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${data.location}</p>
              <p style="margin: 5px 0;"><strong>Height:</strong> ${data.height}m</p>
              <p style="margin: 5px 0;"><strong>Max ERP:</strong> ${data.maxERP} kW</p>
              <div style="margin-top: 10px; padding: 8px; background: #f0f8ff; border-left: 3px solid #007cba; font-size: 12px;">
                💡 Click anywhere on this marker to view detailed technical specifications
              </div>
            </div>
          `)

          marker.on("click", () => {
            setSelectedTechnical(data)
            setTechnicalModalOpen(true)
          })

          technicalMarkerRefs.current[data.id] = marker
        })

        console.log(`Added ${Object.keys(technicalMarkerRefs.current).length} technical data markers to map`)
      } catch (error) {
        console.error("Error adding technical markers:", error)
        setError("Error displaying technical data markers")
      }
    }

    updateTechnicalMarkers()
  }, [currentTechnicalData, isMapReady])

  return (
    <>
      <div ref={mapRef} className="h-full w-full rounded-lg" style={{ minHeight: "400px" }} />
      <CoverageLegend />
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}
      {selectedTechnical && (
        <TechnicalModal data={selectedTechnical} open={technicalModalOpen} onOpenChange={setTechnicalModalOpen} />
      )}
    </>
  )
}
