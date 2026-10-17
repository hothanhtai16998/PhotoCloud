import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Search, X, Filter, Compass } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useCollectionsListStore, markCollectionsOffline, clearCollectionsOfflineError } from '@/stores/useCollectionsListStore';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { t } from '@/i18n';
import { filterCollections } from '@/utils/collectionList';
import type { Collection } from '@/types/collection';

import { CollectionCard } from '@/components/collection/CollectionCard';
import { CollectionDeleteDialog } from '@/components/collection/CollectionDeleteDialog';
import { CollectionLoadError } from '@/components/collection/CollectionLoadError';
import { CollectionsGridSkeleton } from '@/components/collection/CollectionsGridSkeleton';

import './CollectionsPage.css';

const CollectionModal = lazy(() => import('@/components/collection/CollectionModal'));

export default function CollectionsPage() {
	const { accessToken, isInitializing } = useAuthStore();
	const { user } = useUserStore();
	const navigate = useNavigate();

	const {
		collections,
		error,
		loading,
		deletingId,
		searchQuery,
		showPublicOnly,
		sortBy,
		selectedTag,
		hasLoaded,
		fetchCollections,
		setSearchQuery,
		setShowPublicOnly,
		setSortBy,
		setSelectedTag,
		clearFilters,
		refreshCollections,
		checkAndRefreshIfStale,
	} = useCollectionsListStore();

	const canCreate = !!(user?.isAdmin || user?.isSuperAdmin);

	// Tab title + meta. Sở hữu tại page-level hook — useSiteSettings không được ghi đè.
	useDocumentMeta({
		title: t('collections.title'),
		description: user ? undefined : t('collections.subtitleViewer'),
		noIndex: !user,
	});

	useEffect(() => {
		const handleOffline = () => markCollectionsOffline();
		const handleOnline = () => clearCollectionsOfflineError();
		window.addEventListener('offline', handleOffline);
		window.addEventListener('online', handleOnline);
		return () => {
			window.removeEventListener('offline', handleOffline);
			window.removeEventListener('online', handleOnline);
		};
	}, []);

	const [editor, setEditor] = useState<Collection | 'create' | null>(null);
	const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

	const filteredCollections = useMemo(
		() => filterCollections(collections, { searchQuery, showPublicOnly, sortBy, selectedTag }),
		[collections, searchQuery, showPublicOnly, sortBy, selectedTag],
	);

	useEffect(() => {
		if (isInitializing) return;

		if (!accessToken) {
			toast.info(t('collections.loginRequired'));
			navigate('/');
			return;
		}

		if (!hasLoaded) {
			void fetchCollections();
		} else {
			void checkAndRefreshIfStale();
		}

		const interval = setInterval(() => {
			void checkAndRefreshIfStale();
		}, 2 * 60 * 1000);

		return () => clearInterval(interval);
	}, [accessToken, isInitializing, hasLoaded, navigate, fetchCollections, checkAndRefreshIfStale]);

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		collections.forEach(collection => {
			if (collection.tags && Array.isArray(collection.tags)) {
				collection.tags.forEach(tag => tagSet.add(tag));
			}
		});
		return Array.from(tagSet).sort();
	}, [collections]);

	const handleCollectionUpdated = () => {
		void refreshCollections();
	};
	const clearSearch = () => setSearchQuery('');

	if (isInitializing || !accessToken) return null;

	const isInitialLoad = !hasLoaded && loading;
	const isEmptyState = !loading && !error && collections.length === 0;
	const isNoMatch = !loading && !error && collections.length > 0 && filteredCollections.length === 0;
	const showGrid = filteredCollections.length > 0;

	const totalLabel = collections.length === 1
		? t('collections.totalCountOne', { count: collections.length })
		: t('collections.totalCount', { count: collections.length });

	return (
		<>
			<div className="collections-page">
				<div className="collections-page-shell">
					<header className="collections-header">
						<div className="collections-header-titles">
							{hasLoaded && collections.length > 0 && (
								<span className="collections-eyebrow">{totalLabel}</span>
							)}
							<h1>{t('collections.title')}</h1>
							{hasLoaded && collections.length > 0 && !canCreate && (
								<p className="collections-header-subtitle">
									{t('collections.subtitleViewer')}
								</p>
							)}
						</div>
						{canCreate && (
							<button
								className="collections-create-btn"
								type="button"
								onClick={() => setEditor('create')}
							>
								<Plus size={18} aria-hidden="true" />
								{t('collections.createCollection')}
							</button>
						)}
					</header>

					{collections.length > 0 && (
						<div className="collections-filters" role="search">
							<div className="collections-search-wrapper">
								<Search size={18} className="collections-search-icon" aria-hidden="true" />
								<input
									type="search"
									className="collections-search-input"
									placeholder={t('collections.searchPlaceholder')}
									aria-label={t('collections.searchPlaceholder')}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
								{searchQuery && (
									<button
										type="button"
										className="collections-search-clear"
										onClick={clearSearch}
										aria-label={t('collections.clearSearch')}
									>
										<X size={14} aria-hidden="true" />
									</button>
								)}
							</div>

							{allTags.length > 0 && (
								<div className="collections-tags-filter">
									<button
										type="button"
										aria-pressed={!selectedTag}
										className={`collections-tag-filter-btn ${!selectedTag ? 'active' : ''}`}
										onClick={() => setSelectedTag(null)}
										title={t('collections.allTags')}
									>
										{t('collections.all')}
									</button>
									{allTags.map(tag => (
										<button
											key={tag}
											type="button"
											aria-pressed={selectedTag === tag}
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
									type="button"
									aria-pressed={showPublicOnly}
									className={`collections-filter-btn ${showPublicOnly ? 'active' : ''}`}
									onClick={() => setShowPublicOnly(!showPublicOnly)}
									title={showPublicOnly ? t('collections.showAll') : t('collections.showPublicOnly')}
								>
									<Filter size={14} aria-hidden="true" />
									<span>{showPublicOnly ? t('collections.public') : t('collections.all')}</span>
								</button>
								<select
									aria-label={t('collections.sortAriaLabel')}
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

					{error && (
						<CollectionLoadError message={error} busy={loading} onRetry={() => void fetchCollections()} />
					)}

					{isInitialLoad && <CollectionsGridSkeleton count={6} />}

					{isEmptyState && (
						<div className="collections-empty">
							<div className="collections-empty-illustration" aria-hidden="true">
								<Folder size={44} />
							</div>
							<h2>{t('collections.emptyTitle')}</h2>
							<p>
								{canCreate
									? t('collections.emptyHint')
									: t('collections.emptyHintPublic')}
							</p>
							<div className="collections-empty-actions">
								<button
									type="button"
									className="collections-empty-btn"
									onClick={() => navigate('/')}
								>
									<Compass size={16} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
									{t('favorites.explore')}
								</button>
							</div>
						</div>
					)}

					{isNoMatch && (
						<div className="collections-empty">
							<div className="collections-empty-illustration" aria-hidden="true">
								<Search size={40} />
							</div>
							<h2>{t('collections.noCollectionsFound')}</h2>
							<p>
								{searchQuery
									? t('collections.noMatchSearch', { query: searchQuery })
									: t('collections.noMatchFilter')}
							</p>
							{(searchQuery || showPublicOnly || selectedTag) && (
								<div className="collections-empty-actions">
									<button
										type="button"
										className="collections-empty-btn"
										onClick={clearFilters}
									>
										{t('collections.clearFilters')}
									</button>
								</div>
							)}
						</div>
					)}

					{searchQuery && showGrid && (
						<p className="collections-results-info" role="status">
							{t('collections.foundCount', { count: filteredCollections.length })}
						</p>
					)}

					{showGrid && (
						<div className="collections-grid">
							{filteredCollections.map((collection, index) => (
								<CollectionCard
									key={collection._id}
									collection={collection}
									creatorFallback={user?.displayName || user?.username || ''}
									priority={index < 2}
									deleting={deletingId === collection._id}
									canManage={canCreate && (typeof collection.createdBy === 'object' ? collection.createdBy?._id : collection.createdBy) === user?._id}
									onEdit={() => setEditor(collection)}
									onDelete={() => setCollectionToDelete(collection._id)}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{editor && (
				<Suspense fallback={<p role="status" style={{ position: 'absolute', left: -9999 }}>{t('collections.modalLoading')}</p>}>
					<CollectionModal
						key={editor === 'create' ? 'create' : editor._id}
						isOpen
						onClose={() => setEditor(null)}
						collectionToEdit={editor === 'create' ? undefined : editor}
						onCollectionUpdate={handleCollectionUpdated}
					/>
				</Suspense>
			)}

			<CollectionDeleteDialog
				collectionId={collectionToDelete}
				onClose={() => setCollectionToDelete(null)}
			/>
		</>
	);
}
