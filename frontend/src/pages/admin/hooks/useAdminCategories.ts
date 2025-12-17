import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { categoryService, clearCategoriesCache, type Category } from '@/services/categoryService';
import { usePermissions } from '@/hooks/usePermissions';

interface UseAdminCategoriesReturn {
  categories: Category[];
  loading: boolean;
  editingCategory: Category | null;
  creatingCategory: boolean;
  setEditingCategory: (category: Category | null) => void;
  setCreatingCategory: (creating: boolean) => void;
  loadCategories: () => Promise<void>;
  createCategory: (data: {
    name: string;
    description?: string;
  }) => Promise<boolean>;
  updateCategory: (
    categoryId: string,
    updates: { name?: string; description?: string; isActive?: boolean }
  ) => Promise<boolean>;
  deleteCategory: (
    categoryId: string,
    categoryName: string
  ) => Promise<boolean>;
}

/**
 * Custom hook for managing admin categories functionality.
 * Encapsulates all category-related state and operations for the admin panel.
 */
export function useAdminCategories(): UseAdminCategoriesReturn {
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    // Check permission before API call
    if (!isSuperAdmin() && !hasPermission('viewCategories')) {
      toast.error('Bạn không có quyền xem danh mục');
      return;
    }

    try {
      setLoading(true);
      const data = await categoryService.getAllCategoriesAdmin();
      setCategories(data);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(axiosError.response?.data?.message || 'Lỗi khi lấy danh mục');
    } finally {
      setLoading(false);
    }
  }, [hasPermission, isSuperAdmin]);

  const createCategory = useCallback(
    async (data: { name: string; description?: string }): Promise<boolean> => {
      // Check permission before action
      if (!isSuperAdmin() && !hasPermission('createCategories')) {
        toast.error('Bạn không có quyền tạo danh mục');
        return false;
      }

      try {
        await categoryService.createCategory(data);
        // Clear the frontend cache so CategoryNavigation will refresh
        clearCategoriesCache();
        // Dispatch event to notify CategoryNavigation to refresh
        window.dispatchEvent(new CustomEvent('categoriesUpdated'));
        toast.success('Tạo danh mục thành công');
        setCreatingCategory(false);
        await loadCategories();
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi tạo danh mục'
        );
        return false;
      }
    },
    [hasPermission, isSuperAdmin, loadCategories]
  );

  const updateCategory = useCallback(
    async (
      categoryId: string,
      updates: { name?: string; description?: string; isActive?: boolean }
    ): Promise<boolean> => {
      // Check permission before action
      if (!isSuperAdmin() && !hasPermission('editCategories')) {
        toast.error('Bạn không có quyền chỉnh sửa danh mục');
        return false;
      }

      try {
        await categoryService.updateCategory(categoryId, updates);
        // Clear the frontend cache so CategoryNavigation will refresh
        clearCategoriesCache();
        // Dispatch event to notify CategoryNavigation to refresh
        window.dispatchEvent(new CustomEvent('categoriesUpdated'));
        toast.success('Danh mục đã được cập nhật thành công');
        setEditingCategory(null);
        await loadCategories();
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi cập nhật danh mục'
        );
        return false;
      }
    },
    [hasPermission, isSuperAdmin, loadCategories]
  );

  const deleteCategory = useCallback(
    async (categoryId: string, _categoryName: string): Promise<boolean> => {
      // Check permission before action
      if (!isSuperAdmin() && !hasPermission('deleteCategories')) {
        toast.error('Bạn không có quyền xóa danh mục');
        return false;
      }

      // Note: Confirmation is now handled by the component using ConfirmModal
      // This function just performs the deletion

      try {
        await categoryService.deleteCategory(categoryId);
        // Clear the frontend cache so CategoryNavigation will refresh
        clearCategoriesCache();
        // Dispatch event to notify CategoryNavigation to refresh
        window.dispatchEvent(new CustomEvent('categoriesUpdated'));
        toast.success('Xoá danh mục thành công');
        await loadCategories();
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi xoá danh mục'
        );
        return false;
      }
    },
    [hasPermission, isSuperAdmin, loadCategories]
  );

  return {
    categories,
    loading,
    editingCategory,
    creatingCategory,
    setEditingCategory,
    setCreatingCategory,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
