"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, AlertTriangle } from "lucide-react"
import type { Station } from "@/types/map"
import { Radio, RadioGroup } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isMobile, getRecommendedSettings } from "@/utils/deviceDetection"
import { WARNING_THRESHOLDS } from "@/constants/performance"

interface StationSelectorProps {
  stations: Station[]
  onStationChange: (stations: Station[]) => void
  onCompareStations?: (stationIds: string[]) => void
  isLoading?: boolean
}

export default function StationSelector({ stations, onStationChange, onCompareStations, isLoading }: StationSelectorProps) {
  const [selectedStations, setSelectedStations] = useState<Station[]>(stations || [])
  const [compareMode, setCompareMode] = useState(false)
  const [compareStation1, setCompareStation1] = useState<string>(stations?.[0]?.id || "")
  const [compareStation2, setCompareStation2] = useState<string>(stations?.[1]?.id || "")
  const [showMobileWarning, setShowMobileWarning] = useState(false)
  
  // Device detection and performance settings
  const deviceIsMobile = isMobile()
  const performanceSettings = getRecommendedSettings()
  const maxStations = performanceSettings.maxVisibleMarkers

  // Update state when stations data becomes available
  useEffect(() => {
    if (stations && stations.length > 0) {
      setSelectedStations(stations)
      if (!compareStation1 && stations[0]) {
        setCompareStation1(stations[0].id)
      }
      if (!compareStation2 && stations[1]) {
        setCompareStation2(stations[1].id)
      }
    }
  }, [stations, compareStation1, compareStation2])

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Stations...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Show empty state
  if (!stations || stations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Stations Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No station data could be loaded. Please check your data source.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleStationToggle = (stationId: string, checked: boolean) => {
    const updatedStations = selectedStations.map((station) => {
      if (station.id === stationId) {
        return { ...station, visible: checked }
      }
      return station
    })
    setSelectedStations(updatedStations)
    onStationChange(updatedStations)
  }

  const handleSelectAll = (checked: boolean) => {
    // Check mobile warning conditions
    if (checked && deviceIsMobile && stations.length > WARNING_THRESHOLDS.MOBILE_STATION_COUNT) {
      setShowMobileWarning(true)
      return
    }
    
    const updatedStations = selectedStations.map((station) => ({
      ...station,
      visible: checked,
    }))
    setSelectedStations(updatedStations)
    onStationChange(updatedStations)
  }
  
  const handleSelectAllWithWarning = () => {
    // Force select all with mobile optimizations
    const updatedStations = selectedStations.map((station) => ({
      ...station,
      visible: true,
    }))
    setSelectedStations(updatedStations)
    onStationChange(updatedStations)
    setShowMobileWarning(false)
  }
  
  const getVisibleStationCount = () => {
    return selectedStations.filter(station => station.visible).length
  }

  const handleCompare = () => {
    if (compareStation1 && compareStation2 && onCompareStations) {
      onCompareStations([compareStation1, compareStation2])
      setCompareMode(true)
    }
  }

  const handleResetCompare = () => {
    setCompareMode(false)
    if (stations && stations.length > 0) {
      onStationChange(stations.map((station) => ({ ...station, visible: false })))
    }
  }

  // Show loading state if stations data is not available
  if (!stations || stations.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">สถานีส่งสัญญาณ</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-0">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">กำลังโหลดข้อมูลสถานี...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">สถานีส่งสัญญาณ</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0">
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="all">แสดงทั้งหมด</TabsTrigger>
            <TabsTrigger value="compare">เปรียบเทียบ</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Mobile Performance Warning */}
            {showMobileWarning && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm">
                  <div className="space-y-2">
                    <p className="font-medium text-orange-800">
                      ⚠️ การแสดงสถานีทั้งหมดอาจทำให้แอปช้าหรือค้างบนมือถือ
                    </p>
                    <p className="text-orange-700">
                      แนะนำให้เลือกเฉพาะสถานีที่ต้องการ (ไม่เกิน {maxStations} สถานี) เพื่อประสิทธิภาพที่ดีที่สุด
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowMobileWarning(false)}
                        className="text-orange-700 border-orange-300"
                      >
                        ยกเลิก
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSelectAllWithWarning}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        เลือกทั้งหมดต่อไป
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Station count and performance indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedStations.every((s) => s.visible)}
                  onCheckedChange={(checked) => handleSelectAll( !!checked)}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  เลือกทั้งหมด
                </Label>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <span className={getVisibleStationCount() > maxStations ? "text-orange-600 font-medium" : ""}>
                  {getVisibleStationCount()}/{stations.length}
                </span>
                {deviceIsMobile && (
                  <span className="ml-2 text-blue-600">
                    (แนะนำ: ≤{maxStations})
                  </span>
                )}
              </div>
            </div>
            
            {/* Performance warning for too many selected stations */}
            {deviceIsMobile && getVisibleStationCount() > maxStations && (
              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                การเลือกสถานีมากเกินไปอาจทำให้แอปทำงานช้า
              </div>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {selectedStations.map((station) => (
                <div key={station.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`station-${station.id}`}
                    checked={station.visible}
                    onCheckedChange={(checked) => handleStationToggle(station.id, !!checked)}
                  />
                  <Label htmlFor={`station-${station.id}`} className="text-sm">
                    {station.name}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">สถานีที่ 1</Label>
                <RadioGroup
                  value={compareStation1}
                  onValueChange={setCompareStation1}
                  className="space-y-2 max-h-[150px] overflow-y-auto pr-2"
                >
                  {(stations || []).map((station) => (
                    <div key={`compare1-${station.id}`} className="flex items-center space-x-2">
                      <Radio value={station.id} id={`compare1-${station.id}`} />
                      <Label htmlFor={`compare1-${station.id}`} className="text-sm">
                        {station.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">สถานีที่ 2</Label>
                <RadioGroup
                  value={compareStation2}
                  onValueChange={setCompareStation2}
                  className="space-y-2 max-h-[150px] overflow-y-auto pr-2"
                >
                  {stations.map((station) => (
                    <div key={`compare2-${station.id}`} className="flex items-center space-x-2">
                      <Radio value={station.id} id={`compare2-${station.id}`} />
                      <Label htmlFor={`compare2-${station.id}`} className="text-sm">
                        {station.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleCompare} className="flex-1" disabled={!compareStation1 || !compareStation2}>
                  เปรียบเทียบ
                </Button>
                {compareMode && (
                  <Button variant="outline" onClick={handleResetCompare}>
                    รีเซ็ต
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
