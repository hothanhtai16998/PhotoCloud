import './ImageProgressBar.css';
import { t } from '@/i18n';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

interface ImageProgressBarProps {
  progress?: number; // Undefined when the browser cannot report byte progress.
  visible: boolean;
}

export function ImageProgressBar({ progress, visible }: ImageProgressBarProps) {
  if (!visible) {
    return null;
  }

  const progressValue = progress !== undefined && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : undefined;
  if (progressValue === undefined) return <div className="image-loading-indicator"><LoadingIndicator label={t('imagePage.loading')} /></div>;

  return (
    <div className={`image-progress-bar-container ${progressValue === undefined ? 'is-indeterminate' : ''}`}
      role="progressbar" aria-label={t('imagePage.loading')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressValue}>
      <div 
        className="image-progress-bar-fill"
        style={progressValue === undefined ? undefined : {
          width: `${progressValue}%`,
          minWidth: progressValue > 0 ? '2px' : '0' // Ensure it's visible even at low progress
        }}
      />
    </div>
  );
}

