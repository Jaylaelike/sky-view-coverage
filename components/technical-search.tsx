"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Zap, Building2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TechnicalData } from "@/types/map"

interface TechnicalSearchProps {
  technicalData: TechnicalData[]
  onLocationSelect: (data: TechnicalData) => void
  className?: string
}

export default function TechnicalSearch({ technicalData, onLocationSelect, className }: TechnicalSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedItems, setSelectedItems] = useState<TechnicalData[]>([])

  // Memoized search results for better performance
  const searchResults = useMemo(() => {
    if (!searchValue.trim()) return []
    
    const query = searchValue.toLowerCase().trim()
    
    // Debug: Log first item to see actual data structure
    if (technicalData.length > 0 && searchValue.length > 0) {
      console.log('Search query:', query)
      console.log('Sample data item:', technicalData[0])
      console.log('Total technical data items:', technicalData.length)
    }
    
    return technicalData
      .filter((item) => {
        // Search across ALL fields in TechnicalData with debugging
        const searchableFields = [
          String(item.stationNameThai || ''),
          String(item.stationNameEng || ''),
          String(item.location || ''),
          String(item.stationType || ''),
          String(item.address || ''),
          String(item.owner || ''),
          String(item.engineeringCenter || ''),
          String(item.responsibleEntity || ''),
          String(item.antType1 || ''),
          String(item.antType2 || ''),
          String(item.antBrand || ''),
          String(item.hrp || ''),
          String(item.beamTilt || ''),
          String(item.id || ''),
          // Include numeric fields as strings
          String(item.latitude || ''),
          String(item.longitude || ''),
          String(item.height || ''),
          String(item.maxERP || ''),
          String(item.feederLoss || '')
        ]
        
        // Debug: Check which fields match for the first few items
        const matches = searchableFields.some(field => {
          const fieldLower = field.toLowerCase()
          const isMatch = fieldLower.includes(query)
          if (isMatch) {
            console.log(`Match found in field "${field}" for query "${query}"`)
          }
          return isMatch
        })
        
        if (matches) {
          console.log(`Item matched:`, item.stationNameThai || item.stationNameEng)
        }
        
        return matches
      })
      .slice(0, 30) // Increased limit for more comprehensive search
      .sort((a, b) => {
        const query = searchValue.toLowerCase().trim()
        
        // Enhanced scoring system for relevance across all fields
        const getRelevanceScore = (item: TechnicalData) => {
          let score = 0
          
          // Station names (highest priority)
          const stationNameThai = (item.stationNameThai || '').toLowerCase()
          const stationNameEng = (item.stationNameEng || '').toLowerCase()
          
          if (stationNameThai === query) score += 100
          else if (stationNameThai.startsWith(query)) score += 85
          else if (stationNameThai.includes(query)) score += 70
          
          if (stationNameEng === query) score += 95
          else if (stationNameEng.startsWith(query)) score += 80
          else if (stationNameEng.includes(query)) score += 65
          
          // Location and address (high priority)
          const location = (item.location || '').toLowerCase()
          const address = (item.address || '').toLowerCase()
          
          if (location === query) score += 60
          else if (location.startsWith(query)) score += 50
          else if (location.includes(query)) score += 40
          
          if (address.includes(query)) score += 35
          
          // Station type and technical specs (medium priority)
          const stationType = (item.stationType || '').toLowerCase()
          const owner = (item.owner || '').toLowerCase()
          const engineeringCenter = (item.engineeringCenter || '').toLowerCase()
          const responsibleEntity = (item.responsibleEntity || '').toLowerCase()
          
          if (stationType === query) score += 45
          else if (stationType.includes(query)) score += 30
          
          if (owner.includes(query)) score += 25
          if (engineeringCenter.includes(query)) score += 25
          if (responsibleEntity.includes(query)) score += 25
          
          // Antenna and technical details (lower priority)
          const antType1 = (item.antType1 || '').toLowerCase()
          const antType2 = (item.antType2 || '').toLowerCase()
          const antBrand = (item.antBrand || '').toLowerCase()
          const hrp = (item.hrp || '').toLowerCase()
          const beamTilt = (item.beamTilt || '').toLowerCase()
          
          if (antType1.includes(query)) score += 20
          if (antType2.includes(query)) score += 20
          if (antBrand.includes(query)) score += 15
          if (hrp.includes(query)) score += 15
          if (beamTilt.includes(query)) score += 10
          
          // Numeric fields (lowest priority but still searchable)
          const numericFields = [
            item.latitude?.toString() || '',
            item.longitude?.toString() || '',
            item.height?.toString() || '',
            item.maxERP?.toString() || '',
            item.feederLoss?.toString() || ''
          ]
          
          numericFields.forEach(field => {
            if (field.includes(query)) score += 5
          })
          
          // ID exact match (for technical searches)
          if ((item.id || '').toLowerCase() === query) score += 50
          
          return score
        }
        
        return getRelevanceScore(b) - getRelevanceScore(a)
      })
  }, [technicalData, searchValue])

  // Helper function to detect which field matches the search query
  const getMatchingFields = useCallback((item: TechnicalData, query: string) => {
    const matches: string[] = []
    const queryLower = query.toLowerCase()
    
    if ((item.stationNameThai || '').toLowerCase().includes(queryLower)) matches.push('ชื่อสถานี (ไทย)')
    if ((item.stationNameEng || '').toLowerCase().includes(queryLower)) matches.push('ชื่อสถานี (อังกฤษ)')
    if ((item.location || '').toLowerCase().includes(queryLower)) matches.push('พื้นที่')
    if ((item.stationType || '').toLowerCase().includes(queryLower)) matches.push('ประเภทสถานี')
    if ((item.address || '').toLowerCase().includes(queryLower)) matches.push('ที่อยู่')
    if ((item.owner || '').toLowerCase().includes(queryLower)) matches.push('เจ้าของ')
    if ((item.engineeringCenter || '').toLowerCase().includes(queryLower)) matches.push('ศูนย์วิศวกรรม')
    if ((item.responsibleEntity || '').toLowerCase().includes(queryLower)) matches.push('หน่วยงานรับผิดชอบ')
    if ((item.antType1 || '').toLowerCase().includes(queryLower)) matches.push('ประเภทเสาอากาศ 1')
    if ((item.antType2 || '').toLowerCase().includes(queryLower)) matches.push('ประเภทเสาอากาศ 2')
    if ((item.antBrand || '').toLowerCase().includes(queryLower)) matches.push('ยี่ห้อเสาอากาศ')
    if ((item.hrp || '').toLowerCase().includes(queryLower)) matches.push('HRP')
    if ((item.beamTilt || '').toLowerCase().includes(queryLower)) matches.push('Beam Tilt')
    if ((item.id || '').toLowerCase().includes(queryLower)) matches.push('ID')
    
    // Check numeric fields
    if ((item.latitude?.toString() || '').includes(queryLower)) matches.push('ละติจูด')
    if ((item.longitude?.toString() || '').includes(queryLower)) matches.push('ลองจิจูด')
    if ((item.height?.toString() || '').includes(queryLower)) matches.push('ความสูง')
    if ((item.maxERP?.toString() || '').includes(queryLower)) matches.push('กำลังส่งสูงสุด')
    if ((item.feederLoss?.toString() || '').includes(queryLower)) matches.push('Feeder Loss')
    
    return matches
  }, [])

  // Helper function to highlight matching text
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">{part}</span>
      ) : part
    )
  }, [])

  // Handle item selection
  const handleSelectItem = useCallback((item: TechnicalData) => {
    setSelectedItems(prev => {
      const isAlreadySelected = prev.some(selected => selected.id === item.id)
      if (isAlreadySelected) {
        return prev.filter(selected => selected.id !== item.id)
      }
      return [...prev, item]
    })
  }, [])

  // Handle fly to location
  const handleFlyToLocation = useCallback((item: TechnicalData) => {
    onLocationSelect(item)
    setOpen(false)
  }, [onLocationSelect])

  // Remove selected item
  const removeSelectedItem = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  // Clear all selections
  const clearAll = useCallback(() => {
    setSelectedItems([])
    setSearchValue("")
  }, [])

  // Get station type icon
  const getStationTypeIcon = (stationType: string) => {
    if (stationType?.toLowerCase().includes('tv')) return "📺"
    if (stationType?.toLowerCase().includes('radio') || stationType?.toLowerCase().includes('fm')) return "📻"
    if (stationType?.toLowerCase().includes('community')) return "🏘️"
    return "📡"
  }

  // Get station type color
  const getStationTypeColor = (stationType: string) => {
    if (stationType?.toLowerCase().includes('tv')) return "bg-purple-100 text-purple-800"
    if (stationType?.toLowerCase().includes('radio') || stationType?.toLowerCase().includes('fm')) return "bg-green-100 text-green-800"
    if (stationType?.toLowerCase().includes('community')) return "bg-orange-100 text-orange-800"
    return "bg-blue-100 text-blue-800"
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      {/* Search Input */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white shadow-lg border-gray-200 hover:border-blue-300 focus:border-blue-500"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 truncate">
                {searchValue ? `ค้นหา: ${searchValue}` : "ค้นหาสถานีเทคนิค..."}
              </span>
            </div>
            {selectedItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                {selectedItems.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" side="bottom" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="ค้นหาด้วยชื่อสถานี, ประเภท, พื้นที่, เจ้าของ, หรือข้อมูลเทคนิค..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="border-0 focus:ring-0"
            />
            <CommandList className="max-h-80">
              <CommandEmpty>
                <div className="text-center py-6 text-gray-500">
                  {searchValue ? "ไม่พบสถานีที่ค้นหา" : "พิมพ์ชื่อสถานีเพื่อค้นหา"}
                </div>
              </CommandEmpty>
              
              {searchResults.length > 0 && (
                <CommandGroup heading={`ผลการค้นหา (${searchResults.length})`}>
                  {searchResults.map((item) => {
                    const isSelected = selectedItems.some(selected => selected.id === item.id)
                    
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.stationNameThai} ${item.stationNameEng} ${item.location} ${item.stationType} ${item.owner} ${item.id}`.toLowerCase()}
                        onSelect={() => handleSelectItem(item)}
                        className="flex items-start gap-3 p-3 cursor-pointer"
                      >
                        <div className="flex-shrink-0 text-lg">
                          {getStationTypeIcon(item.stationType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              {/* Primary station name (Thai) */}
                              <p className="font-medium text-gray-900 truncate">
                                {highlightMatch(item.stationNameThai || item.stationNameEng, searchValue)}
                              </p>
                              {/* Secondary station name (English) if different */}
                              {item.stationNameThai && item.stationNameEng && 
                               item.stationNameThai !== item.stationNameEng && (
                                <p className="text-sm text-gray-600 truncate">
                                  {highlightMatch(item.stationNameEng, searchValue)}
                                </p>
                              )}
                              
                              {/* Show matched fields indicators */}
                              {searchValue && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {getMatchingFields(item, searchValue).slice(0, 3).map((field, index) => (
                                    <span 
                                      key={index}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"
                                    >
                                      {field}
                                    </span>
                                  ))}
                                  {getMatchingFields(item, searchValue).length > 3 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      +{getMatchingFields(item, searchValue).length - 3} อื่นๆ
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", getStationTypeColor(item.stationType))}
                              >
                                {item.stationType}
                              </Badge>
                              {isSelected && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-600">
                            <p className="truncate">{highlightMatch(item.location, searchValue)}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {item.maxERP} kW
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFlyToLocation(item)
                            }}
                            className="mt-2 h-6 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1"
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            ไปยังตำแหน่ง
                          </Button>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              สถานีที่เลือก ({selectedItems.length})
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearAll}
              className="h-6 text-xs text-gray-600 hover:text-gray-800"
            >
              <X className="h-3 w-3 mr-1" />
              ล้างทั้งหมด
            </Button>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-2 rounded border text-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-base flex-shrink-0">
                    {getStationTypeIcon(item.stationType)}
                  </span>
                  <span className="font-medium truncate">
                    {item.stationNameThai || item.stationNameEng}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs flex-shrink-0", getStationTypeColor(item.stationType))}
                  >
                    {item.stationType}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFlyToLocation(item)}
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    title="ไปยังตำแหน่ง"
                  >
                    <MapPin className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSelectedItem(item.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    title="ลบออก"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
