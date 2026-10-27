import { t } from '@/i18n';
import { LoadingIndicator } from './LoadingIndicator';
import './PageLoader.css';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Unified page loading component - use this for all page-level loading states
 * Provides consistent loading experience across the entire app
 */
export function PageLoader({ message, fullScreen = true }: PageLoaderProps) {
  const containerClass = fullScreen 
    ? 'page-loader page-loader-fullscreen' 
    : 'page-loader';

  return (
    <div className={containerClass} role="status" aria-label={message ? undefined : t('common.loading')}>
      <div className="page-loader-content">
        <LoadingIndicator size="large" aria-hidden="true" />
        {message && <p className="page-loader-message">{message}</p>}
      </div>
    </div>
  );
}

/**
 * Default page loader with Vietnamese text
 */
export function DefaultPageLoader() {
  return <PageLoader message={t('common.loading') || 'Đang tải...'} />;
}


