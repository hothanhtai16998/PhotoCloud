import { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import { imageService } from '@/services/imageService';
import { extractIdFromSlug, generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';
import { appConfig } from '@/config/appConfig';
import './ImagePage.css';
import ImagePageSidebar from '@/components/ImagePageSidebar';

// Lazy load ImageModal - main component of this page
const ImageModal = lazy(() => import('@/components/ImageModal'));

function ImagePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [image, setImage] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
  const processedImages = useRef<Set<string>>(new Set());
  const currentImageIds = useRef<Set<string>>(new Set());

  // Detect if we came from grid (modal) or refresh/direct access (page)
  // Initialize state immediately based on location.state and sessionStorage
  const getInitialFromGrid = () => {
    // Check if we have state from navigation
    const hasState = location.state?.fromGrid === true;

    // Check sessionStorage (set when clicking from grid)
    const fromGridFlag = sessionStorage.getItem(appConfig.storage.imagePageFromGridKey);

    // If we have state OR sessionStorage flag, it's from grid (modal mode)
    const fromGrid = hasState || fromGridFlag === 'true';

    // Clear sessionStorage flag after reading (only if it exists)
    if (fromGridFlag === 'true') {
      sessionStorage.removeItem(appConfig.storage.imagePageFromGridKey);
    }

    return fromGrid;
  };

  // Initialize state once - use lazy initialization to prevent re-detection
  const [isFromGrid] = useState(() => getInitialFromGrid());
  const renderAsPage = !isFromGrid; // Page mode when NOT from grid

  // Extract image ID from slug
  const imageId = useMemo(() => {
    if (!slug) return null;
    return extractIdFromSlug(slug);
  }, [slug]);

  // Fetch image
  useEffect(() => {
    if (!imageId) {
      setError('Invalid image slug');
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // If coming from grid, try to use passed images first (faster)
        const passedImages = location.state?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find(img => {
            const imgShortId = img._id.slice(-12);
            return imgShortId === imageId;
          });

          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);
            currentImageIds.current = new Set(passedImages.map(img => img._id));
            setLoading(false);
            return;
          }
        }

        // Otherwise, fetch from API
        const relatedResponse = await imageService.fetchImages({ limit: 50 });
        const allImages = relatedResponse.images || [];

        const foundImage = allImages.find(img => {
          const imgShortId = img._id.slice(-12);
          return imgShortId === imageId;
        });

        if (foundImage) {
          setImage(foundImage);
          setImages(allImages);
          currentImageIds.current = new Set(allImages.map(img => img._id));
        } else {
          setError('Image not found');
        }
      } catch (err: unknown) {
        console.error('Error fetching image:', err);
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [imageId, location.state]);

  const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
    if (processedImages.current.has(imageId)) return;
    processedImages.current.add(imageId);
    const isPortrait = img.naturalHeight > img.naturalWidth;
    const imageType = isPortrait ? 'portrait' : 'landscape';
    setImageTypes(prev => {
      if (prev.has(imageId)) return prev;
      const newMap = new Map(prev);
      newMap.set(imageId, imageType);
      return newMap;
    });
  }, []);

  const handleImageSelect = useCallback((selectedImage: Image) => {
    const newSlug = generateImageSlug(selectedImage.imageTitle || "", selectedImage._id);
    // When navigating between images, keep as page mode (no fromGrid state)
    navigate(`/photos/${newSlug}`, { replace: true, state: { images } });
  }, [navigate, images]);

  const handleDownload = useCallback((_image: Image, e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleClose = useCallback(() => {
    if (isFromGrid) {
      navigate(-1); // Go back to grid
    } else {
      navigate('/'); // Go to home
    }
  }, [navigate, isFromGrid]);




  if (loading) {
    return (
      <>
        <Header />
        <div className="image-page-loading">
          <div className="loading-spinner" />
          <p>Đang tải ảnh...</p>
        </div>
      </>
    );
  }

  if (error || !image) {
    return (
      <>
        <Header />
        <div className="image-page-error">
          <p>{error || 'Không tìm thấy ảnh'}</p>
          <button onClick={() => navigate('/')}>Quay lại trang chủ</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="image-page-layout">
        {renderAsPage && <ImagePageSidebar />}
        <div className={`image-page-container ${isFromGrid ? 'modal-mode' : 'page-mode'}`}>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="loading-spinner" />
            </div>
          }>
            <ImageModal
              image={image}
              images={images}
              onClose={handleClose}
              onImageSelect={handleImageSelect}
              lockBodyScroll={!isFromGrid}
              onDownload={handleDownload}
              imageTypes={imageTypes}
              onImageLoad={handleImageLoad}
              currentImageIds={currentImageIds.current}
              processedImages={processedImages}
              renderAsPage={renderAsPage}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default ImagePage;
