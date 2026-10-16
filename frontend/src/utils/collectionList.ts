import type { Collection } from '@/types/collection';
import type { CollectionsListState } from '@/types/store';
type Filters = Pick<CollectionsListState, 'searchQuery' | 'selectedTag' | 'showPublicOnly' | 'sortBy'>;
const timestamp = (value: string): number => Date.parse(value) || 0;
export function filterCollections(collections: Collection[], filters: Filters): Collection[] {
 const query = filters.searchQuery.trim().toLocaleLowerCase();
 const selectedTag = filters.selectedTag;
 return collections.filter(collection => {
  if (filters.showPublicOnly && !collection.isPublic) return false;
  if (selectedTag && !collection.tags?.includes(selectedTag)) return false;
  return !query || [collection.name, collection.description, ...(collection.tags ?? [])]
   .some(value => value?.toLocaleLowerCase().includes(query));
 }).sort((a, b) => {
  switch (filters.sortBy) {
   case 'newest': return timestamp(b.createdAt) - timestamp(a.createdAt);
   case 'oldest': return timestamp(a.createdAt) - timestamp(b.createdAt);
   case 'name': return a.name.localeCompare(b.name, 'vi');
   case 'images': return (b.imageCount || 0) - (a.imageCount || 0);
  }
 });
}
