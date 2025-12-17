import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminLogs() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    interface Log {
        _id: string;
        timestamp: string;
        level?: string;
        message: string;
        userId?: string | { displayName?: string; username?: string };
    }
    const [logs, setLogs] = useState<Log[]>([]);
    const [, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('viewLogs')) {
            toast.error('Bạn không có quyền xem nhật ký');
            return;
        }
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLogs = async (page = 1) => {
        try {
            // Don't block UI - load in background
            // setLoading(true);
            const data = await adminService.getSystemLogs({ page, limit: 50, search });
            setLogs((data.logs as Log[]) || []);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tải nhật ký');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Show UI immediately - don't block
    // if (loading) {
    //     return <div className="admin-loading">Đang tải...</div>;
    // }

    return (
        <div className="admin-logs">
            <div className="admin-header">
                <h1 className="admin-title">Nhật ký hệ thống</h1>
            </div>

            <div className="admin-search">
                <div className="admin-search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm trong nhật ký..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
                <Button variant="outline" onClick={() => toast.info('Tính năng đang được phát triển')}>
                    <Download size={16} />
                    Xuất nhật ký
                </Button>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Thời gian</th>
                            <th>Loại</th>
                            <th>Thông điệp</th>
                            <th>Người dùng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                                    Không có nhật ký
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id}>
                                    <td>{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                    <td>
                                        <span className={`admin-log-badge ${log.level || 'info'}`}>
                                            {log.level?.toUpperCase() || 'INFO'}
                                        </span>
                                    </td>
                                    <td>{log.message}</td>
                                    <td>
                                        {typeof log.userId === 'object' && log.userId
                                            ? log.userId.displayName || log.userId.username
                                            : log.userId || 'System'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

