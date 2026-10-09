import { memo } from 'react';
import './TextLogo.css';

interface TextLogoProps {
  text?: string;
  className?: string;
  fontWeight?: 100 | 300 | 400 | 700 | 900;
}

export const TextLogo = memo(function TextLogo({ 
  text = 'photocloud', 
  className = '',
  fontWeight = 400
}: TextLogoProps) {
  return (
    <span 
      className={`text-logo ${className}`}
      style={{ fontWeight }}
    >
      {text}
    </span>
  );
});
