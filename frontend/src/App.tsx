import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { PageViewTracker } from "./components/PageViewTracker";
import { ActualLocationContext, BackgroundRouteContext } from "./contexts/ActualLocationContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { VisualArtFormsSlider } from "./components/VisualArtFormsSlider";
import { ContactButton } from "./components/ContactButton";
import { BookingModal } from "./components/BookingModal";
import ImagePageSidebar from "./components/ImagePageSidebar";
import Header from "./components/Header";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { GlobalLoadingOverlay } from "./components/ui/GlobalLoadingOverlay";
import { syncGlobalLoading } from "./stores/helpers/syncGlobalLoading";
import {
  isPageRefresh,
  clearModalStateOnRefresh,
  validateModalState,
  withoutModalState,
} from "./utils/modalNavigation";


// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const ProfileRouteHandler = lazy(() => import("./pages/profile/ProfileRouteHandler").then(module => ({ default: module.ProfileRouteHandler })));
const ProfileRedirect = lazy(() => import("./pages/profile/ProfileRedirect").then(module => ({ default: module.ProfileRedirect })));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const FavoriteCollectionsPage = lazy(() => import("./pages/FavoriteCollectionsPage"));
const DownloadHistoryPage = lazy(() => import("./pages/DownloadHistoryPage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/collection/CollectionDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingDetailPage = lazy(() => import("./pages/BookingDetailPage"));


// Loading animation fallback for lazy-loaded routes
// Syncs with global loading so GlobalLoadingOverlay shows the spinner (prevents duplicate)
const PageLoader = () => {
  const hasSyncedRef = useRef(false);
  
  useEffect(() => {
    // Only sync once when component mounts (Suspense is loading)
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncGlobalLoading('suspense', true);
    }
    
    return () => {
      // Clear when component unmounts (route loaded)
      if (hasSyncedRef.current) {
        hasSyncedRef.current = false;
        syncGlobalLoading('suspense', false);
      }
    };
  }, []);
  
  // Return null - GlobalLoadingOverlay will show the spinner
  return null;
};


function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Load site settings to update document title and meta tags
  const { settings } = useSiteSettings();

  // Prefetch CSRF token early to avoid critical request chaining
  useEffect(() => {
    // Fetch CSRF token as early as possible to avoid chaining with other requests
    const prefetchCsrfToken = async () => {
      try {
        await fetch('/api/csrf-token', { method: 'GET', credentials: 'include' });
      } catch {
        // Silently fail - will be retried on first POST request
      }
    };
    prefetchCsrfToken();
  }, []);

  // Only the entry present at reload is stale; subsequent photo navigation is valid.
  const [reloadLocationKey] = useState(() => isPageRefresh() ? location.key : null);

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

  // A reload opens a standalone photo; later navigation may open a new modal.
  const modalValidation = useMemo(() => {
    if (location.key === reloadLocationKey) return { isValid: false, isModal: false };
    return validateModalState(location.state);
  }, [location.key, location.state, reloadLocationKey]);

  // Clean up invalid modal state (state exists but flag doesn't, or vice versa)
  useEffect(() => {
    if (location.key === reloadLocationKey) clearModalStateOnRefresh();
    const state = location.state as { background?: unknown; inlineModal?: boolean } | undefined;
    // replaceState alone does not update React Router's in-memory location.
    if ((state?.inlineModal || state?.background) && !modalValidation.isValid) {
      navigate(location.pathname + location.search + location.hash, {
        replace: true,
        state: withoutModalState(location.state),
      });
    }
  }, [location, modalValidation.isValid, navigate, reloadLocationKey]);

  // Mobile uses a single full page while preserving its navigation history.
  const backgroundLocation = isMobile ? undefined : modalValidation.background;
  
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
  const shouldRenderModalRoutes = Boolean(modalValidation.isValid && hasValidBackground);

  // Show sidebar on all pages except admin and auth pages
  const shouldShowSidebar = !location.pathname.startsWith('/admin') && 
                            !location.pathname.startsWith('/signin') && 
                            !location.pathname.startsWith('/signup') &&
                            !location.pathname.startsWith('/auth/google/callback');

  // Show header on all pages except auth pages (signin/signup/callback)
  const shouldShowHeader = !location.pathname.startsWith('/signin') && 
                            !location.pathname.startsWith('/signup') &&
                            !location.pathname.startsWith('/auth/google/callback');

  return (
    <ActualLocationContext.Provider value={location}>
      {/* Header - Unsplash-style: Always visible, even during loading */}
      {shouldShowHeader && <Header />}

      {/* Sidebar - Unsplash-style: Always visible, even during loading */}
      {shouldShowSidebar && <ImagePageSidebar />}

      {/* Floating Contact Button - Always visible */}
      <ContactButton />
      <BookingModal />

      {/* Global Loading Overlay - Single spinner for all loading states */}
      <GlobalLoadingOverlay />

      {/* App body wrapper: clears the fixed header so page content is never
          covered. --header-height is set in index.css (114px desktop / 86px mobile)
          and already accounts for the header-top row + the CategoryNavigation row
          that lives inside <Header />. Only rendered when the header is visible
          (auth pages render directly without the wrapper so they keep full-bleed
          layouts). */}
      {shouldShowHeader ? (
        <div className="app-body">
        <Suspense fallback={<PageLoader />}>
        <PageViewTracker />
        {/* Primary routes. If background exists, render using the background location */}
        <ActualLocationContext.Provider value={backgroundLocation || location}>
        <BackgroundRouteContext.Provider value={Boolean(backgroundLocation)}>
        <Routes location={backgroundLocation || location}>
          {/**public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/t/:categorySlug" element={<HomePage />} />
          <Route path="/s/photos/:query" element={<SearchResultsPage />} />
          <Route path="/photos/:slug" element={<ImagePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/booking/:bookingId" element={<BookingDetailPage />} />
          </Route>
          <Route path="/test/visual-art-slider" element={<VisualArtFormsSlider />} />
          {/* Fallback route for users without username */}
          <Route path="/profile/user/:userId" element={<ProfilePage />} />


          {/**protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfileRedirect />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/favorite-collections" element={<FavoriteCollectionsPage />} />
            <Route path="/downloads" element={<DownloadHistoryPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
          </Route>

          {/**admin routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          
          {/* Catch-all route for /@username - must be last to only match unmatched paths */}
          <Route path="/*" element={<ProfileRouteHandler />} />
        </Routes>
        </BackgroundRouteContext.Provider>
        </ActualLocationContext.Provider>

        {/* Modal routes: render on top when background exists */}
        {shouldRenderModalRoutes && (
          <Routes>
            <Route path="/photos/:slug" element={<ImagePage />} />
          </Routes>
        )}
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </Suspense>
        </div>
      ) : (
        <Suspense fallback={<PageLoader />}>
          <PageViewTracker />
          <Routes location={location}>
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
            {/* Other routes also need to be reachable when the header is hidden
                (defensive fallback). */}
            <Route path="/*" element={<ProfileRouteHandler />} />
          </Routes>
          <PWAInstallPrompt />
        </Suspense>
      )}
    </ActualLocationContext.Provider>
  )
}

export default App
