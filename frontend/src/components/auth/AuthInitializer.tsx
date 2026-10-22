import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useEffect } from 'react';
import { SessionRecoveryPanel } from './SessionRecoveryPanel';
import { isPageDeparting } from '@/utils/pageDeparture';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
    const { initializeApp, sessionError, isInitializing, accessToken } = useAuthStore();
    const { user, error: profileError, loading: profileLoading, fetchMe } = useUserStore();
    const recoveryMessage = sessionError || (accessToken && !user ? profileError : null);
    useEffect(() => {
        void initializeApp();
        const recover = () => {
            const state = useAuthStore.getState();
            if (document.visibilityState === 'hidden' || isPageDeparting()) return;
            if (state.sessionError || state.isInitializing) void state.initializeApp();
            else {
                const profile = useUserStore.getState();
                if (state.accessToken && !profile.user && !profile.loading) void profile.fetchMe();
            }
        };
        window.addEventListener('online', recover);
        window.addEventListener('pageshow', recover);
        document.addEventListener('visibilitychange', recover);
        return () => {
            window.removeEventListener('online', recover);
            window.removeEventListener('pageshow', recover);
            document.removeEventListener('visibilitychange', recover);
        };
    }, [initializeApp]);
    return <>
        {children}
        {recoveryMessage && !isInitializing && !profileLoading && <div className="session-recovery-notice">
            <SessionRecoveryPanel message="Chưa thể hoàn tất kiểm tra tài khoản. Vui lòng thử lại." onRetry={() => { void (sessionError ? initializeApp() : fetchMe()); }} />
        </div>}
    </>;
}
