import { Link } from 'react-router-dom';
import { Folder, Edit2, Trash2, Lock, Image as ImageIcon } from 'lucide-react';
import { BlurUpImage } from '@/components/NoFlashGrid/components/BlurUpImage';
import type { Collection } from '@/types/collection';
import { t } from '@/i18n';

interface Props {
	collection: Collection;
	creatorFallback: string;
	priority?: boolean;
	deleting?: boolean;
	canManage?: boolean;
	onEdit: () => void;
	onDelete: () => void;
}

export function CollectionCard({ collection, creatorFallback, priority = false, deleting, canManage = false, onEdit, onDelete }: Props) {
	const cover = collection.coverImage && typeof collection.coverImage === 'object'
		? collection.coverImage : collection.sampleImages?.find(image => image && typeof image === 'object') ?? null;
	const samples = (collection.sampleImages ?? []).filter(image => image && typeof image === 'object' && image._id !== cover?._id).slice(0, 2);
	const creator = typeof collection.createdBy === 'object' && collection.createdBy ? collection.createdBy.displayName || collection.createdBy.username : creatorFallback;
	const count = Number.isFinite(collection.imageCount) ? Math.max(0, collection.imageCount ?? 0) : 0;
	const countLabel = `${count} ${count === 1 ? t('collections.image') : t('collections.images')}`;

	return (
		<article className="collection-card">
			<Link className="collection-card-link" to={`/collections/${collection._id}`} aria-label={collection.name}>
				<div className="collection-card-cover">
					<div className={`collection-card-images ${samples.length < 2 ? 'no-thumbnails' : ''}`}>
						<div className="collection-card-main-image">
							{cover ? (
								<BlurUpImage image={cover} priority={priority} previewSize="small" minimal />
							) : (
								<div className="collection-card-placeholder" aria-hidden="true">
									<Folder size={48} />
								</div>
							)}
						</div>
						{samples.length >= 2 && (
							<div className="collection-card-thumbnails">
								{samples.map(image => (
									<div key={image._id} className="collection-card-thumbnail">
										<BlurUpImage image={image} priority={priority} previewSize="thumbnail" minimal />
									</div>
								))}
							</div>
						)}
					</div>
					<div className="collection-card-badges">
						<span className="collection-card-count-badge">
							<ImageIcon size={12} aria-hidden="true" />
							{countLabel}
						</span>
						{!collection.isPublic && (
							<span className="collection-card-lock-badge" aria-label={t('collections.privateBadge')}>
								<Lock size={13} aria-hidden="true" />
							</span>
						)}
					</div>
				</div>
				<div className="collection-card-info">
					<h2 className="collection-card-title">{collection.name}</h2>
					<p className="collection-card-meta">{t('collections.curatedBy', { name: creator })}</p>
				</div>
			</Link>
			{canManage && (
				<div className="collection-card-actions">
					<button
						className="collection-card-action-btn"
						onClick={onEdit}
						aria-label={`${t('collections.editCollection')}: ${collection.name}`}
						title={t('collections.editCollection')}
					>
						<Edit2 size={16} />
					</button>
					<button
						className="collection-card-action-btn action-danger"
						onClick={onDelete}
						disabled={deleting}
						aria-label={`${t('common.delete')}: ${collection.name}`}
						title={t('common.delete')}
					>
						<Trash2 size={16} />
					</button>
				</div>
			)}
		</article>
	);
}
