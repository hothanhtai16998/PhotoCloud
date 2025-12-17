import axios from 'axios';

/**
 * Type definition for API error responses
 */
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
  code?: string;
}

/**
 * Extract a user-friendly error message from various error types.
 * Handles Axios errors, API errors, and generic JavaScript errors.
 *
 * @param error - The error object to extract message from
 * @param defaultMessage - Fallback message if no specific message found
 * @returns User-friendly error message string
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
): string {
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }

    // Network errors
    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }

    // Server response errors
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // HTTP status errors
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Please sign in to continue.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return error.message || defaultMessage;
      }
    }

    return error.message || defaultMessage;
  }

  // Handle API error response format
  const apiError = error as ApiErrorResponse;
  if (apiError?.response?.data?.message) {
    return apiError.response.data.message;
  }

  if (apiError?.message) {
    return apiError.message;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Check if an error is a cancelled request (user navigated away or changed filters)
 */
export function isCancelledRequest(error: unknown): boolean {
  if (axios.isCancel(error)) {
    return true;
  }

  const errorWithCode = error as { code?: string };
  return errorWithCode?.code === 'ERR_CANCELED';
}

/**
 * Upload-specific error messages
 */
export function getUploadErrorMessage(error: unknown): string {
  const apiError = error as ApiErrorResponse;

  // Timeout errors
  if (
    apiError.code === 'ECONNABORTED' ||
    apiError.message?.includes('timeout')
  ) {
    return 'Upload timeout: The upload took too long. Please try again with a smaller file or check your internet connection.';
  }

  // File size errors
  if (apiError.response?.data?.message?.includes('size')) {
    return 'File too large. Please choose a smaller file.';
  }

  // File type errors
  if (
    apiError.response?.data?.message?.includes('type') ||
    apiError.response?.data?.message?.includes('format')
  ) {
    return 'Invalid file format. Please choose a supported image format.';
  }

  return getErrorMessage(error, 'Failed to upload image. Please try again.');
}
