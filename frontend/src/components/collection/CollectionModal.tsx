import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Plus, Search, Folder, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collectionService } from '@/services/collectionService';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import { imageService } from '@/services/imageService';
import type { Collection } from '@/types/collection';
import type { Image } from '@/types/image';
import { BlurUpImage } from '@/components/NoFlashGrid/components/BlurUpImage';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { t } from '@/i18n';
import { CollectionPickerRow } from './CollectionPickerRow';
import { useImageDialogFocus } from '@/hooks/useImageDialogFocus';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import './CollectionModal.css';

interface CollectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	imageId?: string; // Optional - if not provided, modal is in edit mode
	collectionToEdit?: Collection; // If provided, modal is in edit mode
	onCollectionUpdate?: () => void;
}

export default function CollectionModal({
	isOpen,
	onClose,
	imageId,
	collectionToEdit,
	onCollectionUpdate,
}: CollectionModalProps) {
 const mutationBusy = useRef(false);
 const pendingCreation = useRef<{ collection: Collection; added: Set<string> } | null>(null);
 const dialogRef = useRef<HTMLDivElement>(null);
 useImageDialogFocus(dialogRef, isOpen && !imageId);
 useEffect(() => {
  if (!isOpen || imageId) return;
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !mutationBusy.current) onClose(); };
  document.addEventListener('keydown', keydown);
  return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); };
 }, [isOpen, imageId, onClose]);
 const isEditMode = !!collectionToEdit;
	const { collection: currentCollection, fetchCollection } = useCollectionStore();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(!imageId && !collectionToEdit);
	const [newCollectionName, setNewCollectionName] = useState('');
	const [newCollectionDescription, setNewCollectionDescription] = useState('');
	const [newCollectionPublic, setNewCollectionPublic] = useState(true);
	const [newCollectionTags, setNewCollectionTags] = useState<string[]>([]);
	const [newTagInput, setNewTagInput] = useState('');
	const [editCollectionName, setEditCollectionName] = useState(collectionToEdit?.name ?? '');
	const [editCollectionDescription, setEditCollectionDescription] = useState(collectionToEdit?.description ?? '');
	const [editCollectionPublic, setEditCollectionPublic] = useState(collectionToEdit?.isPublic !== false);
	const [editCollectionTags, setEditCollectionTags] = useState<string[]>(collectionToEdit?.tags ?? []);
	const [editTagInput, setEditTagInput] = useState('');
	const [collectionsContainingImage, setCollectionsContainingImage] = useState<Set<string>>(
		new Set()
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [recentCollectionIds, setRecentCollectionIds] = useState<string[]>(() => {
  try { const stored: unknown = JSON.parse(localStorage.getItem('recentCollections') || '[]'); return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []; }
  catch { return []; }
 });
	const { user } = useUserStore();
	const [availableImages, setAvailableImages] = useState<Image[]>([]);
	const [loadingImages, setLoadingImages] = useState(false);
 const [imagePickerError, setImagePickerError] = useState(false);
 const [imageRetry, setImageRetry] = useState(0);
	const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());


	// Helper functions for tags
	const addTag = (tag: string, isEdit: boolean) => {
		const trimmedTag = tag.trim().toLowerCase();
		if (!trimmedTag) return;

		if (isEdit) {
			if (!editCollectionTags.includes(trimmedTag) && editCollectionTags.length < 10) {
				setEditCollectionTags([...editCollectionTags, trimmedTag]);
				setEditTagInput('');
			}
		} else {
			if (!newCollectionTags.includes(trimmedTag) && newCollectionTags.length < 10) {
				setNewCollectionTags([...newCollectionTags, trimmedTag]);
				setNewTagInput('');
			}
		}
	};

	const removeTag = (tag: string, isEdit: boolean) => {
		if (isEdit) {
			setEditCollectionTags(editCollectionTags.filter(t => t !== tag));
		} else {
			setNewCollectionTags(newCollectionTags.filter(t => t !== tag));
		}
	};

	const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isEdit: boolean) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			const input = e.currentTarget.value;
			if (input.includes(',')) {
				// Multiple tags separated by commas
				input.split(',').forEach(tag => addTag(tag, isEdit));
			} else {
				addTag(input, isEdit);
			}
		}
	};


	// Load collections and check which ones contain this image
	useEffect(() => {
		if (!isOpen) return;
  if (isEditMode || !imageId) return;

		const loadData = async () => {
			setLoading(true);
			try {
				const [userCollections, containingCollections] = await Promise.all([
					collectionService.getUserCollections(),
					collectionService.getCollectionsContainingImage(imageId),
				]);

				setCollections(userCollections);
				const containingIds = new Set(
					containingCollections.map((c) => c._id)
				);
				setCollectionsContainingImage(containingIds);
			} catch {
				toast.error(t('collections.loadFailed'));
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [isOpen, imageId, isEditMode]);

	// Load user images for image picker (when creating collection from collections page)
	useEffect(() => {
		if (!isOpen || imageId || isEditMode) return;
		if (!user?._id) return;

		let active = true;
		const loadUserImages = async () => {
   setImagePickerError(false);
			setLoadingImages(true);
			try {
				const response = await imageService.fetchUserImages(user._id, {
					page: 1,
					limit: 50, // Load first 50 images
				});
				if (active) setAvailableImages(response.images || []);
			} catch {
				if (active) setImagePickerError(true);
			} finally {
				if (active) setLoadingImages(false);
			}
		};

		void loadUserImages();
  return () => { active = false; };
	}, [isOpen, imageId, isEditMode, user?._id, imageRetry]);


	// Filter collections by search query
	const filteredCollections = useMemo(() => {
		if (!searchQuery.trim()) return collections;
		const query = searchQuery.toLowerCase();
		return collections.filter(
			(collection) =>
				collection.name.toLowerCase().includes(query) ||
				collection.description?.toLowerCase().includes(query)
		);
	}, [collections, searchQuery]);

	// Get recent collections
	const recentCollections = useMemo(() => {
		return recentCollectionIds
			.map((id) => collections.find((c) => c._id === id))
			.filter((c): c is Collection => c !== undefined)
			.slice(0, 5); // Limit to 5 most recent
	}, [collections, recentCollectionIds]);

	// Get other collections (not in recent)
	const otherCollections = useMemo(() => {
		const recentIds = new Set(recentCollectionIds);
		return filteredCollections.filter((c) => !recentIds.has(c._id));
	}, [filteredCollections, recentCollectionIds]);

	const handleToggleCollection = useCallback(
		async (collectionId: string, isInCollection: boolean) => {
			if (!imageId) {
				toast.error(t('collections.imageIdNotFound'));
				return;
			}
			try {
				if (isInCollection) {
					const updatedCollection = await collectionService.removeImageFromCollection(collectionId, imageId);
					setCollectionsContainingImage((prev) => {
						const next = new Set(prev);
						next.delete(collectionId);
						return next;
					});

					// Update the collection in local state to reflect new image count
					setCollections((prev) => {
						return prev.map((c) => {
							if (c._id === collectionId) {
								return {
									...c,
									imageCount: updatedCollection.imageCount || Math.max(0, (c.imageCount || 0) - 1),
								};
							}
							return c;
						});
					});

					toast.success(t('collections.imageRemoved'));

					// Check if we're currently viewing this collection and refresh it
					if (typeof window !== 'undefined') {
						const currentPath = window.location.pathname;

						// Always dispatch event - let the detail page decide if it needs to refresh
						window.dispatchEvent(new CustomEvent('collectionUpdated', {
							detail: { collectionId, collection: updatedCollection }
						}));

						// Also refresh directly if we're on that collection's page OR if the current collection matches
						if (currentPath === `/collections/${collectionId}` ||
						    (currentCollection?._id === collectionId)) {
							// Refresh the collection to get full image data
							fetchCollection(collectionId);
						}
					}
				} else {
					const updatedCollection = await collectionService.addImageToCollection(collectionId, imageId);
					setCollectionsContainingImage((prev) => {
						const next = new Set(prev);
						next.add(collectionId);
						return next;
					});

					// Update the collection in local state to reflect new image count and cover image
					setCollections((prev) => {
						return prev.map((c) => {
							if (c._id === collectionId) {
								return {
									...c,
									imageCount: updatedCollection.imageCount || (c.imageCount || 0) + 1,
									coverImage: updatedCollection.coverImage || c.coverImage,
								};
							}
							return c;
						});
					});

					toast.success(t('collections.imageAdded'));

					// Add to recent collections
					setRecentCollectionIds((prev) => {
						const updated = [collectionId, ...prev.filter((id) => id !== collectionId)].slice(0, 10);
						if (typeof window !== 'undefined') {
							localStorage.setItem('recentCollections', JSON.stringify(updated));
						}
						return updated;
					});

					// Check if we're currently viewing this collection and refresh it
					if (typeof window !== 'undefined') {
						const currentPath = window.location.pathname;

						// Always dispatch event - let the detail page decide if it needs to refresh
						const event = new CustomEvent('collectionUpdated', {
							detail: { collectionId, collection: updatedCollection }
						});
						window.dispatchEvent(event);

						// Also refresh directly if we're on that collection's page OR if the current collection matches
						if (currentPath === `/collections/${collectionId}` ||
						    (currentCollection?._id === collectionId)) {
							// Refresh the collection to get full image data
							fetchCollection(collectionId);
						}
					}
				}
				onCollectionUpdate?.();
			} catch (error: unknown) {
				toast.error(
					getErrorMessage(error, t('collections.updateFailed'))
				);
			}
		},
		[imageId, onCollectionUpdate, currentCollection, fetchCollection]
	);

	const handleCreateCollection = useCallback(async () => {
  if (mutationBusy.current) return;
		if (!newCollectionName.trim()) {
			toast.error(t('collections.enterName'));
			return;
		}

		mutationBusy.current = true;
  const session = getAuthSessionVersion();
		setCreating(true);
		try {
   if (pendingCreation.current) {
    pendingCreation.current.collection = await collectionService.updateCollection(pendingCreation.current.collection._id, { name: newCollectionName.trim(), description: newCollectionDescription.trim(), isPublic: newCollectionPublic, tags: newCollectionTags });
    if (session !== getAuthSessionVersion()) return;
   }
   const newCollection = pendingCreation.current?.collection ?? await collectionService.createCollection({
    name: newCollectionName.trim(), description: newCollectionDescription.trim() || undefined,
    isPublic: newCollectionPublic, tags: newCollectionTags,
   });
   if (session !== getAuthSessionVersion()) return;
   if (!pendingCreation.current) {
    pendingCreation.current = { collection: newCollection, added: new Set<string>() };
    window.dispatchEvent(new CustomEvent('collectionCreated', { detail: { collection: newCollection } }));
   }
   // Retain the created ID and completed additions so retry cannot create duplicates.
   const requestedImages = new Set([...(imageId ? [imageId] : []), ...selectedImageIds]);
   for (const id of requestedImages) {
    if (pendingCreation.current.added.has(id)) continue;
    await collectionService.addImageToCollection(newCollection._id, id);
    if (session !== getAuthSessionVersion()) return;
    pendingCreation.current.added.add(id);
   }

			setCollections((prev) => [newCollection, ...prev]);
			if (imageId) {
				setCollectionsContainingImage((prev) => {
					const next = new Set(prev);
					next.add(newCollection._id);
					return next;
				});
			}

			setNewCollectionName('');
			setNewCollectionDescription('');
			setNewCollectionPublic(true);
			setNewCollectionTags([]);
			setNewTagInput('');
			setShowCreateForm(false);
			setSelectedImageIds(new Set());

			// Dispatch event for global collections list update
			window.dispatchEvent(new CustomEvent('collectionCreated', {
				detail: { collection: newCollection }
			}));

			const imageCount = (imageId ? 1 : 0) + selectedImageIds.size;
			if (imageCount > 0) {
				toast.success(t('collections.createdWithImages', { count: imageCount }));
			} else {
				toast.success(t('collections.created'));
			}
			onCollectionUpdate?.();

   pendingCreation.current = null;
			// Close the modal after successful creation
			onClose();
		} catch (error: unknown) {
   if (session !== getAuthSessionVersion()) return;
			toast.error(
				pendingCreation.current ? 'Bộ sưu tập đã được tạo nhưng chưa thêm đủ ảnh. Bấm Tạo bộ sưu tập để thử lại các ảnh còn thiếu.' : getErrorMessage(error, t('collections.createFailed'))
			);
		} finally {
			mutationBusy.current = false;
			setCreating(false);
		}
	}, [
		newCollectionName,
		newCollectionDescription,
		newCollectionPublic,
		newCollectionTags,
		imageId,
		selectedImageIds,
		onCollectionUpdate,
		onClose,
	]);

	const handleUpdateCollection = useCallback(async () => {
  if (mutationBusy.current) return;
		if (!collectionToEdit || !editCollectionName.trim()) {
			toast.error(t('collections.enterName'));
			return;
		}

		mutationBusy.current = true;
  const session = getAuthSessionVersion();
		setEditing(true);
		try {
			await collectionService.updateCollection(collectionToEdit._id, {
				name: editCollectionName.trim(),
				description: editCollectionDescription.trim(),
				isPublic: editCollectionPublic,
				tags: editCollectionTags,
			});

   if (session !== getAuthSessionVersion()) return;
			toast.success(t('collections.updated'));
			onCollectionUpdate?.();
			onClose();
		} catch (error: unknown) {
   if (session !== getAuthSessionVersion()) return;
			toast.error(
				getErrorMessage(error, t('collections.updateFailed'))
			);
		} finally {
			mutationBusy.current = false;
			setEditing(false);
		}
	}, [
		collectionToEdit,
		editCollectionName,
		editCollectionDescription,
		editCollectionPublic,
		editCollectionTags,
		onCollectionUpdate,
		onClose,
	]);

	if (!isOpen) return null;

	// If used as dropdown (when imageId is provided and not editing), render without overlay
	const isDropdown = !!imageId && !collectionToEdit;
	// Show image picker sidebar on the right when creating collection (no imageId and not editing)
	const showImagePickerSidebar = !imageId && !collectionToEdit;

	return (
		<>
			{!isDropdown && (
				<div className="collection-modal-overlay" onClick={() => { if (!mutationBusy.current) onClose(); }} />
			)}
			<div ref={dialogRef} role={!imageId ? "dialog" : undefined} aria-modal={!imageId ? true : undefined} aria-label={isEditMode ? t('collections.editCollection') : t('collections.createCollection')} tabIndex={-1} className={`collection-modal-wrapper ${isDropdown ? 'collection-modal-wrapper-dropdown' : ''} ${showImagePickerSidebar ? 'with-image-picker' : ''}`}>
				<div className={`collection-modal ${isDropdown ? 'collection-modal-dropdown' : 'collection-modal-centered'} ${showImagePickerSidebar ? 'with-sidebar' : ''}`} onClick={(e) => e.stopPropagation()}>
					{!isDropdown && (
						<div className="collection-modal-header">
						<h2>{isEditMode ? t('collections.editCollection') : (imageId ? t('collections.saveToCollection') : t('collections.createNew'))}</h2>
						<Button
							variant="ghost"
							size="icon"
							className="collection-modal-close"
							onClick={() => { if (!mutationBusy.current) onClose(); }}
							aria-label={t('common.close')}
						>
							<X size={20} />
						</Button>
						</div>
					)}

					<div className="collection-modal-content">
					{isEditMode ? (
						<div className="collection-modal-create-form collection-modal-edit-form">
							<div className="collection-modal-form-group">
								<label htmlFor="edit-collection-name">{t('collections.collectionName')} *</label>
								<input
									id="edit-collection-name"
									type="text"
									value={editCollectionName}
									onChange={(e) => setEditCollectionName(e.target.value)}
									placeholder={t('collections.collectionNamePlaceholder')}
									maxLength={100}
									autoFocus={!!imageId}
								/>
							</div>
							<div className="collection-modal-form-group">
								<label htmlFor="edit-collection-description">{t('collections.description')}</label>
								<textarea
									id="edit-collection-description"
									value={editCollectionDescription}
									onChange={(e) => setEditCollectionDescription(e.target.value)}
									placeholder={t('collections.descriptionPlaceholder')}
									maxLength={500}
									rows={3}
								/>
							</div>
									<div className="collection-modal-form-group">
										<label className="collection-modal-checkbox-label">
											<input
												type="checkbox"
												checked={editCollectionPublic}
												onChange={(e) => setEditCollectionPublic(e.target.checked)}
											/>
											<span>{t('collections.public')}</span>
										</label>
									</div>
									<div className="collection-modal-form-group">
										<label htmlFor="edit-collection-tags">{t('collections.tags')}</label>
										<div className="collection-modal-tags-input-wrapper">
											<input
												id="edit-collection-tags"
												type="text"
												value={editTagInput}
												onChange={(e) => setEditTagInput(e.target.value)}
												onKeyDown={(e) => handleTagInputKeyDown(e, true)}
												placeholder={t('collections.tagsPlaceholder')}
											/>
											<button
												type="button"
												className="collection-modal-tag-add-btn"
												onClick={() => addTag(editTagInput, true)}
												disabled={!editTagInput.trim() || editCollectionTags.length >= 10}
											>
												<Plus size={16} />
											</button>
										</div>
										{editCollectionTags.length > 0 && (
											<div className="collection-modal-tags-list">
												{editCollectionTags.map((tag, index) => (
													<span key={index} className="collection-modal-tag">
														{tag}
														<button
															type="button"
															onClick={() => removeTag(tag, true)}
															className="collection-modal-tag-remove"
														>
															<X size={12} />
														</button>
													</span>
												))}
											</div>
										)}
									</div>
									<div className="collection-modal-form-actions">
								<Button
									variant="outline"
									className="collection-modal-cancel-btn"
									onClick={() => { if (!mutationBusy.current) onClose(); }}
									disabled={editing}
								>
									{t('common.cancel')}
								</Button>
								<Button
									className="collection-modal-submit-btn"
									onClick={handleUpdateCollection}
									loading={editing}
									disabled={!editCollectionName.trim()}
								>
									{t('common.saveChanges')}
								</Button>
							</div>
						</div>
					) : loading ? (
						<div className="collection-modal-loading">
							<p>{t('common.loading')}</p>
						</div>
					) : (
						<>
							{!showCreateForm ? (
								<>
									{/* Search Bar - PHOTOCLOUD style */}
									<div className="collection-modal-search">
										<Search size={18} className="collection-modal-search-icon" />
										<input
											type="text"
											className="collection-modal-search-input"
											placeholder="Find a collection"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											autoFocus={!!imageId}
										/>
										{searchQuery && (
											<button
												type="button"
												className="collection-modal-search-clear"
												onClick={() => setSearchQuery('')}
												aria-label={t('common.clear')}
											>
												<X size={16} />
											</button>
										)}
									</div>

									{/* Recent Collections Section */}
									{recentCollections.length > 0 && !searchQuery && (
										<div className="collection-modal-section">
											<h4 className="collection-modal-section-title">Recent</h4>
											<div className="collection-modal-list">
												{recentCollections.map(collection => <CollectionPickerRow key={collection._id} collection={collection} selected={collectionsContainingImage.has(collection._id)} onToggle={handleToggleCollection} />)}
											</div>
										</div>
									)}

									{/* All Collections */}
									{(otherCollections.length > 0 || (searchQuery && filteredCollections.length > 0)) ? (
										<div className="collection-modal-section">
											{!searchQuery && recentCollections.length > 0 && (
												<h4 className="collection-modal-section-title">All collections</h4>
											)}
											<div className="collection-modal-list">
												{(searchQuery ? filteredCollections : otherCollections).map(collection => <CollectionPickerRow key={collection._id} collection={collection} selected={collectionsContainingImage.has(collection._id)} onToggle={handleToggleCollection} />)}
											</div>
										</div>
									) : collections.length === 0 ? (
										<div className="collection-modal-empty">
											<Folder size={48} />
											<p>{t('collections.empty')}</p>
											<p className="collection-modal-empty-hint">
												{t('collections.emptyHint')}
											</p>
										</div>
									) : searchQuery ? (
										<div className="collection-modal-empty">
											<p>{t('collections.noCollectionsFound')}</p>
										</div>
									) : null}

									{/* Create New Collection Button - at bottom like PHOTOCLOUD */}
									{(user?.isAdmin || user?.isSuperAdmin) && <div className="collection-modal-create-bottom">
										<button
											type="button"
											className="collection-modal-create-new-btn"
											onClick={() => {
												setShowCreateForm(true);
											}}
										>
											<Plus size={18} />
											<span>{t('collections.createNew')}</span>
										</button>
									</div>}
								</>
							) : (
								<div className="collection-modal-create-form">

									<div className="collection-modal-form-group">
										<label htmlFor="collection-name">{t('collections.collectionName')} *</label>
										<input
											id="collection-name"
											type="text"
											value={newCollectionName}
											onChange={(e) => setNewCollectionName(e.target.value)}
											placeholder={t('collections.collectionNamePlaceholder')}
											maxLength={100}
											autoFocus={!!imageId}
										/>
									</div>
									<div className="collection-modal-form-group">
										<label htmlFor="collection-description">{t('collections.description')}</label>
										<textarea
											id="collection-description"
											value={newCollectionDescription}
											onChange={(e) =>
												setNewCollectionDescription(e.target.value)
											}
											placeholder={t('collections.descriptionPlaceholder')}
											maxLength={500}
											rows={3}
										/>
									</div>
									<div className="collection-modal-form-group">
										<label className="collection-modal-checkbox-label">
											<input
												type="checkbox"
												checked={newCollectionPublic}
												onChange={(e) => setNewCollectionPublic(e.target.checked)}
											/>
											<span>{t('collections.public')}</span>
										</label>
									</div>
									<div className="collection-modal-form-group">
										<label htmlFor="collection-tags">{t('collections.tags')}</label>
										<div className="collection-modal-tags-input-wrapper">
											<input
												id="collection-tags"
												type="text"
												value={newTagInput}
												onChange={(e) => setNewTagInput(e.target.value)}
												onKeyDown={(e) => handleTagInputKeyDown(e, false)}
												placeholder={t('collections.tagsPlaceholder')}
											/>
											<button
												type="button"
												className="collection-modal-tag-add-btn"
												onClick={() => addTag(newTagInput, false)}
												disabled={!newTagInput.trim() || newCollectionTags.length >= 10}
											>
												<Plus size={16} />
											</button>
										</div>
										{newCollectionTags.length > 0 && (
											<div className="collection-modal-tags-list">
												{newCollectionTags.map((tag, index) => (
													<span key={index} className="collection-modal-tag">
														{tag}
														<button
															type="button"
															onClick={() => removeTag(tag, false)}
															className="collection-modal-tag-remove"
														>
															<X size={12} />
														</button>
													</span>
												))}
											</div>
										)}
									</div>
									<div className="collection-modal-form-actions">
										<Button
											className="collection-modal-submit-btn"
											onClick={handleCreateCollection}
											loading={creating}
											disabled={!newCollectionName.trim()}
										>
											{creating ? t('collections.creating') : t('collections.createNew')}
										</Button>
										<Button
											variant="outline"
											className="collection-modal-cancel-btn"
											onClick={() => {
												setShowCreateForm(false);
												setNewCollectionName('');
												setNewCollectionDescription('');
												setSelectedImageIds(new Set());
											}}
											disabled={creating}
										>
											{t('common.cancel')}
										</Button>
									</div>
								</div>
							)}
						</>
					)}
					</div>
				</div>

				{/* Image Picker Sidebar - Always visible on right side when creating collection */}
				{showImagePickerSidebar && (
					<div className="collection-modal-image-picker-sidebar" onClick={(e) => e.stopPropagation()}>
						<div className="collection-modal-image-picker-sidebar-header">
							<h3>{t('collections.selectImages')}</h3>
							{selectedImageIds.size > 0 && (
								<span className="collection-modal-image-picker-count">
									{selectedImageIds.size} {t('collections.image')}
								</span>
							)}
						</div>
						<div className="collection-modal-image-picker-sidebar-content">
							{loadingImages ? (
								<div className="collection-modal-image-picker-loading">
									<p>{t('common.loading')}</p>
								</div>
							) : imagePickerError ? (
         <div className="collection-modal-image-picker-empty" role="alert"><p>Không thể tải ảnh để chọn. Bạn vẫn có thể tạo bộ sưu tập trống.</p><button onClick={() => setImageRetry(value => value + 1)}>Thử lại tải ảnh</button></div>
        ) : availableImages.length === 0 ? (
								<div className="collection-modal-image-picker-empty">
									<p>{t('collections.noImagesAvailable')}</p>
								</div>
							) : (
								<div className="collection-modal-image-picker-grid">
									{availableImages.map((image) => {
										const isSelected = selectedImageIds.has(image._id);
										return (
											<div
												key={image._id}
												className={`collection-modal-image-picker-item ${isSelected ? 'selected' : ''}`}
												onClick={() => {
													setSelectedImageIds((prev) => {
														const next = new Set(prev);
														if (isSelected) {
															next.delete(image._id);
														} else {
															next.add(image._id);
														}
														return next;
													});
												}}
											>
												<BlurUpImage
													image={image}
													priority={false}
													minimal={true}
												/>
												{isSelected && (
													<div className="collection-modal-image-picker-check">
														<Check size={20} />
													</div>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</>
	);
}

