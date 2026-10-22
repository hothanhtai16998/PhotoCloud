import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { getPageDepartureVersion, isPageDeparting } from '@/utils/pageDeparture';
import { CanceledError } from 'axios';
import api from '@/lib/axios';
import type {
	SignUpResponse,
	SignInResponse,
	SignOutResponse,
	RefreshTokenResponse,
	CheckEmailAvailabilityResponse,
	CheckUsernameAvailabilityResponse,
	FetchMeResponse,
} from '@/types/auth';
import type { User } from '@/types/user';

let refreshFlight: { version: number; departure: number; promise: Promise<string> } | null = null;

export const authService = {
	signUp: async (
		username: string,
		password: string,
		email: string,
		firstName: string,
		lastName: string,
		phone?: string,
		bio?: string
	): Promise<SignUpResponse> => {
		const res = await api.post<SignUpResponse>(
			'/auth/signup',
			{
				username,
				password,
				email,
				firstName,
				lastName,
				phone,
				bio,
			},
			{ withCredentials: true }
		);

		return res.data;
	},

	signIn: async (
		username: string,
		password: string
	): Promise<SignInResponse> => {
		const res = await api.post<SignInResponse>(
			'/auth/signin',
			{ username, password },
			{ withCredentials: true }
		);
		return res.data;
	},

	signOut: async (): Promise<SignOutResponse> => {
		const res = await api.post<SignOutResponse>(
			'/auth/signout',
			{},
			{ withCredentials: true }
		);
		return res.data;
	},

	fetchMe: async (): Promise<User> => {
		const res = await api.get<FetchMeResponse>(
			'/users/me',
			{ withCredentials: true, params: { _t: Date.now() }, headers: { 'Cache-Control': 'no-cache' } }
		);
		const user = res.data?.user;
        if (!user || typeof user !== 'object' || typeof user._id !== 'string' || !user._id) throw new Error('Invalid profile response');
        return user;
	},

	refresh: (): Promise<string> => {
        const version = getAuthSessionVersion();
        const departure = getPageDepartureVersion();
        if (refreshFlight?.version === version && refreshFlight.departure === departure) return refreshFlight.promise;
        const promise = api.post<RefreshTokenResponse>('/auth/refresh', {}, { withCredentials: true }).then(res => {
            if (departure !== getPageDepartureVersion() || isPageDeparting()) throw new CanceledError('Page changed');
            const token = res.data.accessToken;
            if (typeof token !== 'string' || !token.trim()) throw new Error('Invalid refresh response');
            return token;
        });
        const flight = { version, departure, promise };
        refreshFlight = flight;
        void promise.finally(() => { if (refreshFlight === flight) refreshFlight = null; }).catch(() => {});
        return promise;
    },

	checkEmailAvailability: async (email: string): Promise<CheckEmailAvailabilityResponse> => {
		const res = await api.get<CheckEmailAvailabilityResponse>(
			`/auth/check-email?email=${encodeURIComponent(email)}`,
			{ withCredentials: true }
		);
		return res.data;
	},

	checkUsernameAvailability: async (username: string): Promise<CheckUsernameAvailabilityResponse> => {
		const res = await api.get<CheckUsernameAvailabilityResponse>(
			`/auth/check-username?username=${encodeURIComponent(username)}`,
			{ withCredentials: true }
		);
		return res.data;
	},

	/**
	 * Get all active sessions for the current user
	 */
	getActiveSessions: async (): Promise<{ success: boolean; sessions: Session[] }> => {
		const res = await api.get<{ success: boolean; sessions: Session[] }>(
			'/auth/sessions',
			{ withCredentials: true }
		);
		return res.data;
	},

	/**
	 * Sign out all devices except the current one
	 */
	signOutAllDevices: async (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
		const res = await api.post<{ success: boolean; message: string; deletedCount: number }>(
			'/auth/sessions/signout-all',
			{},
			{ withCredentials: true }
		);
		return res.data;
	},

	/**
	 * Sign out a specific session
	 */
	signOutSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
		const res = await api.delete<{ success: boolean; message: string }>(
			`/auth/sessions/${sessionId}`,
			{ withCredentials: true }
		);
		return res.data;
	},
};

export interface Session {
	_id: string;
	deviceName: string;
	browserName: string;
	ipAddress: string;
	location: string;
	isCurrentSession: boolean;
	lastActive: string;
	createdAt: string;
}
