import { useState, useEffect, useMemo, useRef } from 'react';
import { analyticsService, type UserAnalytics } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Download, ChevronDown, Award, Target } from 'lucide-react';
import { toast } from 'sonner';
import { uiConfig } from '@/config/uiConfig';
import { t, getLocale } from '@/i18n';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
// Recharts is code-split via Vite manualChunks config (see vite.config.ts)
import {
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import './UserAnalyticsDashboard.css';

export const UserAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(uiConfig.analytics.dayOptions[1]); // Default to 30 days
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    };

    if (periodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [periodDropdownOpen]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getUserAnalytics(days);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        toast.error(t('profile.analyticsLoadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [days]);

  // Calculate max values for charts
  useMemo(() => {
    if (!analytics) return { maxViews: 0, maxDownloads: 0 };
    
    const maxViewsValue = Math.max(...analytics.viewsOverTime.map(d => d.value), 1);
    const maxDownloadsValue = Math.max(...analytics.downloadsOverTime.map(d => d.value), 1);
    
    return {
      maxViews: maxViewsValue,
      maxDownloads: maxDownloadsValue,
    };
  }, [analytics]);

  // Get period label
  const periodLabel = days === 7 ? '7 ngày qua' : days === 30 ? '30 ngày qua' : days === 365 ? 'Năm ngoái' : `${days} ngày`;

  // Format number with dots (European format like "2.090")
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Format chart data for Recharts (with date labels)
  const formatChartData = useMemo(() => {
    if (!analytics) return { viewsData: [], downloadsData: [], viewsDomain: [0, 0], downloadsDomain: [0, 0], viewsTickInterval: 0, downloadsTickInterval: 0 };
    
    const viewsData = analytics.viewsOverTime.map((item) => {
      const date = new Date(item.date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return {
        date: item.date,
        dateLabel: `${day}/${month}`,
        value: item.value,
        views: item.value,
      };
    });
    
    const downloadsData = analytics.downloadsOverTime.map((item) => {
      const date = new Date(item.date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return {
        date: item.date,
        dateLabel: `${day}/${month}`,
        value: item.value,
        downloads: item.value,
      };
    });
    
    // Calculate Y-axis domain - use absolute max scaling like Photo
    // Charts with different max values will have proportionally different heights
    const calculateDomain = (data: Array<{ value: number }>): [number, number] | ['auto', 'auto'] => {
      if (data.length === 0) return ['auto', 'auto'];
      
      const allValues = data.map(d => d.value);
      const maxValue = Math.max(...allValues);
      
      if (maxValue === 0) return ['auto', 'auto'];
      
      // Use absolute max scaling - always scale from 0 to max value
      // This ensures charts with different max values show proportionally different heights
      // e.g., chart with max 9 will be much shorter than chart with max 46
      const padding = Math.max(1, Math.ceil(maxValue * 0.1));
      return [0, maxValue + padding];
    };
    
    const viewsDomain = calculateDomain(viewsData);
    const downloadsDomain = calculateDomain(downloadsData);
    
    // Calculate interval for X-axis labels based on data length
    // Show more dates when there are fewer data points, fewer when many
    const calculateTickInterval = (dataLength: number): number => {
      if (dataLength <= 7) return 0; // Show all dates for a week
      if (dataLength <= 14) return 1; // Show every other date for 2 weeks
      if (dataLength <= 30) return Math.floor(dataLength / 5); // Show ~5 dates for a month
      return Math.floor(dataLength / 7); // Show ~7 dates for longer periods
    };
    
    const viewsTickInterval = calculateTickInterval(viewsData.length);
    const downloadsTickInterval = calculateTickInterval(downloadsData.length);
    
    return { viewsData, downloadsData, viewsDomain, downloadsDomain, viewsTickInterval, downloadsTickInterval };
  }, [analytics]);

  // Chart configuration
  const viewsChartConfig = {
    views: {
      label: t('image.views'),
      color: '#b1e3c5',
    },
  };

  const downloadsChartConfig = {
    downloads: {
      label: t('image.downloads'),
      color: '#b1e3c5',
    },
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="insights-header">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="insights-main-grid">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-empty">
          <p>{t('profile.noAnalyticsData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Insights Header */}
      <div className="insights-header">
        <h2 className="insights-title">{t('profile.stats')}</h2>
        <div className="insights-period-dropdown" ref={periodDropdownRef}>
          <button 
            className="insights-period-button"
            onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
          >
            {periodLabel}
            <ChevronDown size={16} className={periodDropdownOpen ? 'rotate-180' : ''} />
          </button>
          {periodDropdownOpen && (
            <div className="insights-period-menu">
              {uiConfig.analytics.dayOptions.map((optionDays) => (
                <button
                  key={optionDays}
                  className={`insights-period-option ${days === optionDays ? 'active' : ''}`}
                  onClick={() => {
                    setDays(optionDays);
                    setPeriodDropdownOpen(false);
                  }}
                >
                  {optionDays === 7 ? t('profile.last7Days') : 
                   optionDays === 30 ? t('profile.last30Days') : 
                   optionDays === 365 ? t('profile.lastYear') : 
                   t('profile.daysAgo', { days: optionDays })}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Insights Grid - Two Large Cards */}
      <div className="insights-main-grid">
        {/* Views Card */}
        <div className="insights-card">
          <div className="insights-card-header">
            <div className="insights-metric-label">{t('profile.views')}</div>
            <div className="insights-metric-value">{formatNumber(analytics.summary.totalViews)}</div>
          </div>
          
          {/* Line Chart */}
          <div className="insights-chart-container">
            <ChartContainer config={viewsChartConfig} className="h-[116px] w-full">
              <AreaChart data={formatChartData.viewsData} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ddf3ef" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#fbfdfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#fillViews)"
                  dot={{ r: 2.5, fill: '#111' }}
                  activeDot={{ r: 3, fill: '#111' }}
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#767676', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={formatChartData.viewsTickInterval}
                  height={20}
                />
                <YAxis
                  hide
                  domain={formatChartData.viewsDomain}
                  allowDataOverflow={true}
                  type="number"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(_value, payload) => {
                        if (!payload || payload.length === 0 || !payload[0]) return '';
                        const date = new Date(payload[0].payload.date);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      }}
                      formatter={(value) => {
                        const result = t('profile.viewedTimes', { value: Number(value) });
                        return result;
                      }}
                    />
                  } 
                />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Most Viewed On */}
          <div className="insights-most-section">
            <div className="insights-most-header">
              <span>{t('profile.mostViewedOn')}</span>
              <button className="insights-most-toggle">
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="insights-platform">
              <span className="insights-platform-name">PhotoApp</span>
            </div>
            {analytics.mostPopularImages.length > 0 && (
              <div className="insights-thumbnails">
                {analytics.mostPopularImages.slice(0, 3).map((image) => (
                  <div key={image._id} className="insights-thumbnail" title={image.imageTitle}>
                    {image.thumbnailUrl ? (
                      <img 
                        src={image.thumbnailUrl} 
                        alt={image.imageTitle || ''}
                        className="insights-thumbnail-image"
                      />
                    ) : (
                      <div className="insights-thumbnail-placeholder">
                        <Eye size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Downloads Card */}
        <div className="insights-card">
          <div className="insights-card-header">
            <div className="insights-metric-label">{t('profile.downloads')}</div>
            <div className="insights-metric-value">{formatNumber(analytics.summary.totalDownloads)}</div>
          </div>
          
          {/* Line Chart */}
          <div className="insights-chart-container">
            <ChartContainer config={downloadsChartConfig} className="h-[116px] w-full">
              <AreaChart data={formatChartData.downloadsData} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="fillDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ddf3ef" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#fbfdfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#fillDownloads)"
                  dot={{ r: 2.5, fill: '#111' }}
                  activeDot={{ r: 3, fill: '#111' }}
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#767676', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={formatChartData.downloadsTickInterval}
                  height={20}
                />
                <YAxis
                  hide
                  domain={formatChartData.downloadsDomain}
                  allowDataOverflow={true}
                  type="number"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(_value, payload) => {
                        if (!payload || payload.length === 0 || !payload[0]) return '';
                        const date = new Date(payload[0].payload.date);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      }}
                      formatter={(value) => {
                        const result = t('profile.downloadedTimes', { value: Number(value) });
                        return result;
                      }}
                    />
                  } 
                />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Most Downloaded On */}
          <div className="insights-most-section">
            <div className="insights-most-header">
              <span>{t('profile.mostDownloadedOn')}</span>
              <button className="insights-most-toggle">
                <ChevronDown size={16} />
              </button>
            </div>
            {analytics.summary.totalDownloads > 0 ? (
              <>
                <div className="insights-platform">
                  <span className="insights-platform-name">PhotoApp</span>
                </div>
                {analytics.mostPopularImages.filter(img => img.downloads > 0).slice(0, 3).length > 0 && (
                  <div className="insights-thumbnails">
                    {analytics.mostPopularImages.filter(img => img.downloads > 0).slice(0, 3).map((image) => (
                      <div key={image._id} className="insights-thumbnail" title={image.imageTitle}>
                        {image.thumbnailUrl ? (
                          <img 
                            src={image.thumbnailUrl} 
                            alt={image.imageTitle || ''}
                            className="insights-thumbnail-image"
                          />
                        ) : (
                          <div className="insights-thumbnail-placeholder">
                            <Download size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="insights-empty-state">{t('profile.noInsightsData')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Sections Grid */}
      <div className="insights-secondary-grid">
        {/* Uses Section */}
        <div className="insights-section-card">
          <div className="insights-section-header">
            <h3 className="insights-section-title">{t('profile.uses')}</h3>
            <button className="insights-section-button">{t('profile.showFeatured')}</button>
          </div>
          <div className="insights-uses-content">
            {/* Uses chart/visualization would go here */}
            <div className="insights-empty-state">{t('profile.noInsightsData')}</div>
          </div>
          <div className="insights-section-footer">
            <span className="insights-section-note">{t('profile.usesNote')}</span>
          </div>
        </div>

        {/* Milestones Section */}
        <div className="insights-section-card">
          <div className="insights-section-header">
            <h3 className="insights-section-title">{t('profile.milestones')}</h3>
          </div>
          <div className="insights-milestones">
            <div className="milestone-item">
              <Award size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">{t('profile.firstUpload')}</h4>
                <div className="milestone-date">{t('profile.uploadedOn')} {new Date(analytics.mostPopularImages[0]?.createdAt || Date.now()).toLocaleDateString(getLocale() === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="milestone-item milestone-upcoming">
              <Target size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">{t('profile.featuredImage')}</h4>
                <div className="milestone-description">{t('profile.featuredGoal')}</div>
              </div>
            </div>
            <div className="milestone-item milestone-upcoming">
              <Eye size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">{t('image.views')}</h4>
                <div className="milestone-description">{t('profile.viewsGoal')}</div>
              </div>
            </div>
            <div className="milestone-item milestone-upcoming">
              <Download size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">{t('image.downloads')}</h4>
                <div className="milestone-description">{t('profile.downloadsGoal')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Images Section */}
      <div className="insights-images-section">
        <div className="insights-images-header">
          <h3 className="insights-section-title">{t('profile.yourImages')}</h3>
          <button className="insights-sort-button">
            {t('profile.sortByViews')}
            <ChevronDown size={16} />
          </button>
        </div>
        {analytics.mostPopularImages.length > 0 ? (
          <div className="insights-images-list">
            {analytics.mostPopularImages.map((image, index) => (
              <div key={image._id} className="insights-image-item">
                <div className="insights-image-thumbnail">
                  <div className="insights-image-rank">#{index + 1}</div>
                  {image.thumbnailUrl || image.smallUrl || image.imageUrl ? (
                    <img 
                      src={image.thumbnailUrl || image.smallUrl || image.imageUrl} 
                      alt={image.imageTitle || ''}
                      className="insights-image-thumbnail-img"
                    />
                  ) : (
                    <div className="insights-image-placeholder">
                      <Eye size={20} />
                    </div>
                  )}
                </div>
                <div className="insights-image-info">
                  <div className="insights-image-meta">
                    <div className="insights-image-badge">{t('profile.published')}</div>
                    <time className="insights-image-date">
                      {new Date(image.createdAt).toLocaleDateString(getLocale() === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </time>
                  </div>
                  <div className="insights-image-stats">
                    <div className="insights-image-stat">
                      <Eye size={14} />
                      <span>{formatNumber(image.views)}</span>
                    </div>
                    <div className="insights-image-stat">
                      <Download size={14} />
                      <span>{formatNumber(image.downloads)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="insights-empty-state">{t('profile.noImages')}</div>
        )}
      </div>
    </div>
  );
};