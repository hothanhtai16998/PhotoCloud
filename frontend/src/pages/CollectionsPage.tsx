import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Collection } from '@/types/collection';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useCollectionsListStore, markCollectionsOffline } from '@/stores/useCollectionsListStore';
import { Folder, Plus, Search, X, Filter } from 'lucide-react';
import { t } from '@/i18n';
import { filterCollections } from '@/utils/collectionList';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { CollectionDeleteDialog } from '@/components/collection/CollectionDeleteDialog';
import { CollectionLoadError } from '@/components/collection/CollectionLoadError';
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
		error,
		loading,
		deletingId,
		searchQuery,
		showPublicOnly,
		sortBy,
		selectedTag,
		hasLoaded,
		fetchCollections,		setSearchQuery,
		setShowPublicOnly,
		setSortBy,
		setSelectedTag,
		clearFilters,
		refreshCollections,
		checkAndRefreshIfStale,
	} = useCollectionsListStore();



 const canCreate = !!(user?.isAdmin || user?.isSuperAdmin);
 useEffect(() => { window.addEventListener('offline', markCollectionsOffline); return () => window.removeEventListener('offline', markCollectionsOffline); }, []);
 const [editor, setEditor] = useState<Collection | 'create' | null>(null);
 const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
 const filteredCollections = useMemo(() => filterCollections(collections, { searchQuery, showPublicOnly, sortBy, selectedTag }), [collections, searchQuery, showPublicOnly, sortBy, selectedTag]);

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

  if (!hasLoaded) void fetchCollections();
  else void checkAndRefreshIfStale();
  const interval = setInterval(() => { void checkAndRefreshIfStale(); }, 2 * 60 * 1000);
  return () => clearInterval(interval);
 }, [accessToken, isInitializing, hasLoaded, navigate, fetchCollections, checkAndRefreshIfStale]);

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

 const handleCollectionUpdated = () => { void refreshCollections(); };
 const clearSearch = () => setSearchQuery('');
 if (isInitializing || !accessToken) return null;

		return (
			<>
				<div className="collections-page">
					<div className="collections-header">
					<h1>Bộ sưu tập</h1>
					{canCreate && <button
						className="collections-create-btn"
						onClick={() => {
							setEditor('create');
						}}
					>
						<Plus size={18} />
						{t('collections.createCollection')}
					</button>}
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
								aria-label={t('collections.searchPlaceholder')}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{searchQuery && (
								<button
									className="collections-search-clear"
									onClick={clearSearch}
									aria-label={t('collections.clearSearch')}
								>
									<X size={16} />
								</button>
							)}
						</div>
						{allTags.length > 0 && (
							<div className="collections-tags-filter">
								<button
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
								aria-pressed={showPublicOnly}
 className={`collections-filter-btn ${showPublicOnly ? 'active' : ''}`}
								onClick={() => setShowPublicOnly(!showPublicOnly)}
								title={showPublicOnly ? t('collections.showAll') : t('collections.showPublicOnly')}
							>
								<Filter size={16} />
								<span>{showPublicOnly ? t('collections.public') : t('collections.all')}</span>
							</button>
							<select
								aria-label="Sắp xếp bộ sưu tập"
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

				{error && <CollectionLoadError message={error} busy={loading} onRetry={() => void fetchCollections()} />}
                {loading && <p className="collections-results-info" role="status">Đang tải bộ sưu tập…</p>}
                {collections.length === 0 && (loading || error || !hasLoaded) ? null : collections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>Chưa có bộ sưu tập</h2>
						<p>{canCreate ? t('collections.emptyHint') : 'Bộ sưu tập công khai sẽ xuất hiện tại đây khi quản trị viên đăng tải.'}</p>
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
							{filteredCollections.map((collection, index) => <CollectionCard key={collection._id} collection={collection} creatorFallback={user?.displayName || user?.username || ''} priority={index < 2} deleting={deletingId === collection._id} canManage={canCreate && (typeof collection.createdBy === 'object' ? collection.createdBy?._id : collection.createdBy) === user?._id} onEdit={() => setEditor(collection)} onDelete={() => setCollectionToDelete(collection._id)} />)}
						</div>
					</>
				)}
			</div>


   {editor && <Suspense fallback={<p role="status">Đang tải biểu mẫu…</p>}>
    <CollectionModal key={editor === 'create' ? 'create' : editor._id} isOpen onClose={() => setEditor(null)} collectionToEdit={editor === 'create' ? undefined : editor} onCollectionUpdate={handleCollectionUpdated} />
   </Suspense>}
   <CollectionDeleteDialog collectionId={collectionToDelete} onClose={() => setCollectionToDelete(null)} />
  </>
 );
}
