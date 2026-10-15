import { Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminLayout } from './components/AdminLayout';
import { Skeleton } from '@/components/ui/skeleton';
import AdminRoute from '@/components/auth/AdminRoute';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminImagesPage = lazy(() => import('./AdminImagesPage').then(m => ({ default: m.AdminImagesPage })));
const AdminCategoriesPage = lazy(() => import('./AdminCategoriesPage').then(m => ({ default: m.AdminCategoriesPage })));
const AdminUsersPage = lazy(() => import('./AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminModerationPage = lazy(() => import('./AdminModerationPage').then(m => ({ default: m.AdminModerationPage })));
const AdminSettingsPage = lazy(() => import('./AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));

const AdminRouteFallback = () => (
    <div style={{ padding: 24 }}>
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-32 w-full" />
    </div>
);

/**
 * Wraps the auth + layout together. Each page is its own lazy chunk so
 * the dashboard, image manager, and settings all share nothing in
 * memory until the user navigates to them.
 *
 * The previous implementation imported one giant AdminPage that mounted
 * 4 data hooks on first paint. That cascade — every admin visit kicked
 * off 4 API calls, 4 permission checks, and 4 toast error handlers —
 * is what froze the page on refresh. This new tree makes each route
 * own exactly the hooks it needs.
 */
export function AdminAppRoutes() {
    return (
        <Routes>
            <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route
                        index
                        element={
                            <Suspense fallback={<AdminRouteFallback />}>
                                <AdminDashboard />
                            </Suspense>
                        }
                    />
                    <Route
                        path="images"
                        element={
                            <Suspense fallback={<AdminRouteFallback />}>
                                <AdminImagesPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="categories"
                        element={
                            <Suspense fallback={<AdminRouteFallback />}>
                                <AdminCategoriesPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="users"
                        element={
                            <Suspense fallback={<AdminRouteFallback />}>
                                <AdminUsersPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="moderation"
                        element={
                            <Suspense fallback={<AdminRouteFallback />}>
                                <AdminModerationPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="settings"
                        element={
                            <Suspense fallback={<AdminRouteFallback />}>
                                <AdminSettingsPage />
                            </Suspense>
                        }
                    />
                </Route>
            </Route>
        </Routes>
    );
}
