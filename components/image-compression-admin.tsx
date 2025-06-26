"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, FileImage, Trash2 } from "lucide-react"
import { 
  compressImage, 
  DEFAULT_COMPRESSION_OPTIONS, 
  HIGH_QUALITY_COMPRESSION_OPTIONS,
  getCompressionCacheStats,
  clearCompressedImageCache
} from "@/lib/image-compression"

interface CompressedImageResult {
  originalFile: File
  compressedFile: File
  originalSize: number
  compressedSize: number
  compressionRatio: number
  previewUrl: string
}

export default function ImageCompressionAdmin() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [compressedResults, setCompressedResults] = useState<CompressedImageResult[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [useHighQuality, setUseHighQuality] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length !== files.length) {
      setError('Some files were skipped because they are not images')
    } else {
      setError(null)
    }

    setSelectedFiles(imageFiles)
    setCompressedResults([]) // Clear previous results
  }

  const compressAllImages = async () => {
    if (selectedFiles.length === 0) return

    setIsCompressing(true)
    setError(null)
    setCompressionProgress(0)

    const results: CompressedImageResult[] = []
    const options = useHighQuality ? HIGH_QUALITY_COMPRESSION_OPTIONS : DEFAULT_COMPRESSION_OPTIONS

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        try {
          const compressedFile = await compressImage(file, options)
          const previewUrl = URL.createObjectURL(compressedFile)
          
          const result: CompressedImageResult = {
            originalFile: file,
            compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            compressionRatio: ((file.size - compressedFile.size) / file.size) * 100,
            previewUrl
          }
          
          results.push(result)
        } catch (fileError) {
          console.error(`Failed to compress ${file.name}:`, fileError)
          setError(`Failed to compress ${file.name}: ${fileError}`)
        }

        setCompressionProgress(((i + 1) / selectedFiles.length) * 100)
      }

      setCompressedResults(results)
    } catch (error) {
      console.error('Compression failed:', error)
      setError(`Compression failed: ${error}`)
    } finally {
      setIsCompressing(false)
    }
  }

  const downloadCompressedImage = (result: CompressedImageResult) => {
    const link = document.createElement('a')
    link.href = result.previewUrl
    link.download = `compressed_${result.originalFile.name}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadAllCompressed = () => {
    compressedResults.forEach(result => {
      downloadCompressedImage(result)
    })
  }

  const clearResults = () => {
    // Revoke all preview URLs to prevent memory leaks
    compressedResults.forEach(result => {
      URL.revokeObjectURL(result.previewUrl)
    })
    
    setCompressedResults([])
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearCache = () => {
    clearCompressedImageCache()
    setError(null)
  }

  const cacheStats = getCompressionCacheStats()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Image Compression Tool
          </CardTitle>
          <CardDescription>
            Compress overlay images for optimal map performance. Compressed images load faster and use less bandwidth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file-input">Select Images</Label>
            <Input
              id="file-input"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedFiles.length} file(s) selected
              </p>
            )}
          </div>

          {/* Compression Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useHighQuality}
                onChange={(e) => setUseHighQuality(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">High Quality Mode (larger file size)</span>
            </label>
          </div>

          {/* Compression Controls */}
          <div className="flex gap-2">
            <Button
              onClick={compressAllImages}
              disabled={selectedFiles.length === 0 || isCompressing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isCompressing ? 'Compressing...' : 'Compress Images'}
            </Button>
            
            {compressedResults.length > 0 && (
              <>
                <Button
                  onClick={downloadAllCompressed}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download All
                </Button>
                <Button
                  onClick={clearResults}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {isCompressing && (
            <div className="space-y-2">
              <Progress value={compressionProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(compressionProgress)}% Complete
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {compressedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compression Results</CardTitle>
            <CardDescription>
              Review and download your compressed images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {compressedResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={result.previewUrl}
                      alt={`Compressed ${result.originalFile.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className="font-medium truncate" title={result.originalFile.name}>
                      {result.originalFile.name}
                    </p>
                    <p className="text-muted-foreground">
                      Original: {(result.originalSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-muted-foreground">
                      Compressed: {(result.compressedSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-green-600 font-medium">
                      Saved: {result.compressionRatio.toFixed(1)}%
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => downloadCompressedImage(result)}
                    size="sm"
                    className="w-full"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Manage the image compression cache
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {cacheStats.cacheSize}
            </div>
            <Button onClick={clearCache} variant="outline" size="sm">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
