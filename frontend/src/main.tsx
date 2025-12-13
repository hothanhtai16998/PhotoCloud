import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import './index.css';
import './styles/theme.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import AuthInitializer from './components/auth/AuthInitializer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { detectAvifSupport } from './utils/avifSupport';
import { registerServiceWorker } from './utils/registerServiceWorker';

// Import verification utility (makes it available globally in dev mode)
import './utils/verifyAppearanceSettings';

// Enable Immer MapSet plugin for Map and Set support in Zustand stores
enableMapSet();

// Detect AVIF support early (before any images load) to prevent format switching flash
// This caches the result in window.avifSupport for synchronous access
detectAvifSupport().catch(() => {
	// Silently fail - will fallback to WebP
});

// Register Service Worker for image caching and offline support
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary>
			<BrowserRouter>
				<AuthInitializer>
					<Toaster position="bottom-right" richColors />
					<App />
				</AuthInitializer>
			</BrowserRouter>
		</ErrorBoundary>
	</StrictMode>
);
