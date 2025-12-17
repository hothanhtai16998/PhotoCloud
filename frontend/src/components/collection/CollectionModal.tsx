import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Plus, Folder, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collectionService } from '@/services/collectionService';
import { collectionTemplateService, type CollectionTemplate } from '@/services/collectionTemplateService';
import type { Collection } from '@/types/collection';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { t } from '@/i18n';
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
	const isEditMode = !!collectionToEdit;
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newCollectionName, setNewCollectionName] = useState('');
	const [newCollectionDescription, setNewCollectionDescription] = useState('');
	const [newCollectionPublic, setNewCollectionPublic] = useState(true);
	const [newCollectionTags, setNewCollectionTags] = useState<string[]>([]);
	const [newTagInput, setNewTagInput] = useState('');
	const [editCollectionName, setEditCollectionName] = useState('');
	const [editCollectionDescription, setEditCollectionDescription] = useState('');
	const [editCollectionPublic, setEditCollectionPublic] = useState(true);
	const [editCollectionTags, setEditCollectionTags] = useState<string[]>([]);
	const [editTagInput, setEditTagInput] = useState('');
	const [collectionsContainingImage, setCollectionsContainingImage] = useState<Set<string>>(
		new Set()
	);
	const [_templates, setTemplates] = useState<CollectionTemplate[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState<CollectionTemplate | null>(null);
	const [_showTemplates, setShowTemplates] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [recentCollectionIds, setRecentCollectionIds] = useState<string[]>([]);

	// Initialize edit form when collectionToEdit changes
	useEffect(() => {
		if (collectionToEdit) {
			setEditCollectionName(collectionToEdit.name || '');
			setEditCollectionDescription(collectionToEdit.description || '');
			setEditCollectionPublic(collectionToEdit.isPublic !== false);
			setEditCollectionTags(collectionToEdit.tags || []);
			setShowCreateForm(false);
		}
	}, [collectionToEdit]);

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

	// Load templates
	useEffect(() => {
		if (!isOpen || isEditMode) return;

		const loadTemplates = async () => {
			try {
				const templatesData = await collectionTemplateService.getTemplates();
				setTemplates(templatesData);
			} catch (error: unknown) {
				console.error('Failed to load templates:', error);
				// Don't show error toast for templates, it's optional
			}
		};

		loadTemplates();
	}, [isOpen, isEditMode]);

	// Load collections and check which ones contain this image
	useEffect(() => {
		if (!isOpen) return;

		// If in edit mode, don't load collections list
		if (isEditMode) {
			setLoading(false);
			return;
		}

		if (!imageId) return;

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
			} catch (error: unknown) {
				console.error('Failed to load collections:', error);
				toast.error(t('collections.loadFailed'));
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [isOpen, imageId, isEditMode]);

	// Apply template when selected
	useEffect(() => {
		if (selectedTemplate && showCreateForm) {
			setNewCollectionName(selectedTemplate.templateName);
			setNewCollectionDescription(selectedTemplate.description || '');
			setNewCollectionPublic(selectedTemplate.defaultIsPublic);
			setNewCollectionTags([...selectedTemplate.defaultTags]);
		}
	}, [selectedTemplate, showCreateForm]);

	// Load recent collections from localStorage
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const recent = localStorage.getItem('recentCollections');
			if (recent) {
				try {
					setRecentCollectionIds(JSON.parse(recent));
				} catch {
					// Ignore parse errors
				}
			}
		}
	}, []);

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
					await collectionService.removeImageFromCollection(collectionId, imageId);
					setCollectionsContainingImage((prev) => {
						const next = new Set(prev);
						next.delete(collectionId);
						return next;
					});
					toast.success(t('collections.imageRemoved'));
				} else {
					await collectionService.addImageToCollection(collectionId, imageId);
					setCollectionsContainingImage((prev) => {
						const next = new Set(prev);
						next.add(collectionId);
						return next;
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
				}
				onCollectionUpdate?.();
			} catch (error: unknown) {
				console.error('Failed to toggle collection:', error);
				toast.error(
					getErrorMessage(error, t('collections.updateFailed'))
				);
			}
		},
		[imageId, onCollectionUpdate]
	);

	const handleCreateCollection = useCallback(async () => {
		if (!newCollectionName.trim()) {
			toast.error(t('collections.enterName'));
			return;
		}

		setCreating(true);
		try {
			let newCollection: Collection;

			// Create from template if selected
			if (selectedTemplate) {
				const result = await collectionTemplateService.createCollectionFromTemplate(
					selectedTemplate._id,
					{
						name: newCollectionName.trim(),
						description: newCollectionDescription.trim() || undefined,
						isPublic: newCollectionPublic,
						tags: newCollectionTags.length > 0 ? newCollectionTags : undefined,
					}
				);
				newCollection = result as unknown as Collection;
			} else {
				// Create normally
				newCollection = await collectionService.createCollection({
					name: newCollectionName.trim(),
					description: newCollectionDescription.trim() || undefined,
					isPublic: newCollectionPublic,
					tags: newCollectionTags.length > 0 ? newCollectionTags : undefined,
				});
			}

			// Add the image to the new collection if imageId is provided
			if (imageId) {
				await collectionService.addImageToCollection(newCollection._id, imageId);
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
			setSelectedTemplate(null);
			setShowTemplates(false);

			toast.success(imageId ? t('collections.createdAndAdded') : t('collections.created'));
			onCollectionUpdate?.();
		} catch (error: unknown) {
			console.error('Failed to create collection:', error);
			toast.error(
				getErrorMessage(error, t('collections.createFailed'))
			);
		} finally {
			setCreating(false);
		}
	}, [
		newCollectionName,
		newCollectionDescription,
		newCollectionPublic,
		newCollectionTags,
		selectedTemplate,
		imageId,
		onCollectionUpdate,
	]);

	const handleUpdateCollection = useCallback(async () => {
		if (!collectionToEdit || !editCollectionName.trim()) {
			toast.error(t('collections.enterName'));
			return;
		}

		setEditing(true);
		try {
			await collectionService.updateCollection(collectionToEdit._id, {
				name: editCollectionName.trim(),
				description: editCollectionDescription.trim() || undefined,
				isPublic: editCollectionPublic,
				tags: editCollectionTags.length > 0 ? editCollectionTags : undefined,
			});

			toast.success(t('collections.updated'));
			onCollectionUpdate?.();
			onClose();
		} catch (error: unknown) {
			console.error('Failed to update collection:', error);
			toast.error(
				getErrorMessage(error, t('collections.updateFailed'))
			);
		} finally {
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

	return (
		<>
			{!isDropdown && (
				<div className="collection-modal-overlay" onClick={onClose} />
			)}
			<div className={`collection-modal ${isDropdown ? 'collection-modal-dropdown' : 'collection-modal-centered'}`} onClick={(e) => e.stopPropagation()}>
				{!isDropdown && (
					<div className="collection-modal-header">
						<h2>{isEditMode ? t('collections.editCollection') : t('collections.saveToCollection')}</h2>
						<Button 
							variant="ghost" 
							size="icon" 
							className="collection-modal-close" 
							onClick={onClose} 
							aria-label={t('common.close')}
						>
							<X size={20} />
						</Button>
					</div>
				)}

				<div className="collection-modal-content">
					{isEditMode ? (
						<div className="collection-modal-create-form">
							<h3>{t('collections.editCollection')}</h3>
							<div className="collection-modal-form-group">
								<label htmlFor="edit-collection-name">{t('collections.collectionName')} *</label>
								<input
									id="edit-collection-name"
									type="text"
									value={editCollectionName}
									onChange={(e) => setEditCollectionName(e.target.value)}
									placeholder={t('collections.collectionNamePlaceholder')}
									maxLength={100}
									autoFocus
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
									onClick={onClose}
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
									{/* Search Bar - Unsplash style */}
									<div className="collection-modal-search">
										<Search size={18} className="collection-modal-search-icon" />
										<input
											type="text"
											className="collection-modal-search-input"
											placeholder="Find a collection"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											autoFocus
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
												{recentCollections.map((collection) => {
													const isInCollection = collectionsContainingImage.has(
														collection._id
													);
													return (
														<button
															key={collection._id}
															className={`collection-modal-item ${
																isInCollection ? 'selected' : ''
															}`}
															onClick={() =>
																handleToggleCollection(
																	collection._id,
																	isInCollection
																)
															}
														>
															<div className="collection-modal-item-info">
																{collection.coverImage &&
																typeof collection.coverImage === 'object' ? (
																	<img
																		src={
																			collection.coverImage.thumbnailUrl ||
																			collection.coverImage.smallUrl ||
																			collection.coverImage.imageUrl
																		}
																		alt={collection.name}
																		className="collection-modal-item-cover"
																	/>
																) : (
																	<div className="collection-modal-item-placeholder">
																		<Folder size={20} />
																	</div>
																)}
																<div className="collection-modal-item-details">
																	<h3>{collection.name}</h3>
																	<p className="collection-modal-item-count">
																		{collection.imageCount || 0} {collection.imageCount === 1 ? 'image' : 'images'}
																	</p>
																</div>
															</div>
															{isInCollection && (
																<Check
																	size={18}
																	className="collection-modal-item-check"
																/>
															)}
														</button>
													);
												})}
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
												{(searchQuery ? filteredCollections : otherCollections).map((collection) => {
													const isInCollection = collectionsContainingImage.has(
														collection._id
													);
													return (
														<button
															key={collection._id}
															className={`collection-modal-item ${
																isInCollection ? 'selected' : ''
															}`}
															onClick={() =>
																handleToggleCollection(
																	collection._id,
																	isInCollection
																)
															}
														>
															<div className="collection-modal-item-info">
																{collection.coverImage &&
																typeof collection.coverImage === 'object' ? (
																	<img
																		src={
																			collection.coverImage.thumbnailUrl ||
																			collection.coverImage.smallUrl ||
																			collection.coverImage.imageUrl
																		}
																		alt={collection.name}
																		className="collection-modal-item-cover"
																	/>
																) : (
																	<div className="collection-modal-item-placeholder">
																		<Folder size={20} />
																	</div>
																)}
																<div className="collection-modal-item-details">
																	<h3>{collection.name}</h3>
																	<p className="collection-modal-item-count">
																		{collection.imageCount || 0} {collection.imageCount === 1 ? 'image' : 'images'}
																	</p>
																</div>
															</div>
															{isInCollection && (
																<Check
																	size={18}
																	className="collection-modal-item-check"
																/>
															)}
														</button>
													);
												})}
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

									{/* Create New Collection Button - at bottom like Unsplash */}
									<div className="collection-modal-create-bottom">
										<button
											type="button"
											className="collection-modal-create-new-btn"
											onClick={() => {
												setShowCreateForm(true);
												setShowTemplates(false);
												setSelectedTemplate(null);
											}}
										>
											<Plus size={18} />
											<span>{t('collections.createNew')}</span>
										</button>
									</div>
								</>
							) : (
								<div className="collection-modal-create-form">
									<div className="collection-modal-form-header">
										<h3>
											{selectedTemplate
												? t('collections.createFromTemplateTitle', { name: selectedTemplate.templateName })
												: t('collections.createNew')}
										</h3>
										{selectedTemplate && (
											<button
												type="button"
												className="collection-modal-clear-template"
												onClick={() => {
													setSelectedTemplate(null);
													setNewCollectionName('');
													setNewCollectionDescription('');
													setNewCollectionPublic(true);
													setNewCollectionTags([]);
												}}
												title={t('collections.clearTemplate')}
											>
												<X size={16} />
											</button>
										)}
									</div>
									<div className="collection-modal-form-group">
										<label htmlFor="collection-name">{t('collections.collectionName')} *</label>
										<input
											id="collection-name"
											type="text"
											value={newCollectionName}
											onChange={(e) => setNewCollectionName(e.target.value)}
											placeholder={t('collections.collectionNamePlaceholder')}
											maxLength={100}
											autoFocus
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
											variant="outline"
											className="collection-modal-cancel-btn"
											onClick={() => {
												setShowCreateForm(false);
												setNewCollectionName('');
												setNewCollectionDescription('');
											}}
											disabled={creating}
										>
											{t('common.cancel')}
										</Button>
										<Button
											className="collection-modal-submit-btn"
											onClick={handleCreateCollection}
											loading={creating}
											disabled={!newCollectionName.trim()}
										>
											{creating ? t('collections.creating') : t('collections.createNew')}
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</>
	);
}

