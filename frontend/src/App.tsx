import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { PageViewTracker } from "./components/PageViewTracker";
import { ActualLocationContext, BackgroundRouteContext, ImagePresentationContext } from "./contexts/ActualLocationContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { useStructuredData, schemaHelpers } from "./hooks/useStructuredData";
import { ContactButton } from "./components/ContactButton";
import { BookingModal } from "./components/BookingModal";
import Header from "./components/Header";
import HomePage from './pages/HomePage';
import CollectionsPage from './pages/CollectionsPage';
import { Footer } from "./components/Footer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { GlobalLoadingOverlay } from "./components/ui/GlobalLoadingOverlay";
import { syncGlobalLoading } from "./stores/helpers/syncGlobalLoading";
import ImagePage from "./pages/ImagePage";
import {
  isPageRefresh,
  clearModalStateOnRefresh,
  validateModalState,
  withoutModalState,
} from "./utils/modalNavigation";


// Lazy load pages for code splitting
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const SettingsPage = lazy(() => import("./pages/profile/SettingsPage").then(m => ({ default: m.default })));
const UserDashboardPage = lazy(() => import("./pages/profile/UserDashboardPage").then(m => ({ default: m.default })));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const ProfileRouteHandler = lazy(() => import("./pages/profile/ProfileRouteHandler").then(module => ({ default: module.ProfileRouteHandler })));
const ProfileRedirect = lazy(() => import("./pages/profile/ProfileRedirect").then(module => ({ default: module.ProfileRedirect })));
import { AdminAccess } from './pages/admin/components/AdminAccess';
const AdminToolsPage = lazy(() => import('./pages/admin/AdminToolsPage').then(m => ({ default: m.AdminToolsPage })));
// Admin v2 - new layout-based routing
const AdminLayout = lazy(() => import("./pages/admin/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminImagesPage = lazy(() => import("./pages/admin/AdminImagesPage").then(m => ({ default: m.AdminImagesPage })));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage").then(m => ({ default: m.AdminCategoriesPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminModerationPage = lazy(() => import("./pages/admin/AdminModerationPage").then(m => ({ default: m.AdminModerationPage })));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage").then(m => ({ default: m.AdminSettingsPage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const FavoriteCollectionsPage = lazy(() => import("./pages/FavoriteCollectionsPage"));
const DownloadHistoryPage = lazy(() => import("./pages/DownloadHistoryPage"));
const CollectionDetailPage = lazy(() => import("./pages/collection/CollectionDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingDetailPage = lazy(() => import("./pages/BookingDetailPage"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const NotificationPage = lazy(() => import("./pages/NotificationPage"));
const PackagesPage = lazy(() => import("./pages/PackagesPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));


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
  // Load site settings for runtime use (e.g. palette, upload limits).
  // Document title is owned by per-page `useDocumentMeta` — App must not
  // overwrite it after the page has set its own title.
  const { settings } = useSiteSettings();

  // Global structured data (Organization + PhotographyBusiness) — persists across routes
  useStructuredData(schemaHelpers.organization());
  useStructuredData(schemaHelpers.photographyBusiness());

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

  // Show header on all pages except auth pages (signin/signup/callback)
  const shouldShowHeader = !location.pathname.startsWith('/signin') && 
                            !location.pathname.startsWith('/signup') &&
                            !location.pathname.startsWith('/auth/google/callback');

  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  // Footer: show ở public/member pages, KHÔNG hiện ở admin (admin có layout riêng)
  const shouldShowFooter = shouldShowHeader && !location.pathname.startsWith('/admin');

  return (
    <ActualLocationContext.Provider value={location}>
      {/* Header - PHOTOCLOUD-style: Always visible, even during loading */}
      {shouldShowHeader && !isAdminArea && <Header />}

      {/* Floating Contact Button - Always visible */}
      {!isAdminArea && <ContactButton />}
      {!isAdminArea && <BookingModal />}

      {/* Mobile Bottom Nav - ẩn tự động khi modal mở */}
      {shouldShowHeader && !isAdminArea && <MobileBottomNav />}

      {/* Global Loading Overlay - Single spinner for all loading states */}
      {location.pathname !== '/' && <GlobalLoadingOverlay />}

      {/* App body wrapper: clears the fixed header so page content is never
          covered. --header-height is set in index.css (80px desktop / 52px mobile).
          Only rendered when the header is visible
          (auth pages render directly without the wrapper so they keep full-bleed
          layouts). */}
      {shouldShowHeader ? (
        <div className={isAdminArea ? "admin-app-body" : "app-body"}>
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
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/newsletter/confirm" element={<NewsletterPage />} />
          <Route path="/newsletter/unsubscribe" element={<NewsletterPage />} />
          <Route path="/packages" element={<PackagesPage />} />
          <Route path="/packages/:slug" element={<PackagesPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          {/* Public collections — anyone can browse, login required to interact */}
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/booking/:bookingId" element={<BookingDetailPage />} />
          </Route>
          {/* Fallback route for users without username */}
          <Route path="/profile/user/:userId" element={<ProfilePage />} />


          {/**protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfileRedirect />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/profile" element={<SettingsPage />} />
            <Route path="/settings/notifications" element={<SettingsPage />} />
            <Route path="/upload" element={<Navigate to="/" replace />} />
            <Route path="/me" element={<UserDashboardPage />} />
          </Route>
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/favorites/photos" element={<FavoritesPage />} />
          <Route path="/favorites/collections" element={<FavoriteCollectionsPage />} />
          {/* Legacy alias — redirect to /favorites/collections */}
          <Route path="/favorite-collections" element={<FavoriteCollectionsPage />} />
          <Route path="/downloads" element={<DownloadHistoryPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/profile/bookings" element={<MyBookingsPage />} />

          {/**admin routes v2 - per-route lazy load */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="bookings" element={<AdminAccess><AdminToolsPage /></AdminAccess>} />
              <Route path="collections" element={<AdminAccess><AdminToolsPage /></AdminAccess>} />
              <Route path="roles" element={<AdminAccess><AdminToolsPage /></AdminAccess>} />
              <Route path="logs" element={<AdminAccess><AdminToolsPage /></AdminAccess>} />
              <Route
                index
                element={
                  <Suspense fallback={null}>
                    <AdminAccess><AdminDashboard /></AdminAccess>
                  </Suspense>
                }
              />
              <Route
                path="images"
                element={
                  <Suspense fallback={null}>
                    <AdminAccess><AdminImagesPage /></AdminAccess>
                  </Suspense>
                }
              />
              <Route
                path="categories"
                element={
                  <Suspense fallback={null}>
                    <AdminAccess><AdminCategoriesPage /></AdminAccess>
                  </Suspense>
                }
              />
              <Route
                path="users"
                element={
                  <Suspense fallback={null}>
                    <AdminAccess><AdminUsersPage /></AdminAccess>
                  </Suspense>
                }
              />
              <Route
                path="moderation"
                element={
                  <Suspense fallback={null}>
                    <AdminAccess><AdminModerationPage /></AdminAccess>
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={null}>
                    <AdminAccess><AdminSettingsPage /></AdminAccess>
                  </Suspense>
                }
              />
            </Route>
          </Route>
          
          <Route path="/404" element={<NotFoundPage />} />
          {/* Catch-all route for /@username - must be last to only match unmatched paths */}
          <Route path="/*" element={<ProfileRouteHandler />} />
        </Routes>
        </BackgroundRouteContext.Provider>
        </ActualLocationContext.Provider>

        {/* Modal routes: render on top when background exists */}
        {shouldRenderModalRoutes && (
          <Suspense fallback={null}>
          <ImagePresentationContext.Provider value="modal">
          <Routes>
            <Route path="/photos/:slug" element={<ImagePage />} />
          </Routes>
          </ImagePresentationContext.Provider>
          </Suspense>
        )}

        {/* Studio Footer - hiện ở public/member, ẩn ở admin */}
        {shouldShowFooter && <Footer />}

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
