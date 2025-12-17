import { useCallback } from 'react';
import { toast } from 'sonner';
import { parseRateLimitHeaders, getRateLimitMessage } from '@/utils/rateLimit';
import { t } from '@/i18n';

interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  logError?: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ msg?: string; message?: string }>;
    };
    status?: number;
    headers?: Record<string, string>;
  };
  code?: string;
  message?: string;
}

/**
 * Custom hook for centralized error handling
 * Provides consistent error handling patterns across the application
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}): {
  handleError: (error: unknown, customMessage?: string) => string;
  handleAsyncError: <T,>(asyncFn: () => Promise<T>, options?: ErrorHandlerOptions) => Promise<[T | null, Error | null]>;
} {
  const {
    showToast = true,
    fallbackMessage = t('errors.generic'),
    logError = true,
  } = options;

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      if (logError) {
        console.error('Error:', error);
      }

      let message = customMessage ?? fallbackMessage;

      // Handle Axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;

        // Handle validation errors (express-validator format)
        if (
          apiError.response?.data?.errors &&
          Array.isArray(apiError.response.data.errors)
        ) {
          const validationErrors = apiError.response.data.errors
            .map(
              (err: { msg?: string; message?: string }) =>
                err.msg ?? err.message ?? 'Validation failed'
            )
            .join(', ');
          message = `Lỗi xác thực: ${validationErrors}`;
        } else if (apiError.response?.data?.message) {
          message = apiError.response.data.message;
        } else if (apiError.message) {
          message = apiError.message;
        }

        // Handle specific error codes
        if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
          message = t('errors.timeout');
        } else if (apiError.response?.status === 429) {
          // Rate limit error - parse headers and show user-friendly message
          // Axios normalizes headers to lowercase, but we check both cases
          const headers: Record<string, string> = {};
          if (apiError.response.headers) {
            // Convert Axios headers object to plain object
            Object.keys(apiError.response.headers).forEach((key) => {
              const value = apiError.response?.headers?.[key];
              if (typeof value === 'string') {
                headers[key.toLowerCase()] = value;
                headers[key] = value; // Also keep original case
              }
            });
          }
          const rateLimitInfo = parseRateLimitHeaders(headers);
          message = getRateLimitMessage(rateLimitInfo);
        } else if (apiError.response?.status === 401 || apiError.response?.status === 403) {
          message = t('errors.unauthorized');
        } else if (apiError.response?.status === 404) {
          message = t('errors.notFound');
        } else if (apiError.response?.status === 500) {
          message = t('errors.server');
        }
      } else if (error instanceof Error) {
        message = error.message ?? message;
      }

      if (showToast) {
        toast.error(message);
      }

      return message;
    },
    [showToast, fallbackMessage, logError]
  );

  const handleAsyncError = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<[T | null, Error | null]> => {
      try {
        const result = await asyncFn();
        return [result, null];
      } catch (error) {
        handleError(error, options?.fallbackMessage);
        return [null, error as Error];
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}

