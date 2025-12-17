import api from '@/lib/api';
import type { Image } from '@/types/image';
import type { Coordinates } from '@/types/common';

export const imageUpdateService = {
  updateImage: async (
    imageId: string,
    data: {
      imageTitle?: string;
      description?: string;
      location?: string;
      coordinates?: Coordinates | null;
      cameraModel?: string;
      cameraMake?: string;
      focalLength?: number;
      aperture?: number;
      shutterSpeed?: string;
      iso?: number;
      tags?: string[];
    }
  ): Promise<Image> => {
    const res = await api.patch(`/images/${imageId}`, data, {
      withCredentials: true,
    });

    return res.data.image;
  },

  updateImageWithFile: async (
    imageId: string,
    editedFile: File
  ): Promise<Image> => {
    const formData = new FormData();
    formData.append('image', editedFile);

    const res = await api.patch(`/images/${imageId}/replace`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
      timeout: 120000,
    });

    return res.data.image;
  },

  batchUpdateImages: async (
    editedImages: Array<{ imageId: string; file: File }>
  ): Promise<Image[]> => {
    const formData = new FormData();
    editedImages.forEach((item, index) => {
      formData.append(`images[${index}][imageId]`, item.imageId);
      formData.append(`images[${index}][file]`, item.file);
    });

    const res = await api.patch('/images/batch/replace', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
      timeout: 300000, // 5 minutes for batch operations
    });

    return res.data.images;
  },
};





