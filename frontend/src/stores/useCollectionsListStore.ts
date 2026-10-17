import { create } from 'zustand';
import { collectionService } from '@/services/collectionService';
import { useAuthStore } from './useAuthStore';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { onLogout, onLoginSuccess } from '@/utils/authEvents';
import type { CollectionsListState } from '@/types/store';
const STALE_THRESHOLD = 5 * 60 * 1000;
let controller: AbortController | null = null;
let revision = 0;
let account = 0;
const initial = { collections: [], loading: false, deletingId: null, error: null, searchQuery: '', showPublicOnly: false, sortBy: 'newest' as const, selectedTag: null, hasLoaded: false, lastFetchedAt: null };
export const useCollectionsListStore = create<CollectionsListState>((set, get) => ({
 ...initial,
 fetchCollections: async () => {
  if (get().loading || !useAuthStore.getState().accessToken) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) { markCollectionsOffline(); return; }
  const request = new AbortController(); controller = request;
  const session = getAuthSessionVersion(); const currentRevision = revision;
  const valid = (): boolean => controller === request && session === getAuthSessionVersion();
  set({ loading: true, error: null });
  try {
   const data = await collectionService.getUserCollections(request.signal, 'browse');
   if (valid() && currentRevision === revision) set({ collections: data, hasLoaded: true, lastFetchedAt: Date.now() });
  } catch {
   if (valid()) set({ error: 'Không thể tải danh sách bộ sưu tập. Kiểm tra kết nối rồi thử lại.' });
  } finally {
   if (valid()) { controller = null; set({ loading: false }); }
  }
 },
 deleteCollection: async id => {
  if (get().deletingId) return false;
  const session = getAuthSessionVersion(); const owner = account; set({ deletingId: id });
  // Reads started before a mutation must not restore deleted items.
  revision++; controller?.abort(); controller = null; set({ loading: false });
  try {
   await collectionService.deleteCollection(id);
   if (session !== getAuthSessionVersion() || owner !== account) return false;
   set(state => ({ collections: state.collections.filter(c => c._id !== id) })); return true;
  } catch { return false; }
  finally { if (session === getAuthSessionVersion() && owner === account) set({ deletingId: null }); }
 },
 setSearchQuery: searchQuery => set({ searchQuery }),
 setShowPublicOnly: showPublicOnly => set({ showPublicOnly }),
 setSortBy: sortBy => set({ sortBy }),
 setSelectedTag: selectedTag => set({ selectedTag }),
 clearFilters: () => set({ searchQuery: '', showPublicOnly: false, selectedTag: null }),
 refreshCollections: async () => {
  revision++; controller?.abort(); controller = null; set({ loading: false }); await get().fetchCollections();
 },
 checkAndRefreshIfStale: async () => {
  if (get().hasLoaded && Date.now() - (get().lastFetchedAt ?? 0) > STALE_THRESHOLD) await get().fetchCollections();
 },
 addCollection: collection => {
  revision++;
  set(state => ({ collections: [collection, ...state.collections.filter(c => c._id !== collection._id)] }));
 },
}));
const reset = (): void => { account++; revision++; controller?.abort(); controller = null; useCollectionsListStore.setState(initial); };
onLogout(reset); onLoginSuccess(reset);
if (typeof window !== 'undefined') {
 window.addEventListener('collectionCreated', ((event: CustomEvent<{ collection: import('@/types/collection').Collection }>) => {
  const collection = event.detail?.collection;
  if (collection?._id && useAuthStore.getState().accessToken) useCollectionsListStore.getState().addCollection(collection);
 }) as EventListener);
}

export function markCollectionsOffline(): void {
	revision++; controller?.abort(); controller = null;
	useCollectionsListStore.setState({ loading: false, error: 'Bạn đang ngoại tuyến. Kết nối mạng rồi bấm Thử lại.' });
}

// Called when the browser comes back online. Clears the offline error so the
// banner disappears, but does NOT auto-fetch: keep the cached list visible and
// let the user press Thử lại to avoid a stale write racing with a mutation.
export function clearCollectionsOfflineError(): void {
	const { error } = useCollectionsListStore.getState();
	if (!error) return;
	useCollectionsListStore.setState({ error: null });
}
