import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';
import { useCollectionStore } from '@/stores/useCollectionStore';

export const useCollectionDetail = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const {
    collection,
    loading,
    fetchCollection,
    clearCollection,
  } = useCollectionStore();
  const scope = `${collectionId ?? ''}:${user?._id ?? 'guest'}`;
  const [activeScope, setActiveScope] = useState<string | null>(null);
  const currentCollection = activeScope === scope && collection?._id === collectionId ? collection : null;

  // Data and pending requests belong to this route and account, not the next visit.
  useEffect(() => {
    if (!collectionId) {
      navigate('/collections');
      return;
    }
    clearCollection();
    let active = true;

    const loadCollection = async () => {
      try {
        await fetchCollection(collectionId);
      } catch {
        // Error already handled in store
        // Keep this URL and let the page show its error with retry.
      } finally {
        if (active) setActiveScope(scope);
      }
    };

    loadCollection();
    return () => { active = false; clearCollection(); };
  }, [collectionId, scope, navigate, fetchCollection, clearCollection]);

  // Check if user owns the collection
  const isOwner = useMemo(() => {
    if (!collection || !user || !(user.isAdmin || user.isSuperAdmin)) return false;
    const createdBy = typeof collection.createdBy === 'object'
      ? collection.createdBy._id
      : collection.createdBy;
    return createdBy === user._id;
  }, [collection, user]);

  // Get user's permission level (owner, admin, edit, view, or null)
  const userPermission = useMemo(() => {
    if (!collection || !user) return undefined;
    if (isOwner) return 'admin' as const; // Owner has admin permissions

    const collaborator = collection.collaborators?.find(
      collab => typeof collab.user === 'object' && collab.user._id === user._id
    );

    return collaborator?.permission;
  }, [collection, user, isOwner]);

  // Check if user can edit (owner, admin, or edit permission)
  const canEdit = useMemo(() => {
    return Boolean(user && (user.isAdmin || user.isSuperAdmin) && (isOwner || userPermission === 'admin' || userPermission === 'edit'));
  }, [user, isOwner, userPermission]);

  // Get current cover image ID
  const coverImageId = useMemo(() => {
    if (!collection?.coverImage) return null;
    return typeof collection.coverImage === 'object'
      ? collection.coverImage._id
      : collection.coverImage;
  }, [collection]);

  return {
    collectionId,
    collection: currentCollection,
    loading: loading || activeScope !== scope,
    user,
    isOwner,
    userPermission,
    canEdit,
    coverImageId,
  };
};

