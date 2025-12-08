import { type LogoStyle } from '@/components/Logo'

/**
 * Updates the favicon dynamically based on the selected logo style or image
 */
export function updateFavicon(style: LogoStyle): void {
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll('link[rel*="icon"]')
  existingLinks.forEach(link => link.remove())

  // Create SVG favicon based on logo style
  const svg = generateFaviconSVG(style)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  // Create and add new favicon link
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  link.href = url
  document.head.appendChild(link)

  // Also update apple-touch-icon for iOS
  const appleLink = document.createElement('link')
  appleLink.rel = 'apple-touch-icon'
  appleLink.href = url
  document.head.appendChild(appleLink)

  // Clean up old blob URLs after a delay
  setTimeout(() => {
    existingLinks.forEach((oldLink) => {
      const oldHref = oldLink.getAttribute('href')
      if (oldHref?.startsWith('blob:')) {
        URL.revokeObjectURL(oldHref)
      }
    })
  }, 100)
}

/**
 * Updates the favicon with a custom image URL
 * Converts the image to a properly sized canvas for better favicon display
 */
export function updateFaviconWithImage(imageUrl: string): void {
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll('link[rel*="icon"]')
  existingLinks.forEach(link => link.remove())

  // Create an image element to load the logo
  const img = new Image()
  img.crossOrigin = 'anonymous'
  
  img.onload = () => {
    // Create canvas to resize and optimize the image for favicon
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return
    
    // Set canvas size to standard favicon sizes
    const sizes = [16, 32, 48, 64]
    
    sizes.forEach(size => {
      canvas.width = size
      canvas.height = size
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size)
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Draw image centered and scaled to fit
      const scale = Math.min(size / img.width, size / img.height)
      const x = (size - img.width * scale) / 2
      const y = (size - img.height * scale) / 2
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png')
      
      // Create and add favicon link
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      link.sizes = `${size}x${size}`
      link.href = dataUrl
      document.head.appendChild(link)
    })
    
    // Add apple-touch-icon (larger size for iOS)
    canvas.width = 180
    canvas.height = 180
    ctx.clearRect(0, 0, 180, 180)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    const scale = Math.min(180 / img.width, 180 / img.height)
    const x = (180 - img.width * scale) / 2
    const y = (180 - img.height * scale) / 2
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
    
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = canvas.toDataURL('image/png')
    document.head.appendChild(appleLink)
  }
  
  img.onerror = () => {
    // Fallback: use the image directly if canvas conversion fails
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = imageUrl
    document.head.appendChild(link)
    
    const appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    appleLink.href = imageUrl
    document.head.appendChild(appleLink)
  }
  
  img.src = imageUrl

  // Clean up old blob URLs after a delay
  setTimeout(() => {
    existingLinks.forEach((oldLink) => {
      const oldHref = oldLink.getAttribute('href')
      if (oldHref?.startsWith('blob:')) {
        URL.revokeObjectURL(oldHref)
      }
    })
  }, 100)
}

function generateFaviconSVG(style: LogoStyle): string {
  const uniqueId = `favicon-${style}`
  
  // Generate SVG based on style (simplified version for favicon)
  const svgContent = getFaviconContent(style, uniqueId)
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${svgContent}
</svg>`
}

function getFaviconContent(style: LogoStyle, uniqueId: string): string {
  switch (style) {
    case 'minimalist':
      return `
        <defs>
          <linearGradient id="${uniqueId}-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#111" />
            <stop offset="100%" stop-color="#333" />
          </linearGradient>
        </defs>
        <rect x="6" y="8" width="20" height="3" rx="1" fill="url(#${uniqueId}-grad)" />
        <rect x="13" y="11" width="6" height="13" rx="1" fill="url(#${uniqueId}-grad)" />
      `
    
    case 'monogram':
      return `
        <defs>
          <linearGradient id="${uniqueId}-mono" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="url(#${uniqueId}-mono)" />
        <path d="M 9 10 L 23 10 L 23 13 L 9 13 Z M 13 13 L 13 21 L 19 21 L 19 13 Z" fill="white" />
      `
    
    case 'signature-handwritten':
    case 'signature-calligraphic':
    case 'signature-brush':
    case 'signature-elegant':
    case 'signature-modern':
      return `
        <defs>
          <linearGradient id="${uniqueId}-sig" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="100%" stop-color="#8b5cf6" />
          </linearGradient>
        </defs>
        <path d="M 8 10 Q 12 8 16 10 Q 20 12 24 10 L 24 12 Q 20 11 16 12 Q 12 11 8 12 Z" fill="url(#${uniqueId}-sig)" />
        <path d="M 13 12 Q 16 11 19 12 L 19 22 Q 16 23 13 22 Z" fill="url(#${uniqueId}-sig)" />
      `
    
    case 'gradient-circle':
    default:
      return `
        <defs>
          <linearGradient id="${uniqueId}-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1" />
            <stop offset="50%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
          <linearGradient id="${uniqueId}-letter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#f3f4f6" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="url(#${uniqueId}-grad)" />
        <rect x="8" y="9" width="16" height="4" rx="1" fill="url(#${uniqueId}-letter)" />
        <rect x="13" y="13" width="6" height="9" rx="1" fill="url(#${uniqueId}-letter)" />
        <circle cx="16" cy="16" r="1.5" fill="rgba(255,255,255,0.8)" />
      `
  }
}
