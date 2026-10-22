import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { collectionService } from '@/services/collectionService';
import { toast } from 'sonner';
import { useCollectionStore, markCollectionOffline } from '@/stores/useCollectionStore';
import { useCollectionDetail } from './hooks/useCollectionDetail';
import { useCollectionImages } from './hooks/useCollectionImages';
import { CollectionHeader } from './components/CollectionHeader';
import { CollectionNoFlashGrid } from './components/CollectionNoFlashGrid';
import { CollectionBulkActions } from './components/CollectionBulkActions';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { appConfig } from '@/config/appConfig';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import type { Collection } from '@/types/collection';
import { CollectionDetailFrame, CollectionDetailSkeleton } from './components/CollectionDetailFrame';
import './components/CollectionDetailFrame.css';
import { useCollectionConnection } from '@/hooks/useCollectionConnection';
import { CollectionLoadError } from '@/components/collection/CollectionLoadError';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import './CollectionDetailPage.css';

export default function CollectionDetailPage() {
  useLayoutEffect(() => { document.getElementById('public-collection-detail-startup')?.remove(); }, []);
 const error = useCollectionStore(state => state.error);
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
		canEdit,
		coverImageId,
	} = useCollectionDetail();

	// Set page title and meta. The store is the source of truth for header chrome;
	// we only update document.title + meta when collection data is available.
	useDocumentMeta({
		title: collection?.name || 'Bộ sưu tập',
		description: collection?.description?.slice(0, 160),
		noIndex: !collection?.isPublic,
	});

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

	// Collection images hook
	const {
		images,
		draggedImageId,
		dragOverImageId,
		isReordering,
		selectionMode,
		selectedImageIds,
		isBulkRemoving,
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
		canEdit,
		fetchCollection,
	});

	const reconnect = useCallback(async () => { if (collectionId) await fetchCollection(collectionId); }, [collectionId, fetchCollection]);
	useCollectionConnection(markCollectionOffline, reconnect, isBulkRemoving || isReordering || Boolean(updatingCover) || togglingFavorite);

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
					void fetchCollection(collectionId).catch(() => {});
				}
			} catch {
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

		try { await setCoverImage(collectionId, imageId); } catch { /* Store reports the failure; keep the current page. */ }
	}, [collectionId, isOwner, setCoverImage]);

	// Handle toggle favorite
	const handleToggleFavorite = useCallback(async () => {
		if (!collectionId) return;
		if (!user) { toast.info('Vui lòng đăng nhập để yêu thích bộ sưu tập.'); return; }
		try { await toggleFavorite(collectionId); } catch { /* Store reports the failure. */ }
	}, [collectionId, user, toggleFavorite]);


	const pageScope = `${collectionId}:${user?._id ?? 'guest'}`;
	const [showBulkRemoveModal, setShowBulkRemoveModal] = useState<string | null>(null);

	const handleBulkRemoveClick = useCallback(() => {
		if (selectedImageIds.size === 0) return;
		setShowBulkRemoveModal(pageScope);
	}, [selectedImageIds.size, pageScope]);

	const closeBulkRemove = useCallback(() => { setShowBulkRemoveModal(null); }, []);
	const exportPending = useRef(false);
	const exportGeneration = useRef(0);
	const [exportingScope, setExportingScope] = useState<string | null>(null);
	useEffect(() => {
		const generation = ++exportGeneration.current;
		exportPending.current = false;
		return () => { exportGeneration.current = generation + 1; toast.dismiss('export-collection'); };
	}, [collectionId, user?._id]);

	// Handle export collection
	const handleExportCollection = useCallback(async () => {
		if (!user) { toast.info('Vui lòng đăng nhập để xuất bộ sưu tập.'); return; }
		if (exportPending.current) return;
		if (!collectionId || !collection || images.length === 0) {
			toast.error('Bộ sưu tập không có ảnh để xuất');
			return;
		}

		const generation = exportGeneration.current;
		const session = getAuthSessionVersion();
		const isCurrent = (): boolean => generation === exportGeneration.current && session === getAuthSessionVersion();
		exportPending.current = true;
		setExportingScope(pageScope);
		try {
			toast.loading('Đang tạo file ZIP...', { id: 'export-collection' });

			const blob = await collectionService.exportCollection(collectionId);
			if (!isCurrent()) return;
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
			if (!isCurrent()) return;
			const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
			toast.error(
				message || 'Xuất bộ sưu tập thất bại. Vui lòng thử lại.',
				{ id: 'export-collection' }
			);
		} finally {
			if (isCurrent()) { exportPending.current = false; setExportingScope(null); }
		}
	}, [collectionId, collection, images.length, pageScope, user]);

	if (loading && !collection) return <CollectionDetailSkeleton />;

	if (!collection) {
		return (
			<>
				<div className="collection-detail-page" data-loading-scope="local">
					<CollectionDetailFrame />
					<div className="collection-detail-error">
						<CollectionLoadError message={error || 'Không tìm thấy bộ sưu tập'} onRetry={() => { if (collectionId) void fetchCollection(collectionId).catch(() => {}); }} backTo="/collections" />
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="collection-detail-page" data-loading-scope="local">
				{error && <CollectionLoadError message={error} busy={loading} onRetry={() => void reconnect().catch(() => {})} backTo="/collections" />}
				{loading && <p role="status">Đang cập nhật bộ sưu tập…</p>}
				<CollectionHeader
					collection={collection}
					imagesCount={images.length}
					isFavorited={isFavorited}
					togglingFavorite={togglingFavorite}
					selectionMode={selectionMode}
					canEdit={canEdit}
					isExporting={exportingScope === pageScope}
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
				key={`${collectionId}:${user?._id ?? 'guest'}`}
				isOpen={showBulkRemoveModal === pageScope && selectionMode && selectedImageIds.size > 0}
					onClose={closeBulkRemove}
					onConfirm={handleBulkRemove}
				title="Xóa ảnh khỏi bộ sưu tập"
				message={`Bạn có chắc chắn muốn xóa ${selectedImageIds.size} ảnh khỏi bộ sưu tập này?`}
				confirmText="Xóa"
				cancelText="Hủy"
				variant="danger"
			/>
		</>
	);
}
