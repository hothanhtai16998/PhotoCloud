import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { authService } from '@/services/authService';
import type { UserState } from '@/types/store';
import type { HttpErrorResponse } from '@/types/errors';
import { onLogout, onLoginSuccess, dispatchLogout } from '@/utils/authEvents';

export const useUserStore = create(
	immer<UserState>((set) => ({
		user: null,
		loading: false,

		fetchMe: async () => {
			try {
				set((state) => {
					state.loading = true;
				});

				const user = await authService.fetchMe();

				set((state) => {
					state.user = user;
					state.loading = false;
				});
			} catch (error) {
				// Only clear state if it's a 401/403 (unauthorized/forbidden)
				// This means the user is actually not authenticated
				const errorStatus = (error as HttpErrorResponse)?.response?.status;

				if (errorStatus === 401 || errorStatus === 403) {
					// User is not authenticated, clear user state
					set((state) => {
						state.user = null;
						state.loading = false;
					});
					// Dispatch logout event to notify auth store (decoupled)
					dispatchLogout();
				} else {
					// For other errors (network, 500, etc.), keep existing user data
					set((state) => {
						state.loading = false;
					});
				}
				// Don't show error toast on fetchMe failure during initialization
				// It's expected if user is not logged in
			}
		},

		clearUser: () => {
			set((state) => {
				state.user = null;
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

