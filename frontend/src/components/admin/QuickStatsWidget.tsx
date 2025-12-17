import { useState, useEffect } from 'react';
import { X, Users, Image as ImageIcon, Folder } from 'lucide-react';
import type { DashboardStats } from '@/services/adminService';
import './QuickStatsWidget.css';
import { t } from '@/i18n';

interface QuickStatsWidgetProps {
    stats: DashboardStats | null;
    loading: boolean;
}

export function QuickStatsWidget({ stats, loading }: QuickStatsWidgetProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // Hide on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsVisible(window.innerWidth > 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isVisible || loading || !stats) return null;

    return (
        <div className={`quick-stats-widget ${isMinimized ? 'minimized' : ''}`}>
            <div className="quick-stats-header">
                <h4>{t('admin.quickStats')}</h4>
                <div className="quick-stats-actions">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="quick-stats-toggle"
                        aria-label={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? '↑' : '↓'}
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="quick-stats-close"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
            {!isMinimized && (
                <div className="quick-stats-content">
                    <div className="quick-stat-item">
                        <Users size={18} />
                        <div>
                            <div className="quick-stat-value">{stats.stats.totalUsers}</div>
                            <div className="quick-stat-label">{t('admin.totalUsers')}</div>
                        </div>
                    </div>
                    <div className="quick-stat-item">
                        <ImageIcon size={18} />
                        <div>
                            <div className="quick-stat-value">{stats.stats.totalImages}</div>
                            <div className="quick-stat-label">{t('admin.totalImages')}</div>
                        </div>
                    </div>
                    <div className="quick-stat-item">
                        <Folder size={18} />
                        <div>
                            <div className="quick-stat-value">{stats.stats.categoryStats.length}</div>
                            <div className="quick-stat-label">{t('admin.totalCategories')}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

