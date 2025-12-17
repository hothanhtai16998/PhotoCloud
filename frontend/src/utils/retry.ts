/**
 * Utility function for retrying failed API calls
 */

import { apiConfig } from '@/config/apiConfig';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'fixed' | 'exponential';
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retry a function with configurable retry logic
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 'exponential',
    shouldRetry = (error: unknown) => {
      // Default: retry on network errors and 5xx server errors
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { status?: number } };
        const status = apiError.response?.status;
        return status === undefined || (status >= 500 && status < 600);
      }
      // Retry on network errors (no response)
      return true;
    },
  } = options;

  let lastError: unknown;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted retries
      if (attempt >= maxRetries) {
        throw error;
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        
        // Apply backoff strategy
        if (backoff === 'exponential') {
          currentDelay *= 2;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Retry with exponential backoff (convenience function)
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = apiConfig.retry.maxRetries,
  initialDelay: number = apiConfig.retry.initialDelayMs
): Promise<T> {
  return retry(fn, {
    maxRetries,
    delay: initialDelay,
    backoff: 'exponential',
  });
}

