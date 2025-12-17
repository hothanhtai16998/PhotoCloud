import Header from '@/components/Header';
import { DownloadHistory } from '@/components/DownloadHistory';
import { t } from '@/i18n';
import './DownloadHistoryPage.css';

export default function DownloadHistoryPage() {
    return (
        <>
            <Header />
            <main className="download-history-page">
                <div className="download-history-page-container">
                    <div className="download-history-page-header">
                        <h1 className="download-history-page-title">
                            {t('profile.downloadHistory')}
                        </h1>
                        <p className="download-history-page-description">
                            {t('profile.downloadHistorySection.description') || 'Your download history includes everything that you have downloaded while being logged in. It is only visible to you.'}
                        </p>
                    </div>
                    <DownloadHistory />
                </div>
            </main>
        </>
    );
}

