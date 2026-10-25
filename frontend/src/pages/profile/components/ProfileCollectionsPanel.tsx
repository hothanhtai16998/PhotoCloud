import { useNavigate } from 'react-router-dom';
import { Folder, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BlurUpImage } from '@/components/NoFlashGrid/components/BlurUpImage';
import { DataLoading } from '@/components/user/DataLoading';
import type { Collection } from '@/types/collection';
import type { Image } from '@/types/image';
import { uiConfig } from '@/config/uiConfig';
import { t } from '@/i18n';

interface Props {
  collections: Collection[];
  collectionsLoading: boolean;
  isOwnProfile: boolean;
  creatorFallback: string;
}
export function ProfileCollectionsPanel({ collections, collectionsLoading, isOwnProfile, creatorFallback }: Props) {
  const navigate = useNavigate();
  return <>
    {collectionsLoading && collections.length > 0 && <DataLoading size="inline" message="Đang cập nhật bộ sưu tập" />}
                            {collectionsLoading && collections.length === 0 ? (
                                <div className="collections-grid" aria-label={t('profile.loadingCollections')} aria-live="polite">
                                    {Array.from({ length: uiConfig.skeleton.collectionGridCount }).map((_, index) => (
                                        <div key={`skeleton-${index}`} className="collection-card">
                                            <Skeleton className="w-full h-48 rounded-lg mb-3" />
                                            <Skeleton className="w-3/4 h-4 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : collections.length === 0 ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>{t('profile.noCollections')}</p>
                                    {isOwnProfile && (
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/collections')}
                                            className="mt-4"
                                        >
                                            {t('collections.createCollection') || 'Create Collection'}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="collections-grid">
                                    {collections.map((collection) => {
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
                                            : creatorFallback;

                                        return (
                                            <div
                                                key={collection._id}
                                                className="collection-card"
                                                onClick={() => navigate(`/collections/${collection._id}`)}
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
                            )}
  </>;
}
