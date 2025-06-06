"use client"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import type { Station, ImageOverlayData } from "@/types/map"

interface MapComponentProps {
  stations: Station[]
  overlayData?: ImageOverlayData | null
  isLoading?: boolean
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

export default function MapComponent({ stations, overlayData, isLoading }: MapComponentProps) {
  return (
    <div className="h-full w-full relative z-0">
      <DynamicMap stations={stations} />

      {stations.filter((s) => s.visible).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg pointer-events-none">
          <div className="text-center space-y-2">
            <div className="text-muted-foreground">ไม่มีสถานีที่เลือกแสดง</div>
            <div className="text-sm text-muted-foreground">กรุณาเลือกสถานีที่ต้องการแสดงจากเมนูด้านซ้าย</div>
          </div>
        </div>
      )}
    </div>
  )
}
