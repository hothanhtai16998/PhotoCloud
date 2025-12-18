import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { t } from '@/i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { TrafficAnalyticsData } from '@/types/admin';
import { Calendar, TrendingUp, Users, Eye } from 'lucide-react';

export const AdminTrafficAnalytics = memo(function AdminTrafficAnalytics() {
    const [trafficData, setTrafficData] = useState<TrafficAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const loadTrafficData = async () => {
            try {
                setLoading(true);
                const data = await adminService.getTrafficAnalytics(days);
                setTrafficData(data);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error, 'Lỗi khi tải dữ liệu traffic'));
            } finally {
                setLoading(false);
            }
        };

        loadTrafficData();
    }, [days]);

    // Format peak usage times for display (memoized) - MUST be before any returns (Rules of Hooks)
    const peakUsageData = useMemo(() => {
        if (!trafficData?.peakUsageTimes) return [];
        return trafficData.peakUsageTimes.map(item => ({
            hour: `${item.hour}:00`,
            views: item.views,
        }));
    }, [trafficData?.peakUsageTimes]);

    // Calculate peak hour (memoized) - MUST be before any returns (Rules of Hooks)
    const peakHour = useMemo(() => {
        if (!trafficData?.peakUsageTimes || trafficData.peakUsageTimes.length === 0) {
            return { hour: 0, views: 0 };
        }
        return trafficData.peakUsageTimes.reduce((max, item) => 
            item.views > max.views ? item : max, 
            trafficData.peakUsageTimes[0]
        );
    }, [trafficData?.peakUsageTimes]);

    if (loading) {
        return (
            <div className="falcon-card">
                <div className="falcon-card-body">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        {t('common.loading') || 'Loading...'}
                    </div>
                </div>
            </div>
        );
    }

    if (!trafficData) {
        return (
            <div className="falcon-card">
                <div className="falcon-card-body">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        {t('admin.noData') || 'No data available'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className="admin-section-title">
                    <Eye size={20} />
                    {t('admin.trafficAnalytics') || 'Traffic Analytics'}
                </h2>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="falcon-select-small"
                    style={{ marginLeft: '1rem' }}
                >
                    <option value={7}>{t('admin.last7Days') || 'Last 7 Days'}</option>
                    <option value={30}>{t('admin.lastMonth') || 'Last 30 Days'}</option>
                    <option value={90}>{t('admin.last90Days') || 'Last 90 Days'}</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="falcon-card">
                    <div className="falcon-card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Users size={20} style={{ color: '#667eea' }} />
                            <div className="falcon-stat-label">{t('admin.uniqueVisitors') || 'Unique Visitors'}</div>
                        </div>
                        <div className="falcon-stat-value">{trafficData.uniqueVisitors.toLocaleString()}</div>
                    </div>
                </div>
                <div className="falcon-card">
                    <div className="falcon-card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Users size={20} style={{ color: '#10b981' }} />
                            <div className="falcon-stat-label">{t('admin.authenticatedUsers') || 'Authenticated Users'}</div>
                        </div>
                        <div className="falcon-stat-value">{trafficData.uniqueAuthenticatedUsers.toLocaleString()}</div>
                    </div>
                </div>
                <div className="falcon-card">
                    <div className="falcon-card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <TrendingUp size={20} style={{ color: '#f59e0b' }} />
                            <div className="falcon-stat-label">{t('admin.peakHour') || 'Peak Hour'}</div>
                        </div>
                        <div className="falcon-stat-value">{peakHour.hour}:00</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {peakHour.views.toLocaleString()} {t('admin.views') || 'views'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Page Views Chart */}
            <div className="falcon-card" style={{ marginBottom: '1.5rem' }}>
                <div className="falcon-card-header">
                    <h3 className="falcon-card-title">
                        <Calendar size={16} />
                        {t('admin.dailyPageViews') || 'Daily Page Views'}
                    </h3>
                </div>
                <div className="falcon-card-body">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trafficData.dailyPageViews}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" strokeOpacity={0.5} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#6c757d"
                                tick={{ fill: '#6c757d', fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis 
                                stroke="#6c757d"
                                tick={{ fill: '#6c757d', fontSize: 11 }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload?.length && payload[0]) {
                                        const data = payload[0].payload;
                                        return (
                                            <div style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '6px', color: '#212529' }}>
                                                    {data.date}
                                                </div>
                                                <div style={{ color: '#667eea', fontWeight: 700, fontSize: '16px' }}>
                                                    {data.views.toLocaleString()} {t('admin.views') || 'views'}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="views" 
                                stroke="#667eea" 
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: '#667eea', stroke: '#fff', strokeWidth: 2 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Peak Usage Times Chart */}
            <div className="falcon-card" style={{ marginBottom: '1.5rem' }}>
                <div className="falcon-card-header">
                    <h3 className="falcon-card-title">
                        <TrendingUp size={16} />
                        {t('admin.peakUsageTimes') || 'Peak Usage Times (by Hour)'}
                    </h3>
                </div>
                <div className="falcon-card-body">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={peakUsageData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" strokeOpacity={0.5} />
                            <XAxis 
                                dataKey="hour" 
                                stroke="#6c757d"
                                tick={{ fill: '#6c757d', fontSize: 11 }}
                            />
                            <YAxis 
                                stroke="#6c757d"
                                tick={{ fill: '#6c757d', fontSize: 11 }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload?.length && payload[0]) {
                                        const data = payload[0].payload;
                                        return (
                                            <div style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                border: '1px solid #e9ecef',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '6px', color: '#212529' }}>
                                                    {data.hour}
                                                </div>
                                                <div style={{ color: '#667eea', fontWeight: 700, fontSize: '16px' }}>
                                                    {data.views.toLocaleString()} {t('admin.views') || 'views'}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="views" fill="#667eea" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Pages */}
            {trafficData.pageViewsByRoute && trafficData.pageViewsByRoute.length > 0 && (
                <div className="falcon-card">
                    <div className="falcon-card-header">
                        <h3 className="falcon-card-title">
                            {t('admin.topPages') || 'Top Pages'}
                        </h3>
                    </div>
                    <div className="falcon-card-body">
                        <div className="falcon-table-container">
                            <table className="falcon-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{t('admin.page') || 'Page'}</th>
                                        <th>{t('admin.views') || 'Views'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trafficData.pageViewsByRoute.map((page, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <code style={{ 
                                                    backgroundColor: '#f3f4f6', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {page.path}
                                                </code>
                                            </td>
                                            <td>{page.views.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

