import { useState, useMemo } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { reportService, type ReportType, type ReportReason } from '@/services/reportService';
import { t } from '@/i18n';
import { Button } from '@/components/ui/button';
import './ReportButton.css';

interface ReportButtonProps {
    type: ReportType;
    targetId: string;
    targetName?: string;
    className?: string;
}

export default function ReportButton({ type, targetId, targetName, className = '' }: ReportButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const REPORT_REASONS = useMemo(() => [
        { value: 'inappropriate_content' as ReportReason, label: t('report.inappropriateContent') },
        { value: 'spam' as ReportReason, label: t('report.spam') },
        { value: 'copyright_violation' as ReportReason, label: t('report.copyrightViolation') },
        { value: 'harassment' as ReportReason, label: t('report.harassment') },
        { value: 'fake_account' as ReportReason, label: t('report.fakeAccount') },
        { value: 'other' as ReportReason, label: t('report.other') },
    ], []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!reason) {
            toast.error(t('report.selectReason'));
            return;
        }

        setSubmitting(true);
        try {
            await reportService.createReport({
                type,
                targetId,
                reason: reason as ReportReason,
                description: description.trim() || undefined,
            });
            
            toast.success(t('report.success'));
            setShowModal(false);
            setReason('');
            setDescription('');
        } catch (error: unknown) {
            console.error('Failed to submit report:', error);
            toast.error(getErrorMessage(error, t('report.failed')));
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeLabel = () => {
        switch (type) {
            case 'image':
                return t('report.typeImage');
            case 'collection':
                return t('report.typeCollection');
            case 'user':
                return t('report.typeUser');
            default:
                return t('report.typeContent');
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className={`report-btn ${className}`}
                onClick={() => setShowModal(true)}
                title={t('report.reportType', { type: getTypeLabel() })}
            >
                <Flag size={16} />
                <span>{t('report.report')}</span>
            </Button>

            {showModal && (
                <div className="report-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="report-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="report-modal-header">
                            <h2>{t('report.reportType', { type: getTypeLabel() })}</h2>
                            <button
                                className="report-modal-close"
                                onClick={() => setShowModal(false)}
                                aria-label={t('common.close')}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="report-modal-form">
                            {targetName && (
                                <div className="report-modal-target">
                                    <p>{t('report.reporting')} <strong>{targetName}</strong></p>
                                </div>
                            )}

                            <div className="report-form-group">
                                <label htmlFor="reason">{t('report.reasonLabel')}</label>
                                <select
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value as ReportReason)}
                                    required
                                    disabled={submitting}
                                >
                                    <option value="">{t('report.selectReasonPlaceholder')}</option>
                                    {REPORT_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="report-form-group">
                                <label htmlFor="description">{t('report.descriptionLabel')}</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('report.descriptionPlaceholder')}
                                    rows={4}
                                    maxLength={1000}
                                    disabled={submitting}
                                />
                                <div className="report-char-count">
                                    {description.length}/1000
                                </div>
                            </div>

                            <div className="report-modal-actions">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="report-btn-cancel"
                                    onClick={() => setShowModal(false)}
                                    disabled={submitting}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    className="report-btn-submit"
                                    loading={submitting}
                                    disabled={!reason}
                                >
                                    {t('report.submit')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

