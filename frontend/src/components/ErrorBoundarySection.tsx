import { Component, type ReactNode } from 'react';
import { errorTracker } from '@/utils/errorTracking';

interface ErrorBoundarySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Specific error boundary for different sections of the app
 * Provides more granular error handling than the global ErrorBoundary
 */
export class ErrorBoundarySection extends Component<ErrorBoundarySectionProps, State> {
  constructor(props: ErrorBoundarySectionProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error with context
    errorTracker.captureException(error, {
      section: this.props.sectionName,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (import.meta.env.MODE === 'development') {
      console.error(`ErrorBoundarySection [${this.props.sectionName}] caught an error:`, error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Lỗi trong {this.props.sectionName}
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {this.state.error?.message || 'Đã xảy ra lỗi không mong muốn'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

