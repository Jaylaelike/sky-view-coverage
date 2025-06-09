"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { coverageLevels } from "@/data/coveragelevel"

export default function CoverageLegend() {
  const [isVisible, setIsVisible] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="absolute top-20 right-4 z-[999] bg-white shadow-lg hover:bg-gray-100 px-3 py-2"
      >
        <Eye className="h-4 w-4 mr-2" />
        แสดงคำอธิบาย
      </Button>
    )
  }

  return (
    <div className="absolute top-20 right-4 z-[999] bg-white shadow-lg rounded-lg border border-gray-200 max-w-xs">
      {/* Header with collapse/close buttons */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">ระดับความแรงของสัญญาณ</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0 hover:bg-gray-100"
            title={isCollapsed ? "ขยาย" : "ย่อ"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0 hover:bg-gray-100"
            title="ปิด"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3">
          <p className="text-xs text-gray-600 mb-3">คำอธิบายสีที่แสดงระดับความแรงของสัญญาณในแผนที่</p>
          <div className="space-y-2">
            {coverageLevels.map((level) => (
              <div key={level.level} className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded border border-gray-300"
                  style={{
                    backgroundColor: level.color,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900">{level.level}</div>
                  <div className="text-xs text-gray-600 truncate">{level.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
