import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { Skeleton } from "./components/ui/skeleton";
import { PageViewTracker } from "./components/PageViewTracker";
import { ContactButton } from './components/ContactButton';
import { MaintenanceOverlay } from "./components/MaintenanceOverlay";
import { ActualLocationContext } from "./contexts/ActualLocationContext";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { useModalNavigation } from "./hooks/useModalNavigation";
import { useMetaTags } from "./hooks/useMetaTags";


// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const FavoriteCollectionsPage = lazy(() => import("./pages/FavoriteCollectionsPage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/collection/CollectionDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));


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
  const { settings } = useSiteSettings();
  
  // Extract complex logic to custom hooks
  const { backgroundLocation, shouldRenderModalRoutes } = useModalNavigation(location);
  useMetaTags(settings.siteDescription);

  return (
    <ActualLocationContext.Provider value={location}>
      <MaintenanceOverlay isEnabled={settings.maintenanceMode} />
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
          {/* <Route path="/PhotoGrid" element={<PhotoGrid />} /> */}


          {/**protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/profile/user/:userId" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
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