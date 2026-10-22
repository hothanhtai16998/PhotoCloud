import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { authService } from '@/services/authService';
import type { UserState } from '@/types/store';
import { isSessionCancelled, isSessionRejected } from '@/utils/sessionRecovery';
import { isPageDeparting } from '@/utils/pageDeparture';
import { onLogout, onLoginSuccess } from '@/utils/authEvents';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { useAuthStore } from './useAuthStore';

let userRequest = 0;

export const useUserStore = create(
	immer<UserState>((set, get) => ({
		error: null,
		user: null,
		loading: false,

		fetchMe: async () => {
			if (isPageDeparting() || get().loading || !useAuthStore.getState().accessToken) return;
			const request = ++userRequest;
			const version = getAuthSessionVersion();
			try {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				const user = await authService.fetchMe();
				if (request !== userRequest || version !== getAuthSessionVersion()) return;

				set((state) => {
					state.user = user;
					state.loading = false;
				});
			} catch (error) {
				if (request !== userRequest || version !== getAuthSessionVersion()) return;
                if (isSessionCancelled(error)) {
                    set(state => { state.loading = false; });
                    if (!isPageDeparting()) void get().fetchMe();
                    return;
                }
				// Only clear state if it's a 401/403 (unauthorized/forbidden)
				// This means the user is actually not authenticated
                if (isSessionRejected(error)) {
                    useAuthStore.getState().clearAuth();
				} else {
					// Temporary failures preserve identity and offer a retry.
					set((state) => {
						state.loading = false;
						state.error = 'Không thể tải thông tin tài khoản. Vui lòng thử lại.';
					});
				}
				// Don't show error toast on fetchMe failure during initialization
				// It's expected if user is not logged in
			}
		},

		clearUser: () => {
			userRequest++;
			set((state) => {
				state.error = null;
				state.user = null;
				state.loading = false;
			});
		},
	}))
);

// Listen for auth events to keep user store in sync (decoupled from auth store)
if (typeof window !== 'undefined') {
	// Clear user when logout event is dispatched
	onLogout(() => {
		useUserStore.getState().clearUser();
	});

	// Fetch user when login success event is dispatched
	onLoginSuccess(() => {
		const state = useUserStore.getState();
		// Only fetch if we don't have user data yet
		if (!state.user && !state.loading) {
			state.fetchMe();
		}
	});
}

