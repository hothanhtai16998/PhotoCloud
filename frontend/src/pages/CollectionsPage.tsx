import { useEffect, useState, useMemo, lazy, Suspense } from 'react';

import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useCollectionsListStore, markCollectionsOffline } from '@/stores/useCollectionsListStore';
import { useCollectionConnection } from '@/hooks/useCollectionConnection';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { t } from '@/i18n';
import type { Collection } from '@/types/collection';

import { CollectionDeleteDialog } from '@/components/collection/CollectionDeleteDialog';
import { CollectionsGridSkeleton } from '@/components/collection/CollectionsGridSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import './CollectionsPage.css';
import '../components/collection/CollectionsToolbar.css';
import { CollectionsToolbar } from '@/components/collection/CollectionsToolbar';

const CollectionsResults = lazy(() => import('@/components/collection/CollectionsResults'));
const CollectionModal = lazy(() => import('@/components/collection/CollectionModal'));

export default function CollectionsPage() {
  // Startup shell (static toolbar) chỉ là nơi giữ layout trước khi React mount.
  // Xoá nó bằng useEffect (sau paint) để nội dung React đã kịp commit trước khi
  // biến mất — tránh khoảng thời gian #root rỗng khiến trang bị cắt/cụt.
  useEffect(() => {
    const shell = document.getElementById('public-collections-startup');
    if (!shell) return;
    const frame = requestAnimationFrame(() => shell.remove());
    return () => cancelAnimationFrame(frame);
  }, []);
	const { accessToken, isInitializing } = useAuthStore();
	const { user } = useUserStore();

	const {
		collections,
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
		refreshCollections,
		checkAndRefreshIfStale,
	} = useCollectionsListStore();

	const canCreate = !!(user?.isAdmin || user?.isSuperAdmin);

	// Tab title + meta. Sở hữu tại page-level hook — useSiteSettings không được ghi đè.
	useDocumentMeta({
		title: t('collections.title'),
		description: user ? undefined : t('collections.subtitleViewer'),
	});


	const [editor, setEditor] = useState<Collection | 'create' | null>(null);
	const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
	useCollectionConnection(markCollectionsOffline, fetchCollections, Boolean(editor || collectionToDelete || deletingId));
	const browseCollections = useMemo(() => collections.filter(collection => (collection.imageCount ?? 0) > 0), [collections]);


	useEffect(() => {
		if (isInitializing) return;

		if (!hasLoaded) {
			void fetchCollections();
		} else {
			void checkAndRefreshIfStale();
		}

		const interval = setInterval(() => {
			void checkAndRefreshIfStale();
		}, 2 * 60 * 1000);

		return () => clearInterval(interval);
	}, [accessToken, isInitializing, hasLoaded, fetchCollections, checkAndRefreshIfStale]);

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		browseCollections.forEach(collection => {
			if (collection.tags && Array.isArray(collection.tags)) {
				collection.tags.forEach(tag => tagSet.add(tag));
			}
		});
		return Array.from(tagSet).sort();
	}, [browseCollections]);

	const handleCollectionUpdated = () => {
		void refreshCollections();
	};

	const totalLabel = browseCollections.length === 1
		? t('collections.totalCountOne', { count: browseCollections.length })
		: t('collections.totalCount', { count: browseCollections.length });

	return (
		<>
			<div className="collections-page" data-loading-scope="local">
				<div className="collections-page-shell">
                    <CollectionsToolbar
                        labels={{title: t('collections.title'), subtitleViewer: t('collections.subtitleViewer'), createCollection: t('collections.createCollection'), searchPlaceholder: t('collections.searchPlaceholder'), clearSearch: t('collections.clearSearch'), allTags: t('collections.allTags'), all: t('collections.all'), filterBy: t('collections.filterBy'), showAll: t('collections.showAll'), showPublicOnly: t('collections.showPublicOnly'), public: t('collections.public'), sortAriaLabel: t('collections.sortAriaLabel'), sortNewest: t('collections.sortNewest'), sortOldest: t('collections.sortOldest'), sortName: t('collections.sortName'), sortImages: t('collections.sortImages')}}
                        totalLabel={hasLoaded && browseCollections.length > 0 ? totalLabel : ''}
                        canCreate={canCreate} isInitializing={isInitializing} allTags={allTags}
                        searchQuery={searchQuery} selectedTag={selectedTag} showPublicOnly={showPublicOnly} sortBy={sortBy}
                        onCreate={() => setEditor('create')} onSearchChange={setSearchQuery}
                        onTagChange={setSelectedTag} onPublicChange={setShowPublicOnly} onSortChange={setSortBy}
                    />

                    <section aria-label="Danh sách bộ sưu tập">
                        <ErrorBoundary fallback={
                            <div role="alert">
                                <p>Không thể mở danh sách bộ sưu tập. Vui lòng tải lại trang.</p>
                                <button type="button" className="collections-empty-btn" onClick={() => window.location.reload()}>Tải lại trang</button>
                            </div>
                        }>
                            <Suspense fallback={<CollectionsGridSkeleton count={6} />}>
                                <CollectionsResults collections={browseCollections} onEdit={setEditor} onDelete={setCollectionToDelete} />
                            </Suspense>
                        </ErrorBoundary>
                    </section>
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
