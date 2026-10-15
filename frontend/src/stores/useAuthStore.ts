import { create } from 'zustand';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/store';
import type { ApiErrorResponse, ValidationErrorResponse, HttpErrorResponse } from '@/types/errors';
import { dispatchLogout, dispatchLoginSuccess } from '@/utils/authEvents';
import { t } from '@/i18n';
import { getAuthSessionVersion, invalidateAuthSession } from '@/utils/authSessionVersion';

let pendingSignOut: Promise<unknown> | null = null;
let initializationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
	accessToken: null,
	loading: false,
	isInitializing: true,

	setAccessToken: (accessToken) => {
		set({ accessToken });
	},

	clearAuth: () => {
		invalidateAuthSession();
		set({
			accessToken: null,
			loading: false,
		});
		// Clear sessionStorage on logout to prevent icons from showing on next refresh
		if (typeof window !== 'undefined') {
			sessionStorage.removeItem('hasAuth');
		}
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
			const sessionVersion = getAuthSessionVersion();
			try {
				const { setAccessToken } = get();
				const accessToken = await authService.refresh();
				if (sessionVersion !== getAuthSessionVersion()) return;

				setAccessToken(accessToken);

				// Dispatch event to let user store handle fetching user data
				dispatchLoginSuccess();
			} catch (error: unknown) {
				if (sessionVersion !== getAuthSessionVersion()) return;
				const errorResponse = error as HttpErrorResponse;
				const errorStatus = errorResponse?.response?.status;
				
				// Check if request was cancelled (e.g., during rapid refresh)
				const isCancelled = 
					(error as any)?.name === 'CanceledError' || 
					(error as any)?.code === 'ERR_CANCELED' ||
					(error as any)?.message === 'canceled';
				
				// Don't sign out if request was cancelled or rate limited
				// Only sign out on actual auth failures
				if (isCancelled || errorStatus === 429) {
					// Request was cancelled or rate limited - don't sign out
					// User stays logged in
					return;
				}
				
				// Only show error if it's not a 401/403 (expected when not logged in)
				if (errorStatus !== 401 && errorStatus !== 403) {
					toast.error(t('auth.sessionExpired'));
				}
				
				// Only clear auth on actual auth failures (401, 403)
				if (errorStatus === 401 || errorStatus === 403) {
					if (get().accessToken) get().clearAuth();
					else {
						// Confirming a guest is not an account switch: keep public requests valid.
						if (typeof window !== 'undefined') sessionStorage.removeItem('hasAuth');
						dispatchLogout();
					}
				}
			}
		},

		initializeApp: async () => {
			if (initializationPromise) return initializationPromise;
			if (!get().isInitializing) return;
			initializationPromise = (async () => {
				try { await get().refresh(); }
				catch { /* Guests can continue without a session. */ }
				finally { set({ isInitializing: false }); }
			})();
			try { await initializationPromise; }
			finally { initializationPromise = null; }
		},
	}));
