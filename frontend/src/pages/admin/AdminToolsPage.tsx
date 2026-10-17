import { useAdminLocale } from '@/pages/admin/adminLocale';
import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import { useAdminRoles } from './hooks/useAdminRoles';
import { useUserStore } from '@/stores/useUserStore';
import './AdminTools.css';
import './AdminImagesPage.css';
import './AdminToolsTheme.css';
const Bookings = lazy(() =>
  import('./components/tabs/AdminBookings').then((m) => ({
    default: m.AdminBookings,
  }))
);
const Collections = lazy(() =>
  import('./components/tabs/AdminCollections').then((m) => ({
    default: m.AdminCollections,
  }))
);
const Logs = lazy(() =>
  import('./components/tabs/AdminLogs').then((m) => ({ default: m.AdminLogs }))
);
const Roles = lazy(() =>
  import('./components/tabs/AdminRoles').then((m) => ({
    default: m.AdminRoles,
  }))
);
function RolesPage() {
  useAdminLocale();
  const roles = useAdminRoles();
  const currentUser = useUserStore((s) => s.user);
  return (
    <Roles
      roles={roles.adminRoles}
      loading={roles.loading}
      error={roles.error}
      busy={roles.busy}
      onReload={() => void roles.loadAdminRoles()}
      currentUser={currentUser}
      creatingRole={roles.creatingRole}
      editingRole={roles.editingRole}
      onCreateClick={() => roles.setCreatingRole(true)}
      onEdit={roles.setEditingRole}
      onDelete={roles.deleteRole}
      onCloseCreate={() => roles.setCreatingRole(false)}
      onCloseEdit={() => roles.setEditingRole(null)}
      onSaveCreate={roles.createRole}
      onSaveEdit={roles.updateRole}
    />
  );
}
export function AdminToolsPage() {
  useAdminLocale();
  const path = useLocation().pathname;
  const account = useUserStore((s) => s.user?._id);
  const content = path.endsWith('/bookings') ? (
    <Bookings />
  ) : path.endsWith('/collections') ? (
    <Collections />
  ) : path.endsWith('/logs') ? (
    <Logs />
  ) : (
    <RolesPage key={account} />
  );
  return (
    <div className="admin-tools">
      <Suspense fallback={<div className="admin-skeleton tall" />}>
        {content}
      </Suspense>
    </div>
  );
}
