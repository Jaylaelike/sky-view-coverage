// Image optimization utilities for map overlays

export interface OptimizedImage {
  url: string;
  originalUrl: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

// Cache for optimized images
const imageCache = new Map<string, OptimizedImage>();

// Default optimization options
const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  format: 'jpeg',
};

/**
 * Load an image from URL and return HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    
    img.src = url;
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };
  
  // Scale down if needed
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Optimize a single image
 */
export async function optimizeImage(
  imageUrl: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const cacheKey = `${imageUrl}_${JSON.stringify(options)}`;
  
  // Return cached version if available
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Load original image
    const img = await loadImage(imageUrl);
    
    // Calculate optimized dimensions
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth,
      opts.maxHeight
    );
    
    // Create canvas for optimization
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw and compress image
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to optimized format
    const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 
                     opts.format === 'webp' ? 'image/webp' : 'image/png';
    
    const optimizedDataUrl = canvas.toDataURL(mimeType, opts.quality);
    
    // Calculate approximate size (base64 encoding adds ~33% overhead)
    const size = Math.round((optimizedDataUrl.length * 3) / 4);
    
    const optimizedImage: OptimizedImage = {
      url: optimizedDataUrl,
      originalUrl: imageUrl,
      width,
      height,
      size,
    };
    
    // Cache the result
    imageCache.set(cacheKey, optimizedImage);
    
    // Clean up
    canvas.remove();
    
    return optimizedImage;
    
  } catch (error) {
    console.warn(`Failed to optimize image ${imageUrl}:`, error);
    
    // Return a fallback optimized image object with original URL
    const fallback: OptimizedImage = {
      url: imageUrl,
      originalUrl: imageUrl,
      width: 0,
      height: 0,
      size: 0,
    };
    
    return fallback;
  }
}

/**
 * Optimize multiple images in parallel
 */
export async function optimizeImages(
  imageUrls: string[],
  options: ImageOptimizationOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];
  let completed = 0;
  
  const promises = imageUrls.map(async (url) => {
    try {
      const optimized = await optimizeImage(url, options);
      completed++;
      onProgress?.(completed, imageUrls.length);
      return optimized;
    } catch (error) {
      console.warn(`Failed to optimize image ${url}:`, error);
      completed++;
      onProgress?.(completed, imageUrls.length);
      
      // Return fallback
      return {
        url,
        originalUrl: url,
        width: 0,
        height: 0,
        size: 0,
      };
    }
  });
  
  return Promise.all(promises);
}

/**
 * Preload images for better performance
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Resolve even on error to not block other images
      img.src = url;
    });
  });
  
  return Promise.all(promises);
}

/**
 * Clear image cache to free up memory
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Get cache size information
 */
export function getCacheInfo(): { count: number; totalSize: number } {
  let totalSize = 0;
  
  for (const [, image] of imageCache) {
    totalSize += image.size;
  }
  
  return {
    count: imageCache.size,
    totalSize,
  };
}

/**
 * Remove specific images from cache
 */
export function removeFromCache(originalUrl: string): void {
  const keysToRemove: string[] = [];
  
  for (const [key, image] of imageCache) {
    if (image.originalUrl === originalUrl) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => imageCache.delete(key));
}
