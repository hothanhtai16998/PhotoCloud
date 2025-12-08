import HeaderLogo from '@/assets/logo.png';
// import FaviconLogo from "@/assets/FaviconLogo.png" // Simpler/smaller version

export const LOGO_CONFIG = {
  // Main logo used in header
  mainLogo: HeaderLogo,

  // Logo dimensions
  headerHeight: 40, // Height in pixels for header

  // Alternative logos for different contexts (optional)
  mobileLogo: HeaderLogo, // Can be different for mobile
  faviconLogo: HeaderLogo, // Can be different for favicon

  // Logo alt text
  altText: 'PhotoApp Logo',
} as const;

export default LOGO_CONFIG;
