import { lazy, Suspense, useEffect, useMemo, useLayoutEffect, useRef, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { Skeleton } from "./components/ui/skeleton";
import { PageViewTracker } from "./components/PageViewTracker";
import { ContactButton } from './components/ContactButton';
import { ActualLocationContext } from "./contexts/ActualLocationContext";
import { useSiteSettings } from "./hooks/useSiteSettings";
import {
  isPageRefresh,
  clearModalStateOnRefresh,
  validateModalState,
  clearHistoryState,
  isModalActive,
} from "./utils/modalNavigation";


// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const FavoriteCollectionsPage = lazy(() => import("./pages/FavoriteCollectionsPage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/collection/CollectionDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const NoFlashGridPage = lazy(() => import("./pages/test/NoFlashGrid"));


// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);


function App() {
  const location = useLocation();
  // Load site settings to update document title and meta tags
  const { settings } = useSiteSettings();

  // Check if this is a refresh - do this synchronously before render logic
  // Cache the result so we only check once per actual page load
  const isRefresh = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return isPageRefresh();
  }, []);

  // Clear modal state on refresh - MUST be done synchronously BEFORE validation
  // On refresh, ALWAYS clear modal state, even if location.state has modal flags
  // (location.state persists in browser history on refresh, but we should still clear)
  const hasClearedOnRefreshRef = useRef(false);
  
  // Clear flag synchronously during render (before useMemo runs)
  // This is safe because clearModalStateOnRefresh() only modifies sessionStorage
  if (isRefresh && !hasClearedOnRefreshRef.current) {
    clearModalStateOnRefresh();
    hasClearedOnRefreshRef.current = true;
    // Clear any persisted state from browser history to ensure clean state
    // NOTE: This clears window.history.state, but React Router's location.state
    // may not update immediately, so we force validation to return invalid on refresh
    if (location.state != null) {
      clearHistoryState();
    }
  }

  // Update meta description when site description changes
  useEffect(() => {
    if (settings.siteDescription) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', settings.siteDescription);
      }
    }
  }, [settings.siteDescription]);

  // Check maintenance mode - block non-admin users from accessing the site
  useEffect(() => {
    if (settings.maintenanceMode && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/maintenance')) {
      // Allow admins to access admin panel even during maintenance
      const isAdmin = sessionStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === 'true';
      if (!isAdmin) {
        // Show maintenance message
        const maintenanceMessage = document.createElement('div');
        maintenanceMessage.id = 'maintenance-overlay';
        maintenanceMessage.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          font-size: 1.5rem;
          text-align: center;
          padding: 2rem;
        `;
        maintenanceMessage.innerHTML = `
          <div>
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">🚧 Bảo trì hệ thống</h1>
            <p>Website đang được bảo trì. Vui lòng quay lại sau.</p>
          </div>
        `;
        document.body.appendChild(maintenanceMessage);

        return () => {
          const overlay = document.getElementById('maintenance-overlay');
          if (overlay) overlay.remove();
        };
      }
    }
    // Return undefined if no cleanup needed
    return undefined;
  }, [settings.maintenanceMode, location.pathname]);

  // Validate modal state using unified utility
  // CRITICAL: Check if flag is missing but location.state has modal data (refresh scenario)
  // On refresh, flag is cleared but location.state persists from browser history
  // If location.state has modal data but flag is missing → refresh scenario → invalid
  const modalValidation = useMemo(() => {
    const state = location.state as { inlineModal?: boolean; background?: unknown } | undefined;
    const hasModalStateInLocation = state?.inlineModal === true && Boolean(state?.background);
    const hasFlag = isModalActive();
    
    // If location.state has modal data but flag is missing → refresh scenario → invalid
    // This detects refresh even if isPageRefresh() is cached incorrectly
    if (hasModalStateInLocation && !hasFlag) {
      return { isValid: false, isModal: false };
    }
    
    // Normal validation
    return validateModalState(location.state);
  }, [location.state]);

  // Clean up invalid modal state (state exists but flag doesn't, or vice versa)
  useLayoutEffect(() => {
    if (isRefresh) return; // Already handled above

  const state = location.state as { background?: Location; inlineModal?: boolean } | undefined;
    
    // If state has inlineModal but validation failed, clean it up
    if (state?.inlineModal && !modalValidation.isValid) {
      const cleanedState = { ...state };
      delete cleanedState.inlineModal;
      delete cleanedState.background;
      clearHistoryState();
    }
  }, [isRefresh, location.state, modalValidation.isValid]);

  // Use validated background location
  // DON'T use isRefresh here - it's cached and can be wrong during navigation
  // Instead, rely on modalValidation.isValid which checks the flag (cleared on refresh)
  const backgroundLocation = modalValidation.background;
  
  // Validate backgroundLocation is a proper Location object
  const hasValidBackground = Boolean(
    backgroundLocation && 
    typeof backgroundLocation === 'object' &&
    'pathname' in backgroundLocation &&
    backgroundLocation.pathname
  );
  
  // Render modal routes only when:
  // 1. Modal state is valid (flag + location.state check)
  // 2. We have a valid background location with pathname
  // NOTE: We don't check isRefresh here because:
  // - On refresh, the flag is cleared by clearModalStateOnRefresh() above
  // - So modalValidation.isValid will be false if flag is missing
  // - This way, navigation works even if initial load was a refresh
  const shouldRenderModalRoutes = Boolean(modalValidation.isValid && hasValidBackground);

  return (
    <ActualLocationContext.Provider value={location}>
      <Suspense fallback={<PageLoader />}>
        <PageViewTracker />
        {/* Primary routes. If background exists, render using the background location */}
        <Routes location={backgroundLocation || location}>
          {/**public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/t/:categorySlug" element={<HomePage />} />
          <Route path="/photos/:slug" element={<ImagePage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/test/no-flash-grid" element={<NoFlashGridPage />} />
          {/* <Route path="/UnsplashGrid" element={<UnsplashGrid />} /> */}


          {/**protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/profile/user/:userId" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/favorite-collections" element={<FavoriteCollectionsPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
          </Route>

          {/**admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>

        {/* Modal routes: render on top when background exists */}
        {shouldRenderModalRoutes && (
          <Routes>
            <Route path="/photos/:slug" element={<ImagePage />} />
          </Routes>
        )}

        {/* Floating Contact Button - appears on all pages */}
        <ContactButton />
      </Suspense>
    </ActualLocationContext.Provider>
  )
}

export default App