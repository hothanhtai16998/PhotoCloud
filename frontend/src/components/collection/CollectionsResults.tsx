import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Search, Compass } from 'lucide-react';
import { useCollectionsListStore } from '@/stores/useCollectionsListStore';
import { useUserStore } from '@/stores/useUserStore';
import { filterCollections } from '@/utils/collectionList';
import { t } from '@/i18n';
import type { Collection } from '@/types/collection';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { CollectionLoadError } from '@/components/collection/CollectionLoadError';
import { CollectionsGridSkeleton } from '@/components/collection/CollectionsGridSkeleton';

interface Props {
  collections: Collection[];
  onEdit: (collection: Collection) => void;
  onDelete: (id: string) => void;
}

export default function CollectionsResults({ collections: browseCollections, onEdit, onDelete }: Props) {
  const { error, loading, deletingId, searchQuery, showPublicOnly, sortBy, selectedTag, hasLoaded, fetchCollections, clearFilters } = useCollectionsListStore();
  const user = useUserStore(state => state.user);
  const canCreate = !!(user?.isAdmin || user?.isSuperAdmin);
  const navigate = useNavigate();
  const filteredCollections = useMemo(() => filterCollections(browseCollections, { searchQuery, showPublicOnly, sortBy, selectedTag }), [browseCollections, searchQuery, showPublicOnly, sortBy, selectedTag]);
  const isInitialLoad = !hasLoaded && !error;
  const isEmptyState = hasLoaded && !loading && !error && browseCollections.length === 0;
  const isNoMatch = hasLoaded && !loading && !error && browseCollections.length > 0 && filteredCollections.length === 0;
  const showGrid = filteredCollections.length > 0;
  return <>
    <div className="collections-result-summary" aria-live="polite">{hasLoaded ? t(filteredCollections.length === 1 ? 'collections.totalCountOne' : 'collections.totalCount', { count: filteredCollections.length }) : ''}</div>
	{error && (
		<CollectionLoadError message={error} busy={loading} onRetry={() => void fetchCollections()} />
	)}

	{isInitialLoad && <CollectionsGridSkeleton count={6} />}
	{loading && hasLoaded && <p role="status">Đang cập nhật bộ sưu tập…</p>}

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
					onClick={() => navigate('/explore')}
				>
					<Compass size={16} aria-hidden="true" />
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
					onEdit={() => onEdit(collection)}
					onDelete={() => onDelete(collection._id)}
				/>
			))}
		</div>
	)}
  </>;
}
