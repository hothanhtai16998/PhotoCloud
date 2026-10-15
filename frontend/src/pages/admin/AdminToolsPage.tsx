import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAdminRoles } from './hooks/useAdminRoles';
import { useAdminUsers } from './hooks/useAdminUsers';
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
  const roles = useAdminRoles();
  const users = useAdminUsers();
  const currentUser = useUserStore((s) => s.user);
  useEffect(() => {
    void roles.loadAdminRoles();
    void users.loadUsers(1);
  }, [roles.loadAdminRoles, users.loadUsers]);
  return (
    <Roles
      roles={roles.adminRoles}
      users={users.users}
      currentUser={currentUser}
      creatingRole={roles.creatingRole}
      editingRole={roles.editingRole}
      onCreateClick={() => roles.setCreatingRole(true)}
      onEdit={roles.setEditingRole}
      onDelete={(id, name) => {
        void roles.deleteRole(id, name);
      }}
      onCloseCreate={() => roles.setCreatingRole(false)}
      onCloseEdit={() => roles.setEditingRole(null)}
      onSaveCreate={async (data) => {
        await roles.createRole(data);
      }}
      onSaveEdit={roles.updateRole}
    />
  );
}
export function AdminToolsPage() {
  const path = useLocation().pathname;
  const content = path.endsWith('/bookings') ? (
    <Bookings />
  ) : path.endsWith('/collections') ? (
    <Collections />
  ) : path.endsWith('/logs') ? (
    <Logs />
  ) : (
    <RolesPage />
  );
  return (
    <div className="admin-tools">
      <Suspense fallback={<div className="admin-skeleton tall" />}>
        {content}
      </Suspense>
    </div>
  );
}
