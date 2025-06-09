"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import { 
  MapPin, 
  Navigation, 
  Ruler, 
  Eye, 
  Star, 
  Radio, 
  Building2,
  Target,
  Compass,
  X
} from "lucide-react"
import type { StationDistance } from "@/lib/geo-utils"
import { 
  formatDistance, 
  formatDistanceDetailed,
  calculateAccessibilityScore,
  getCompassDirection 
} from "@/lib/geo-utils"

interface LocationAnalysisProps {
  userLocation: { latitude: number; longitude: number } | null
  nearestStations: StationDistance[]
  onClose: () => void
  onFlyToStation: (station: any) => void
  onToggleLineOfSight: () => void
  showLineOfSight: boolean
}

export default function LocationAnalysis({ 
  userLocation, 
  nearestStations, 
  onClose, 
  onFlyToStation,
  onToggleLineOfSight,
  showLineOfSight 
}: LocationAnalysisProps) {
  const isMobile = useIsMobile()
  
  if (!userLocation || nearestStations.length === 0) {
    return null
  }

  const closestStation = nearestStations[0]

  return (
    <div className={`fixed z-[1000] ${
      isMobile 
        ? 'top-20 left-4 right-4 bottom-4 flex flex-col' 
        : 'top-20 right-4 max-h-[calc(100vh-6rem)]'
    }`}>
      <Card className={`shadow-lg border-0 bg-white/95 backdrop-blur-sm ${
        isMobile ? 'flex-1 flex flex-col h-full' : 'w-96'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              การวิเคราะห์ตำแหน่ง
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Current Location Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="font-mono text-xs">
              {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            </span>
          </div>
        </CardHeader>

        <CardContent className={`space-y-4 ${isMobile ? 'flex-1 overflow-auto' : ''}`}>
        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant={showLineOfSight ? "default" : "outline"}
            size="sm"
            onClick={onToggleLineOfSight}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showLineOfSight ? 'Hide Lines' : 'Show Lines'}
          </Button>
        </div>

        <Separator />

        {/* Closest Station Highlight */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-800">สถานีใกล้ที่สุด / Nearest Station</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {closestStation.station.type === 'technical'
                    ? (closestStation.station.stationNameThai || closestStation.station.stationNameEng || 'Technical Station')
                    : (closestStation.station.name || 'Coverage Area')}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Ruler className="h-3 w-3" />
                  <span>{formatDistanceDetailed(closestStation.distance)}</span>
                  <Compass className="h-3 w-3 ml-1" />
                  <span>{(() => {
                    const compass = getCompassDirection(closestStation.bearing)
                    return `${compass.th} (${compass.bearing}°)`
                  })()}</span>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="mb-1">
                  Score: {calculateAccessibilityScore(closestStation.station, closestStation.distance)}
                </Badge>
                <div className="flex gap-1">
                  {closestStation.station.type === 'technical' ? (
                    <Badge variant="outline" className="text-xs">
                      <Radio className="h-3 w-3 mr-1" />
                      Tech
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      Coverage
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFlyToStation(closestStation.station)}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              บินไปยังสถานี / Fly to Station
            </Button>
          </div>
        </div> 

        <Separator />

        {/* All Nearby Stations */}
        <div>
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Nearby Stations ({nearestStations.length})
          </h4>
          
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {nearestStations.map((item, index) => (
                <div 
                  key={`${item.station.type}-${item.station.id || index}`}
                  className={`p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                    index === 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => onFlyToStation(item.station)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.station.type === 'technical' ? (
                          <Radio className="h-3 w-3 text-orange-600 flex-shrink-0" />
                        ) : (
                          <Building2 className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        )}
                        <p className="font-medium text-xs truncate">
                          {item.station.type === 'technical' 
                            ? (item.station.stationNameThai || item.station.stationNameEng)
                            : item.station.name
                          }
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          {formatDistanceDetailed(item.distance)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Compass className="h-3 w-3" />
                          {(() => {
                            const compass = getCompassDirection(item.bearing)
                            return `${compass.en} (${compass.bearing}°)`
                          })()}
                        </div>
                      </div>
                      
                      {item.station.type === 'technical' && (
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-1">
                          {item.station.height && (
                            <div>Height: {item.station.height}m</div>
                          )}
                          {item.station.maxERP && (
                            <div>Power: {item.station.maxERP}kW</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={item.station.type === 'technical' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.station.type === 'technical' ? 'Tech' : 'Coverage'}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Legend */}
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-xs mb-2">Legend</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Radio className="h-3 w-3 text-orange-600" />
              <span>Technical Station</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-blue-600" />
              <span>Coverage Area</span>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="h-3 w-3" />
              <span>Distance</span>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="h-3 w-3" />
              <span>Direction</span>
            </div>
          </div>
        </div>        </CardContent>
      </Card>
    </div>
  )
}
