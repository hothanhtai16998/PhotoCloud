import './ImageProgressBar.css';

interface ImageProgressBarProps {
  progress: number; // 0-100
  visible: boolean;
}

export function ImageProgressBar({ progress, visible }: ImageProgressBarProps) {
  // Debug logging
  if (visible) {
    console.log('[ImageProgressBar] Rendering with progress:', progress, '%', 'visible:', visible);
  }

  if (!visible) {
    console.log('[ImageProgressBar] Not visible, returning null');
    return null;
  }

  const progressValue = Math.max(0, Math.min(100, progress));

  return (
    <div className="image-progress-bar-container" style={{ display: 'block' }}>
      <div 
        className="image-progress-bar-fill"
        style={{ 
          width: `${progressValue}%`,
          minWidth: progressValue > 0 ? '2px' : '0' // Ensure it's visible even at low progress
        }}
      />
    </div>
  );
}

