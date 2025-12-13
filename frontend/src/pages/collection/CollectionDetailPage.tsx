import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { collectionService } from '@/services/collectionService';
import type { Image } from '@/types/image';
import { toast } from 'sonner';
import { generateImageSlug } from '@/lib/utils';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useCollectionDetail } from './hooks/useCollectionDetail';
import { useCollectionImages } from './hooks/useCollectionImages';
import { CollectionHeader } from './components/CollectionHeader';
import { CollectionImageGrid } from './components/CollectionImageGrid';
import { CollectionVersionHistory } from './components/CollectionVersionHistory';
import { CollectionBulkActions } from './components/CollectionBulkActions';
import CollectionCollaborators from './components/CollectionCollaborators';
import { ConfirmModal } from '@/pages/admin/components/modals';
import api from '@/lib/axios';
import { appConfig } from '@/config/appConfig';
import './CollectionDetailPage.css';

// Lazy load ImageModal - conditionally rendered
const ImageModal = lazy(() => import('@/components/NoFlashGrid/components/ImageModal').then(module => ({ default: module.ImageModal })));

export default function CollectionDetailPage() {
	const navigate = useNavigate();
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === 'undefined') return false;
		return window.innerWidth <= appConfig.mobileBreakpoint;
	});

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Collection detail hook
	const {
		collectionId,
		collection,
		loading,
		user,
		isOwner,
		userPermission,
		canEdit,
		coverImageId,
	} = useCollectionDetail();

	// Collection store for actions
	const {
		isFavorited,
		togglingFavorite,
		versions,
		loadingVersions,
		updatingCover,
		fetchCollection,
		setCoverImage,
		toggleFavorite,
		fetchVersions,
		restoreVersion,
	} = useCollectionStore();

	// Collection images hook
	const {
		images,
		imageTypes,
		draggedImageId,
		dragOverImageId,
		isReordering,
		selectionMode,
		selectedImageIds,
		isBulkRemoving,
		selectedImage,
		currentImageIds,
		processedImages,
		handleImageLoad,
		handleImageUpdate,
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleDragEnd,
		handleImageClick,
		handleBulkRemove,
		toggleSelectionMode,
		toggleImageSelection,
		selectAllImages,
		deselectAllImages,
		setSearchParams,
	} = useCollectionImages({
		collection,
		collectionId,
		isOwner,
		isMobile,
		fetchCollection,
	});

	// Handle setting cover image
	const handleSetCoverImage = useCallback(async (imageId: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!collectionId || !isOwner) return;

		await setCoverImage(collectionId, imageId);
		// Reload collection to sync with backend
		await fetchCollection(collectionId);
	}, [collectionId, isOwner, setCoverImage, fetchCollection]);

	// Handle toggle favorite
	const handleToggleFavorite = useCallback(async () => {
		if (!collectionId) return;
		await toggleFavorite(collectionId);
	}, [collectionId, toggleFavorite]);

	// Handle download
	const handleDownload = useCallback(async (image: Image, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			const response = await api.get(`/images/${image._id}/download`, {
				responseType: 'blob',
				withCredentials: true,
			});

			const blob = new Blob([response.data], { type: response.headers['content-type'] });
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = `${image.imageTitle || 'image'}.jpg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setTimeout(() => {
				URL.revokeObjectURL(blobUrl);
			}, 100);
			toast.success('Tải ảnh thành công');
		} catch (error) {
			console.error('Download failed:', error);
			toast.error('Tải ảnh thất bại. Vui lòng thử lại.');
		}
	}, []);

	// Load versions when collection is loaded and user can edit
	useEffect(() => {
		if (collection && canEdit && collectionId) {
			fetchVersions(collectionId);
		}
	}, [collection, canEdit, collectionId, fetchVersions]);

	// Handle restore version
	const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
	const [showRestoreModal, setShowRestoreModal] = useState(false);
	const [versionToRestore, setVersionToRestore] = useState<number | null>(null);
	const [showBulkRemoveModal, setShowBulkRemoveModal] = useState(false);

	const handleRestoreVersionClick = useCallback((versionNumber: number) => {
		setVersionToRestore(versionNumber);
		setShowRestoreModal(true);
	}, []);

	const handleRestoreVersionConfirm = useCallback(async () => {
		if (!collectionId || versionToRestore === null) return;

		setRestoringVersion(versionToRestore);
		try {
			await restoreVersion(collectionId, versionToRestore);
			// Reload collection to sync with backend
			await fetchCollection(collectionId);
			setShowRestoreModal(false);
			setVersionToRestore(null);
		} catch {
			// Error already handled in store
		} finally {
			setRestoringVersion(null);
		}
	}, [collectionId, versionToRestore, restoreVersion, fetchCollection]);

	const handleBulkRemoveClick = useCallback(() => {
		if (selectedImageIds.size === 0) return;
		setShowBulkRemoveModal(true);
	}, [selectedImageIds.size]);

	const handleBulkRemoveConfirm = useCallback(async () => {
		await handleBulkRemove();
		setShowBulkRemoveModal(false);
	}, [handleBulkRemove]);

	// Handle export collection
	const handleExportCollection = useCallback(async () => {
		if (!collectionId || !collection || images.length === 0) {
			toast.error('Bộ sưu tập không có ảnh để xuất');
			return;
		}

		try {
			toast.loading('Đang tạo file ZIP...', { id: 'export-collection' });

			const blob = await collectionService.exportCollection(collectionId);
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = blobUrl;

			// Generate filename from collection name
			const safeCollectionName = (collection.name || 'collection')
				.replace(/[^a-z0-9]/gi, '_')
				.toLowerCase()
				.substring(0, 50);
			link.download = `${safeCollectionName}_${Date.now()}.zip`;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			setTimeout(() => {
				URL.revokeObjectURL(blobUrl);
			}, 100);

			toast.success(`Đã xuất ${images.length} ảnh thành công`, { id: 'export-collection' });
		} catch (error: unknown) {
			console.error('Export failed:', error);
			const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
			toast.error(
				message || 'Xuất bộ sưu tập thất bại. Vui lòng thử lại.',
				{ id: 'export-collection' }
			);
		}
	}, [collectionId, collection, images.length]);

	// Convert selectedImage to index for new ImageModal API
	const currentIndex = useMemo(() => {
		if (!selectedImage) return -1;
		return images.findIndex(img => img._id === selectedImage._id);
	}, [selectedImage, images]);

	// Convert images to ExtendedImage format (add categoryName if needed)
	const extendedImages = useMemo(() => {
		return images.map(img => ({
			...img,
			categoryName: img.categoryName || (typeof img.imageCategory === 'string' ? img.imageCategory : img.imageCategory?.name),
		}));
	}, [images]);

	// Handle navigation - update the selected image and URL
	const handleNavigate = useCallback((nextIndex: number) => {
		if (nextIndex >= 0 && nextIndex < images.length) {
			const updatedImage = images[nextIndex];
			handleImageUpdate(updatedImage);
			// Update URL to reflect the selected image with slug
			const slug = generateImageSlug(updatedImage.imageTitle || 'Untitled', updatedImage._id);
			setSearchParams(prev => {
				const newParams = new URLSearchParams(prev);
				newParams.set('image', slug);
				return newParams;
			});
		}
	}, [images, handleImageUpdate, setSearchParams]);

	// Handle index selection
	const handleSelectIndex = useCallback((idx: number) => {
		if (idx >= 0 && idx < images.length) {
			const updatedImage = images[idx];
			handleImageUpdate(updatedImage);
			// Update URL to reflect the selected image with slug
			const slug = generateImageSlug(updatedImage.imageTitle || 'Untitled', updatedImage._id);
			setSearchParams(prev => {
				const newParams = new URLSearchParams(prev);
				newParams.set('image', slug);
				return newParams;
			});
		}
	}, [images, handleImageUpdate, setSearchParams]);

	if (loading) {
		return (
			<>
				<Header />
				<div className="collection-detail-page">
					<div className="collection-detail-loading">
						<div className="loading-spinner" />
						<p>Đang tải bộ sưu tập...</p>
					</div>
				</div>
			</>
		);
	}

	if (!collection) {
		return (
			<>
				<Header />
				<div className="collection-detail-page">
					<div className="collection-detail-error">
						<p>Không tìm thấy bộ sưu tập</p>
						<Button onClick={() => navigate('/collections')} variant="outline">
							Quay lại danh sách
						</Button>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<Header />
			<div className="collection-detail-page">
				<CollectionHeader
					collection={collection}
					imagesCount={images.length}
					user={user}
					isFavorited={isFavorited}
					togglingFavorite={togglingFavorite}
					selectionMode={selectionMode}
					canEdit={canEdit}
					handleToggleFavorite={handleToggleFavorite}
					handleExportCollection={handleExportCollection}
					toggleSelectionMode={toggleSelectionMode}
				/>

				{/* Collaborators Section */}
				{collection && (
					<div className="collection-detail-collaborators-wrapper">
						<CollectionCollaborators
							collection={collection}
							onCollectionUpdate={async () => {
								// Update collection in store
								await fetchCollection(collectionId!);
							}}
							isOwner={isOwner}
							userPermission={userPermission}
						/>
					</div>
				)}

				{/* Version History Section */}
				<CollectionVersionHistory
					versions={versions}
					loadingVersions={loadingVersions}
					restoringVersion={restoringVersion}
					canEdit={canEdit}
					onRestoreVersion={handleRestoreVersionClick}
				/>

				{/* Bulk Action Bar */}
				<CollectionBulkActions
					selectionMode={selectionMode}
					selectedImageIds={selectedImageIds}
					totalImages={images.length}
					isBulkRemoving={isBulkRemoving}
					onBulkRemove={handleBulkRemoveClick}
					onSelectAll={selectAllImages}
					onDeselectAll={deselectAllImages}
				/>

				{/* Image Grid */}
				<CollectionImageGrid
					images={images}
					imageTypes={imageTypes}
					coverImageId={coverImageId}
					isOwner={isOwner}
					isReordering={isReordering}
					selectionMode={selectionMode}
					draggedImageId={draggedImageId}
					dragOverImageId={dragOverImageId}
					selectedImageIds={selectedImageIds}
					updatingCover={updatingCover}
					currentImageIds={currentImageIds}
					processedImages={processedImages}
					handleImageLoad={handleImageLoad}
					handleDragStart={handleDragStart}
					handleDragOver={handleDragOver}
					handleDragLeave={handleDragLeave}
					handleDrop={handleDrop}
					handleDragEnd={handleDragEnd}
					handleImageClick={handleImageClick}
					handleSetCoverImage={handleSetCoverImage}
					toggleImageSelection={toggleImageSelection}
					isMobile={isMobile}
				/>
			</div>

			{/* Image Modal - shown as overlay when image param exists */}
			{selectedImage && currentIndex >= 0 && (
				<Suspense fallback={null}>
				<ImageModal
					images={extendedImages}
					index={currentIndex}
					onClose={() => {
						// Remove image param from URL when closing
						setSearchParams(prev => {
							const newParams = new URLSearchParams(prev);
							newParams.delete('image');
							return newParams;
						});
					}}
					onNavigate={handleNavigate}
					onSelectIndex={handleSelectIndex}
				/>
				</Suspense>
			)}

			{/* Restore Version Modal */}
			<ConfirmModal
				isOpen={showRestoreModal}
				onClose={() => {
					setShowRestoreModal(false);
					setVersionToRestore(null);
				}}
				onConfirm={handleRestoreVersionConfirm}
				title="Khôi phục phiên bản"
				message={versionToRestore !== null ? `Bạn có chắc chắn muốn khôi phục bộ sưu tập về phiên bản ${versionToRestore}? Tất cả thay đổi sau phiên bản này sẽ bị mất.` : ''}
				confirmText="Khôi phục"
				cancelText="Hủy"
				variant="warning"
			/>

			{/* Bulk Remove Modal */}
			<ConfirmModal
				isOpen={showBulkRemoveModal}
				onClose={() => setShowBulkRemoveModal(false)}
				onConfirm={handleBulkRemoveConfirm}
				title="Xóa ảnh khỏi bộ sưu tập"
				message={`Bạn có chắc chắn muốn xóa ${selectedImageIds.size} ảnh khỏi bộ sưu tập này?`}
				confirmText="Xóa"
				cancelText="Hủy"
				variant="danger"
			/>
		</>
	);
}
