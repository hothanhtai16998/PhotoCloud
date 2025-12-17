import { Component, type ReactNode } from 'react';
import { toast } from 'sonner';
import { errorTracker } from '@/utils/errorTracking';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Track error with error tracking service
		errorTracker.captureException(error, {
			componentStack: errorInfo.componentStack,
			boundary: 'global',
		});

		if (import.meta.env.MODE === 'development') {
			console.error('ErrorBoundary caught an error:', error, errorInfo);
		}
		toast.error('An unexpected error occurred. Please refresh the page.');
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
							Lỗi...
						</h1>
						<p className="mt-2 text-gray-600 dark:text-gray-400">
							{this.state.error?.message || 'An unexpected error occurred'}
						</p>
						<button
							onClick={() => {
								this.setState({ hasError: false, error: null });
								window.location.reload();
							}}
							className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						>
							Tải lại trang
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

