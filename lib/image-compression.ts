import imageCompression from "browser-image-compression"

// Default compression options optimized for map overlays
export const DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // Max file size in MB
  maxWidthOrHeight: 1920, // Max width or height  
  useWebWorker: true, // Use web worker for better performance
  preserveExif: false, // Remove EXIF data to reduce size
  fileType: 'image/webp', // Use WebP format for better compression
  initialQuality: 0.85, // High quality setting (0.1 to 1.0)
  alwaysKeepResolution: true, // P
}

// Alternative options for high-quality overlays
export const HIGH_QUALITY_COMPRESSION_OPTIONS = {
  maxSizeMB: 1.0,
  maxWidthOrHeight: 2560,
  useWebWorker: true,
  preserveExif: false,
  fileType: 'image/webp',
  initialQuality: 0.85, // High quality setting (0.1 to 1.0)
  alwaysKeepResolution: true, // P
}

// Cache for compressed images to avoid re-compression
export const compressedImageCache = new Map<string, string>()

/**
 * Compress an image file with specified options
 * @param file - The image file to compress
 * @param options - Compression options (defaults to DEFAULT_COMPRESSION_OPTIONS)
 * @returns Promise<File> - The compressed image file
 */
export async function compressImage(
  file: File, 
  options = DEFAULT_COMPRESSION_OPTIONS
): Promise<File> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image')
    }

    const compressedFile = await imageCompression(file, options)
    
    console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    throw error
  }
}

/**
 * Convert image URL to compressed blob URL
 * @param imageUrl - The URL of the image to compress
 * @param options - Compression options (defaults to DEFAULT_COMPRESSION_OPTIONS)
 * @returns Promise<string> - The blob URL of the compressed image
 */
export async function compressImageFromUrl(
  imageUrl: string,
  options = DEFAULT_COMPRESSION_OPTIONS
): Promise<string> {
  // Check cache first
  if (compressedImageCache.has(imageUrl)) {
    return compressedImageCache.get(imageUrl)!
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // Check if it's an image
    if (!blob.type.startsWith('image/')) {
      console.warn(`URL ${imageUrl} is not an image, using original`)
      return imageUrl
    }

    // Compress the image
    const compressedBlob = await imageCompression(blob as File, options)
    
    // Create blob URL for the compressed image
    const compressedBlobUrl = URL.createObjectURL(compressedBlob)
    
    // Cache the result
    compressedImageCache.set(imageUrl, compressedBlobUrl)
    
    console.log(`Image compressed from URL: ${(blob.size / 1024 / 1024).toFixed(2)}MB → ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`)
    
    return compressedBlobUrl
  } catch (error) {
    console.error(`Failed to compress image ${imageUrl}:`, error)
    // Return original URL on error
    return imageUrl
  }
}

/**
 * Clear all cached compressed images and revoke blob URLs
 */
export function clearCompressedImageCache(): void {
  for (const blobUrl of compressedImageCache.values()) {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl)
    }
  }
  compressedImageCache.clear()
}

/**
 * Get cache statistics
 */
export function getCompressionCacheStats(): {
  totalCached: number
  cacheSize: string
} {
  return {
    totalCached: compressedImageCache.size,
    cacheSize: `${compressedImageCache.size} URLs cached`
  }
}
