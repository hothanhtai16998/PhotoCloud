import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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

	// While initializing, show skeleton (matches App.tsx PageLoader style)
	// Don't show spinner here - let Suspense/PageLoader handle it to avoid duplicate loading states
	if (isInitializing) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="flex flex-col items-center gap-4">
					<Skeleton className="h-12 w-12 rounded-full" />
					<Skeleton className="h-4 w-32" />
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

export default AuthInitializer;
