import { useEffect, useLayoutEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import type { Image } from '@/types/image';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useCollectionsListStore } from '@/stores/useCollectionsListStore';
import { Folder, Plus, Trash2, Edit2, Lock, Search, X, Filter } from 'lucide-react';
import { BlurUpImage } from '@/components/NoFlashGrid/components/BlurUpImage';
import { ConfirmModal } from '@/pages/admin/components/modals';
import { t } from '@/i18n';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import './CollectionsPage.css';

// Lazy load CollectionModal - only shown when editing
const CollectionModal = lazy(() => import('@/components/collection/CollectionModal'));

export default function CollectionsPage() {
	const { accessToken, isInitializing } = useAuthStore();
	const { user } = useUserStore();
	const navigate = useNavigate();

	// Collections list store
	const {
		collections,
		filteredCollections,
		loading,
		deletingId,
		searchQuery,
		showPublicOnly,
		sortBy,
		selectedTag,
		hasLoaded,
		fetchCollections,
		deleteCollection,
		updateCollection,
		setSearchQuery,
		setShowPublicOnly,
		setSortBy,
		setSelectedTag,
		clearFilters,
		refreshCollections,
		resetLoading,
		checkAndRefreshIfStale,
	} = useCollectionsListStore();



	const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

	// Reset loading synchronously before paint if we have data
	// This prevents grid flash when navigating with cached data
	useLayoutEffect(() => {
		if (collections.length > 0) {
			resetLoading();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [collections.length]); // Run when collections change

	useEffect(() => {
		// CRITICAL: Wait for auth initialization before fetching collections
		if (isInitializing) {
			return;
		}

		if (!accessToken) {
			toast.info(t('collections.loginRequired'));
			navigate('/');
			return;
		}

		// On mount, if we have data, ensure loading is false
		if (collections.length > 0) {
			resetLoading();
		}

		// Only fetch if we haven't loaded yet or if data is empty
		if (!hasLoaded || collections.length === 0) {
			const loadCollections = async () => {
				try {
					await fetchCollections();
				} catch (_error) {
					// Error already handled in store
				}
			};

			loadCollections();
		} else {
			// Unsplash-style: Silent background refresh if stale
			checkAndRefreshIfStale();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accessToken, isInitializing]);

	// Unsplash-style: Periodic check for stale data (every 2 minutes)
	useEffect(() => {
		if (!hasLoaded || !accessToken) return;
		
		const interval = setInterval(() => {
			checkAndRefreshIfStale();
		}, 2 * 60 * 1000); // Check every 2 minutes
		
		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasLoaded, accessToken]);

	// Get all unique tags from collections
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		collections.forEach(collection => {
			if (collection.tags && Array.isArray(collection.tags)) {
				collection.tags.forEach(tag => tagSet.add(tag));
			}
		});
		return Array.from(tagSet).sort();
	}, [collections]);

	// Filtering and sorting is now handled in the store

	const handleDeleteClick = (collectionId: string) => {
		setCollectionToDelete(collectionId);
		setShowDeleteModal(true);
	};

	const handleDeleteConfirm = async () => {
		if (collectionToDelete) {
			await deleteCollection(collectionToDelete);
			setShowDeleteModal(false);
			setCollectionToDelete(null);
		}
	};

	const handleCollectionClick = (collection: Collection) => {
		navigate(`/collections/${collection._id}`);
	};

	const handleEditCollection = (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		setEditingCollection(collection);
		setShowEditModal(true);
	};

	const handleCollectionUpdated = () => {
		// Reload collections after update
		refreshCollections();
	};

	const clearSearch = () => {
		setSearchQuery('');
	};


	// Only show loading if we're actually loading AND have no data
	// This prevents showing loading placeholder when navigating with existing data
	if (loading && collections.length === 0) {
		return (
			<>
				<div className="collections-page">
					<div className="collections-loading">
						<div className="flex items-center justify-center py-12">
							<LoadingSpinner size="large" />
						</div>
					</div>
				</div>
			</>
		);
	}

		return (
			<>
				<div className="collections-page">
					<div className="collections-header">
					<h1>{t('collections.myCollections')}</h1>
					<button
						className="collections-create-btn"
						onClick={() => {
							setShowCreateModal(true);
						}}
					>
						<Plus size={18} />
						{t('collections.createCollection')}
					</button>
				</div>

				{/* Search and Filter Bar */}
				{collections.length > 0 && (
					<div className="collections-filters">
						<div className="collections-search-wrapper">
							<Search size={20} className="collections-search-icon" />
							<input
								type="text"
								className="collections-search-input"
								placeholder={t('collections.searchPlaceholder')}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{searchQuery && (
								<button
									className="collections-search-clear"
									onClick={clearSearch}
									title={t('collections.clearSearch')}
								>
									<X size={16} />
								</button>
							)}
						</div>
						{allTags.length > 0 && (
							<div className="collections-tags-filter">
								<button
									className={`collections-tag-filter-btn ${!selectedTag ? 'active' : ''}`}
									onClick={() => setSelectedTag(null)}
									title={t('collections.allTags')}
								>
									{t('collections.all')}
								</button>
								{allTags.map(tag => (
									<button
										key={tag}
										className={`collections-tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
										onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
										title={t('collections.filterBy', { tag })}
									>
										{tag}
									</button>
								))}
							</div>
						)}
						<div className="collections-filter-controls">
							<button
								className={`collections-filter-btn ${showPublicOnly ? 'active' : ''}`}
								onClick={() => setShowPublicOnly(!showPublicOnly)}
								title={showPublicOnly ? t('collections.showAll') : t('collections.showPublicOnly')}
							>
								<Filter size={16} />
								<span>{showPublicOnly ? t('collections.public') : t('collections.all')}</span>
							</button>
							<select
								className="collections-sort-select"
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
							>
								<option value="newest">{t('collections.sortNewest')}</option>
								<option value="oldest">{t('collections.sortOldest')}</option>
								<option value="name">{t('collections.sortName')}</option>
								<option value="images">{t('collections.sortImages')}</option>
							</select>
						</div>
					</div>
				)}

				{collections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>{t('collections.empty')}</h2>
						<p>{t('collections.emptyHint')}</p>
						<button
							className="collections-empty-btn"
							onClick={() => navigate('/')}
						>
							{t('favorites.explore')}
						</button>
					</div>
				) : filteredCollections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>{t('collections.noCollectionsFound')}</h2>
						<p>
							{searchQuery 
								? t('collections.noMatchSearch', { query: searchQuery })
								: t('collections.noMatchFilter')}
						</p>
						{(searchQuery || showPublicOnly || selectedTag) && (
							<button
								className="collections-empty-btn"
							onClick={() => {
								clearFilters();
							}}
							>
								{t('collections.clearFilters')}
							</button>
						)}
					</div>
				) : (
					<>
						{searchQuery && (
							<div className="collections-results-info">
								{t('collections.foundCount', { count: filteredCollections.length })}
							</div>
						)}
						<div className="collections-grid">
							{filteredCollections.map((collection) => {
							const coverImage =
								collection.coverImage &&
								typeof collection.coverImage === 'object'
									? collection.coverImage
									: null;
							
							// Get sample images (2-3 images for thumbnails)
							// Filter out coverImage to avoid duplicates
							const allSampleImages = collection.sampleImages && Array.isArray(collection.sampleImages)
								? collection.sampleImages.filter((img): img is Image => 
									typeof img === 'object' && img !== null && '_id' in img
								)
								: [];
							
							// Exclude coverImage from thumbnails to avoid showing the same image twice
							const coverImageId = coverImage?._id;
							const sampleImages = coverImageId
								? allSampleImages.filter(img => img._id !== coverImageId)
								: allSampleImages;
							
							
							// Get creator name
							const creatorName = typeof collection.createdBy === 'object' 
								? collection.createdBy.displayName || collection.createdBy.username
								: user?.displayName || user?.username || 'You';

							return (
								<div
									key={collection._id}
									className="collection-card"
									onClick={() => handleCollectionClick(collection)}
								>
									<div className="collection-card-cover">
										<div className={`collection-card-images ${sampleImages.length < 2 ? 'no-thumbnails' : ''}`}>
											{/* Main large image on the left */}
											<div className="collection-card-main-image">
												{coverImage ? (
													<BlurUpImage
														image={coverImage}
														priority={false}
														minimal={true}
													/>
												) : (
													<div className="collection-card-placeholder">
														<Folder size={48} />
													</div>
												)}
											</div>
											{/* Smaller thumbnails on the right (stacked) - only show if we have 2+ sample images */}
											{sampleImages.length >= 2 && (
												<div className="collection-card-thumbnails">
													{sampleImages.slice(0, 2).map((img, idx) => (
														<div key={img._id || idx} className="collection-card-thumbnail">
															<BlurUpImage
																image={img}
																priority={false}
																minimal={true}
															/>
														</div>
													))}
												</div>
											)}
										</div>
										<div className="collection-card-overlay">
											<div className="collection-card-actions">
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleEditCollection(e, collection)}
													title={t('collections.editCollection')}
												>
													<Edit2 size={18} />
												</button>
												<button
													className="collection-card-action-btn action-danger"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteClick(collection._id);
													}}
													disabled={deletingId === collection._id}
													title={t('common.delete')}
												>
													<Trash2 size={18} />
												</button>
											</div>
										</div>
									</div>
									<div className="collection-card-info">
										<div className="collection-card-header">
											<h3 className="collection-card-title">
												{collection.name}
												{!collection.isPublic && (
													<Lock size={14} className="collection-card-lock-icon" />
												)}
											</h3>
										</div>
										<div className="collection-card-meta">
											<span className="collection-card-meta-text">
												{collection.imageCount || 0} {collection.imageCount === 1 ? t('collections.image') : t('collections.images')} · {t('collections.curatedBy', { name: creatorName })}
											</span>
										</div>
									</div>
								</div>
							);
						})}
						</div>
					</>
				)}
			</div>

			{/* Edit Collection Modal */}
			{showEditModal && editingCollection && (
				<Suspense fallback={null}>
					<CollectionModal
						isOpen={showEditModal}
						onClose={() => {
							setShowEditModal(false);
							setEditingCollection(null);
						}}
						collectionToEdit={editingCollection}
						onCollectionUpdate={handleCollectionUpdated}
					/>
				</Suspense>
			)}
			{/* Create Collection Modal */}
			{showCreateModal && (
				<Suspense fallback={null}>
					<CollectionModal
						isOpen={showCreateModal}
						onClose={() => {
							setShowCreateModal(false);
						}}
						onCollectionUpdate={handleCollectionUpdated}
					/>
				</Suspense>
			)}

			{/* Delete Collection Modal */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
					setCollectionToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Xóa bộ sưu tập"
				message={t('collections.deleteConfirm')}
				confirmText="Xóa"
				cancelText="Hủy"
				variant="danger"
			/>

		</>
	);
}

