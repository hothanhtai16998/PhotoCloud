/**
 * TextLogo Component
 * Pexels-style text logo using TT Backwards Script font
 * 
 * Features:
 * - Lowercase italic text
 * - Script/cursive font style (TT Backwards Script)
 * - Smooth transitions
 * - Responsive sizing
 */

import { memo } from 'react';
import './TextLogo.css';

interface TextLogoProps {
  text?: string;
  className?: string;
  onClick?: () => void;
  fontWeight?: 100 | 300 | 400 | 700 | 900;
}

export const TextLogo = memo(function TextLogo({ 
  text = 'photocloud', 
  className = '',
  onClick,
  fontWeight = 400
}: TextLogoProps) {
  return (
    <span 
      className={`text-logo ${className}`}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        fontWeight: fontWeight
      }}
    >
      {text}
    </span>
  );
});
