"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Station } from "@/types/map"
import { Radio, RadioGroup } from "@/components/ui/radio-group"

interface StationSelectorProps {
  stations: Station[]
  onStationChange: (stations: Station[]) => void
  onCompareStations: (stationIds: string[]) => void
}

export default function StationSelector({ stations, onStationChange, onCompareStations }: StationSelectorProps) {
  const [selectedStations, setSelectedStations] = useState<Station[]>(stations || [])
  const [compareMode, setCompareMode] = useState(false)
  const [compareStation1, setCompareStation1] = useState<string>(stations?.[0]?.id || "")
  const [compareStation2, setCompareStation2] = useState<string>(stations?.[1]?.id || "")

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
    const updatedStations = selectedStations.map((station) => ({
      ...station,
      visible: checked,
    }))
    setSelectedStations(updatedStations)
    onStationChange(updatedStations)
  }

  const handleCompare = () => {
    if (compareStation1 && compareStation2) {
      onCompareStations([compareStation1, compareStation2])
      setCompareMode(true)
    }
  }

  const handleResetCompare = () => {
    setCompareMode(false)
    if (stations && stations.length > 0) {
      onStationChange(stations.map((station) => ({ ...station, visible: true })))
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedStations.every((s) => s.visible)}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                เลือกทั้งหมด
              </Label>
            </div>

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
