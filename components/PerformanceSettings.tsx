"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Zap, 
  Monitor, 
  Smartphone, 
  AlertTriangle,
  Info,
  RotateCcw
} from "lucide-react"
import { 
  getDeviceType, 
  getPerformanceTier, 
  getRecommendedSettings,
  isMobile 
} from "@/utils/deviceDetection"

interface PerformanceSettingsProps {
  onSettingsChange?: (settings: any) => void
  currentStats?: any
  isOpen?: boolean
  onClose?: () => void
}

export default function PerformanceSettings({ 
  onSettingsChange, 
  currentStats,
  isOpen = false,
  onClose 
}: PerformanceSettingsProps) {
  const [settings, setSettings] = useState(() => getRecommendedSettings())
  const [isPerformanceMode, setIsPerformanceMode] = useState(false)
  const [autoOptimize, setAutoOptimize] = useState(true)
  
  // Device info
  const deviceType = getDeviceType()
  const performanceTier = getPerformanceTier()
  const mobile = isMobile()
  
  useEffect(() => {
    const recommended = getRecommendedSettings()
    setSettings(recommended)
    setIsPerformanceMode(recommended.enableProgressiveLoading)
  }, [])

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    if (onSettingsChange) {
      onSettingsChange(newSettings)
    }
  }

  const enablePerformanceMode = () => {
    const performanceSettings = {
      ...settings,
      maxVisibleMarkers: mobile ? 20 : 100,
      enableClustering: true,
      enableProgressiveLoading: true,
      enableAnimations: false,
      compressionQuality: 0.3,
      debounceDelay: 300
    }
    
    setSettings(performanceSettings)
    setIsPerformanceMode(true)
    
    if (onSettingsChange) {
      onSettingsChange(performanceSettings)
    }
  }

  const resetToRecommended = () => {
    const recommended = getRecommendedSettings()
    setSettings(recommended)
    setIsPerformanceMode(recommended.enableProgressiveLoading)
    
    if (onSettingsChange) {
      onSettingsChange(recommended)
    }
  }

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Monitor className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  const getTierColor = () => {
    switch (performanceTier) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              ตั้งค่าประสิทธิภาพ
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          {/* Device Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {getDeviceIcon()}
              <span className="capitalize">{deviceType}</span>
            </div>
            <Badge className={getTierColor()}>
              {performanceTier} performance
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <Label className="text-base font-medium">การตั้งค่าด่วน</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant={isPerformanceMode ? "default" : "outline"}
                onClick={enablePerformanceMode}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">โหมดประสิทธิภาพ</span>
                </div>
                <span className="text-xs text-left opacity-80">
                  เหมาะสำหรับมือถือและอุปกรณ์สมรรถนะต่ำ
                </span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={resetToRecommended}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4" />
                  <span className="font-medium">ค่าเริ่มต้น</span>
                </div>
                <span className="text-xs text-left opacity-80">
                  รีเซ็ตเป็นค่าที่แนะนำสำหรับอุปกรณ์นี้
                </span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Performance Stats */}
          {currentStats && (
            <div className="space-y-3">
              <Label className="text-base font-medium">สถานะปัจจุบัน</Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">สถานีทั้งหมด</div>
                  <div className="font-medium">{currentStats.totalStations}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">แสดงอยู่</div>
                  <div className="font-medium">{currentStats.renderedStations}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">คลัสเตอร์</div>
                  <div className="font-medium">{currentStats.renderedClusters || 0}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">ซูมปัจจุบัน</div>
                  <div className="font-medium">{currentStats.currentZoom}</div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Detailed Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">การตั้งค่าละเอียด</Label>
            
            {/* Max Visible Markers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">จำนวนสถานีสูงสุด</Label>
                <span className="text-sm text-muted-foreground">{settings.maxVisibleMarkers}</span>
              </div>
              <Slider
                value={[settings.maxVisibleMarkers]}
                onValueChange={(value) => handleSettingChange('maxVisibleMarkers', value[0])}
                max={mobile ? 100 : 1000}
                min={10}
                step={10}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                แนะนำ: {mobile ? "≤50" : "≤500"} สำหรับ{deviceType}
              </div>
            </div>

            {/* Clustering */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">เปิดใช้การจัดกลุ่ม</Label>
                <div className="text-xs text-muted-foreground">
                  รวมสถานีใกล้เคียงเป็นกลุ่มเดียว
                </div>
              </div>
              <Switch
                checked={settings.enableClustering}
                onCheckedChange={(checked) => handleSettingChange('enableClustering', checked)}
              />
            </div>

            {/* Progressive Loading */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">โหลดแบบค่อยเป็นค่อยไป</Label>
                <div className="text-xs text-muted-foreground">
                  โหลดสถานีเป็นชุดเพื่อป้องกันการค้าง
                </div>
              </div>
              <Switch
                checked={settings.enableProgressiveLoading}
                onCheckedChange={(checked) => handleSettingChange('enableProgressiveLoading', checked)}
              />
            </div>

            {/* Animations */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">เปิดใช้แอนิเมชัน</Label>
                <div className="text-xs text-muted-foreground">
                  แอนิเมชันการเคลื่อนไหวและการซูม
                </div>
              </div>
              <Switch
                checked={settings.enableAnimations}
                onCheckedChange={(checked) => handleSettingChange('enableAnimations', checked)}
              />
            </div>

            {/* Image Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">คุณภาพภาพ</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(settings.compressionQuality * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.compressionQuality]}
                onValueChange={(value) => handleSettingChange('compressionQuality', value[0])}
                max={1}
                min={0.1}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                คุณภาพต่ำ = โหลดเร็วกว่า, คุณภาพสูง = ภาพชัดกว่า
              </div>
            </div>

            {/* Auto-optimization */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">ปรับปรุงประสิทธิภาพอัตโนมัติ</Label>
                <div className="text-xs text-muted-foreground">
                  ปรับการตั้งค่าอัตโนมัติเมื่อประสิทธิภาพต่ำ
                </div>
              </div>
              <Switch
                checked={autoOptimize}
                onCheckedChange={setAutoOptimize}
              />
            </div>
          </div>

          {/* Warnings */}
          {mobile && settings.maxVisibleMarkers > 50 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800">คำเตือน</div>
                  <div className="text-orange-700">
                    การตั้งค่าจำนวนสถานีสูงอาจทำให้แอปทำงานช้าหรือค้างบนมือถือ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                การตั้งค่าจะมีผลทันทีและจัดเก็บไว้ในอุปกรณ์ของคุณ
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}