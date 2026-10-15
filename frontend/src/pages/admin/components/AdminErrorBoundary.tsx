import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminErrorBoundaryProps {
    children: ReactNode;
    /** Label shown in the fallback so the user can tell which tab crashed. */
    scope?: string;
}

interface AdminErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Lightweight error boundary scoped to a single admin tab. When a tab's
 * data load throws (e.g. unexpected response shape, third-party widget
 * failure), this boundary catches the error and renders a recovery UI
 * instead of unmounting the entire admin shell. The user can retry the
 * tab without losing their navigation state.
 *
 * Critical: before this existed, an uncaught render error inside a lazy
 * tab would propagate up and unmount AdminPage entirely — which left the
 * header frozen and the page unresponsive to clicks.
 */
export class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
    state: AdminErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Surface the error in the console for debugging but don't spam
        // it to the user — the visible fallback is enough.
        // eslint-disable-next-line no-console
        console.error('[AdminErrorBoundary]', this.props.scope ?? 'admin', error, info);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        const scope = this.props.scope ?? 'this section';
        return (
            <div className="admin-error-boundary" role="alert">
                <div className="admin-error-boundary-inner">
                    <AlertTriangle size={32} className="admin-error-boundary-icon" aria-hidden="true" />
                    <h3 className="admin-error-boundary-title">
                        {`Không thể hiển thị ${scope}`}
                    </h3>
                    <p className="admin-error-boundary-message">
                        Vui lòng thử lại. Bạn vẫn có thể chuyển sang mục khác trong menu.
                    </p>
                    <button
                        type="button"
                        className="admin-error-boundary-retry"
                        onClick={this.handleRetry}
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }
}
