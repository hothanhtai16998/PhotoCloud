import { useEffect, useMemo } from 'react';
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

  // Load collection on mount
  useEffect(() => {
    if (!collectionId) {
      navigate('/collections');
      return;
    }

    const loadCollection = async () => {
      try {
        await fetchCollection(collectionId);
      } catch {
        // Error already handled in store
        navigate('/collections');
      }
    };

    loadCollection();

    // Cleanup on unmount
    return () => {
      clearCollection();
    };
  }, [collectionId, navigate, fetchCollection, clearCollection]);

  // Check if user owns the collection
  const isOwner = useMemo(() => {
    if (!collection || !user) return false;
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
    return isOwner || userPermission === 'admin' || userPermission === 'edit';
  }, [isOwner, userPermission]);

  // Get current cover image ID
  const coverImageId = useMemo(() => {
    if (!collection?.coverImage) return null;
    return typeof collection.coverImage === 'object'
      ? collection.coverImage._id
      : collection.coverImage;
  }, [collection]);

  return {
    collectionId,
    collection,
    loading,
    user,
    isOwner,
    userPermission,
    canEdit,
    coverImageId,
  };
};

