/**
 * Error tracking utility (Sentry-ready)
 * Currently logs to console, but can be easily extended to use Sentry or other services
 */

interface ErrorContext {
  [key: string]: unknown;
}

class ErrorTracker {
  private enabled: boolean = false;

  /**
   * Initialize error tracking (e.g., with Sentry)
   */
  init(options?: { dsn?: string; enabled?: boolean }): void {
    this.enabled = options?.enabled ?? import.meta.env.PROD;
    // DSN would be used here if Sentry was integrated
    void options?.dsn;

    // In production, you would initialize Sentry here:
    // if (this.enabled && this.dsn) {
    //   Sentry.init({
    //     dsn: this.dsn,
    //     environment: import.meta.env.MODE,
    //     integrations: [new BrowserTracing()],
    //     tracesSampleRate: 1.0,
    //   });
    // }
  }

  /**
   * Capture an exception
   */
  captureException(_error: Error, _context?: ErrorContext): void {
    // Error tracking disabled - logs removed
    // In production with Sentry, uncomment and use:
    // Sentry.captureException(error, {
    //   contexts: {
    //     additional: context,
    //   },
    // });
  }

  /**
   * Capture a message
   */
  captureMessage(_message: string, _level: 'info' | 'warning' | 'error' = 'info', _context?: ErrorContext): void {
    // Error tracking disabled - logs removed
    // In production with Sentry, uncomment and use:
    // Sentry.captureMessage(message, level, {
    //   contexts: {
    //     additional: context,
    //   },
    // });
  }

  /**
   * Set user context for error tracking
   */
  setUser(_user: { id: string; username?: string; email?: string }): void {
    if (!this.enabled) return;

    // In production with Sentry:
    // Sentry.setUser(user);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.enabled) return;

    // In production with Sentry:
    // Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(_message: string, _category: string = 'default', _level: 'info' | 'warning' | 'error' = 'info', _data?: Record<string, unknown>): void {
    if (!this.enabled) return;

    // In production with Sentry:
    // Sentry.addBreadcrumb({
    //   message,
    //   category,
    //   level,
    //   data,
    // });

    console.warn(`[Breadcrumb] [${category}]`, message, data);
  }
}

export const errorTracker = new ErrorTracker();

// Initialize error tracking in production
errorTracker.init({
  enabled: import.meta.env.PROD,
  // dsn: import.meta.env.VITE_SENTRY_DSN, // Set this in your .env file
});

