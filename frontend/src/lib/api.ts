/**
 * Enhanced API wrapper with request deduplication
 * Wraps axios to automatically deduplicate requests
 */

import api from './axios';
import { deduplicateRequest } from '@/utils/requestDeduplication';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Enhanced GET request with deduplication
 */
export async function get<T = unknown>(
	url: string,
	config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
	return deduplicateRequest(
		'GET',
		url,
		() => api.get<T>(url, config),
		config?.params
	);
}

/**
 * Enhanced POST request (no deduplication for mutations)
 */
export async function post<T = unknown>(
	url: string,
	data?: unknown,
	config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
	return api.post<T>(url, data, config);
}

/**
 * Enhanced PUT request (no deduplication for mutations)
 */
export async function put<T = unknown>(
	url: string,
	data?: unknown,
	config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
	return api.put<T>(url, data, config);
}

/**
 * Enhanced DELETE request (no deduplication for mutations)
 */
export async function del<T = unknown>(
	url: string,
	config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
	return api.delete<T>(url, config);
}

/**
 * Enhanced PATCH request (no deduplication for mutations)
 */
export async function patch<T = unknown>(
	url: string,
	data?: unknown,
	config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
	return api.patch<T>(url, data, config);
}

// Export default api for backward compatibility
export default api;


