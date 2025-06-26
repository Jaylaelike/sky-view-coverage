"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Loader2, ImageIcon, MapPin, AlertCircle, Globe, Layers, Settings, RefreshCw, Satellite, Menu, X } from "lucide-react"
import MapComponent from "@/components/map-component"
import StationSelector from "@/components/station-selector"
import CoverageLegend from "@/components/coverage-legend"
import { useMapData } from "@/hooks/use-map-data"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ImageOverlayData, Station } from "@/types/map"

export default function HomePage() {
  const [overlayData, setOverlayData] = useState<ImageOverlayData | null>(null)
  const [isMapLoading, setIsMapLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const [stationVisibility, setStationVisibility] = useState<Record<string, boolean>>({})
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  
  // Mobile detection hook
  const isMobile = useIsMobile()
  
  // Use optimized data loading hook
  const { 
    stations: rawStations, 
    technicalData, 
    isLoading, 
    isStationsLoading,
    isTechnicalLoading,
    error: dataError, 
    refetch 
  } = useMapData()
  
  const [error, setError] = useState<string | null>(null)

  // Combine stations with visibility state
  const stations = rawStations.map(station => ({
    ...station,
    visible: stationVisibility[station.id] ?? false // Default to not visible
  }))

  // Initialize visibility when stations load
  useEffect(() => {
    if (rawStations.length > 0 && Object.keys(stationVisibility).length === 0) {
      const initialVisibility = rawStations.reduce((acc, station) => {
        acc[station.id] = false // All stations not visible by default
        return acc
      }, {} as Record<string, boolean>)
      setStationVisibility(initialVisibility)
    }
  }, [rawStations, stationVisibility])

  // Combine data error with form errors
  const combinedError = error || dataError

  // Form state with better defaults
  const [imageUrl, setImageUrl] = useState(
    "https://nr7t6rfqta.ufs.sh/f/VK654lgqwb6rs8cifq1FEr3YKvRVfXoLx2IZs87gMTPzA6ui"
  )
  const [swLat, setSwLat] = useState("7.263421835225775")
  const [swLng, setSwLng] = useState("95.87121093657444")
  const [neLat, setNeLat] = useState("13.78782685349949")
  const [neLng, setNeLng] = useState("102.5150760215263")
  const [opacity, setOpacity] = useState(60) // 0-100 scale for better slider control

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
    const opacityNum = opacity / 100 // Convert from 0-100 to 0-1

    if (isNaN(swLatNum) || isNaN(swLngNum) || isNaN(neLatNum) || isNaN(neLngNum)) {
      setError("Please enter valid coordinates")
      return
    }

    if (swLatNum >= neLatNum || swLngNum >= neLngNum) {
      setError("Southwest coordinates must be less than northeast coordinates")
      return
    }

    setIsMapLoading(true)

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
      setIsMapLoading(false)
    }, 500)
  }

  const clearOverlay = () => {
    setOverlayData(null)
    setError(null)
  }

  const handleStationChange = (updatedStations: Station[]) => {
    const newVisibility = updatedStations.reduce((acc, station) => {
      acc[station.id] = station.visible
      return acc
    }, {} as Record<string, boolean>)
    setStationVisibility(newVisibility)
  }

  const handleCompareStations = (stationIds: string[]) => {
    const newVisibility = rawStations.reduce((acc, station) => {
      acc[station.id] = stationIds.includes(station.id)
      return acc
    }, {} as Record<string, boolean>)
    setStationVisibility(newVisibility)
  }

  // Sidebar content component for reuse
  const SidebarContent = () => (
    <div className="space-y-4">
      <Tabs defaultValue="stations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stations" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Stations
          </TabsTrigger>
          <TabsTrigger value="layers" className="flex items-center">
            <Layers className="h-4 w-4 mr-2" />
            Layers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="space-y-4">
          <StationSelector 
            stations={stations} 
            onStationChange={handleStationChange} 
            onCompareStations={handleCompareStations}
            isLoading={isStationsLoading}
          />
        </TabsContent>

        <TabsContent value="layers" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Image Overlay</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {overlayData ? 'Active' : 'Inactive'}
                  </span>
                  <Switch 
                    checked={!!overlayData}
                    onCheckedChange={(checked) => !checked && clearOverlay()}
                    disabled={isMapLoading}
                  />
                </div>
              </div>
              <CardDescription>
                Add a custom image overlay to the map
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="swLat" className="text-xs">SW Latitude</Label>
                  <Input
                    id="swLat"
                    type="number"
                    step="any"
                    value={swLat}
                    onChange={(e) => setSwLat(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swLng" className="text-xs">SW Longitude</Label>
                  <Input
                    id="swLng"
                    type="number"
                    step="any"
                    value={swLng}
                    onChange={(e) => setSwLng(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="neLat" className="text-xs">NE Latitude</Label>
                  <Input
                    id="neLat"
                    type="number"
                    step="any"
                    value={neLat}
                    onChange={(e) => setNeLat(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neLng" className="text-xs">NE Longitude</Label>
                  <Input
                    id="neLng"
                    type="number"
                    step="any"
                    value={neLng}
                    onChange={(e) => setNeLng(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Opacity: {opacity}%</span>
                </div>
                <Slider
                  value={[opacity]}
                  onValueChange={([value]) => setOpacity(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="py-2"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <Button 
                  onClick={handleAddOverlay}
                  className="flex-1"
                  disabled={isMapLoading}
                >
                  {isMapLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Apply Overlay'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearOverlay}
                  disabled={!overlayData || isMapLoading}
                >
                  Clear
                </Button>
              </div>

              {error && (
                <div className="text-sm text-destructive inline-flex items-center mt-2">
                  <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[1001]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="mr-2 md:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SkyView Coverage
            </h1>
            <Badge variant="outline" className="ml-2">Beta</Badge>
          </div>
          
          {/* Data Loading Status */}
          <div className="flex items-center space-x-4">
            {(isStationsLoading || isTechnicalLoading) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading data...
              </div>
            )}
            
            {!isLoading && (
              <div className="flex items-center gap-4 text-xs">
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {stations.length} Stations
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Satellite className="h-3 w-3" />
                  {technicalData.length} Technical Points
                </Badge>
              </div>
            )}
            
            {combinedError && (
              <Button variant="outline" size="sm" onClick={refetch} className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </div>
        
        {/* Error Banner */}
        {combinedError && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
            <div className="container mx-auto flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {combinedError}
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Mobile Sheet */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-80 p-4">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Station Controls
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar - Hidden on Mobile */}
        <aside className="hidden md:flex w-80 border-r bg-card/50 backdrop-blur-sm overflow-y-auto p-4">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className={`flex-1 relative ${isMobile ? 'bg-black' : 'bg-muted/20'}`}>
          <MapComponent 
            stations={stations} 
            overlayData={overlayData} 
            technicalData={technicalData}
            isLoading={isLoading} 
            isDataLoading={isLoading}
            isOverlayLoading={isMapLoading}
          />
          
          {/* Mobile Floating Action Button */}
          {isMobile && !isMobileSidebarOpen && (
            <Button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="fixed bottom-6 left-6 z-[1000] rounded-full shadow-lg bg-primary hover:bg-primary/90 size-14 p-0"
              size="lg"
            >
              <div className="flex flex-col items-center">
                <MapPin className="h-5 w-5" />
                <span className="text-xs font-medium">
                  {stations.filter(s => s.visible).length}
                </span>
              </div>
            </Button>
          )}
          
          {/* Status Bar */}
          {/* <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full border shadow-sm flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
              <span>Connected</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div>
              {stations.filter(s => s.visible).length} of {stations.length} stations visible
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div>
              {overlayData ? 'Overlay: Active' : 'Overlay: Inactive'}
            </div>
          </div> */}
        </main>
      </div>
    </div>
  )
}
