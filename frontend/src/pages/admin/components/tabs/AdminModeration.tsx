import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { ModerationNotesModal } from '../modals/ModerationNotesModal';
import { t } from '@/i18n';

export function AdminModeration() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    interface PendingContentItem {
        _id: string;
        title?: string;
        content?: string;
        uploadedBy?: { displayName?: string; username?: string };
        status?: string;
        createdAt: string;
    }
    const [pendingContent, setPendingContent] = useState<PendingContentItem[]>([]);
    const [, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [contentToReject, setContentToReject] = useState<string | null>(null);

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('moderateContent')) {
            toast.error(t('admin.noPermission'));
            return;
        }
        loadPendingContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadPendingContent = async () => {
        try {
            // Don't block UI - load in background
            // setLoading(true);
            const data = await adminService.getPendingContent();
            setPendingContent((data.content as PendingContentItem[]) || []);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('admin.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (contentId: string) => {
        try {
            await adminService.approveContent(contentId);
            toast.success(t('admin.approveSuccess'));
            loadPendingContent();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('admin.moderationFailed'));
        }
    };

    const handleRejectClick = (contentId: string) => {
        setContentToReject(contentId);
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async (reason?: string) => {
        if (!contentToReject) return;

        try {
            await adminService.rejectContent(contentToReject, reason || undefined);
            toast.success(t('admin.rejectSuccess'));
            loadPendingContent();
            setShowRejectModal(false);
            setContentToReject(null);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('admin.moderationFailed'));
        }
    };

    // Show UI immediately - don't block
    // if (loading) {
    //     return <div className="admin-loading">{t('common.loading')}</div>;
    // }

    return (
        <div className="admin-moderation">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.moderation')}</h1>
            </div>

            <div className="admin-search">
                <div className="admin-search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.searchContent')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin.content')}</th>
                            <th>{t('admin.uploader')}</th>
                            <th>{t('admin.status')}</th>
                            <th>{t('admin.uploadDate')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingContent.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                                    {t('admin.noPendingContent')}
                                </td>
                            </tr>
                        ) : (
                            pendingContent.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.title || item.content}</td>
                                    <td>{item.uploadedBy?.displayName || item.uploadedBy?.username}</td>
                                    <td>
                                        <span className={`admin-status-badge ${item.status || 'pending'}`}>
                                            {item.status || t('admin.pending')}
                                        </span>
                                    </td>
                                    <td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <div className="admin-actions">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleApprove(item._id)}
                                            >
                                                <CheckCircle size={16} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRejectClick(item._id)}
                                            >
                                                <XCircle size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ModerationNotesModal
                isOpen={showRejectModal}
                onClose={() => {
                    setShowRejectModal(false);
                    setContentToReject(null);
                }}
                onConfirm={handleRejectConfirm}
                title={t('admin.rejectImage')}
                placeholder={t('admin.moderationNotesPlaceholder')}
                isOptional={true}
            />
        </div>
    );
}

