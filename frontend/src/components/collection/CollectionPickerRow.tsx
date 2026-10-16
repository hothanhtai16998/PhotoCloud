import { Check, Folder, Minus, Plus } from 'lucide-react';
import type { Collection } from '@/types/collection';
import { t } from '@/i18n';
export function CollectionPickerRow({ collection, selected, onToggle }: { collection: Collection; selected: boolean; onToggle: (id: string, selected: boolean) => void }) {
 const cover = typeof collection.coverImage === 'object' ? collection.coverImage : null;
 return <button className={`collection-modal-item ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onToggle(collection._id, selected)}>
  <div className="collection-modal-item-info">
   {cover ? <img src={cover.thumbnailUrl || cover.smallUrl || cover.imageUrl} alt="" className="collection-modal-item-cover" /> : <div className="collection-modal-item-placeholder"><Folder size={20} /></div>}
   <div className="collection-modal-item-details"><h3>{collection.name}</h3><p className="collection-modal-item-count">{collection.imageCount || 0} {t(collection.imageCount === 1 ? 'collections.image' : 'collections.images')}</p></div>
  </div>
  <div className="collection-modal-item-action">{selected ? <><Check size={18} className="collection-modal-item-check collection-modal-item-check-visible" /><Minus size={18} className="collection-modal-item-remove collection-modal-item-remove-hover" /></> : <Plus size={18} className="collection-modal-item-add collection-modal-item-add-hover" />}</div>
 </button>;
}
