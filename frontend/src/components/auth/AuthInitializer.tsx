import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useRef } from 'react';

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
	const { initializeApp, isInitializing } = useAuthStore();
	const hasInitialized = useRef(false);

	useEffect(() => {
		// Only initialize once
		if (!hasInitialized.current) {
			hasInitialized.current = true;
			initializeApp();
		}
	}, [initializeApp]);

	// While initializing, show a loading state
	if (isInitializing) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
					<p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

export default AuthInitializer;
