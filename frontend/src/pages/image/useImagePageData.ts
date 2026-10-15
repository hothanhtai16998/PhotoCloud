import { imageService } from '@/services/imageService';
import type { Image } from '@/types/image';
import { useEffect,type Dispatch,type RefObject,type SetStateAction } from 'react';

interface Props {
  attempt: number;
  imageId: string | null;
  navigationState: unknown;
  initialLocationStateRef: RefObject<unknown>;
  setImage: Dispatch<SetStateAction<Image | null>>;
  setImages: Dispatch<SetStateAction<Image[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function useImagePageData({ imageId, attempt, navigationState, initialLocationStateRef, setImage, setImages, setLoading, setError }: Props) {
  // Fetch image
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!imageId || !/^(?:[a-f\d]{12}|[a-f\d]{24})$/i.test(imageId)) {
      setError('Đường dẫn ảnh không hợp lệ.');
      setLoading(false);
      return;
    }
    const matchesId = (id: string) => (imageId.length === 24 ? id : id.slice(-12)).toLowerCase() === imageId.toLowerCase();

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);

        const initialState = initialLocationStateRef.current as
          | { images?: Image[]; image?: Image; fromGrid?: boolean }
          | undefined;

        // 1) Fast path: if a single image was passed in state, use it directly.
        const passedImage = initialState?.image;
        if (passedImage && passedImage._id) {
          if (matchesId(passedImage._id)) {
            const passedImages = Array.isArray(initialState?.images)
              ? (initialState!.images as Image[])
              : [passedImage];

            setImage(passedImage);
            setImages(passedImages);

            
            setLoading(false);
            return;
          }
        }

        // 2) Next: try passed images array (existing behavior)
        const passedImages = initialState?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find((img) => {
            return matchesId(img._id);
          });

          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);

            
            setLoading(false);
            return;
          }
        }

        // 3) Fallback: fetch from API (direct URL / refresh)
        const foundImage = await imageService.fetchImageById(imageId, controller.signal);
        if (!active) return;
        setImage(foundImage);
        setImages([foundImage]);
        setLoading(false);
        // Related photos are optional and must never block the selected photo.
        void imageService.fetchImages({ limit: 50 }, controller.signal).then(response => {
          if (!active) return;
          setImages([foundImage, ...response.images.filter(item => item._id !== foundImage._id)]);
        }).catch(() => { /* Keep the selected image usable if recommendations fail. */ });
      } catch (err: unknown) {
        if (!active) return;
        // Error handled by error boundary
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Không thể tải thông tin ảnh. Vui lòng thử lại.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchImage();
    return () => {
      active = false;
      controller.abort();
    };
  }, [imageId, attempt, navigationState, initialLocationStateRef, setImage, setImages, setLoading, setError]);

}
