import { useAdminLocale } from '@/pages/admin/adminLocale';
import { AdminRecords } from './components/AdminRecords';
export function AdminCategoriesPage() {
  useAdminLocale();
  return <AdminRecords kind="categories" />;
}
