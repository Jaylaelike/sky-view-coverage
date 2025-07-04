"use client"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import React, { useCallback, useRef, useMemo, useState } from "react"
import type { Station, ImageOverlayData, TechnicalData } from "@/types/map"
import TechnicalSearch from "@/components/technical-search"
import ImageOverlayLoadingDialog from "@/components/image-overlay-loading-dialog"

interface MapComponentProps {
  stations: Station[]
  overlayData?: ImageOverlayData | null
  technicalData?: TechnicalData[]
  isLoading?: boolean
  isDataLoading?: boolean
  isOverlayLoading?: boolean
}

// Dynamically import the actual map to avoid SSR issues
const DynamicMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-muted/20">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลดแผนที่...
      </div>
    </div>
  ),
})

const MapComponent = ({ stations, overlayData, technicalData, isLoading, isDataLoading, isOverlayLoading }: MapComponentProps) => {
  const flyToTechnicalPointRef = useRef<((data: TechnicalData) => void) | null>(null)
  const [overlayLoadingState, setOverlayLoadingState] = useState({
    open: false,
    loadingCount: 0,
    totalImages: 1,
    currentImageUrl: '',
    error: null as string | null
  })
  
  // Memoize visible stations to avoid recalculating on every render
  const visibleStations = useMemo(() => stations.filter(s => s.visible), [stations])

  // Handle technical point selection from search
  const handleTechnicalPointSelect = useCallback((data: TechnicalData) => {
    // Use the global function if available
    if (window && (window as any).flyToTechnicalPoint) {
      (window as any).flyToTechnicalPoint(data)
    }
  }, [])

  // Handle technical point selection from map
  const handleMapTechnicalPointSelect = useCallback((data: TechnicalData) => {
    console.log('Technical point selected from map:', data.stationNameThai || data.stationNameEng)
  }, [])

  return (
    <div className="h-full w-full relative z-0">
      {/* Search Bar */}
      {technicalData && technicalData.length > 0 && (
        <div className="absolute top-20 left-4 z-[1000] max-w-md">
          <TechnicalSearch
            technicalData={technicalData}
            onLocationSelect={handleTechnicalPointSelect}
            className="w-full"
          />
        </div>
      )}

      <DynamicMap 
        stations={stations} 
        technicalData={technicalData}
        isDataLoading={isDataLoading}
        onTechnicalPointSelect={handleMapTechnicalPointSelect}
      />

      {/* Image Overlay Loading Dialog */}
      <ImageOverlayLoadingDialog
        open={isOverlayLoading || overlayLoadingState.open}
        onOpenChange={(open) => setOverlayLoadingState(prev => ({ ...prev, open }))}
        loadingCount={overlayLoadingState.loadingCount}
        totalImages={overlayLoadingState.totalImages}
        currentImageUrl={overlayLoadingState.currentImageUrl}
        error={overlayLoadingState.error}
        onCancel={() => {
          setOverlayLoadingState(prev => ({ ...prev, open: false }))
          // TODO: Add actual cancel logic if needed
        }}
      />

      {visibleStations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg pointer-events-none">
          <div className="text-center space-y-2">
            <div className="text-muted-foreground">ไม่มีสถานีที่เลือกแสดง</div>
            <div className="text-sm text-muted-foreground">กรุณาเลือกสถานีที่ต้องการแสดงจากเมนูด้านซ้าย</div>
          </div>
        </div>
      )}
    </div>
  )
};

export default React.memo(MapComponent);

