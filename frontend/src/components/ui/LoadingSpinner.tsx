import { memo } from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingSpinner = memo(({ size = 'medium', className = '' }: LoadingSpinnerProps) => {
  return (
    <div 
      className={`loading-spinner-optimized loading-spinner-${size} ${className}`}
      aria-label="Loading"
      role="status"
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;

