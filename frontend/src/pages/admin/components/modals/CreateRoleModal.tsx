import { useAdminLocale } from '@/pages/admin/adminLocale';
import { RoleEditor } from './RoleEditor';
import type { RoleCreateData } from '../../hooks/useAdminRoles';
export function CreateRoleModal({ onClose, onSave }: { onClose: () => void; onSave: (data: RoleCreateData) => Promise<boolean> }) {
  useAdminLocale();
  return <RoleEditor onClose={onClose} onSave={onSave} />;
}
