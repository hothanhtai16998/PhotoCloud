import { useState, useEffect, useRef, useMemo } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { BarChart2, Calendar, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { t } from '@/i18n';
// Recharts is code-split via Vite manualChunks config (see vite.config.ts)
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { ErrorBoundarySection } from '@/components/ErrorBoundarySection';
import type { AnalyticsData } from '@/types/admin';

interface RealtimeData {
    usersOnline: number;
    viewsPerSecond: Array<{ second: number; count: number }>;
    mostActivePages: Array<{ path: string; userCount: number }>;
}

type MetricTab = 'users' | 'images' | 'pending' | 'approved';

export function AdminAnalytics() {
    const [, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
    const [days, setDays] = useState(30);
    const [activeTab, setActiveTab] = useState<MetricTab>('users');
    const realtimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadAnalytics = async () => {
        try {
            // Don't block UI - load in background
            // setLoading(true);
            const data = await adminService.getAnalytics(days);
            setAnalytics(data);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi tải dữ liệu phân tích'));
        } finally {
            setLoading(false);
        }
    };

    const loadRealtimeData = async () => {
        try {
            const data = await adminService.getRealtimeAnalytics();
            setRealtimeData(data);
        } catch (error: unknown) {
            // Silently fail for realtime data to avoid spamming errors
            void error;
            console.error('Failed to load realtime data:', error);
        }
    };

    useEffect(() => {
        loadAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

    // Load realtime data on mount and set up polling
    useEffect(() => {
        loadRealtimeData();
        
        // Poll every 5 seconds for real-time updates
        realtimeIntervalRef.current = setInterval(() => {
            loadRealtimeData();
        }, 5000);

        return () => {
            if (realtimeIntervalRef.current) {
                clearInterval(realtimeIntervalRef.current);
            }
        };
    }, []);

    // Calculate percentage changes (mock for now, can be enhanced with historical data)
    const calculatePercentage = (current: number, previous: number = current * 0.8) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    };

    // Use default/empty analytics if not loaded yet - define before useMemo
    const displayAnalytics = analytics || {
        users: { total: 0, new: 0 },
        images: { total: 0, pendingModeration: 0, approved: 0 },
        dailyUsers: [],
        dailyUploads: [],
        dailyPending: [],
        dailyApproved: [],
        dailyUsersComparison: [],
        dailyUploadsComparison: [],
        dailyPendingComparison: [],
        dailyApprovedComparison: [],
        topUploaders: [],
        categories: [],
    };

    // Prepare chart data based on active tab - MUST be called before early returns (Rules of Hooks)
    const chartData = useMemo(() => {
        if (!displayAnalytics || !displayAnalytics.dailyUsers) return [];
        
        let dataSource: Array<{ _id: string; count: number }> = [];
        let comparisonSource: Array<{ _id: string; count: number }> = [];
        
        switch (activeTab) {
            case 'users':
                dataSource = displayAnalytics.dailyUsers || [];
                comparisonSource = displayAnalytics.dailyUsersComparison || [];
                break;
            case 'images':
                dataSource = displayAnalytics.dailyUploads || [];
                comparisonSource = displayAnalytics.dailyUploadsComparison || [];
                break;
            case 'pending':
                dataSource = displayAnalytics.dailyPending || [];
                comparisonSource = displayAnalytics.dailyPendingComparison || [];
                break;
            case 'approved':
                dataSource = displayAnalytics.dailyApproved || [];
                comparisonSource = displayAnalytics.dailyApprovedComparison || [];
                break;
        }

        // Fill in missing dates and format for chart
        // Include today, so we go from (days-1) days ago to today (inclusive)
        // Use Vietnam timezone (Asia/Ho_Chi_Minh) to match backend MongoDB $dateToString format
        const now = new Date();
        
        // Helper function to get date string in Vietnam timezone (YYYY-MM-DD)
        // This matches MongoDB's $dateToString with timezone: 'Asia/Ho_Chi_Minh'
        const getVietnamDateString = (date: Date): string => {
            // Use Intl.DateTimeFormat to get the date in Vietnam timezone
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            // Format returns YYYY-MM-DD directly
            return formatter.format(date);
        };
        
        // Helper function to get date N days ago (in local time, will be converted to Vietnam timezone)
        const getDateNDaysAgo = (n: number): Date => {
            const date = new Date(now);
            date.setDate(date.getDate() - n);
            return date;
        };
        
        const dataMap = new Map(dataSource.map(item => [item._id, item.count]));
        const comparisonMap = new Map(comparisonSource.map(item => [item._id, item.count]));
        const chartDataArray = [];
        
        // Generate dates from (days-1) days ago to today (inclusive) in Vietnam timezone
        // This ensures today is always included and matches backend date format
        for (let i = 0; i < days; i++) {
            const daysAgo = days - 1 - i; // 0 = today, (days-1) = oldest date
            const date = getDateNDaysAgo(daysAgo);
            const dateStr = getVietnamDateString(date); // YYYY-MM-DD in Vietnam timezone (matches backend)
            
            // Get comparison date (same day, previous month - month-over-month comparison)
            const comparisonDate = new Date(date);
            comparisonDate.setMonth(comparisonDate.getMonth() - 1); // Go back one month
            const comparisonDateStr = getVietnamDateString(comparisonDate);
            
            // Use the date for display label (in local timezone for user)
            const localDate = date;
            const currentValue = dataMap.get(dateStr) || 0;
            // For month-over-month comparison, try to find the same date in previous month from current data
            // If not found in current data, try comparison map (which has previous period data)
            const comparisonValue = dataMap.get(comparisonDateStr) || comparisonMap.get(comparisonDateStr) || 0;
            
            // Calculate percentage change
            const percentageChange = comparisonValue > 0 
                ? ((currentValue - comparisonValue) / comparisonValue) * 100 
                : (currentValue > 0 ? 100 : 0);
            
            chartDataArray.push({
                date: dateStr,
                dateLabel: localDate.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
                value: currentValue,
                comparison: comparisonValue,
                percentageChange: percentageChange,
            });
        }

        // Find first non-zero data point and slice from there
        const firstDataIndex = chartDataArray.findIndex(d => d.value > 0);
        return firstDataIndex >= 0 ? chartDataArray.slice(firstDataIndex) : chartDataArray;
    }, [activeTab, displayAnalytics, days]);

    // Calculate percentages - safe to call even if analytics is null
    const userPercentage = displayAnalytics ? calculatePercentage(displayAnalytics.users.total) : 0;
    const imagePercentage = displayAnalytics ? calculatePercentage(displayAnalytics.images.total) : 0;
    const pendingPercentage = displayAnalytics ? calculatePercentage(displayAnalytics.images.pendingModeration) : 0;
    const approvedPercentage = displayAnalytics ? calculatePercentage(displayAnalytics.images.approved) : 0;

    // Format chart data for the selected metric tab with profile page logic
    const formattedChartData = useMemo(() => {
        if (!chartData || chartData.length === 0) return { data: [], domain: ['auto', 'auto'] };

        // Find first non-zero data point
        const firstDataIndex = chartData.findIndex(d => d.value > 0);
        const filteredData = firstDataIndex >= 0 ? chartData.slice(firstDataIndex) : chartData;

        // Calculate Y-axis domain - use absolute max scaling like Unsplash
        // Charts with different max values will have proportionally different heights
        const calculateDomain = (data: Array<{ value: number }>) => {
            if (data.length === 0) return ['auto', 'auto'];
            const values = data.map(d => d.value);
            const maxValue = Math.max(...values);

            if (maxValue === 0) return ['auto', 'auto'];

            // Use absolute max scaling - always scale from 0 to max value
            // This ensures charts with different max values show proportionally different heights
            const padding = Math.max(1, Math.ceil(maxValue * 0.1));
            return [0, maxValue + padding];
        };

        const domain = calculateDomain(filteredData);

        return { data: filteredData, domain };
    }, [chartData]);

    // Chart configuration
    const chartConfig = {
        value: {
            label: activeTab === 'users' ? t('admin.users') : activeTab === 'images' ? t('admin.images') : activeTab === 'pending' ? t('admin.pending') : t('admin.approved'),
            color: '#667eea',
        },
    };

    // Show UI immediately - don't block
    // if (loading) {
    //     return <div className="admin-loading">{t('common.loading')}</div>;
    // }

    // Show UI immediately with skeleton/placeholders - don't block
    // if (!analytics) {
    //     return (
    //         <div className="admin-analytics-falcon">
    //             <div className="admin-loading">{loading ? t('common.loading') : 'Không có dữ liệu'}</div>
    //         </div>
    //     );
    // }

    return (
        <div className="admin-analytics-falcon">
            {/* Top Metric Tabs */}
            <div className="falcon-metric-tabs">
                <div 
                    className={`falcon-metric-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <div className="falcon-metric-label">{t('admin.users')}</div>
                    <div className="falcon-metric-value">{displayAnalytics.users.total.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${userPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {userPercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(userPercentage).toFixed(1)}%
                    </div>
                </div>
                <div 
                    className={`falcon-metric-tab ${activeTab === 'images' ? 'active' : ''}`}
                    onClick={() => setActiveTab('images')}
                >
                    <div className="falcon-metric-label">{t('admin.images')}</div>
                    <div className="falcon-metric-value">{displayAnalytics.images.total.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${imagePercentage >= 0 ? 'positive' : 'negative'}`}>
                        {imagePercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(imagePercentage).toFixed(1)}%
                    </div>
                </div>
                <div 
                    className={`falcon-metric-tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <div className="falcon-metric-label">{t('admin.pending')}</div>
                    <div className="falcon-metric-value">{displayAnalytics.images.pendingModeration.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${pendingPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {pendingPercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(pendingPercentage).toFixed(1)}%
                    </div>
                </div>
                <div 
                    className={`falcon-metric-tab ${activeTab === 'approved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('approved')}
                >
                    <div className="falcon-metric-label">{t('admin.approved')}</div>
                    <div className="falcon-metric-value">{displayAnalytics.images.approved.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${approvedPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {approvedPercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(approvedPercentage).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Chart and Realtime Widget Side by Side */}
            <div className="falcon-chart-realtime-container">
                {/* Main Trend Chart - 2/3 width */}
                <div className="falcon-card falcon-main-chart">
                    <div className="falcon-card-header">
                        <div className="falcon-chart-header-left">
                            <select
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                                className="falcon-select-small"
                            >
                            <option value={7}>{t('admin.last7Days')}</option>
                            <option value={30}>{t('admin.lastMonth')}</option>
                            <option value={90}>{t('admin.last90Days')}</option>
                            <option value={365}>{t('admin.lastYear')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="falcon-card-body">
                        <div className="insights-chart-container" style={{ minHeight: '400px', minWidth: '100%' }}>
                            <ErrorBoundarySection sectionName="Analytics Chart">
                                {formattedChartData.data && formattedChartData.data.length > 0 ? (
                                    <ChartContainer config={chartConfig} className="h-full w-full" style={{ minHeight: '400px' }}>
                                        <AreaChart data={formattedChartData.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#e0e7ff" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#fbfdfc" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#667eea"
                                                strokeWidth={2}
                                                fill="url(#fillValue)"
                                                dot={{ r: 2.5, fill: '#111' }}
                                                activeDot={{ r: 4, fill: '#111', stroke: '#111', strokeWidth: 1 }}
                                            />
                                            <XAxis
                                                dataKey="dateLabel"
                                                tick={{ fill: '#767676', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                interval="preserveStartEnd"
                                                height={20}
                                            />
                                            <YAxis
                                                hide
                                                domain={formattedChartData.domain}
                                            />
                                            <CartesianGrid vertical={false} horizontal={false} />
                                            <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent indicator="dot" />}
                                            />
                                        </AreaChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        {t('admin.noDataAvailable') || 'Không có dữ liệu'}
                                    </div>
                                )}
                            </ErrorBoundarySection>
                        </div>
                    </div>
                </div>

                {/* Users Online Right Now Widget - 1/3 width */}
                {realtimeData && (
                    <div className="falcon-card falcon-realtime-widget">
                    <div className="falcon-card-header">
                        <h3 className="falcon-card-title">{t('admin.usersOnline')}</h3>
                    </div>
                    <div className="falcon-card-body">
                        <div className="falcon-users-online-value">{realtimeData.usersOnline}</div>
                        
                        <div className="falcon-views-per-second">
                            <div className="falcon-views-label">{t('admin.pageViewsPerSecond')}</div>
                            <div className="falcon-views-chart">
                                {realtimeData.viewsPerSecond.map((item, index) => {
                                    const maxCount = Math.max(...realtimeData.viewsPerSecond.map(v => v.count), 1);
                                    const height = (item.count / maxCount) * 100;
                                    return (
                                        <div key={index} className="falcon-views-bar" style={{ height: `${Math.max(height, 10)}%` }} />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="falcon-most-active-pages">
                            <div className="falcon-pages-header">
                                <span>Trang hoạt động nhiều nhất</span>
                                <span>Số người dùng</span>
                            </div>
                            <div className="falcon-pages-list">
                                {realtimeData.mostActivePages.map((page, index) => (
                                    <div key={index} className="falcon-page-item">
                                        <span className="falcon-page-path">{page.path}</span>
                                        <span className="falcon-page-count">{page.userCount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="falcon-realtime-link">
                            <a href="#" onClick={(e) => { e.preventDefault(); loadRealtimeData(); }}>
                                {t('admin.realtimeData')} →
                            </a>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="falcon-analytics-grid">
                {/* Left Column */}
                <div className="falcon-analytics-left">
                    {/* Users Overview Card */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">{t('admin.userOverview')}</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-stats-row">
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">{t('admin.totalUsers')}</div>
                                    <div className="falcon-stat-value">{displayAnalytics.users.total.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">{t('admin.newUsers', { days })}</div>
                                    <div className="falcon-stat-value">{displayAnalytics.users.new.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">{t('admin.bannedUsers')}</div>
                                    <div className="falcon-stat-value">{(displayAnalytics.users as any).banned?.toLocaleString() || '0'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Images Overview Card */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Tổng quan ảnh</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-stats-row">
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Tổng ảnh</div>
                                    <div className="falcon-stat-value">{displayAnalytics.images.total.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">{t('admin.newImages', { days })}</div>
                                    <div className="falcon-stat-value">{(displayAnalytics.images as any).new?.toLocaleString() || '0'}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Chờ duyệt</div>
                                    <div className="falcon-stat-value">{displayAnalytics.images.pendingModeration.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Đã phê duyệt</div>
                                    <div className="falcon-stat-value">{displayAnalytics.images.approved.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Uploads Chart */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">{t('admin.dailyUploads')}</h3>
                            <select className="falcon-select-small">
                                <option>{t('admin.last7Days')}</option>
                                <option>{t('admin.lastMonth')}</option>
                                <option>{t('admin.lastYear')}</option>
                            </select>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-chart-container">
                                <div className="falcon-bar-chart">
                                    {(displayAnalytics.dailyUploads || []).map((day) => {
                                        const maxCount = Math.max(...(displayAnalytics.dailyUploads || []).map(d => d.count), 1);
                                        const height = (day.count / maxCount) * 100;
                                        return (
                                            <div key={day._id} className="falcon-bar-item">
                                                <div className="falcon-bar" style={{ height: `${Math.max(height, 5)}%` }} />
                                                <div className="falcon-bar-label">{new Date(day._id).getDate()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="falcon-analytics-right">
                    {/* Category Distribution - Line Chart */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">{t('admin.categoryDistribution')}</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <ErrorBoundarySection sectionName="Category Distribution Chart">
                                {(displayAnalytics.categories && displayAnalytics.categories.length > 0) ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart
                                            data={displayAnalytics.categories.map(cat => ({
                                                name: cat.name || 'Không xác định',
                                                count: cat.count,
                                                _id: cat._id
                                            }))}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" strokeOpacity={0.5} />
                                            <XAxis 
                                                dataKey="name" 
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
                                                content={({ active, payload }: { active?: boolean; payload?: readonly any[] }) => {
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
                                                                    {data.name}
                                                                </div>
                                                                <div style={{ color: '#667eea', fontWeight: 700, fontSize: '16px' }}>
                                                                    {data.count.toLocaleString()} ảnh
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke="#667eea" 
                                                strokeWidth={3}
                                                dot={{ fill: '#667eea', r: 5, strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 7, fill: '#667eea', stroke: '#fff', strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                        {t('admin.noDataAvailable') || 'Không có dữ liệu'}
                                    </div>
                                )}
                            </ErrorBoundarySection>
                        </div>
                    </div>

                    {/* Top Uploaders */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Top người tải lên</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-table-container">
                                <table className="falcon-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tên người dùng</th>
                                            <th>Số lượng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(displayAnalytics.topUploaders || [])?.map((uploader, index) => (
                                            <tr key={uploader.userId}>
                                                <td>{index + 1}</td>
                                                <td>{uploader.username}</td>
                                                <td>{uploader.uploadCount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Daily Uploads */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <Calendar size={20} />
                    {t('admin.dailyUploads')} ({t('admin.lastNDays', { count: days })})
                </h2>
                <div className="admin-daily-uploads-chart">
                    {(() => {
                        const maxCount = Math.max(...(displayAnalytics.dailyUploads || []).map(d => d.count), 1);
                        return (displayAnalytics.dailyUploads || []).map((day) => {
                            const height = (day.count / maxCount) * 100;
                            const date = new Date(day._id);
                            const dayNumber = date.getDate();
                            return (
                                <div key={day._id} className="admin-daily-upload-bar">
                                    <div
                                        className="admin-daily-upload-bar-fill"
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                        title={`${day._id}: ${day.count} ảnh`}
                                    />
                                    <div className="admin-daily-upload-bar-label">
                                        <span className="admin-daily-upload-day">{dayNumber}</span>
                                        <span className="admin-daily-upload-count">{day.count}</span>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Top Uploaders */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <BarChart2 size={20} />
                    Top người tải lên ({days} ngày gần nhất)
                </h2>
                <div className="admin-top-uploaders">
                    {(displayAnalytics.topUploaders || [])?.map((uploader, index) => {
                        const maxCount = (displayAnalytics.topUploaders || [])?.[0]?.uploadCount || 1;
                        const percentage = (uploader.uploadCount / maxCount) * 100;
                        const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                        const medalColor = medalColors[index] || '#6B7280';
                        return (
                            <div key={uploader.userId} className="admin-top-uploader-item">
                                <div className="admin-top-uploader-rank">
                                    {index < 3 ? (
                                        <span className="admin-top-uploader-medal" style={{ color: medalColor }}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                        </span>
                                    ) : (
                                        <span className="admin-top-uploader-number">#{index + 1}</span>
                                    )}
                                </div>
                                <div className="admin-top-uploader-info">
                                    <div className="admin-top-uploader-name">
                                        <strong>{uploader.username}</strong>
                                        {uploader.displayName && (
                                            <span className="admin-top-uploader-display-name">{uploader.displayName}</span>
                                        )}
                                    </div>
                                    <div className="admin-top-uploader-bar-container">
                                        <div
                                            className="admin-top-uploader-bar-fill"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="admin-top-uploader-count">{uploader.uploadCount} ảnh</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

