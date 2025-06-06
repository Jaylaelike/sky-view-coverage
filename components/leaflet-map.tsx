"use client"

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react"
import type { Station, TechnicalData } from "@/types/map"
import { technicalData, getTechnicalData } from "@/data/technical"
import TechnicalModal from "@/components/technical-modal" // Assuming TechnicalModal is defined elsewhere
import CoverageLegend from "@/components/coverage-legend"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, Satellite, Maximize2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"

interface LeafletMapProps {
  stations: Station[]
  technicalData?: TechnicalData[]
  isDataLoading?: boolean
  onTechnicalPointSelect?: (data: TechnicalData) => void
  shouldFitBounds?: boolean // New prop to control when to fit bounds
}

export default function LeafletMap({ stations, technicalData: propTechnicalData, isDataLoading, onTechnicalPointSelect, shouldFitBounds = false }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const overlayRefs = useRef<Record<string, any>>({})
  const markerRefs = useRef<Record<string, any>>({})
  const technicalMarkerRefs = useRef<Record<string, any>>({})
  const [isMapReady, setIsMapReady] = useState(false)
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTechnical, setSelectedTechnical] = useState<TechnicalData | null>(null)
  const [technicalModalOpen, setTechnicalModalOpen] = useState(false)
  const [currentTechnicalData, setCurrentTechnicalData] = useState<TechnicalData[]>([])
  const [technicalDataLoading, setTechnicalDataLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hasInitializedView, setHasInitializedView] = useState(false)
  
  // Mobile detection for responsive design
  const isMobile = useIsMobile()

  // Memoize visible stations to prevent unnecessary re-renders
  const visibleStations = useMemo(() => 
    stations.filter(station => station.visible), 
    [stations]
  )

  // Memoize bounds calculation
  const mapBounds = useMemo(() => {
    if (visibleStations.length === 0) return null
    return visibleStations.map(station => station.bounds)
  }, [visibleStations])

  // Use prop technical data if available, otherwise load from CSV
  useEffect(() => {
    if (propTechnicalData) {
      setCurrentTechnicalData(propTechnicalData)
      setTechnicalDataLoading(false)
      console.log('Using provided technical data:', propTechnicalData.length, 'items')
    } else {
      // Load technical data from CSV when component mounts - optimized with loading state
      const loadTechnicalData = async () => {
        try {
          setTechnicalDataLoading(true)
          const csvTechnicalData = await getTechnicalData()
          setCurrentTechnicalData(csvTechnicalData)
          console.log('Loaded technical data from CSV:', csvTechnicalData.length, 'items')
        } catch (error) {
          console.error('Failed to load technical data:', error)
          setError('Failed to load technical data')
        } finally {
          setTechnicalDataLoading(false)
        }
      }
      
      loadTechnicalData()
    }
  }, [propTechnicalData])

  useEffect(() => {
    let mounted = true

    const initializeMap = async () => {
      try {
        setIsMapLoading(true)
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
        setHasInitializedView(false) // Reset initialization flag for new map instance
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setError("Failed to initialize map. Please try refreshing the page.")
      } finally {
        setIsMapLoading(false)
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

  // Optimized overlay updates using memoized visible stations
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

        // Fit bounds to visible stations only on initial load or when explicitly requested
        if (visibleStations.length > 0 && (!hasInitializedView || shouldFitBounds)) {
          const bounds = L.latLngBounds([])
          visibleStations.forEach((station) => {
            bounds.extend(station.bounds[0])
            bounds.extend(station.bounds[1])
          })
          map.fitBounds(bounds, { padding: [20, 20] })
          if (!hasInitializedView) {
            setHasInitializedView(true)
            console.log('Initial view set to fit station bounds')
          } else if (shouldFitBounds) {
            console.log('View fitted to bounds on request')
          }
        }
      } catch (error) {
        console.error("Error updating overlays:", error)
        setError("Error displaying overlays on map")
      }
    }

    updateOverlays()
  }, [stations, isMapReady, visibleStations])

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
            <div style="min-width: 200px; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: #333;"><strong>${data.stationNameThai || data.stationNameEng}</strong></h3>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${data.stationType}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${data.location}</p>
              <p style="margin: 5px 0;"><strong>Height:</strong> ${data.height}m</p>
              <p style="margin: 5px 0;"><strong>Max ERP:</strong> ${data.maxERP} kW</p>
              <div style="margin-top: 15px; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                📋 คลิกที่หมุดนี้เพื่อดูรายละเอียดแบบเต็ม<br>
                <span style="font-size: 11px; opacity: 0.9;">Click this pin for full technical details</span>
              </div>
            </div>
          `)

          marker.on("click", () => {
            setSelectedTechnical(data)
            setTechnicalModalOpen(true)
            // Close any existing popup when opening modal
            marker.closePopup()
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

  // Function to get user's current location and fly to it
  const flyToUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      return
    }

    setLocationLoading(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        
        if (mapInstanceRef.current) {
          // Fly to user's location with zoom level 15
          mapInstanceRef.current.flyTo([latitude, longitude], 15, {
            duration: 2 // Animation duration in seconds
          })
          
          // Optionally add a temporary marker at user's location
          import("leaflet").then((L) => {
            const userMarker = L.marker([latitude, longitude], {
              title: "Your Location"
            }).addTo(mapInstanceRef.current)
            
            userMarker.bindPopup(`
              <div style="text-align: center;">
                <h4 style="margin: 0 0 5px 0;">📍 Your Current Location</h4>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  Lat: ${latitude.toFixed(6)}<br>
                  Lng: ${longitude.toFixed(6)}
                </p>
              </div>
            `).openPopup()
            
            // Remove the marker after 10 seconds
            setTimeout(() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(userMarker)
              }
            }, 10000)
          })
        }
        
        setLocationLoading(false)
      },
      (error) => {
        setLocationLoading(false)
        let errorMessage = "Unable to retrieve your location"
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable"
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out"
            break
        }
        
        setLocationError(errorMessage)
        
        // Clear error after 5 seconds
        setTimeout(() => {
          setLocationError(null)
        }, 5000)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Use cached location if it's less than 1 minute old
      }
    )
  }

  // Function to fly to a specific technical point
  const flyToTechnicalPoint = useCallback((technicalData: TechnicalData) => {
    if (!mapInstanceRef.current || !technicalData.latitude || !technicalData.longitude) {
      console.warn('Cannot fly to technical point: invalid coordinates or map not ready')
      return
    }

    // Fly to the technical point with zoom level 16 for detailed view
    mapInstanceRef.current.flyTo([technicalData.latitude, technicalData.longitude], 16, {
      duration: 2.5, // Animation duration in seconds
      easeLinearity: 0.25
    })

    // Find and open the popup for this technical point if marker exists
    const marker = technicalMarkerRefs.current[technicalData.id]
    if (marker) {
      setTimeout(() => {
        marker.openPopup()
      }, 2600) // Open popup after fly animation completes
    }

    // Notify parent component about selection
    if (onTechnicalPointSelect) {
      onTechnicalPointSelect(technicalData)
    }

    console.log(`Flying to technical point: ${technicalData.stationNameThai || technicalData.stationNameEng}`)
  }, [onTechnicalPointSelect])

  // Expose flyToTechnicalPoint function to parent components
  useEffect(() => {
    if (window && typeof window !== 'undefined') {
      (window as any).flyToTechnicalPoint = flyToTechnicalPoint
    }
  }, [flyToTechnicalPoint])

  // Function to manually fit bounds to all visible stations
  const fitBoundsToStations = useCallback(() => {
    if (!mapInstanceRef.current || visibleStations.length === 0) return

    const map = mapInstanceRef.current
    import("leaflet").then((L) => {
      const bounds = L.latLngBounds([])
      visibleStations.forEach((station) => {
        bounds.extend(station.bounds[0])
        bounds.extend(station.bounds[1])
      })
      map.fitBounds(bounds, { padding: [20, 20] })
      console.log('Manual fit bounds to visible stations')
    })
  }, [visibleStations])

  return (
    <>
      {/* Map Loading Skeleton */}
      {isMapLoading && (
        <div className="absolute inset-0 z-[999] bg-white">
          <div className="h-full w-full flex flex-col p-4">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="flex-1 rounded-lg" />
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>
      )}

      <div 
        ref={mapRef} 
        className={`h-full w-full ${isMobile ? 'rounded-none' : 'rounded-lg'}`} 
        style={{ minHeight: isMobile ? "100vh" : "400px" }} 
      />
      
      {/* Coverage Legend - Position optimized for mobile */}
      <div className={isMobile ? "absolute top-2 left-2 z-[1000]" : ""}>
        <CoverageLegend />
      </div>
      
      {/* Technical Data Loading Indicator - Mobile optimized */}
      {technicalDataLoading && (
        <div className={`absolute ${isMobile ? 'top-16 left-2 right-2' : 'top-4 left-1/2 transform -translate-x-1/2'} bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm shadow-lg z-[1000] flex items-center gap-2 max-w-[90vw]`}>
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <span className="truncate">{isMobile ? 'กำลังโหลด...' : 'กำลังโหลดข้อมูลสถานี...'}</span>
        </div>
      )}
      
      {/* Control Buttons - Mobile-first responsive design */}
      <div className={`absolute z-[1000] ${
        isMobile 
          ? 'bottom-4 left-2 right-2 flex flex-col gap-2' 
          : 'bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:justify-between'
      }`}>
        {/* Main control buttons */}
        <div className={`flex ${isMobile ? 'flex-row justify-center' : 'flex-col sm:flex-row'} gap-2`}>
          {/* Current Location Button */}
          <Button
            onClick={flyToUserLocation}
            disabled={locationLoading || !isMapReady}
            className={`${
              isMobile 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl text-base px-4 py-3 h-auto flex-1 touch-manipulation' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-sm px-3 py-2 h-auto'
            }`}
            title="Go to my location"
          >
            {locationLoading ? (
              <Loader2 className={`h-4 w-4 animate-spin ${isMobile ? 'mr-3' : 'mr-2'}`} />
            ) : (
              <MapPin className={`h-4 w-4 ${isMobile ? 'mr-3' : 'mr-2'}`} />
            )}
            <span className={isMobile ? 'block' : 'hidden sm:inline'}>
              {isMobile ? 'ตำแหน่งปัจจุบัน' : 'ตำแหน่งปัจจุบัน'}
            </span>
            <span className={isMobile ? 'hidden' : 'sm:hidden'}>ตำแหน่ง</span>
          </Button>
          
          {/* Fit Bounds Button */}
          <Button
            onClick={fitBoundsToStations}
            disabled={!isMapReady || visibleStations.length === 0}
            className={`${
              isMobile 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-xl text-base px-4 py-3 h-auto flex-1 touch-manipulation' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg text-sm px-3 py-2 h-auto'
            }`}
            title="Fit view to all visible stations"
          >
            <Maximize2 className={`h-4 w-4 ${isMobile ? 'mr-3' : 'mr-2'}`} />
            <span className={isMobile ? 'block' : 'hidden sm:inline'}>
              {isMobile ? 'แสดงทุกสถานี' : 'แสดงทุกสถานี'}
            </span>
            <span className={isMobile ? 'hidden' : 'sm:hidden'}>ทุกสถานี</span>
          </Button>
        </div>

        {/* Status indicator - Hidden on mobile for clean interface */}
        {isMapReady && !technicalDataLoading && !isMobile && (
          <div className="hidden sm:flex bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-full text-xs shadow-lg items-center gap-2 self-end">
            <Satellite className="h-3 w-3" />
            <span>แผนที่พร้อมใช้งาน</span>
          </div>
        )}
      </div>
      
      {/* Location Error Message - Mobile optimized */}
      {locationError && (
        <div className={`absolute ${
          isMobile 
            ? 'top-24 left-2 right-2' 
            : 'top-4 left-4 right-4 sm:left-4 sm:right-auto sm:max-w-xs'
        } bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm shadow-lg z-[1000]`}>
          <div className="flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <span className="flex-1">{locationError}</span>
          </div>
        </div>
      )}
      
      {/* General Error Message - Mobile optimized */}
      {error && (
        <div className={`absolute ${
          isMobile 
            ? 'bottom-24 left-2 right-2' 
            : 'bottom-20 sm:bottom-16 left-4 right-4'
        } bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm shadow-lg z-[1000]`}>
          <div className="flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0">❌</span>
            <span className="flex-1">{error}</span>
          </div>
        </div>
      )}
      
      {/* Technical Modal */}
      {selectedTechnical && (
        <TechnicalModal 
          data={selectedTechnical} 
          open={technicalModalOpen} 
          onOpenChange={setTechnicalModalOpen}
          position="auto"
        />
      )}
    </>
  )
}
