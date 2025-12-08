/**
 * Auth Events - Decouples auth store from user store
 * Uses custom events to communicate between stores without direct dependencies
 */

export const AUTH_EVENTS = {
    LOGOUT: 'auth:logout',
    LOGIN_SUCCESS: 'auth:login_success',
} as const;

/**
 * Dispatch logout event
 * Called when user logs out to notify other stores
 */
export function dispatchLogout(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
    }
}

/**
 * Dispatch login success event
 * Called after successful login to notify other stores
 */
export function dispatchLoginSuccess(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN_SUCCESS));
    }
}

/**
 * Subscribe to logout events
 */
export function onLogout(callback: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }
    
    const handler = () => callback();
    window.addEventListener(AUTH_EVENTS.LOGOUT, handler);
    return () => window.removeEventListener(AUTH_EVENTS.LOGOUT, handler);
}

/**
 * Subscribe to login success events
 */
export function onLoginSuccess(callback: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }
    
    const handler = () => callback();
    window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handler);
    return () => window.removeEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handler);
}

