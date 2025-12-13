import { lazy, Suspense, useCallback, useMemo } from 'react';
import type { Image } from '@/types/image';
import MasonryGrid from '@/components/MasonryGrid';
import { useInfiniteScroll } from '@/components/NoFlashGrid/hooks/useInfiniteScroll';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadImage, type DownloadSize } from '@/utils/downloadService';
import { t } from '@/i18n';
import { toast } from 'sonner';
import {
    useImageGridState,
    useImageGridModal,
    useImageGridCategory,
    useImageGridColumns,
} from './hooks';

const ImageModal = lazy(() => import('@/components/ImageModalAdapter'));
const CollectionModal = lazy(() => import('@/components/CollectionModal'));

const ImageGrid = () => {
    // Category management
    const { category } = useImageGridCategory();

    // Image state and data fetching
    const {
        loading,
        isLoadingMore,
        hasMore,
        filteredImages,
        imageTypes,
        processedImages,
        currentImageIds,
        handleLoadMore,
        handleImageLoad,
    } = useImageGridState({ category });

    // Modal state management
    const {
        selectedImage,
        collectionImage,
        showCollectionModal,
        handleImageClick,
        handleCloseModal,
        handleModalImageSelect,
        handleAddToCollection,
        handleCollectionModalClose,
    } = useImageGridModal({ images: filteredImages });

    // Responsive columns
    const columnCount = useImageGridColumns();

    // Infinite scroll
    const { loadMoreRef } = useInfiniteScroll({
        hasMore,
        isLoading: loading || isLoadingMore,
        onLoadMore: handleLoadMore,
    });

    // Memoized download handler
    const handleDownload = useCallback(async (image: Image, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await downloadImage(image);
            toast.success(t('image.downloadSuccess'));
        } catch (error) {
            console.error('Failed to download image:', error);
            toast.error(t('image.downloadFailed'));
        }
    }, []);

    // Memoized download handler with size selection (for mobile)
    const handleDownloadWithSize = useCallback(async (image: Image, size: DownloadSize) => {
        try {
            await downloadImage(image, size);
            toast.success(t('image.downloadSuccess'));
        } catch (error) {
            console.error('Failed to download image:', error);
            toast.error(t('image.downloadFailed'));
        }
    }, []);

    // Calculate skeleton count based on column count
    const skeletonCount = useMemo(() => columnCount * 3, [columnCount]);

    return (
        <>
            <div className="container mx-auto">
                {loading && filteredImages.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                        {Array.from({ length: skeletonCount }).map((_, i) => (
                            <Skeleton key={i} className="w-full h-64" />
                        ))}
                    </div>
                ) : (
                    <MasonryGrid
                        images={filteredImages}
                        onImageClick={handleImageClick}
                        columnCount={columnCount}
                        onDownload={handleDownload}
                        onDownloadWithSize={handleDownloadWithSize}
                        onAddToCollection={handleAddToCollection}
                    />
                )}
                <div ref={loadMoreRef} />
                {isLoadingMore && <p className="text-center py-4">{t('common.loading')}</p>}
            </div>
            <Suspense fallback={<div className="suspense-loading" />}>
                {selectedImage && (
                    <ImageModal
                        image={selectedImage}
                        images={filteredImages}
                        onClose={handleCloseModal}
                        onImageSelect={handleModalImageSelect}
                        lockBodyScroll={true}
                        renderAsPage={false}
                        onDownload={handleDownload}
                        imageTypes={imageTypes as Map<string, 'portrait' | 'landscape'>}
                        onImageLoad={handleImageLoad}
                        currentImageIds={currentImageIds.current}
                        processedImages={processedImages}
                    />
                )}
                {collectionImage && (
                    <CollectionModal
                        isOpen={showCollectionModal}
                        onClose={handleCollectionModalClose}
                        imageId={collectionImage._id}
                    />
                )}
            </Suspense>
        </>
    );
};

export default ImageGrid;

