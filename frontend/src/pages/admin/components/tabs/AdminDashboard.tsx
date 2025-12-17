import { adminService, type DashboardStats } from '@/services/adminService';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { usePermissions } from '@/hooks/usePermissions';
import { useState, useEffect } from 'react';
import { Download, Users, Image as ImageIcon, Tag, Search, Activity, CheckCircle2, AlertTriangle, XCircle, Server, Database, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { t } from '@/i18n';

interface AdminDashboardProps {
    stats: DashboardStats | null;
    loading: boolean;
}

function DateCell({ date }: { date: string }) {
    const formattedDate = useFormattedDate(date, { format: 'short' });
    return <td>{formattedDate || date}</td>;
}

interface SystemStatus {
    status: 'healthy' | 'warning' | 'critical';
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    responseTime?: number;
    errorRate?: number;
    databaseStatus?: 'connected' | 'disconnected';
    storageStatus?: 'connected' | 'disconnected';
    lastCheck?: string;
}

export function AdminDashboard({ stats, loading }: AdminDashboardProps) {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [isExporting, setIsExporting] = useState(false);
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    // Fetch system status
    useEffect(() => {
        const fetchSystemStatus = async () => {
            try {
                const metrics = await adminService.getSystemMetrics();
                if (metrics) {
                    setSystemStatus({
                        status: metrics.status || 'healthy',
                        cpuUsage: metrics.cpuUsage,
                        memoryUsage: metrics.memoryUsage,
                        diskUsage: metrics.diskUsage,
                        responseTime: metrics.responseTime,
                        errorRate: metrics.errorRate,
                        databaseStatus: metrics.databaseStatus || 'connected',
                        storageStatus: metrics.storageStatus || 'connected',
                        lastCheck: metrics.timestamp || new Date().toISOString(),
                    });
                } else {
                    setSystemStatus({
                        status: 'healthy',
                        lastCheck: new Date().toISOString(),
                    });
                }
            } catch (error) {
                console.error('Error fetching system metrics:', error);
                setSystemStatus({
                    status: 'critical',
                    lastCheck: new Date().toISOString(),
                });
            } finally {
                setStatusLoading(false);
            }
        };

        fetchSystemStatus();
        // Refresh every 30 seconds
        const interval = setInterval(fetchSystemStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleExportData = async () => {
        if (!isSuperAdmin() && !hasPermission('exportData')) {
            toast.error('Bạn không có quyền xuất dữ liệu');
            return;
        }

        setIsExporting(true);
        try {
            const blob = await adminService.exportData();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `photoapp-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Đã xuất dữ liệu thành công');
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xuất dữ liệu');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="admin-dashboard-skeleton">
                    <Skeleton className="h-48 w-full mb-6" />
                    <div className="admin-stats-grid">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full mt-6" />
                    <Skeleton className="h-64 w-full mt-6" />
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="admin-dashboard">
                <div className="admin-empty-state">
                    <p>{t('admin.noData')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard-hero" style={{ position: 'relative' }}>
                <h1 className="admin-dashboard-title">
                    <span>📊</span>
                    Dashboard
                </h1>
                <p className="admin-dashboard-subtitle">{t('admin.dashboardTitle')}</p>
                {(isSuperAdmin() || hasPermission('exportData')) && (
                    <Button
                        onClick={handleExportData}
                        disabled={isExporting}
                        variant="outline"
                        style={{ 
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Download size={16} />
                        {isExporting ? 'Đang xuất...' : 'Xuất dữ liệu'}
                    </Button>
                )}
            </div>

            {/* Quick Actions */}
            <div className="admin-quick-actions">
                <h3 className="admin-quick-actions-title">{t('admin.quickActions')}</h3>
                <div className="admin-quick-actions-grid">
                    {(isSuperAdmin() || hasPermission('viewUsers')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                // Use window.location to trigger tab change
                                window.history.pushState({}, '', '/admin');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                                setTimeout(() => {
                                    const event = new CustomEvent('adminTabChange', { detail: 'users' });
                                    window.dispatchEvent(event);
                                }, 100);
                            }}
                            title={t('admin.manageUsers')}
                        >
                            <Users size={20} />
                            <span>{t('admin.manageUsers')}</span>
                        </button>
                    )}
                    {(isSuperAdmin() || hasPermission('viewImages')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                const event = new CustomEvent('adminTabChange', { detail: 'images' });
                                window.dispatchEvent(event);
                            }}
                            title={t('admin.manageImages')}
                        >
                            <ImageIcon size={20} />
                            <span>{t('admin.manageImages')}</span>
                        </button>
                    )}
                    {(isSuperAdmin() || hasPermission('viewCategories')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                const event = new CustomEvent('adminTabChange', { detail: 'categories' });
                                window.dispatchEvent(event);
                            }}
                            title={t('admin.manageCategories')}
                        >
                            <Tag size={20} />
                            <span>{t('admin.manageCategories')}</span>
                        </button>
                    )}
                    {(isSuperAdmin() || hasPermission('viewAnalytics')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                const event = new CustomEvent('adminTabChange', { detail: 'analytics' });
                                window.dispatchEvent(event);
                            }}
                            title={t('admin.analytics')}
                        >
                            <Search size={20} />
                            <span>{t('admin.analytics')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* System Status Widget */}
            {!statusLoading && systemStatus && (
                <Card style={{ marginBottom: '1.5rem' }}>
                    <CardHeader>
                        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={20} />
                            System Status
                            {systemStatus?.status === 'healthy' && (
                                <CheckCircle2 size={18} style={{ color: '#10b981', marginLeft: 'auto' }} />
                            )}
                            {systemStatus?.status === 'warning' && (
                                <AlertTriangle size={18} style={{ color: '#f59e0b', marginLeft: 'auto' }} />
                            )}
                            {systemStatus?.status === 'critical' && (
                                <XCircle size={18} style={{ color: '#ef4444', marginLeft: 'auto' }} />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {systemStatus?.cpuUsage !== undefined && systemStatus?.cpuUsage !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
                                    <Zap size={16} style={{ color: (systemStatus.cpuUsage || 0) > 80 ? '#ef4444' : (systemStatus.cpuUsage || 0) > 60 ? '#f59e0b' : '#10b981' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>CPU Usage</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{systemStatus.cpuUsage}%</div>
                                    </div>
                                </div>
                            )}
                            {systemStatus?.memoryUsage !== undefined && systemStatus?.memoryUsage !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
                                    <Database size={16} style={{ color: (systemStatus.memoryUsage || 0) > 85 ? '#ef4444' : (systemStatus.memoryUsage || 0) > 70 ? '#f59e0b' : '#10b981' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Memory Usage</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{systemStatus.memoryUsage}%</div>
                                    </div>
                                </div>
                            )}
                            {systemStatus?.diskUsage !== undefined && systemStatus?.diskUsage !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
                                    <Server size={16} style={{ color: (systemStatus.diskUsage || 0) > 90 ? '#ef4444' : (systemStatus.diskUsage || 0) > 75 ? '#f59e0b' : '#10b981' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Disk Usage</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{systemStatus.diskUsage}%</div>
                                    </div>
                                </div>
                            )}
                            {systemStatus?.responseTime !== undefined && systemStatus?.responseTime !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
                                    <Clock size={16} style={{ color: (systemStatus.responseTime || 0) > 1000 ? '#ef4444' : (systemStatus.responseTime || 0) > 500 ? '#f59e0b' : '#10b981' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Response Time</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{systemStatus.responseTime}ms</div>
                                    </div>
                                </div>
                            )}
                            {systemStatus?.databaseStatus && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
                                    <Database size={16} style={{ color: systemStatus.databaseStatus === 'connected' ? '#10b981' : '#ef4444' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Database</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>{systemStatus.databaseStatus}</div>
                                    </div>
                                </div>
                            )}
                            {systemStatus?.storageStatus && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
                                    <Server size={16} style={{ color: systemStatus.storageStatus === 'connected' ? '#10b981' : '#ef4444' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Storage</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>{systemStatus.storageStatus}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {systemStatus?.lastCheck && (
                            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textAlign: 'right' }}>
                                Last check: {new Date(systemStatus.lastCheck).toLocaleTimeString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card admin-stat-card-blue">
                    <div className="admin-stat-icon">
                        <span>👥</span>
                    </div>
                    <div className="admin-stat-content">
                        <div className="admin-stat-value">{stats.stats.totalUsers}</div>
                        <div className="admin-stat-label">Tổng số lượng người dùng</div>
                    </div>
                </div>
                <div className="admin-stat-card admin-stat-card-purple">
                    <div className="admin-stat-icon">
                        <span>🖼️</span>
                    </div>
                    <div className="admin-stat-content">
                        <div className="admin-stat-value">{stats.stats.totalImages}</div>
                        <div className="admin-stat-label">Tổng số lượng ảnh</div>
                    </div>
                </div>
                <div className="admin-stat-card admin-stat-card-cyan">
                    <div className="admin-stat-icon">
                        <span>📁</span>
                    </div>
                    <div className="admin-stat-content">
                        <div className="admin-stat-value">{stats.stats.categoryStats.length}</div>
                        <div className="admin-stat-label">Danh mục</div>
                    </div>
                </div>
            </div>

            {/* Category Stats */}
            <div className="admin-section">
                <h2 className="admin-section-title">Top Categories</h2>
                <div className="admin-category-list">
                    {stats.stats.categoryStats.map((cat) => (
                        <div key={cat._id} className="admin-category-item">
                            <span className="admin-category-name">{cat._id}</span>
                            <span className="admin-category-count">{cat.count} images</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Users */}
            <div className="admin-section">
                <h2 className="admin-section-title">Người dùng được tạo gần đây</h2>
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Tên tài khoản</th>
                                <th>Email</th>
                                <th>Họ và tên</th>
                                <th>Quyền Admin</th>
                                <th>Ngày tham gia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentUsers.map((u) => (
                                <tr key={u._id}>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>{u.displayName}</td>
                                    <td>
                                        {u.isSuperAdmin ? (
                                            <span className="admin-status-badge super-admin">Super Admin</span>
                                        ) : u.isAdmin ? (
                                            <span className="admin-status-badge admin">Admin</span>
                                        ) : (
                                            <span className="admin-status-badge none">No</span>
                                        )}
                                    </td>
                                    <DateCell date={u.createdAt} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Images */}
            <div className="admin-section">
                <h2 className="admin-section-title">{t('admin.recentImagesTitle')}</h2>
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Danh mục</th>
                                <th>Người đăng</th>
                                <th>Ngày đăng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentImages.map((img) => (
                                <tr key={img._id}>
                                    <td>{img.imageTitle}</td>
                                    <td>
                                        {typeof img.imageCategory === 'string'
                                            ? img.imageCategory
                                            : img.imageCategory?.name || 'Không xác định'}
                                    </td>
                                    <td>{img.uploadedBy?.displayName || img.uploadedBy?.username}</td>
                                    <DateCell date={img.createdAt} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

