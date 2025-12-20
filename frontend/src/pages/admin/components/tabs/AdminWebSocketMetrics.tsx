import { useState, useEffect, memo } from 'react';
import { adminService } from '@/services/adminService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Users, Zap, AlertCircle, TrendingUp, Clock, Network, Server, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/i18n';

interface WebSocketMetrics {
    uptime: {
        ms: number;
        seconds: number;
        minutes: number;
        hours: number;
        formatted: string;
    };
    connections: {
        total: number;
        active: number;
        failed: number;
        reconnected: number;
        disconnected: number;
        successRate: string;
        peak?: number;
        avgSessionDuration?: string;
        connectionRate?: number;
        reconnectionRate?: string;
        activeUserCount?: number;
        uniqueUsersLastHour?: number;
        durationHistogram?: Array<{ range: string; count: number }>;
    };
    events: {
        total: number;
        eventsPerSecond: number;
        byType: Record<string, number>;
        topEventTypes: Array<{ eventType: string; count: number }>;
        latency: {
            average: string;
            min: string;
            max: string;
            samples: number;
        };
        deliveryRate?: string;
        delivered?: number;
        failed?: number;
    };
    rooms: {
        total: number;
        totalUsers: number;
        topRooms: Array<{ roomId: string; userCount: number }>;
        joins?: number;
        leaves?: number;
        activityRate?: number;
    };
    bandwidth?: {
        bytes: number;
        kb: string;
        mb: string;
    };
    errors: {
        auth: number;
        join: number;
        emit: number;
        other: number;
        total: number;
    };
    timestamp: string;
}

export const AdminWebSocketMetrics = memo(function AdminWebSocketMetrics() {
    const [metrics, setMetrics] = useState<WebSocketMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            const response = await adminService.getWebSocketMetrics();
            if (response.success && response.metrics) {
                setMetrics(response.metrics);
                setError(null);
            } else {
                setError('Invalid response format');
            }
        } catch (error: any) {
            setError(error?.message || 'Failed to fetch metrics');
            // Don't show toast on every error to avoid spamming
            if (!metrics) {
                // Only show error on first load
                toast.error('Failed to load WebSocket metrics. Check console for details.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Refresh every 5 seconds
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !metrics) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (!metrics && !loading) {
    const getHealthColor = (status?: string) => {
        if (!status) return 'text-gray-600';
        switch (status) {
            case 'healthy': return 'text-green-600';
            case 'warning': return 'text-yellow-600';
            case 'critical': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getHealthBgColor = (status?: string) => {
        if (!status) return 'bg-gray-100';
        switch (status) {
            case 'healthy': return 'bg-green-50 border-green-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'critical': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold mb-2">WebSocket Metrics</h2>
                    <p className="text-muted-foreground text-sm">
                        Real-time WebSocket connection and event statistics
                    </p>
                </div>
                {metrics.health && (
                    <Card className={`${getHealthBgColor(metrics.health.status)} border-2`}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">{t('admin.systemHealth')}</div>
                                    <div className={`text-3xl font-bold ${getHealthColor(metrics.health.status)}`}>
                                        {metrics.health.score}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {metrics.health.status === 'healthy' ? t('admin.healthy') : 
                                         metrics.health.status === 'warning' ? t('admin.warning') : 
                                         t('admin.critical')}
                                    </div>
                                </div>
                                <div className="text-xs space-y-1">
                                    <div>Conn: {metrics.health.factors.connectionSuccess.toFixed(1)}%</div>
                                    <div>Events: {metrics.health.factors.eventDelivery}%</div>
                                    <div>Errors: {metrics.health.factors.errorRate}%</div>
                                    <div>Latency: {metrics.health.factors.latency}ms</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.websocketMetrics')}</CardTitle>
                        <CardDescription>{t('admin.websocketMetricsDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        {error ? (
                            <>
                                <p className="text-muted-foreground mb-2">{t('admin.errorLoadingMetrics')}</p>
                                <p className="text-xs text-red-600 mb-2">{error}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.checkConsoleForDetails')}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-muted-foreground mb-2">{t('admin.noMetricsAvailable')}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.noMetricsAvailableDescription')}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
        if (value <= thresholds.good) return 'text-green-600';
        if (value <= thresholds.warning) return 'text-yellow-600';
        return 'text-red-600';
    };

    const successRate = parseFloat(metrics.connections.successRate.replace('%', ''));

    const getHealthColor = (status?: string) => {
        if (!status) return 'text-gray-600';
        switch (status) {
            case 'healthy': return 'text-green-600';
            case 'warning': return 'text-yellow-600';
            case 'critical': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getHealthBgColor = (status?: string) => {
        if (!status) return 'bg-gray-100';
        switch (status) {
            case 'healthy': return 'bg-green-50 border-green-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'critical': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2">WebSocket Metrics</h2>
                    <p className="text-muted-foreground text-sm">
                        Real-time WebSocket connection and event statistics
                    </p>
                </div>
                {metrics.health && (
                    <Card className={`${getHealthBgColor(metrics.health.status)} border-2`}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">{t('admin.systemHealth')}</div>
                                    <div className={`text-3xl font-bold ${getHealthColor(metrics.health.status)}`}>
                                        {metrics.health.score}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {metrics.health.status === 'healthy' ? t('admin.healthy') : 
                                         metrics.health.status === 'warning' ? t('admin.warning') : 
                                         t('admin.critical')}
                                    </div>
                                </div>
                                <div className="text-xs space-y-1">
                                    <div>Conn: {metrics.health.factors.connectionSuccess.toFixed(1)}%</div>
                                    <div>Events: {metrics.health.factors.eventDelivery}%</div>
                                    <div>Errors: {metrics.health.factors.errorRate}%</div>
                                    <div>Latency: {metrics.health.factors.latency}ms</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Connection Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.activeConnections')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.activeConnectionsTooltip')}
                                </span>
                            </div>
                        </div>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.connections.active}</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.connections.total} {t('admin.totalConnections')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.successRate')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.successRateTooltip')}
                                </span>
                            </div>
                        </div>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getStatusColor(successRate, { good: 95, warning: 90 })}`}>
                            {metrics.connections.successRate}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.failedReconnected', { failed: metrics.connections.failed, reconnected: metrics.connections.reconnected })}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.eventsPerSecond')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.eventsPerSecondTooltip')}
                                </span>
                            </div>
                        </div>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.events.eventsPerSecond.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.totalEvents', { total: metrics.events.total.toLocaleString() })}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.avgLatency')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.avgLatencyTooltip')}
                                </span>
                            </div>
                        </div>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.events.latency.average}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.minMaxLatency', { min: metrics.events.latency.min, max: metrics.events.latency.max })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Connection Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.peakConnections')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.peakConnectionsTooltip')}
                                </span>
                            </div>
                        </div>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.connections.peak || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.maximumConcurrentConnections')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.avgSessionDuration')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.avgSessionDurationTooltip')}
                                </span>
                            </div>
                        </div>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.connections.avgSessionDuration || '0s'}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.averageConnectionDuration')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.connectionRate')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.connectionRateTooltip')}
                                </span>
                            </div>
                        </div>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.connections.connectionRate || 0}/min</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.connectionsPerMinute')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.activeUsers')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.activeUsersTooltip')}
                                </span>
                            </div>
                        </div>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.connections.activeUserCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.uniqueInLastHour', { count: metrics.connections.uniqueUsersLastHour || 0 })}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{t('admin.reconnectionRate')}</CardTitle>
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.reconnectionRateTooltip')}
                                </span>
                            </div>
                        </div>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getStatusColor(parseFloat(metrics.connections.reconnectionRate || '0'), { good: 5, warning: 10 })}`}>
                            {metrics.connections.reconnectionRate || '0.00'}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.reconnections', { count: metrics.connections.reconnected || 0 })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Uptime and Rooms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            {t('admin.serverUptime')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.serverUptimeTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.uptime.formatted}</div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {t('admin.runningSince', { date: new Date(new Date(metrics.timestamp).getTime() - metrics.uptime.ms).toLocaleString() })}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="h-5 w-5" />
                            {t('admin.activeRooms')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.activeRoomsTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.rooms.total}</div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {t('admin.totalUsersAcrossRooms', { count: metrics.rooms.totalUsers })}
                        </p>
                        {metrics.rooms.activityRate !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('admin.joinsLeaves', { joins: metrics.rooms.joins || 0, leaves: metrics.rooms.leaves || 0 })}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Event Delivery and Bandwidth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            {t('admin.eventDelivery')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.eventDeliveryTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {metrics.events.deliveryRate || '100.00%'}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {t('admin.deliveredFailed', { delivered: metrics.events.delivered || 0, failed: metrics.events.failed || 0 })}
                        </p>
                    </CardContent>
                </Card>

                {metrics.bandwidth && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                {t('admin.estimatedBandwidth')}
                                <div className="admin-tooltip-wrapper">
                                    <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                    <span className="admin-tooltip-text" role="tooltip">
                                        {t('admin.estimatedBandwidthTooltip')}
                                    </span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {parseFloat(metrics.bandwidth.mb) > 1 
                                    ? `${metrics.bandwidth.mb} MB`
                                    : `${metrics.bandwidth.kb} KB`}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                {t('admin.totalDataTransferred')}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Connection Duration Histogram */}
            {metrics.connections.durationHistogram && metrics.connections.durationHistogram.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {t('admin.connectionDurationDistribution')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.connectionDurationDistributionTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                        <CardDescription>
                            {t('admin.howLongUsersStayConnected')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {metrics.connections.durationHistogram.map((item) => {
                                const maxCount = Math.max(...metrics.connections.durationHistogram!.map(d => d.count));
                                return (
                                    <div key={item.range} className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 min-w-[120px]">
                                            <span className="text-sm font-medium">
                                                {item.range}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                                            <div className="flex-1 bg-muted rounded-full h-2">
                                                <div
                                                    className="bg-primary h-2 rounded-full"
                                                    style={{
                                                        width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`
                                                    }}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold w-12 text-right">
                                                {item.count}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Event Types */}
            {metrics.events.topEventTypes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            {t('admin.topEventTypes')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.topEventTypesTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                        <CardDescription>{t('admin.mostFrequentlyEmittedEvents')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {metrics.events.topEventTypes.map((item, index) => (
                                <div key={item.eventType} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            #{index + 1}
                                        </span>
                                        <code className="text-sm bg-muted px-2 py-1 rounded">
                                            {item.eventType}
                                        </code>
                                    </div>
                                    <span className="text-sm font-semibold">
                                        {item.count.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Rooms */}
            {metrics.rooms.topRooms.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {t('admin.topRooms')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.topRoomsTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                        <CardDescription>{t('admin.roomsWithMostActiveUsers')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {metrics.rooms.topRooms.map((room, index) => (
                                <div key={room.roomId} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            #{index + 1}
                                        </span>
                                        <code className="text-sm bg-muted px-2 py-1 rounded">
                                            {room.roomId}
                                        </code>
                                    </div>
                                    <span className="text-sm font-semibold">
                                        {room.userCount} {room.userCount === 1 ? 'user' : 'users'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Breakdown */}
            {metrics.errors.total > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            {t('admin.errorBreakdown')}
                            <div className="admin-tooltip-wrapper">
                                <HelpCircle size={14} className="admin-tooltip-icon" aria-hidden="true" />
                                <span className="admin-tooltip-text" role="tooltip">
                                    {t('admin.errorBreakdownTooltip')}
                                </span>
                            </div>
                        </CardTitle>
                        <CardDescription>{t('admin.totalErrors', { count: metrics.errors.total })}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground">{t('admin.authentication')}</div>
                                <div className="text-xl font-bold">{metrics.errors.auth}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">{t('admin.join')}</div>
                                <div className="text-xl font-bold">{metrics.errors.join}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">{t('admin.emit')}</div>
                                <div className="text-xl font-bold">{metrics.errors.emit}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">{t('admin.other')}</div>
                                <div className="text-xl font-bold">{metrics.errors.other}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground text-center">
                {t('admin.lastUpdated', { date: new Date(metrics.timestamp).toLocaleString() })}
            </div>
        </div>
    );
});

