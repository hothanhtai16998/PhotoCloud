import { useState, useEffect } from 'react';
import { authService, type Session } from '@/services/authService';
import { toast } from 'sonner';
import { LogOut, Monitor, Globe, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '@/pages/admin/components/modals';
import { t } from '@/i18n';
import './ActiveSessions.css';

export function ActiveSessions() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [signingOutAll, setSigningOutAll] = useState(false);
	const [signingOutSession, setSigningOutSession] = useState<string | null>(null);
	const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);

	useEffect(() => {
		fetchSessions();
	}, []);

	const fetchSessions = async () => {
		try {
			setLoading(true);
			const response = await authService.getActiveSessions();
			setSessions(response.sessions);
		} catch (error: any) {
			console.error('Failed to fetch sessions:', error);
			toast.error(error?.response?.data?.message || t('profile.loadSessionsFailed'));
		} finally {
			setLoading(false);
		}
	};

	const handleSignOutAll = async () => {
		try {
			setSigningOutAll(true);
			const response = await authService.signOutAllDevices();
			toast.success(response.message || t('profile.signOutAllDevicesSuccess'));
			await fetchSessions();
		} catch (error: any) {
			console.error('Failed to sign out all devices:', error);
			toast.error(error?.response?.data?.message || t('profile.signOutAllDevicesFailed'));
		} finally {
			setSigningOutAll(false);
			setShowSignOutAllModal(false);
		}
	};

	const handleSignOutSession = async (sessionId: string) => {
		try {
			setSigningOutSession(sessionId);
			const response = await authService.signOutSession(sessionId);
			toast.success(response.message || t('profile.signOutDeviceSuccess'));
			await fetchSessions();
		} catch (error: any) {
			console.error('Failed to sign out session:', error);
			toast.error(error?.response?.data?.message || t('profile.signOutDeviceFailed'));
		} finally {
			setSigningOutSession(null);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) {
			return t('notifications.justNow');
		} else if (diffMins < 60) {
			return t('notifications.minutesAgo', { count: diffMins });
		} else if (diffHours < 24) {
			return t('notifications.hoursAgo', { count: diffHours });
		} else if (diffDays < 7) {
			return t('notifications.daysAgo', { count: diffDays });
		} else {
			return date.toLocaleDateString('vi-VN', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			});
		}
	};

	if (loading) {
		return (
			<div className="active-sessions">
				<h2 className="form-title">{t('profile.activeSessionsTitle')}</h2>
				<div className="sessions-loading">{t('common.loading')}</div>
			</div>
		);
	}

	return (
		<div className="active-sessions">
			<div className="sessions-header">
				<h2 className="form-title">{t('profile.activeSessionsTitle')}</h2>
				{sessions.length > 1 && (
					<button
						className="sign-out-all-button"
						onClick={() => setShowSignOutAllModal(true)}
						disabled={signingOutAll}
					>
						{signingOutAll ? t('profile.processing') : t('profile.signOutAllDevices')}
					</button>
				)}
			</div>

			<p className="sessions-description">
				{t('profile.activeSessionsDescription')}
			</p>

			{sessions.length === 0 ? (
				<div className="sessions-empty">{t('profile.noActiveSessions')}</div>
			) : (
				<div className="sessions-list">
					{sessions.map((session) => (
						<div
							key={session._id}
							className={`session-item ${session.isCurrentSession ? 'current-session' : ''}`}
						>
							<div className="session-icon">
								<Monitor size={20} />
							</div>
							<div className="session-info">
								<div className="session-header-info">
									<div className="session-device">
										{session.deviceName} • {session.browserName}
									{session.isCurrentSession && (
										<span className="current-badge">
											<CheckCircle2 size={14} />
											{t('profile.currentSession')}
										</span>
									)}
									</div>
									{!session.isCurrentSession && (
										<button
											className="sign-out-session-button"
											onClick={() => handleSignOutSession(session._id)}
											disabled={signingOutSession === session._id}
											title={t('profile.signOutDevice')}
										>
											{signingOutSession === session._id ? (
												t('profile.processing')
											) : (
												<>
													<LogOut size={14} />
													{t('profile.signOutDevice')}
												</>
											)}
										</button>
									)}
								</div>
								<div className="session-details">
									<div className="session-detail-item">
										<Globe size={14} />
										<span>{session.ipAddress}</span>
									</div>
									<div className="session-detail-item">
										<MapPin size={14} />
										<span>{session.location}</span>
									</div>
									<div className="session-detail-item">
										<Clock size={14} />
										<span>{t('profile.lastActive')}: {formatDate(session.lastActive)}</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<ConfirmModal
				isOpen={showSignOutAllModal}
				onClose={() => setShowSignOutAllModal(false)}
				onConfirm={handleSignOutAll}
				title={t('profile.signOutAllDevices')}
				message={t('profile.signOutAllDevicesConfirm')}
				confirmText={t('profile.signOutAllDevices')}
				cancelText={t('common.cancel')}
				variant="warning"
			/>
		</div>
	);
}

