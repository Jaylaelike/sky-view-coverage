"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageOverlayLoadingDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  loadingCount?: number
  totalImages?: number
  currentImageUrl?: string
  error?: string | null
  onCancel?: () => void
}

export default function ImageOverlayLoadingDialog({
  open,
  onOpenChange,
  loadingCount = 0,
  totalImages = 1,
  currentImageUrl,
  error,
  onCancel
}: ImageOverlayLoadingDialogProps) {
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState("กำลังเตรียมข้อมูล...")
  const [isCompleted, setIsCompleted] = useState(false)

  // Calculate progress
  useEffect(() => {
    if (loadingCount > 0) {
      const currentProgress = ((totalImages - loadingCount) / totalImages) * 100
      setProgress(currentProgress)
      
      if (currentProgress === 0) {
        setLoadingText("กำลังเริ่มโหลดภาพ...")
        setIsCompleted(false)
      } else if (currentProgress === 100) {
        setLoadingText("โหลดภาพเสร็จสิ้น!")
        setIsCompleted(true)
        // Auto close after 1 second when completed
        setTimeout(() => {
          onOpenChange?.(false)
        }, 1000)
      } else {
        setLoadingText(`กำลังโหลดภาพ ${totalImages - loadingCount}/${totalImages}...`)
        setIsCompleted(false)
      }
    } else if (loadingCount === 0 && totalImages > 0) {
      setProgress(100)
      setLoadingText("โหลดภาพเสร็จสิ้น!")
      setIsCompleted(true)
    }
  }, [loadingCount, totalImages, onOpenChange])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setProgress(0)
      setLoadingText("กำลังเตรียมข้อมูล...")
      setIsCompleted(false)
    }
  }, [open])


  const getIcon = () => {
    if (error) return <AlertCircle className="h-8 w-8 text-destructive animate-pulse" />
    if (isCompleted) return <CheckCircle2 className="h-8 w-8 text-green-500" />
    return <Loader2 className="h-8 w-8 text-primary animate-spin" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideCloseButton={!error && !isCompleted}>
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          
          <DialogTitle className="text-lg">
            {error ? "เกิดข้อผิดพลาด" : isCompleted ? "โหลดภาพสำเร็จ" : "กำลังโหลดภาพซ้อนทับ"}
          </DialogTitle>
          
          <DialogDescription className="text-base">
            {error ? error : loadingText}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          {!error && (
            <div className="space-y-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress)}%</span>
                <span>{totalImages - loadingCount}/{totalImages} ภาพ</span>
              </div>
            </div>
          )}

          {/* Current Image Info */}
          {currentImageUrl && !error && !isCompleted && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">กำลังโหลด:</p>
                <p className="text-xs text-muted-foreground truncate" title={currentImageUrl}>
                  {currentImageUrl}
                </p>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {!error && !isCompleted && (
            <div className="flex justify-center py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {error && (
              <Button 
                variant="outline" 
                onClick={() => onOpenChange?.(false)}
                className="flex-1"
              >
                ปิด
              </Button>
            )}
            
            {!error && !isCompleted && onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            )}
            
            {isCompleted && (
              <Button 
                onClick={() => onOpenChange?.(false)}
                className="flex-1"
              >
                เสร็จสิ้น
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}