import { HEADER_BRAND } from './publicHeader';
import HeaderLogo from '@/assets/logo.png';
// import FaviconLogo from "@/assets/FaviconLogo.png" // Simpler/smaller version

export const LOGO_CONFIG = {
  // Logo type: 'image' or 'text'
  // 'text' uses Pexels-style text logo with TT Backwards Script font
  // 'image' uses image file
  type: 'text' as 'image' | 'text',
  
  // Text logo configuration (when type is 'text')
  textLogo: HEADER_BRAND,
  
  // Image logo configuration (when type is 'image')
  mainLogo: HeaderLogo,

  // Logo dimensions
  headerHeight: 40, // Height in pixels for header
  headerWidth: 120, // Approximate width for explicit dimensions (prevents CLS)

  // Alternative logos for different contexts (optional)
  mobileLogo: HeaderLogo, // Can be different for mobile
  faviconLogo: HeaderLogo, // Can be different for favicon

  // Logo alt text
  altText: 'PhotoApp Logo',
} as const;

export default LOGO_CONFIG;
