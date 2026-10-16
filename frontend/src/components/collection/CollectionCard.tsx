import { Link } from 'react-router-dom';
import { Folder, Edit2, Trash2, Lock } from 'lucide-react';
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
 const cover = collection.coverImage && typeof collection.coverImage === 'object' ? collection.coverImage : null;
 const samples = (collection.sampleImages ?? []).filter(image => image && typeof image === 'object' && image._id !== cover?._id).slice(0, 2);
 const creator = typeof collection.createdBy === 'object' && collection.createdBy ? collection.createdBy.displayName || collection.createdBy.username : creatorFallback;
 const count = Number.isFinite(collection.imageCount) ? Math.max(0, collection.imageCount ?? 0) : 0;
 return <article className="collection-card">
  <Link className="collection-card-link" to={`/collections/${collection._id}`} aria-label={collection.name}>
   <div className="collection-card-cover">
    <div className={`collection-card-images ${samples.length < 2 ? 'no-thumbnails' : ''}`}>
     <div className="collection-card-main-image">{cover ? <BlurUpImage image={cover} priority={priority} minimal /> : <div className="collection-card-placeholder"><Folder size={48} aria-hidden="true" /></div>}</div>
     {samples.length >= 2 && <div className="collection-card-thumbnails">{samples.map(image => <div key={image._id} className="collection-card-thumbnail"><BlurUpImage image={image} priority={false} minimal /></div>)}</div>}
    </div>
   </div>
   <div className="collection-card-info">
    <h2 className="collection-card-title">{collection.name}{!collection.isPublic && <Lock size={14} aria-label="Riêng tư" />}</h2>
    <p className="collection-card-meta">{count} {count === 1 ? t('collections.image') : t('collections.images')} · {t('collections.curatedBy', { name: creator })}</p>
   </div>
  </Link>
  {canManage && <div className="collection-card-actions">
   <button className="collection-card-action-btn" onClick={onEdit} aria-label={`${t('collections.editCollection')}: ${collection.name}`} title={t('collections.editCollection')}><Edit2 size={18} /></button>
   <button className="collection-card-action-btn action-danger" onClick={onDelete} disabled={deleting} aria-label={`${t('common.delete')}: ${collection.name}`} title={t('common.delete')}><Trash2 size={18} /></button>
  </div>}
 </article>;
}
