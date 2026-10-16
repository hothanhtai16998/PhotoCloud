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
    const failOffline = () => {
      if (!active) return;
      setError('Bạn đang ngoại tuyến. Kết nối mạng rồi bấm Thử lại.');
      setLoading(false);
      controller.abort();
    };
    const matchesId = (id: string) => (imageId.length === 24 ? id : id.slice(-12)).toLowerCase() === imageId.toLowerCase();

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);

        const initialState = initialLocationStateRef.current as
          | { images?: Image[]; image?: Image; fromGrid?: boolean }
          | undefined;

        // Prefer the selected image, then the matching grid entry. One success path.
        const passedImages = Array.isArray(initialState?.images) ? initialState.images : [];
        const passedImage = initialState?.image;
        const cachedImage = passedImage?._id && matchesId(passedImage._id)
          ? passedImage : passedImages.find(item => matchesId(item._id));
        if (cachedImage) {
          setImage(cachedImage);
          setImages(passedImages.length ? passedImages : [cachedImage]);
          return;
        }

        // 3) Fallback: fetch from API (direct URL / refresh)
        window.addEventListener('offline', failOffline);
        if (!navigator.onLine) { failOffline(); return; }
        const foundImage = await imageService.fetchImageById(imageId, controller.signal);
        if (!active) return;
        window.removeEventListener('offline', failOffline);
        if (!foundImage?._id) throw new Error('Missing image');
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
        if (controller.signal.aborted) return;
        setError(axiosError.response?.data?.message || 'Không thể tải thông tin ảnh. Vui lòng thử lại.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchImage();
    return () => {
      window.removeEventListener('offline', failOffline);
      active = false;
      controller.abort();
    };
  }, [imageId, attempt, navigationState, initialLocationStateRef, setImage, setImages, setLoading, setError]);

}
