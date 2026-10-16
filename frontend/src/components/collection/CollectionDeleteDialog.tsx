import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCollectionsListStore } from '@/stores/useCollectionsListStore';
export function CollectionDeleteDialog({ collectionId, onClose }: { collectionId: string | null; onClose: () => void }) {
 const deletingId = useCollectionsListStore(state => state.deletingId);
 const deleteCollection = useCollectionsListStore(state => state.deleteCollection);
 const [error, setError] = useState<string | null>(null);
 const busy = deletingId !== null;
 return <Dialog.Root open={collectionId !== null} onOpenChange={open => { if (!open && !busy) { setError(null); onClose(); } }}>
  <Dialog.Portal><Dialog.Overlay className="collections-dialog-overlay" /><Dialog.Content className="collections-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
   <Dialog.Title>Xóa bộ sưu tập</Dialog.Title>
   <Dialog.Description>Chỉ xóa bộ sưu tập này; các ảnh gốc vẫn được giữ lại. Bạn có muốn tiếp tục?</Dialog.Description>
   {error && <p role="alert">{error}</p>}
   <div className="collections-dialog-actions">
    <Dialog.Close asChild><button className="collections-empty-btn" disabled={busy}>Hủy</button></Dialog.Close>
    <button className="collections-empty-btn" disabled={busy} onClick={async () => {
     if (!collectionId || busy) return;
     setError(null);
     if (await deleteCollection(collectionId)) onClose();
     else setError('Không thể xóa bộ sưu tập. Vui lòng thử lại.');
    }}>{busy ? 'Đang xóa…' : 'Xóa'}</button>
   </div>
  </Dialog.Content></Dialog.Portal>
 </Dialog.Root>;
}
