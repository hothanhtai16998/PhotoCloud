import './Logo.css'

export type LogoStyle = 
  | 'gradient-circle'      // Current style - gradient circle with T
  | 'minimalist'           // Clean, simple T
  | 'monogram'             // Elegant monogram style
  | 'abstract'             // Stylized abstract T
  | 'emblem'               // T in a shield/badge
  | 'geometric'            // Geometric shapes forming T
  | 'outline'              // Outlined T
  | 'bold-3d'              // Bold 3D effect
  | 'camera-aperture'      // T with camera aperture design
  | 'negative-space'       // Negative space design
  | 'modern-gradient'      // Modern gradient text style
  | 'vintage-badge'        // Vintage badge style
  | 'signature-handwritten' // Handwritten signature style
  | 'signature-calligraphic' // Calligraphic signature style
  | 'signature-brush'      // Brush stroke signature style
  | 'signature-elegant'    // Elegant script signature style
  | 'signature-modern'     // Modern signature style

interface LogoProps {
  size?: number
  className?: string
  style?: LogoStyle
}

export function Logo({ size = 32, className = '', style = 'gradient-circle' }: LogoProps) {
  const uniqueId = `logo-${style}-${size}`
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`photoapp-logo photoapp-logo-${style} ${className}`}
      aria-label="PhotoApp Logo"
    >
      {renderLogoStyle(style, uniqueId)}
    </svg>
  )
}

function renderLogoStyle(style: LogoStyle, uniqueId: string) {
  switch (style) {
    case 'minimalist':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#111" />
              <stop offset="100%" stopColor="#333" />
            </linearGradient>
          </defs>
          <rect x="10" y="12" width="28" height="4" rx="2" fill={`url(#${uniqueId}-grad)`} />
          <rect x="20" y="16" width="8" height="20" rx="2" fill={`url(#${uniqueId}-grad)`} />
        </>
      )
    
    case 'monogram':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-mono`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="20" fill={`url(#${uniqueId}-mono)`} />
          <path d="M 14 16 L 34 16 L 34 20 L 14 20 Z M 20 20 L 20 32 L 28 32 L 28 20 Z" fill="white" />
        </>
      )
    
    case 'abstract':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-abs`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d="M 12 14 Q 24 8 36 14 L 36 18 Q 24 12 12 18 Z" fill={`url(#${uniqueId}-abs)`} />
          <path d="M 20 18 Q 24 16 28 18 L 28 36 Q 24 38 20 36 Z" fill={`url(#${uniqueId}-abs)`} />
        </>
      )
    
    case 'emblem':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-emblem`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path d="M 24 4 L 40 12 L 40 36 L 24 44 L 8 36 L 8 12 Z" fill={`url(#${uniqueId}-emblem)`} />
          <rect x="12" y="14" width="24" height="5" rx="1" fill="white" />
          <rect x="20" y="19" width="8" height="15" rx="1" fill="white" />
        </>
      )
    
    case 'geometric':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-geo`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <polygon points="12,14 36,14 36,20 12,20" fill={`url(#${uniqueId}-geo)`} />
          <polygon points="20,20 28,20 28,34 20,34" fill={`url(#${uniqueId}-geo)`} />
        </>
      )
    
    case 'outline':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-out`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect x="12" y="14" width="24" height="6" rx="2" fill="none" stroke={`url(#${uniqueId}-out)`} strokeWidth="3" />
          <rect x="20" y="20" width="8" height="14" rx="2" fill="none" stroke={`url(#${uniqueId}-out)`} strokeWidth="3" />
        </>
      )
    
    case 'bold-3d':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-3d`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="12" y="14" width="24" height="6" rx="1" fill={`url(#${uniqueId}-3d)`} />
          <rect x="20" y="20" width="8" height="14" rx="1" fill={`url(#${uniqueId}-3d)`} />
          <rect x="13" y="15" width="24" height="6" rx="1" fill="rgba(0,0,0,0.2)" />
          <rect x="21" y="21" width="8" height="14" rx="1" fill="rgba(0,0,0,0.2)" />
        </>
      )
    
    case 'camera-aperture':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-cam`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="22" fill={`url(#${uniqueId}-cam)`} />
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <circle cx="24" cy="24" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="12" y="14" width="24" height="5" rx="1" fill="white" />
          <rect x="20" y="19" width="8" height="15" rx="1" fill="white" />
          <circle cx="24" cy="24" r="2" fill="rgba(255,255,255,0.9)" />
        </>
      )
    
    case 'negative-space':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-neg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="8" fill={`url(#${uniqueId}-neg)`} />
          <rect x="12" y="14" width="24" height="6" rx="1" fill="white" />
          <rect x="20" y="20" width="8" height="14" rx="1" fill="white" />
        </>
      )
    
    case 'modern-gradient':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-mod`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect x="10" y="12" width="28" height="6" rx="3" fill={`url(#${uniqueId}-mod)`} />
          <rect x="18" y="18" width="12" height="18" rx="3" fill={`url(#${uniqueId}-mod)`} />
        </>
      )
    
    case 'vintage-badge':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-vin`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="24" rx="20" ry="22" fill={`url(#${uniqueId}-vin)`} />
          <ellipse cx="24" cy="24" rx="18" ry="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <rect x="12" y="14" width="24" height="5" rx="1" fill="white" />
          <rect x="20" y="19" width="8" height="15" rx="1" fill="white" />
        </>
      )
    
    case 'signature-handwritten':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-sig1`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
          </defs>
          {/* Handwritten style T - flowing script */}
          <path 
            d="M 10 16 Q 14 14 18 16 Q 22 18 24 16 Q 26 14 30 16 Q 34 18 38 16" 
            fill="none"
            stroke={`url(#${uniqueId}-sig1)`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path 
            d="M 20 18 Q 22 17 24 18 Q 26 19 28 18" 
            fill="none"
            stroke={`url(#${uniqueId}-sig1)`}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path 
            d="M 24 18 Q 24 20 24 22 Q 24 28 24 32" 
            fill="none"
            stroke={`url(#${uniqueId}-sig1)`}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )
    
    case 'signature-calligraphic':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-sig2`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>
          </defs>
          {/* Calligraphic T with decorative flourishes */}
          <path 
            d="M 8 18 Q 12 12 16 16 Q 20 20 24 16 Q 28 12 32 16 Q 36 20 40 16" 
            fill="none"
            stroke={`url(#${uniqueId}-sig2)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path 
            d="M 22 18 Q 24 17 26 18" 
            fill="none"
            stroke={`url(#${uniqueId}-sig2)`}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path 
            d="M 24 18 Q 24 22 24 26 Q 24 30 24 34" 
            fill="none"
            stroke={`url(#${uniqueId}-sig2)`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Decorative flourish at bottom */}
          <path 
            d="M 22 34 Q 24 36 26 34" 
            fill="none"
            stroke={`url(#${uniqueId}-sig2)`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )
    
    case 'signature-brush':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-sig3`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>
          {/* Brush stroke style T - bold and dynamic */}
          <ellipse cx="24" cy="16" rx="18" ry="4" fill={`url(#${uniqueId}-sig3)`} opacity="0.9" />
          <path 
            d="M 18 18 Q 20 17 22 18 Q 24 19 26 18 Q 28 17 30 18" 
            fill="none"
            stroke={`url(#${uniqueId}-sig3)`}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.8"
          />
          <ellipse cx="24" cy="20" rx="5" ry="12" fill={`url(#${uniqueId}-sig3)`} opacity="0.9" />
        </>
      )
    
    case 'signature-elegant':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-sig4`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>
          {/* Elegant script T - smooth curves */}
          <path 
            d="M 10 18 C 14 14, 20 14, 24 18 C 28 22, 34 22, 38 18" 
            fill="none"
            stroke={`url(#${uniqueId}-sig4)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path 
            d="M 22 20 C 23 19, 25 19, 26 20" 
            fill="none"
            stroke={`url(#${uniqueId}-sig4)`}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path 
            d="M 24 20 C 24 22, 24 26, 24 32" 
            fill="none"
            stroke={`url(#${uniqueId}-sig4)`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path 
            d="M 22 32 Q 24 34 26 32" 
            fill="none"
            stroke={`url(#${uniqueId}-sig4)`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )
    
    case 'signature-modern':
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-sig5`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          {/* Modern signature style with smooth curves */}
          <path 
            d="M 8 18 Q 16 12 24 18 Q 32 24 40 18" 
            fill="none"
            stroke={`url(#${uniqueId}-sig5)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path 
            d="M 20 20 Q 22 19 24 20 Q 26 21 28 20" 
            fill="none"
            stroke={`url(#${uniqueId}-sig5)`}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path 
            d="M 24 20 Q 24 24 24 30 Q 24 34 24 36" 
            fill="none"
            stroke={`url(#${uniqueId}-sig5)`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )
    
    case 'gradient-circle':
    default:
      return (
        <>
          <defs>
            <linearGradient id={`${uniqueId}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id={`${uniqueId}-letter`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f3f4f6" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="22" fill={`url(#${uniqueId}-grad)`} className="logo-circle" />
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
          <rect x="12" y="14" width="24" height="6" rx="1" fill={`url(#${uniqueId}-letter)`} className="logo-letter" />
          <rect x="20" y="20" width="8" height="14" rx="1" fill={`url(#${uniqueId}-letter)`} className="logo-letter" />
          <circle cx="24" cy="24" r="2" fill="rgba(255, 255, 255, 0.8)" className="logo-accent" />
        </>
      )
  }
}

export default Logo
