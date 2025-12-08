import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';
import { useUserStore } from '@/stores/useUserStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { DownloadSize } from '../DownloadSizeSelector';

interface UseImageModalActionsProps {
  image: Image;
  onImageSelect: (image: Image) => void;
  onClose: () => void;
}

export const useImageModalActions = ({
  image,
  onImageSelect,
  onClose,
}: UseImageModalActionsProps) => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Download image with size selection
  const handleDownloadWithSize = useCallback(async (size: DownloadSize) => {
    try {
      if (!image._id) {
        throw new Error('Lỗi khi lấy ID của ảnh');
      }

      // Increment download count first
      try {
        const response = await imageService.incrementDownload(image._id);
        // Update downloads count if needed
        if (onImageSelect) {
          onImageSelect({
            ...image,
            downloads: response.downloads,
            dailyDownloads: response.dailyDownloads || image.dailyDownloads
          });
        }
      } catch (error) {
        console.error('Failed to increment download:', error);
      }

      // Download image with selected size
      const response = await api.get(`/images/${image._id}/download?size=${size}`, {
        responseType: 'blob',
        withCredentials: true,
      });

      // Create blob URL from response
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'photo.webp';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      } else {
        // Fallback: generate filename from image title
        const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        fileName = `${sanitizedTitle}.${urlExtension}`;
      }
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success('Tải ảnh thành công');
    } catch (error) {
      console.error('Tải ảnh thất bại:', error);
      toast.error('Tải ảnh thất bại. Vui lòng thử lại.');

      // Fallback: try opening in new tab if download fails
      try {
        if (image.imageUrl) {
          window.open(image.imageUrl, '_blank');
        }
      } catch (fallbackError) {
        console.error('Lỗi fallback khi tải ảnh:', fallbackError);
      }
    }
  }, [image, onImageSelect]);

  // Handle edit modal
  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const handleEditUpdate = useCallback((updatedImage: Image) => {
    onImageSelect(updatedImage);
    setShowEditModal(false);
  }, [onImageSelect]);

  // Handle collection modal
  const handleOpenCollection = useCallback(() => {
    setShowCollectionModal(true);
  }, []);

  const handleCollectionClose = useCallback(() => {
    setShowCollectionModal(false);
  }, []);

  // Handle view profile navigation
  const handleViewProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Navigate to user's profile using username or userId
    if (image.uploadedBy?.username) {
      navigate(`/profile/${image.uploadedBy.username}`);
      onClose(); // Close modal when navigating to profile
    } else if (image.uploadedBy?._id) {
      navigate(`/profile/user/${image.uploadedBy._id}`);
      onClose();
    }
  }, [navigate, image.uploadedBy, onClose]);

  return {
    showEditModal,
    showCollectionModal,
    handleDownloadWithSize,
    handleEdit,
    handleEditClose,
    handleEditUpdate,
    handleOpenCollection,
    handleCollectionClose,
    handleViewProfile,
    user,
  };
};

