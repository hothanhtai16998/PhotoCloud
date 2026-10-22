import { create } from 'zustand';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/store';
import type { ApiErrorResponse, ValidationErrorResponse } from '@/types/errors';
import { dispatchLogout, dispatchLoginSuccess } from '@/utils/authEvents';
import { t } from '@/i18n';
import { removeSessionItem, setSessionItem } from '@/utils/safeStorage';
import { isSessionCancelled, isSessionRejected, sessionRetryDelay } from '@/utils/sessionRecovery';
import { getPageDepartureVersion, isPageDeparting } from '@/utils/pageDeparture';
import { getAuthSessionVersion, invalidateAuthSession } from '@/utils/authSessionVersion';

let cancelRetryWait: (() => void) | null = null;

function waitForRetry(delay: number): Promise<void> {
    return new Promise(resolve => {
        const finish = (): void => {
            clearTimeout(timer);
            if (cancelRetryWait === finish) cancelRetryWait = null;
            resolve();
        };
        const timer = setTimeout(finish, delay);
        cancelRetryWait = finish;
    });
}

let pendingSignOut: Promise<unknown> | null = null;
let initializationFlight: { version: number; departure: number; promise: Promise<void> } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
	sessionError: null,
	accessToken: null,
	loading: false,
	isInitializing: true,

	setAccessToken: (accessToken) => {
		set({ accessToken, sessionError: null });
	},

	clearAuth: () => {
		invalidateAuthSession();
		cancelRetryWait?.();
		set({
			accessToken: null,
			sessionError: null,
			isInitializing: false,
			loading: false,
		});
		// Clear sessionStorage on logout to prevent icons from showing on next refresh
		removeSessionItem('hasAuth');
		setSessionItem('publicChromeHint', 'guest');
		// Dispatch event to notify other stores (decoupled from useUserStore)
		dispatchLogout();
	},

		signUp: async (
			username,
			password,
			email,
			firstName,
			lastName,
			phone,
			bio
		) => {
			try {
				set({ loading: true });

				//  gọi api
				await authService.signUp(
					username,
					password,
					email,
					firstName,
					lastName,
					phone,
					bio
				);

				toast.success(t('auth.signUpSuccess'));
			} catch (error: unknown) {
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					t('auth.signUpFailed');
				toast.error(message);
			} finally {
				set({ loading: false });
			}
		},

		signIn: async (
			username,
			password
		) => {
			get().clearAuth();
			const sessionVersion = getAuthSessionVersion();
			try {
				set({ loading: true });
				await pendingSignOut?.catch(() => {});

				const response =
					await authService.signIn(
						username,
						password
					);
				if (sessionVersion !== getAuthSessionVersion()) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');

				// Set access token
				if (response.accessToken) {
					get().setAccessToken(response.accessToken);
				}

				// Dispatch event to notify other stores to fetch user data (decoupled)
				dispatchLoginSuccess();

				toast.success(t('auth.welcomeBack'));
			} catch (error: unknown) {
				const errorResponse = error as ValidationErrorResponse;

				// Handle validation errors (express-validator format)
				if (
					errorResponse.response?.data?.errors &&
					Array.isArray(errorResponse.response.data.errors)
				) {
					const validationErrors =
						errorResponse.response.data.errors
							.map(
								(err) =>
									err.msg ??
									err.message ??
									'Validation failed'
							)
							.join(', ');
					toast.error(`${t('auth.validationError')}: ${validationErrors}`);
				} else {
					const message =
						errorResponse.response?.data?.message ?? t('auth.signInFailed');
					toast.error(message);
				}
				// Re-throw error so form can handle navigation
				throw error;
			} finally {
				set({ loading: false });
			}
		},

		signOut: async () => {
			try {
				get().clearAuth();
				const operation = authService.signOut();
				pendingSignOut = operation;
				try { await operation; }
				finally { if (pendingSignOut === operation) pendingSignOut = null; }
				toast.success(t('auth.signOutSuccess'));
			} catch {
				// Don't show error toast on logout failure
				// User is already logged out locally
				// Log error silently
			}
		},

		refresh: async () => {
            const version = getAuthSessionVersion();
            const departure = getPageDepartureVersion();
            try {
                const accessToken = await authService.refresh();
                if (version !== getAuthSessionVersion() || departure !== getPageDepartureVersion() || isPageDeparting()) return;
                get().setAccessToken(accessToken);
                dispatchLoginSuccess();
            } catch (error: unknown) {
                if (version !== getAuthSessionVersion()) return;
                if (isSessionCancelled(error) && (isPageDeparting() || departure !== getPageDepartureVersion())) throw error;
                if (isSessionRejected(error)) {
                    if (get().accessToken) get().clearAuth();
                    else {
                        // A confirmed guest must not invalidate public requests.
                        removeSessionItem('hasAuth');
                        setSessionItem('publicChromeHint', 'guest');
                        set({ sessionError: null });
                        dispatchLogout();
                    }
                    return;
                }
                set({ sessionError: 'Chưa xác minh được phiên đăng nhập. Vui lòng thử lại khi kết nối ổn định.' });
                throw error;
            }
        },

        initializeApp: async () => {
            const version = getAuthSessionVersion();
            const departure = getPageDepartureVersion();
            if (initializationFlight?.version === version && initializationFlight.departure === departure) return initializationFlight.promise;
            if (!get().isInitializing && !get().sessionError) return;
            set({ isInitializing: true });
            const promise = (async () => {
                try {
                    for (let attempt = 0; attempt < 3; attempt++) {
                        if (version !== getAuthSessionVersion() || departure !== getPageDepartureVersion()) return;
                        try { await get().refresh(); return; }
                        catch (error: unknown) {
                            const delay = sessionRetryDelay(error, attempt);
                            if (delay === null || version !== getAuthSessionVersion() || departure !== getPageDepartureVersion()) return;
                            await waitForRetry(delay);
                        }
                    }
                } finally {
                    if (version === getAuthSessionVersion() && departure === getPageDepartureVersion() && !isPageDeparting()) set({ isInitializing: false });
                }
            })();
            const flight = { version, departure, promise };
            initializationFlight = flight;
            try { await promise; }
            finally { if (initializationFlight === flight) initializationFlight = null; }
        },
    }));
