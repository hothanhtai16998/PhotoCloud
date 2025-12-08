import { useState, useEffect, useCallback } from 'react';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'sonner';

interface UseEditImageFormProps {
  image: Image;
  isOpen: boolean;
  onUpdate: (updatedImage: Image) => void;
  onClose: () => void;
}

export const useEditImageForm = ({ image, isOpen, onUpdate, onClose }: UseEditImageFormProps) => {
  const { user } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Form state
  const [imageTitle, setImageTitle] = useState(image.imageTitle || '');
  const [location, setLocation] = useState(image.location || '');
  const [cameraModel, setCameraModel] = useState(image.cameraModel || '');
  const [cameraMake, setCameraMake] = useState(image.cameraMake || '');
  const [focalLength, setFocalLength] = useState(image.focalLength?.toString() || '');
  const [aperture, setAperture] = useState(image.aperture?.toString() || '');
  const [shutterSpeed, setShutterSpeed] = useState(image.shutterSpeed || '');
  const [iso, setIso] = useState(image.iso?.toString() || '');
  const [tags, setTags] = useState<string[]>(image.tags || []);
  const [description, setDescription] = useState(''); // Placeholder for future description field

  // Reset form when image changes or modal opens
  useEffect(() => {
    if (isOpen && image) {
      setImageTitle(image.imageTitle || '');
      setLocation(image.location || '');
      setCameraModel(image.cameraModel || '');
      setCameraMake(image.cameraMake || '');
      setFocalLength(image.focalLength?.toString() || '');
      setAperture(image.aperture?.toString() || '');
      setShutterSpeed(image.shutterSpeed || '');
      setIso(image.iso?.toString() || '');
      setTags(image.tags || []);
      setDescription('');
    }
  }, [isOpen, image]);

  // Check if user can edit (owner or admin)
  const canEdit = user && (
    user._id === image.uploadedBy._id ||
    user.isAdmin ||
    user.isSuperAdmin
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error('Bạn không có quyền chỉnh sửa ảnh này');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedImage = await imageService.updateImage(image._id, {
        imageTitle: imageTitle.trim(),
        location: location.trim() || undefined,
        cameraModel: cameraModel.trim() || undefined,
        cameraMake: cameraMake.trim() || undefined,
        focalLength: focalLength.trim() ? parseFloat(focalLength) : undefined,
        aperture: aperture.trim() ? parseFloat(aperture) : undefined,
        shutterSpeed: shutterSpeed.trim() || undefined,
        iso: iso.trim() ? parseInt(iso, 10) : undefined,
        tags: tags, // Always send tags array (even if empty) to ensure proper update
      });

      toast.success('Cập nhật thông tin ảnh thành công');
      onUpdate(updatedImage);
      onClose();
    } catch (error) {
      console.error('Failed to update image:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cập nhật thông tin ảnh thất bại';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [image._id, imageTitle, location, cameraModel, cameraMake, focalLength, aperture, shutterSpeed, iso, tags, canEdit, onUpdate, onClose]);

  // Handle saving edited image
  const handleSaveEditedImage = useCallback(async (editedImageBlob: Blob) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền chỉnh sửa ảnh này');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert blob to File
      const editedFile = new File([editedImageBlob], `${image.imageTitle || 'image'}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload edited image
      const updatedImage = await imageService.updateImageWithFile(image._id, editedFile);

      toast.success('Cập nhật ảnh đã chỉnh sửa thành công');
      onUpdate(updatedImage);
      setShowEditor(false);
      onClose();
    } catch (error) {
      console.error('Failed to save edited image:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Lưu ảnh đã chỉnh sửa thất bại';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [image._id, image.imageTitle, canEdit, onUpdate, onClose]);

  return {
    isSubmitting,
    showEditor,
    setShowEditor,
    imageTitle,
    setImageTitle,
    location,
    setLocation,
    cameraModel,
    setCameraModel,
    cameraMake,
    setCameraMake,
    focalLength,
    setFocalLength,
    aperture,
    setAperture,
    shutterSpeed,
    setShutterSpeed,
    iso,
    setIso,
    tags,
    setTags,
    description,
    setDescription,
    canEdit,
    handleSubmit,
    handleSaveEditedImage,
  };
};





