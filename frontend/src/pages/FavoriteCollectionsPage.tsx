import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { collectionFavoriteService } from '@/services/collectionFavoriteService';
import Header from '@/components/Header';
import { Folder, Heart } from 'lucide-react';
import type { Collection } from '@/types/collection';
import ProgressiveImage from '@/components/ProgressiveImage';
import { toast } from 'sonner';
import { t } from '@/i18n';
import './FavoriteCollectionsPage.css';

export default function FavoriteCollectionsPage() {
	const { accessToken } = useAuthStore();
	const { user } = useUserStore();
	const navigate = useNavigate();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [pagination, setPagination] = useState<{
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	const fetchFavoriteCollections = useCallback(async (page = 1) => {
		if (!accessToken || !user?._id) {
			navigate('/signin');
			return;
		}

		try {
			setLoading(true);
			const response = await collectionFavoriteService.getFavoriteCollections({
				page,
				limit: 20,
			});
			setCollections(response.collections || []);
			setPagination(response.pagination || null);
			setCurrentPage(page);
		} catch (error) {
			console.error('Failed to fetch favorite collections:', error);
			toast.error(t('favorites.loadFailed'));
		} finally {
			setLoading(false);
		}
	}, [accessToken, user, navigate]);

	useEffect(() => {
		// ProtectedRoute ensures user is authenticated
		fetchFavoriteCollections(1);
	}, [fetchFavoriteCollections]);

	const handleCollectionClick = (collection: Collection) => {
		navigate(`/collections/${collection._id}`);
	};

	if (loading) {
		return (
			<>
				<Header />
				<div className="favorite-collections-page">
				<div className="favorite-collections-loading">
					<div className="loading-spinner" />
					<p>{t('favorites.loadingFavoriteCollections')}</p>
				</div>
				</div>
			</>
		);
	}

	return (
		<>
			<Header />
			<div className="favorite-collections-page">
				<div className="favorite-collections-header">
					<h1>
						<Heart size={28} fill="currentColor" />
						{t('favorites.favoriteCollections')}
					</h1>
					{pagination && (
						<p className="favorite-collections-count">
							{t('favorites.favoriteCollectionsCount', { count: pagination.total })}
						</p>
					)}
				</div>

				{collections.length === 0 ? (
					<div className="favorite-collections-empty">
						<Folder size={64} />
						<h2>{t('favorites.noFavoriteCollections')}</h2>
						<p>{t('favorites.favoriteCollectionsHint')}</p>
						<button
							className="favorite-collections-empty-btn"
							onClick={() => navigate('/collections')}
						>
							{t('favorites.exploreCollections')}
						</button>
					</div>
				) : (
					<>
						<div className="favorite-collections-grid">
							{collections.map((collection) => {
								const coverImage =
									collection.coverImage &&
									typeof collection.coverImage === 'object'
										? collection.coverImage
										: null;

								return (
									<div
										key={collection._id}
										className="favorite-collection-card"
										onClick={() => handleCollectionClick(collection)}
									>
										<div className="favorite-collection-card-cover">
											{coverImage ? (
												<ProgressiveImage
													src={coverImage.imageUrl}
													thumbnailUrl={coverImage.thumbnailUrl}
													smallUrl={coverImage.smallUrl}
													regularUrl={coverImage.regularUrl}
													alt={collection.name}
												/>
											) : (
												<div className="favorite-collection-card-placeholder">
													<Folder size={48} />
												</div>
											)}
										</div>
										<div className="favorite-collection-card-info">
											<h3>{collection.name}</h3>
											{collection.description && (
												<p className="favorite-collection-card-description">
													{collection.description}
												</p>
											)}
											<div className="favorite-collection-card-meta">
												<span className="favorite-collection-card-count">
													{t('collections.imageCount', { count: collection.imageCount || 0 })}
												</span>
												{typeof collection.createdBy === 'object' &&
													collection.createdBy && (
														<span className="favorite-collection-card-author">
															{t('favorites.by')} {collection.createdBy.displayName || collection.createdBy.username}
														</span>
													)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{pagination && pagination.pages > 1 && (
							<div className="favorite-collections-pagination">
								<button
									className="pagination-btn"
									onClick={() => fetchFavoriteCollections(currentPage - 1)}
									disabled={currentPage === 1}
								>
									← {t('pagination.previous')}
								</button>
								<span className="pagination-info">
									{t('pagination.page', { current: currentPage, total: pagination.pages })}
								</span>
								<button
									className="pagination-btn"
									onClick={() => fetchFavoriteCollections(currentPage + 1)}
									disabled={currentPage === pagination.pages}
								>
									{t('pagination.next')} →
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</>
	);
}

