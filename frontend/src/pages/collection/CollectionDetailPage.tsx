import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { collectionService } from '@/services/collectionService';
import { toast } from 'sonner';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useCollectionDetail } from './hooks/useCollectionDetail';
import { useCollectionImages } from './hooks/useCollectionImages';
import { CollectionHeader } from './components/CollectionHeader';
import { CollectionNoFlashGrid } from './components/CollectionNoFlashGrid';
import { CollectionBulkActions } from './components/CollectionBulkActions';
import { ConfirmModal } from '@/pages/admin/components/modals';
import { appConfig } from '@/config/appConfig';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useUserStore } from '@/stores/useUserStore';
import type { Collection } from '@/types/collection';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import './CollectionDetailPage.css';

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
		updatingCover,
		fetchCollection,
		setCoverImage,
		toggleFavorite,
		addImageToCollection,
		removeImageFromCollection,
		reorderCollectionImages,
		updateCollectionMetadata,
	} = useCollectionStore();

	const { user: currentUser } = useUserStore();

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
		currentImageIds,
		processedImages,
		handleImageLoad,
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
	} = useCollectionImages({
		collection,
		collectionId,
		isOwner,
		isMobile,
		fetchCollection,
	});

	// WebSocket for real-time collaboration
	const { isConnected, joinCollectionRoom, leaveCollectionRoom } = useWebSocket({
		onCollectionUpdate: useCallback((update) => {
			if (!collectionId || update.collectionId !== collectionId) return;
			
			// Don't update if the change was made by the current user (optimistic update already handled)
			if (update.actorId === user?._id) return;

			switch (update.type) {
				case 'image_added':
					if (update.imageId && update.image) {
						addImageToCollection(update.imageId, update.image);
					}
					break;
				case 'image_removed':
					if (update.imageId) {
						removeImageFromCollection(update.imageId);
					}
					break;
				case 'images_reordered':
					if (update.imageIds) {
						reorderCollectionImages(update.imageIds);
					}
					break;
				case 'collection_updated':
					updateCollectionMetadata({
						name: update.name,
						description: update.description,
						coverImageId: update.coverImageId,
					});
					break;
			}
		}, [collectionId, user?._id, addImageToCollection, removeImageFromCollection, reorderCollectionImages, updateCollectionMetadata]),
	});

	// Join/leave collection room for real-time collaboration
	useEffect(() => {
		if (!collectionId || !isConnected) return;

		joinCollectionRoom(collectionId);

		return () => {
			leaveCollectionRoom(collectionId);
		};
	}, [collectionId, isConnected, joinCollectionRoom, leaveCollectionRoom]);

	// Listen for collection updates from other pages (e.g., when image is added from ImagePage)
	// This is a fallback for same-tab updates (WebSocket handles cross-device)
	useEffect(() => {
		if (!collectionId) return;

		const handleCollectionUpdate = (event: Event) => {
			try {
				const customEvent = event as CustomEvent<{ collectionId: string; collection: Collection }>;
				const { collectionId: updatedCollectionId } = customEvent.detail || {};
				
				if (updatedCollectionId === collectionId) {
					// Refresh the collection to show the new image immediately
					fetchCollection(collectionId);
				}
			} catch (error) {
				// Silently handle errors
			}
		};

		window.addEventListener('collectionUpdated', handleCollectionUpdate);
		
		return () => {
			window.removeEventListener('collectionUpdated', handleCollectionUpdate);
		};
	}, [collectionId, fetchCollection]);

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


	const [showBulkRemoveModal, setShowBulkRemoveModal] = useState(false);

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
			const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
			toast.error(
				message || 'Xuất bộ sưu tập thất bại. Vui lòng thử lại.',
				{ id: 'export-collection' }
			);
		}
	}, [collectionId, collection, images.length]);

	if (loading) {
		return (
			<>
				<div className="collection-detail-page">
					<div className="collection-detail-loading">
						<div className="flex items-center justify-center py-12">
							<LoadingSpinner size="large" />
						</div>
					</div>
				</div>
			</>
		);
	}

	if (!collection) {
		return (
			<>
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
				<CollectionNoFlashGrid
					images={images}
					coverImageId={coverImageId}
					isOwner={isOwner}
					isReordering={isReordering}
					selectionMode={selectionMode}
					draggedImageId={draggedImageId}
					dragOverImageId={dragOverImageId}
					selectedImageIds={selectedImageIds}
					updatingCover={updatingCover}
					handleImageClick={handleImageClick}
					handleSetCoverImage={handleSetCoverImage}
					toggleImageSelection={toggleImageSelection}
					handleDragStart={handleDragStart}
					handleDragOver={handleDragOver}
					handleDragLeave={handleDragLeave}
					handleDrop={handleDrop}
					handleDragEnd={handleDragEnd}
				/>
			</div>



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
