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
};
