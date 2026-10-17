import { useAdminLocale } from '@/pages/admin/adminLocale';
import { AdminRecords } from './components/AdminRecords';
export function AdminImagesPage() {
  useAdminLocale();
  return <AdminRecords kind="images" />;
}
