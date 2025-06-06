"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useIsMobile } from "@/hooks/use-mobile"
import type { TechnicalData } from "@/types/map"
import { MapPin, Radio, Antenna, Building, User, Settings, Zap, Signal } from "lucide-react"

interface TechnicalModalProps {
  data: TechnicalData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  position?: 'center' | 'bottom' | 'auto' // Enhanced position options
}

export default function TechnicalModal({ data, open, onOpenChange, position = 'auto' }: TechnicalModalProps) {
  const isMobile = useIsMobile()
  
  if (!data) return null

  // Auto-detect best position based on device
  const effectivePosition = position === 'auto' ? (isMobile ? 'bottom' : 'center') : position

  // Enhanced content component with better responsive design and compact height
  const EnhancedContent = () => (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-4">
        {/* Station Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                {data.stationNameThai}
              </h2>
              {data.stationNameEng && (
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  {data.stationNameEng}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Radio className="h-3 w-3" />
              {data.stationType}
            </Badge>
          </div>
          
          {/* Location Badge */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="h-3 w-3" />
            <span>{data.location}</span>
          </div>
        </div>

        <Separator />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-1.5">
            <div className="flex items-center gap-1">
              <Building className="h-3 w-3 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">ความสูง</p>
                <p className="font-semibold text-xs">{data.height}m</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-1.5">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-orange-600" />
              <div>
                <p className="text-xs text-gray-500">กำลังส่งสูงสุด</p>
                <p className="font-semibold text-xs">{data.maxERP} kW</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-1.5">
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">HRP</p>
                <p className="font-semibold text-xs">{data.hrp || 'N/A'}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-1.5">
            <div className="flex items-center gap-1">
              <Settings className="h-3 w-3 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Beam Tilt</p>
                <p className="font-semibold text-xs">{data.beamTilt || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Information Cards */}
        <div className="grid gap-2 md:grid-cols-2">
          {/* Location Details */}
          <Card>
            <CardHeader className="pb-1 pt-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                ข้อมูลตำแหน่ง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-2">
              <div>
                <p className="text-xs font-medium text-gray-700">ที่อยู่</p>
                <p className="text-xs text-gray-600 mt-0.5">{data.address}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">เจ้าของสถานที่</p>
                <p className="text-xs text-gray-600 mt-0.5">{data.owner}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">พิกัด</p>
                <p className="text-xs text-gray-600 mt-0.5 font-mono">
                  {data.latitude?.toFixed(6)}, {data.longitude?.toFixed(6)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Management Details */}
          <Card>
            <CardHeader className="pb-1 pt-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <User className="h-3 w-3" />
                ข้อมูลการบริหาร
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-2">
              <div>
                <p className="text-xs font-medium text-gray-700">ผู้รับผิดชอบ</p>
                <p className="text-xs text-gray-600 mt-0.5">{data.responsibleEntity}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">ศูนย์วิศวกรรม</p>
                <p className="text-xs text-gray-600 mt-0.5">{data.engineeringCenter}</p>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-1 pt-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Antenna className="h-3 w-3" />
                ข้อมูลเทคนิค
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid gap-1.5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-gray-700">ประเภทสายอากาศ</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {data.antType1}
                    </Badge>
                    {data.antType2 && (
                      <Badge variant="outline" className="text-xs">
                        {data.antType2}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">ยี่ห้อสายอากาศ</p>
                  <p className="text-xs text-gray-600 mt-0.5">{data.antBrand}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">Main Feeder Loss</p>
                  <p className="text-xs text-gray-600 mt-0.5">{data.feederLoss} dB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )

  // Mobile bottom sheet
  if (effectivePosition === 'bottom') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="h-[40vh] rounded-t-xl border-t-0 p-0"
        >
          <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
            <SheetHeader>
              <SheetTitle className="text-left text-base">ข้อมูลสถานี</SheetTitle>
              <SheetDescription className="text-left text-sm">
                รายละเอียดทางเทคนิคของสถานีวิทยุกระจายเสียง
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="px-4 py-3 flex-1 overflow-hidden">
            <EnhancedContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop center dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">ข้อมูลสถานี</DialogTitle>
            <DialogDescription className="text-sm">
              รายละเอียดทางเทคนิคของสถานีวิทยุกระจายเสียง
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-4 flex-1 overflow-hidden">
          <EnhancedContent />
        </div>
      </DialogContent>
    </Dialog>
  )
}
