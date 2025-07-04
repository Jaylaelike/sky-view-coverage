"use client"

import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react"
import type { Station, TechnicalData } from "@/types/map"
import { technicalData, getTechnicalData } from "@/data/technical"
import TechnicalModal from "@/components/technical-modal" // Assuming TechnicalModal is defined elsewhere
import CoverageLegend from "@/components/coverage-legend"
import LocationAnalysis from "@/components/location-analysis"
import ImageOverlayLoadingDialog from "@/components/image-overlay-loading-dialog"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, Satellite, Maximize2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import { 
  calculateDistance, 
  calculateBearing, 
  findNearestStations,
  formatDistanceDetailed,
  type StationDistance,
  type Coordinates
} from "@/lib/geo-utils"
import { 
  compressImageFromUrl, 
  clearCompressedImageCache,
  getCompressionCacheStats 
} from "@/lib/image-compression"
import { StationManager } from "./StationManager"
import { PerformanceMonitor } from "./PerformanceMonitor"
import PerformanceSettings from "./PerformanceSettings"
import { getRecommendedSettings } from "@/utils/deviceDetection"

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
  const stationManagerRef = useRef<StationManager | null>(null)
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null)
  const overlayRefs = useRef<Record<string, any>>({})
  const markerRefs = useRef<Record<string, any>>({})
  const technicalMarkerRefs = useRef<Record<string, any>>({})
  const [isMapReady, setIsMapReady] = useState(false)
  const [isMapLoading, setIsMapLoading] = useState(true)
  // Track number of image overlays currently loading
  const [overlayLoadingCount, setOverlayLoadingCount] = useState(0)
  const [overlayLoadingState, setOverlayLoadingState] = useState({
    open: false,
    loadingCount: 0,
    totalImages: 1,
    currentImageUrl: '',
    error: null as string | null
  })
  const [error, setError] = useState<string | null>(null)
  
  // Performance settings
  const [performanceSettings, setPerformanceSettings] = useState(() => getRecommendedSettings())
  const [performanceMode, setPerformanceMode] = useState(() => {
    const settings = getRecommendedSettings() as any
    return settings.enableProgressiveLoading || false
  })
  const [showPerformanceSettings, setShowPerformanceSettings] = useState(false)
  const [performanceStats, setPerformanceStats] = useState<any>(null)
  const [selectedTechnical, setSelectedTechnical] = useState<TechnicalData | null>(null)
  const [technicalModalOpen, setTechnicalModalOpen] = useState(false)
  const [currentTechnicalData, setCurrentTechnicalData] = useState<TechnicalData[]>([])
  const [technicalDataLoading, setTechnicalDataLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hasInitializedView, setHasInitializedView] = useState(false)
  
  // Location analysis state
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [showLocationAnalysis, setShowLocationAnalysis] = useState(false)
  const [nearestStations, setNearestStations] = useState<StationDistance[]>([])
  
  // Map layer state
  const [currentLayer, setCurrentLayer] = useState<'street' | 'satellite'>('satellite')
  const tileLayerRef = useRef<any>(null)
  const [showLineOfSight, setShowLineOfSight] = useState(false)
  const [lineOfSightRefs, setLineOfSightRefs] = useState<Record<string, any>>({})
  const [userMarkerRef, setUserMarkerRef] = useState<any>(null)
  
  // Mobile detection for responsive design
  const isMobile = useIsMobile()
  // Detect low-end devices (≤4 cores or ≤2 GB RAM)
  const isLowEndDevice = useMemo(() => {
    if (typeof navigator === "undefined") return false
    const cores = (navigator as any).hardwareConcurrency || 8
    const memory = (navigator as any).deviceMemory || 4
    return cores <= 4 || memory <= 2
  }, [])
  
  // Initialize StationManager and PerformanceMonitor when map is ready
  useEffect(() => {
    if (isMapReady && mapInstanceRef.current && !stationManagerRef.current) {
      stationManagerRef.current = new StationManager(mapInstanceRef.current)
      console.log('StationManager initialized with performance settings:', performanceSettings)
      
      // Initialize PerformanceMonitor
      performanceMonitorRef.current = new PerformanceMonitor()
      performanceMonitorRef.current.startMonitoring()
      
      // Set up performance monitoring callbacks
      performanceMonitorRef.current.onWarning((type: string, message: string) => {
        console.warn('Performance Warning:', type, message)
        
        // Auto-enable performance mode on critical warnings
        if (type === 'critical-memory' || type === 'low-fps') {
          setPerformanceMode(true)
          if (stationManagerRef.current) {
            stationManagerRef.current.setClusteringEnabled(true)
          }
        }
      })
      
      performanceMonitorRef.current.onReport((report: any) => {
        setPerformanceStats(report)
        
        // Update station count in monitor
        if (stationManagerRef.current && performanceMonitorRef.current) {
          const stats = stationManagerRef.current.getPerformanceStats() as any
          performanceMonitorRef.current.updateStationCount(stats.renderedStations || 0)
        }
      })
    }
    
    return () => {
      if (stationManagerRef.current) {
        stationManagerRef.current.cleanup()
        stationManagerRef.current = null
      }
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.cleanup()
        performanceMonitorRef.current = null
      }
    }
  }, [isMapReady])

  // Memoize visible stations to prevent unnecessary re-renders
  const visibleStations = useMemo(() => 
    stations.filter(station => station.visible), 
    [stations]
  )

  // Note: mapBounds removed as it's handled by StationManager now

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

        const map = L.map(mapRef.current, {
            preferCanvas: true,
            zoomControl: !isMobile,
            attributionControl: false,
            inertia: true,
            zoomAnimation: !isLowEndDevice,
          }).setView([10.5, 100], 6) // Center on Thailand

        // Add default tile layer (satellite map)
        const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
          maxZoom: 18,
        })
        
        satelliteLayer.addTo(map)
        tileLayerRef.current = satelliteLayer

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

  // Update StationManager with new station data
  useEffect(() => {
    if (stationManagerRef.current && stations.length > 0) {
      // Start render measurement
      performanceMonitorRef.current?.startRenderMeasure('station-update')
      
      // Pre-process stations with compressed images if needed
      const processStations = async () => {
        const processedStations = await Promise.all(
          stations.map(async (station) => {
            const stationWithCompression = station as any
            if (station.imageUrl && !stationWithCompression.compressedImageUrl) {
              try {
                const compressedUrl = await compressImageFromUrl(station.imageUrl)
                return { ...station, compressedImageUrl: compressedUrl } as Station
              } catch (error) {
                console.warn(`Failed to compress image for ${station.name}:`, error)
                return station
              }
            }
            return station
          })
        )
        
        stationManagerRef.current?.setStations(processedStations)
        
        // End render measurement
        performanceMonitorRef.current?.endRenderMeasure('station-update')
      }
      
      if (performanceMode) {
        processStations()
      } else {
        // Use original approach for non-performance mode
        stationManagerRef.current.setStations(stations)
        performanceMonitorRef.current?.endRenderMeasure('station-update')
      }
    }
    
    // Fit bounds to visible stations only on initial load or when explicitly requested
    if (visibleStations.length > 0 && (!hasInitializedView || shouldFitBounds) && mapInstanceRef.current) {
      const fitBounds = async () => {
        const L = await import("leaflet")
        const bounds = L.latLngBounds([])
        visibleStations.forEach((station) => {
          bounds.extend(station.bounds[0])
          bounds.extend(station.bounds[1])
        })
        mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] })
        if (!hasInitializedView) {
          setHasInitializedView(true)
          console.log('Initial view set to fit station bounds')
        } else if (shouldFitBounds) {
          console.log('View fitted to bounds on request')
        }
      }
      fitBounds()
    }
  }, [stations, isMapReady, visibleStations, hasInitializedView, shouldFitBounds, performanceMode])

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

          // Create custom orange tower icon
          const towerIcon = L.divIcon({
            className: 'custom-tower-marker',
            html: `
              <div style="
                background-color: #ff8c00;
                border: 3px solid #fff;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                position: relative;
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 21V10a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v11"/>
                  <path d="M12 8V3"/>
                  <path d="M8 8l4-5 4 5"/>
                  <circle cx="12" cy="8" r="2"/>
                  <path d="M9 21h6"/>
                  <path d="M10 21v-2a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/>
                </svg>
                <div style="
                  position: absolute;
                  bottom: -8px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 8px solid transparent;
                  border-right: 8px solid transparent;
                  border-top: 8px solid #ff8c00;
                "></div>
              </div>
            `,
            iconSize: [40, 48],
            iconAnchor: [20, 48],
            popupAnchor: [0, -48]
          })

          const marker = L.marker([data.latitude, data.longitude], {
            title: data.stationNameThai || data.stationNameEng,
            icon: towerIcon
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
        const userCoords: Coordinates = { latitude, longitude }
        
        // Store user location for analysis
        setUserLocation(userCoords)
        
        // Find nearest stations for analysis - include technical data
        const nearest = findNearestStations(userCoords, visibleStations, currentTechnicalData, 5)
        setNearestStations(nearest)
        
        if (mapInstanceRef.current) {
          // Fly to user's location with zoom level 15
          mapInstanceRef.current.flyTo([latitude, longitude], 15, {
            duration: 2 // Animation duration in seconds
          })
          
          // Add a persistent user location marker
          import("leaflet").then((L) => {
            // Remove existing user marker if it exists
            if (userMarkerRef) {
              mapInstanceRef.current.removeLayer(userMarkerRef)
            }
            
            // Create custom icon for user location
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: `
                <div style="
                  position: relative;
                  width: 20px;
                  height: 20px;
                ">
                  <!-- Outer pulse ring -->
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    background: rgba(0, 122, 255, 0.2);
                    border-radius: 50%;
                    animation: userLocationPulse 2s infinite;
                  "></div>
                  
                  <!-- Inner dot -->
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #007AFF;
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    box-shadow: 0 2px 6px rgba(0, 122, 255, 0.4);
                    z-index: 2;
                  "></div>
                  
                  <!-- Accuracy indicator -->
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 60px;
                    height: 60px;
                    border: 2px solid rgba(0, 122, 255, 0.3);
                    border-radius: 50%;
                    animation: userLocationBreathe 3s infinite ease-in-out;
                  "></div>
                </div>
                <style>
                  @keyframes userLocationPulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                  }
                  @keyframes userLocationBreathe {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.1; }
                  }
                </style>
              `,
              iconSize: [60, 60],
              iconAnchor: [30, 30]
            })
            
            const userMarker = L.marker([latitude, longitude], {
              icon: userIcon,
              title: "Your Location"
            }).addTo(mapInstanceRef.current)
            
            userMarker.bindPopup(`
              <div style="text-align: center; min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #007AFF;">📍 Your Current Location</h4>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                  Lat: ${latitude.toFixed(6)}<br>
                  Lng: ${longitude.toFixed(6)}
                </p>
                <button onclick="document.querySelector('[data-location-analysis]').click()" 
                        style="background: #007AFF; color: white; border: none; padding: 6px 12px; 
                               border-radius: 4px; font-size: 12px; cursor: pointer;">
                  Analyze Location
                </button>
              </div>
            `).openPopup()
            
            // Store user marker reference
            setUserMarkerRef(userMarker)
            
            // Show location analysis
            setShowLocationAnalysis(true)
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

  // Function to toggle line-of-sight visualization
  const toggleLineOfSight = useCallback(async () => {
    if (!mapInstanceRef.current || !userLocation) return

    const L = await import("leaflet")
    const map = mapInstanceRef.current

    if (showLineOfSight) {
      // Remove all line-of-sight lines
      Object.values(lineOfSightRefs).forEach(line => {
        if (line) map.removeLayer(line)
      })
      setLineOfSightRefs({})
      setShowLineOfSight(false)
    } else {
      // Add line-of-sight lines to nearest stations
      const newLineRefs: Record<string, any> = {}
      
      nearestStations.forEach(station => {
        // Get coordinates based on station type
        let stationLat: number, stationLng: number
        
        if (station.station.type === 'technical') {
          // Technical stations have direct latitude/longitude properties
          stationLat = station.station.latitude
          stationLng = station.station.longitude
        } else {
          // Coverage stations have bounds arrays
          stationLat = (station.station.bounds[0][0] + station.station.bounds[1][0]) / 2
          stationLng = (station.station.bounds[0][1] + station.station.bounds[1][1]) / 2
        }
        
        // Create line with gradient color based on distance
        const getLineColor = (distance: number) => {
          if (distance < 5) return '#22c55e' // Green - very close
          if (distance < 15) return '#3b82f6' // Blue - close
          if (distance < 30) return '#f59e0b' // Orange - medium
          return '#ef4444' // Red - far
        }
        
        const line = L.polyline([
          [userLocation.latitude, userLocation.longitude],
          [stationLat, stationLng]
        ], {
          color: getLineColor(station.distance),
          weight: 3,
          opacity: 0.8,
          dashArray: station.station.type === 'technical' ? '10, 5' : '5, 5',
          interactive: false,
          className: 'line-of-sight-line'
        }).addTo(map)

        // Add distance and direction label at midpoint
        const midLat = (userLocation.latitude + stationLat) / 2
        const midLng = (userLocation.longitude + stationLng) / 2
        
        const distanceLabel = L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: 'distance-label',
            html: `<div style="
              background: ${getLineColor(station.distance)};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              border: 2px solid white;
              text-align: center;
              min-width: 60px;
            ">
              <div>${formatDistanceDetailed(station.distance)}</div>
              <div style="font-size: 9px; opacity: 0.9;">${station.direction.split('(')[0].trim()}</div>
            </div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          }),
          interactive: false
        }).addTo(map)

        // Add station marker enhancement for line-of-sight mode
        const stationMarker = L.circleMarker([stationLat, stationLng], {
          radius: 8,
          fillColor: getLineColor(station.distance),
          color: 'white',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
          interactive: false
        }).addTo(map)

        newLineRefs[station.station.id] = L.layerGroup([line, distanceLabel, stationMarker])
      })
      
      setLineOfSightRefs(newLineRefs)
      setShowLineOfSight(true)
    }
  }, [showLineOfSight, userLocation, nearestStations, lineOfSightRefs])

  // Function to fly to a specific station from location analysis
  const flyToStation = useCallback((station: any) => {
    if (!mapInstanceRef.current) return

    // Get coordinates based on station type
    let centerLat: number, centerLng: number
    
    if (station.type === 'technical') {
      // Technical stations have direct latitude/longitude properties
      centerLat = station.latitude
      centerLng = station.longitude
    } else {
      // Coverage stations have bounds arrays
      centerLat = (station.bounds[0][0] + station.bounds[1][0]) / 2
      centerLng = (station.bounds[0][1] + station.bounds[1][1]) / 2
    }

    mapInstanceRef.current.flyTo([centerLat, centerLng], 14, {
      duration: 2
    })
  }, [])

  // Function to close location analysis
  const closeLocationAnalysis = useCallback(() => {
    setShowLocationAnalysis(false)
    setUserLocation(null)
    setNearestStations([])
    
    // Remove line-of-sight visualization
    if (showLineOfSight && mapInstanceRef.current) {
      Object.values(lineOfSightRefs).forEach(line => {
        if (line) mapInstanceRef.current.removeLayer(line)
      })
      setLineOfSightRefs({})
      setShowLineOfSight(false)
    }
    
    // Remove user marker
    if (userMarkerRef && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef)
      setUserMarkerRef(null)
    }
  }, [showLineOfSight, lineOfSightRefs, userMarkerRef])

  // Function to switch map layers
  const switchMapLayer = useCallback(async (layerType: 'street' | 'satellite') => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return
    
    const map = mapInstanceRef.current
    const L = await import("leaflet")
    
    // Remove current tile layer
    map.removeLayer(tileLayerRef.current)
    
    // Add new tile layer based on type
    let newLayer
    if (layerType === 'satellite') {
      newLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
        maxZoom: 18,
      })
    } else {
      newLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
    }
    
    newLayer.addTo(map)
    tileLayerRef.current = newLayer
    setCurrentLayer(layerType)
  }, [])

  // Handle performance settings changes
  const handlePerformanceSettingsChange = (newSettings: any) => {
    setPerformanceSettings(newSettings)
    setPerformanceMode(newSettings.enableProgressiveLoading || false)
    
    // Apply settings to StationManager
    if (stationManagerRef.current) {
      stationManagerRef.current.setClusteringEnabled(newSettings.enableClustering || false)
      stationManagerRef.current.forceUpdate()
    }
    
    // Store settings in localStorage
    try {
      localStorage.setItem('sky-view-performance-settings', JSON.stringify(newSettings))
    } catch (error) {
      console.warn('Failed to save performance settings:', error)
    }
  }
  
  // Load saved performance settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sky-view-performance-settings')
      if (saved) {
        const savedSettings = JSON.parse(saved)
        setPerformanceSettings(savedSettings)
        setPerformanceMode(savedSettings.enableProgressiveLoading || false)
      }
    } catch (error) {
      console.warn('Failed to load saved performance settings:', error)
    }
  }, [])
  
  // Cleanup blob URLs on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up all cached blob URLs
      clearCompressedImageCache()
      // Cleanup StationManager
      if (stationManagerRef.current) {
        stationManagerRef.current.cleanup()
      }
      // Cleanup PerformanceMonitor
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.cleanup()
      }
    }
  }, [])

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
      <div className={isMobile ? "absolute top-20 left-2 z-[999]" : ""}>
        <CoverageLegend />
      </div>
      
      {/* Technical Data Loading Indicator - Mobile optimized */}
      {technicalDataLoading && (
        <div className={`absolute ${isMobile ? 'top-32 left-2 right-2' : 'top-20 left-1/2 transform -translate-x-1/2'} bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm shadow-lg z-[999] flex items-center gap-2 max-w-[90vw]`}>
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <span className="truncate">{isMobile ? 'กำลังโหลด...' : 'กำลังโหลดข้อมูลสถานี...'}</span>
        </div>
      )}
      
      {/* Control Buttons - Mobile-first responsive design */}
      <div className={`absolute z-[1000] ${
        isMobile 
          ? 'bottom-2 left-2 right-2 flex flex-col gap-2' 
          : 'bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:justify-between'
      }`}>
        {/* Main control buttons */}
        <div className={`flex ${isMobile ? 'flex-row justify-between' : 'flex-col sm:flex-row'} gap-2`}>
          {/* Current Location Button */}
          <Button
            onClick={flyToUserLocation}
            disabled={locationLoading || !isMapReady}
            className={`${
              isMobile 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl text-sm px-3 py-2.5 h-auto flex-1 touch-manipulation min-w-0' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-sm px-3 py-2 h-auto'
            }`}
            title="Go to my location"
            data-location-analysis
          >
            {locationLoading ? (
              <Loader2 className={`h-4 w-4 animate-spin ${isMobile ? 'mr-2' : 'mr-2'}`} />
            ) : (
              <MapPin className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'}`} />
            )}
            <span className={isMobile ? 'text-xs leading-tight' : 'hidden sm:inline'}>
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
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-xl text-sm px-3 py-2.5 h-auto flex-1 touch-manipulation min-w-0' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg text-sm px-3 py-2 h-auto'
            }`}
            title="Fit view to all visible stations"
          >
            <Maximize2 className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'}`} />
            <span className={isMobile ? 'text-xs leading-tight' : 'hidden sm:inline'}>
              {isMobile ? 'แสดงทุกสถานี' : 'แสดงทุกสถานี'}
            </span>
            <span className={isMobile ? 'hidden' : 'sm:hidden'}>ทุกสถานี</span>
          </Button>
          
          {/* Layer Switch Button */}
          <Button
            onClick={() => switchMapLayer(currentLayer === 'street' ? 'satellite' : 'street')}
            disabled={!isMapReady}
            className={`${
              isMobile 
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xl text-sm px-3 py-2.5 h-auto flex-1 touch-manipulation min-w-0' 
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg text-sm px-3 py-2 h-auto'
            }`}
            title={currentLayer === 'street' ? 'Switch to satellite view' : 'Switch to street view'}
          >
            <Satellite className={`h-4 w-4 ${isMobile ? 'mr-2' : 'mr-2'}`} />
            <span className={isMobile ? 'text-xs leading-tight' : 'hidden sm:inline'}>
              {currentLayer === 'street' ? 
                (isMobile ? 'ดาวเทียม' : 'ดาวเทียม') : 
                (isMobile ? 'แผนที่' : 'แผนที่')
              }
            </span>
            <span className={isMobile ? 'hidden' : 'sm:hidden'}>
              {currentLayer === 'street' ? 'ดาวเทียม' : 'แผนที่'}
            </span>
          </Button>
        </div>

        {/* Status indicator - Hidden on mobile for clean interface */}
        {isMapReady && !technicalDataLoading && !isMobile && (
          <div className="hidden sm:flex bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-full text-xs shadow-lg items-center gap-2 self-end">
            <Satellite className="h-3 w-3" />
            <span>แผนที่พร้อมใช้งาน</span>
            {performanceMode && (
              <span 
                className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                onClick={() => setShowPerformanceSettings(true)}
                title="คลิกเพื่อตั้งค่าประสิทธิภาพ"
              >
                โหมดประสิทธิภาพ
              </span>
            )}
            <button
              className="ml-2 p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
              onClick={() => setShowPerformanceSettings(true)}
              title="ตั้งค่าประสิทธิภาพ"
            >
              ⚙️
            </button>
          </div>
        )}
      </div>
      
      {/* Location Error Message - Mobile optimized */}
      {locationError && (
        <div className={`absolute ${
          isMobile 
            ? 'top-36 left-2 right-2' 
            : 'top-20 left-4 right-4 sm:left-4 sm:right-auto sm:max-w-xs'
        } bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm shadow-lg z-[999]`}>
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
        } bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm shadow-lg z-[999]`}>
          <div className="flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0">❌</span>
            <span className="flex-1">{error}</span>
          </div>
        </div>
      )}
      
      {/* Image Overlay Loading Dialog */}
      <ImageOverlayLoadingDialog
        open={overlayLoadingCount > 0 || overlayLoadingState.open}
        onOpenChange={(open) => {
          setOverlayLoadingState(prev => ({ ...prev, open }))
          if (!open) {
            setOverlayLoadingCount(0)
          }
        }}
        loadingCount={overlayLoadingCount || overlayLoadingState.loadingCount}
        totalImages={overlayLoadingState.totalImages}
        currentImageUrl={overlayLoadingState.currentImageUrl}
        error={overlayLoadingState.error}
        onCancel={() => {
          setOverlayLoadingCount(0)
          setOverlayLoadingState(prev => ({ ...prev, open: false, loadingCount: 0 }))
        }}
      />

      {/* Technical Modal */}
      {selectedTechnical && (
        <TechnicalModal 
          data={selectedTechnical} 
          open={technicalModalOpen} 
          onOpenChange={setTechnicalModalOpen}
          position="auto"
        />
      )}
      
      {/* Location Analysis Panel */}
      {showLocationAnalysis && userLocation && nearestStations.length > 0 && (
        <LocationAnalysis
          userLocation={userLocation}
          nearestStations={nearestStations}
          showLineOfSight={showLineOfSight}
          onToggleLineOfSight={toggleLineOfSight}
          onFlyToStation={flyToStation}
          onClose={closeLocationAnalysis}
        />
      )}
      
      {/* Performance Settings Panel */}
      <PerformanceSettings
        isOpen={showPerformanceSettings}
        onClose={() => setShowPerformanceSettings(false)}
        onSettingsChange={handlePerformanceSettingsChange}
        currentStats={stationManagerRef.current?.getPerformanceStats()}
      />
    </>
  )
}
