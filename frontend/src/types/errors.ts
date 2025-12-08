/**
 * Common error response types used across the application
 */

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

/**
 * Express-validator validation error format
 */
export interface ValidationError {
  msg?: string;
  message?: string;
}

/**
 * API error response with validation errors (express-validator format)
 */
export interface ValidationErrorResponse {
  response?: {
    data?: {
      message?: string;
      errors?: ValidationError[];
    };
  };
}

/**
 * HTTP error response with status code
 */
export interface HttpErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

/**
 * Axios-specific error response (includes code, message, etc.)
 */
export interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  code?: string;
  message?: string;
}

