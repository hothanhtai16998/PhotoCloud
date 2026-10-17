import { useAdminLocale } from '@/pages/admin/adminLocale';
import { AdminRecords } from './components/AdminRecords';
export function AdminUsersPage() {
  useAdminLocale();
  return <AdminRecords kind="users" />;
}
