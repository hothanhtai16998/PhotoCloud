import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { adminService, type AdminImage } from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';
import { useImageStore } from '@/stores/useImageStore';

interface Pagination {
  page: number;
  pages: number;
  total: number;
}

interface UseAdminImagesReturn {
  images: AdminImage[];
  pagination: Pagination;
  search: string;
  loading: boolean;
  setSearch: (search: string) => void;
  loadImages: (page?: number) => Promise<void>;
  deleteImage: (imageId: string, imageTitle: string) => Promise<boolean>;
}

/**
 * Custom hook for managing admin images functionality.
 * Encapsulates all image-related state and operations for the admin panel.
 */
export function useAdminImages(): UseAdminImagesReturn {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const {
    removeImage,
    fetchImages,
    currentSearch,
    currentCategory,
    pagination: imageStorePagination,
  } = useImageStore();

  const [images, setImages] = useState<AdminImage[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadImages = useCallback(
    async (page = 1) => {
      // Check permission before API call
      if (!isSuperAdmin() && !hasPermission('viewImages')) {
        toast.error('Bạn không có quyền xem ảnh');
        return;
      }

      try {
        setLoading(true);
        const data = await adminService.getAllImages({
          page,
          limit: 20,
          search: search || undefined,
        });
        setImages(data.images);
        setPagination(data.pagination);
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(axiosError.response?.data?.message || 'Lỗi khi lấy ảnh');
      } finally {
        setLoading(false);
      }
    },
    [search, hasPermission, isSuperAdmin]
  );

  const deleteImage = useCallback(
    async (imageId: string, _imageTitle: string): Promise<boolean> => {
      // Check permission before action
      if (!isSuperAdmin() && !hasPermission('deleteImages')) {
        toast.error('Bạn không có quyền xóa ảnh');
        return false;
      }

      // Note: Confirmation is now handled by the component using ConfirmModal
      // This function just performs the deletion

      try {
        await adminService.deleteImage(imageId);

        // Remove image from global image store immediately
        // This ensures the image disappears from homepage ImageGrid
        removeImage(imageId);

        // Trigger a refresh of the ImageGrid store to sync with backend
        // Use a small delay to ensure the deletion is processed
        setTimeout(() => {
          const storeState = useImageStore.getState();
          // Always refresh if there are images or pagination data
          if (storeState.images.length > 0 || storeState.pagination) {
            fetchImages({
              page: imageStorePagination?.page || storeState.pagination?.page || 1,
              search: currentSearch,
              category: currentCategory,
              _refresh: true, // Force cache bust
            }).catch(() => {
              // Silently fail - the image is already removed from store
            });
          }
        }, 100);

        toast.success('Xoá ảnh thành công');
        
        // Reload admin images list
        await loadImages(pagination.page);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('imageDeleted', { detail: { imageId } }));
        
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(axiosError.response?.data?.message || 'Lỗi khi xoá ảnh');
        return false;
      }
    },
    [
      hasPermission,
      isSuperAdmin,
      removeImage,
      fetchImages,
      currentSearch,
      currentCategory,
      imageStorePagination,
      loadImages,
      pagination.page,
    ]
  );

  return {
    images,
    pagination,
    search,
    loading,
    setSearch,
    loadImages,
    deleteImage,
  };
}
