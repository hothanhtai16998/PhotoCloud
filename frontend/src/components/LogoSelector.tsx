import { useState, useEffect } from 'react'
import { Logo, type LogoStyle } from './Logo'
import { X, Check } from 'lucide-react'
import { updateFavicon } from '@/utils/faviconUpdater'
import './LogoSelector.css'

const LOGO_STYLES: { value: LogoStyle; label: string; description: string; category?: string }[] = [
  // Modern Styles
  { value: 'gradient-circle', label: 'Gradient Circle', description: 'Modern gradient with camera aperture', category: 'Modern' },
  { value: 'minimalist', label: 'Minimalist', description: 'Clean and simple design', category: 'Modern' },
  { value: 'modern-gradient', label: 'Modern Gradient', description: 'Contemporary gradient', category: 'Modern' },
  { value: 'outline', label: 'Outline', description: 'Outlined letter design', category: 'Modern' },
  
  // Classic Styles
  { value: 'monogram', label: 'Monogram', description: 'Elegant circular monogram', category: 'Classic' },
  { value: 'emblem', label: 'Emblem', description: 'Badge/shield style', category: 'Classic' },
  { value: 'vintage-badge', label: 'Vintage Badge', description: 'Classic badge style', category: 'Classic' },
  
  // Artistic Styles
  { value: 'abstract', label: 'Abstract', description: 'Stylized abstract form', category: 'Artistic' },
  { value: 'geometric', label: 'Geometric', description: 'Sharp geometric shapes', category: 'Artistic' },
  { value: 'bold-3d', label: 'Bold 3D', description: 'Bold with 3D effect', category: 'Artistic' },
  
  // Photography Styles
  { value: 'camera-aperture', label: 'Camera Aperture', description: 'Camera-inspired design', category: 'Photography' },
  { value: 'negative-space', label: 'Negative Space', description: 'Dark background style', category: 'Photography' },
  
  // Signature Styles
  { value: 'signature-handwritten', label: 'Handwritten Signature', description: 'Natural handwritten style', category: 'Signature' },
  { value: 'signature-calligraphic', label: 'Calligraphic Signature', description: 'Ornate decorative strokes', category: 'Signature' },
  { value: 'signature-brush', label: 'Brush Stroke', description: 'Dynamic brush painting style', category: 'Signature' },
  { value: 'signature-elegant', label: 'Elegant Script', description: 'Sophisticated script style', category: 'Signature' },
  { value: 'signature-modern', label: 'Modern Signature', description: 'Smooth modern curves', category: 'Signature' },
]

const LOGO_STORAGE_KEY = 'photoapp-logo-style'

export function LogoSelector({ onClose }: { onClose?: () => void }) {
  const [selectedStyle, setSelectedStyle] = useState<LogoStyle>(() => {
    const saved = localStorage.getItem(LOGO_STORAGE_KEY)
    return (saved as LogoStyle) || 'gradient-circle'
  })

  useEffect(() => {
    // Save to localStorage whenever selection changes
    localStorage.setItem(LOGO_STORAGE_KEY, selectedStyle)
    // Update favicon
    updateFavicon(selectedStyle)
    // Dispatch custom event so Header can update
    window.dispatchEvent(new CustomEvent('logoStyleChanged', { detail: selectedStyle }))
  }, [selectedStyle])

  const handleSelectStyle = (style: LogoStyle) => {
    setSelectedStyle(style)
  }

  return (
    <div className="logo-selector-overlay" onClick={onClose}>
      <div className="logo-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logo-selector-header">
          <h2>Choose Logo Style</h2>
          {onClose && (
            <button className="logo-selector-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="logo-selector-content">
          {['Modern', 'Classic', 'Artistic', 'Photography', 'Signature'].map((category) => {
            const categoryStyles = LOGO_STYLES.filter(s => s.category === category)
            if (categoryStyles.length === 0) return null
            
            return (
              <div key={category} className="logo-selector-category">
                <h3 className="logo-selector-category-title">{category}</h3>
                <div className="logo-selector-grid">
                  {categoryStyles.map((style) => (
                    <div
                      key={style.value}
                      className={`logo-selector-item ${selectedStyle === style.value ? 'selected' : ''}`}
                      onClick={() => handleSelectStyle(style.value)}
                    >
                      <div className="logo-selector-preview">
                        <Logo size={64} style={style.value} />
                      </div>
                      <div className="logo-selector-info">
                        <h3>{style.label}</h3>
                        <p>{style.description}</p>
                      </div>
                      {selectedStyle === style.value && (
                        <div className="logo-selector-check">
                          <Check size={20} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="logo-selector-footer">
          <p className="logo-selector-hint">
            💡 Tip: Your selection is saved automatically and will be used throughout the app.
          </p>
          <div className="logo-selector-actions">
            <a
              href="https://www.canva.com/create/logos/"
              target="_blank"
              rel="noopener noreferrer"
              className="logo-selector-link"
            >
              Create Custom Logo on Canva
            </a>
            <a
              href="https://www.freelogodesign.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="logo-selector-link"
            >
              Free Logo Design Tool
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export function in separate file to avoid react-refresh warning
// This function is used by Header component
// Export function in separate file to avoid react-refresh warning
// This function is used by Header component
// eslint-disable-next-line react-refresh/only-export-components
export function getStoredLogoStyle(): LogoStyle {
  const saved = localStorage.getItem(LOGO_STORAGE_KEY)
  return (saved as LogoStyle) || 'gradient-circle'
}

export default LogoSelector

