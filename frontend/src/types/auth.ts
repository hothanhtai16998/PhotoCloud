import type { User } from './user';

// Sign Up Response
export interface SignUpResponse {
    success: boolean;
    message?: string;
    user?: User;
    accessToken?: string;
}

// Sign In Response
export interface SignInResponse {
    success: boolean;
    message?: string;
    user?: User;
    accessToken?: string;
}

// Sign Out Response
export interface SignOutResponse {
    success: boolean;
    message?: string;
}

// Refresh Token Response
export interface RefreshTokenResponse {
    accessToken: string;
}

// Check Email Availability Response
export interface CheckEmailAvailabilityResponse {
    available: boolean;
    message?: string;
}

// Check Username Availability Response
export interface CheckUsernameAvailabilityResponse {
    available: boolean;
    message?: string;
}

// Fetch Me Response
export interface FetchMeResponse {
    user: User;
}

