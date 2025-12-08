/**
 * Logger utility for development logging.
 *
 * In development mode: logs are shown
 * In production mode: only errors are shown, others are silently ignored
 *
 * This prevents cluttering the browser console in production while
 * still providing useful debugging information during development.
 */

const isDev = import.meta.env.DEV;

interface LogOptions {
  /** Optional prefix for the log message */
  prefix?: string;
  /** Additional data to log */
  data?: unknown;
}

/**
 * Format a log message with optional prefix
 */
function formatMessage(message: string, prefix?: string): string {
  return prefix ? `[${prefix}] ${message}` : message;
}

/**
 * Debug level logging - only shown in development
 * Use for detailed debugging information
 */
function debug(message: string, options?: LogOptions): void {
  if (isDev) {
    const formatted = formatMessage(message, options?.prefix);
    if (options?.data !== undefined) {
      console.log(formatted, options.data);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * Info level logging - only shown in development
 * Use for general information messages
 */
function info(message: string, options?: LogOptions): void {
  if (isDev) {
    const formatted = formatMessage(message, options?.prefix);
    if (options?.data !== undefined) {
      console.info(formatted, options.data);
    } else {
      console.info(formatted);
    }
  }
}

/**
 * Warning level logging - only shown in development
 * Use for warnings that don't break functionality
 */
function warn(message: string, options?: LogOptions): void {
  if (isDev) {
    const formatted = formatMessage(message, options?.prefix);
    if (options?.data !== undefined) {
      console.warn(formatted, options.data);
    } else {
      console.warn(formatted);
    }
  }
}

/**
 * Error level logging - always shown (even in production)
 * Use for errors that need attention
 */
function error(message: string, options?: LogOptions): void {
  const formatted = formatMessage(message, options?.prefix);
  if (options?.data !== undefined) {
    console.error(formatted, options.data);
  } else {
    console.error(formatted);
  }
}

/**
 * Group related logs together (only in development)
 */
function group(label: string, fn: () => void): void {
  if (isDev) {
    console.group(label);
    fn();
    console.groupEnd();
  }
}

/**
 * Log execution time of a function (only in development)
 */
function time<T>(label: string, fn: () => T): T {
  if (isDev) {
    console.time(label);
    const result = fn();
    console.timeEnd(label);
    return result;
  }
  return fn();
}

/**
 * Async version of time()
 */
async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (isDev) {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
  }
  return fn();
}

export const logger = {
  debug,
  info,
  warn,
  error,
  group,
  time,
  timeAsync,
};

/**
 * Convenience exports for common prefixes
 */
export const imageLogger = {
  debug: (message: string, data?: unknown) =>
    debug(message, { prefix: 'Image', data }),
  info: (message: string, data?: unknown) =>
    info(message, { prefix: 'Image', data }),
  warn: (message: string, data?: unknown) =>
    warn(message, { prefix: 'Image', data }),
  error: (message: string, data?: unknown) =>
    error(message, { prefix: 'Image', data }),
};

export const authLogger = {
  debug: (message: string, data?: unknown) =>
    debug(message, { prefix: 'Auth', data }),
  info: (message: string, data?: unknown) =>
    info(message, { prefix: 'Auth', data }),
  warn: (message: string, data?: unknown) =>
    warn(message, { prefix: 'Auth', data }),
  error: (message: string, data?: unknown) =>
    error(message, { prefix: 'Auth', data }),
};

export const apiLogger = {
  debug: (message: string, data?: unknown) =>
    debug(message, { prefix: 'API', data }),
  info: (message: string, data?: unknown) =>
    info(message, { prefix: 'API', data }),
  warn: (message: string, data?: unknown) =>
    warn(message, { prefix: 'API', data }),
  error: (message: string, data?: unknown) =>
    error(message, { prefix: 'API', data }),
};
