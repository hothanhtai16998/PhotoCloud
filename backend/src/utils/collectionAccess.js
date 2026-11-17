/**
 * Helper function to safely extract user ID from collaborator user field
 * Handles both ObjectId and populated user objects
 */
export const getUserId = (userField) => {
    if (!userField) return null;
    // If it's a populated object, extract _id
    if (typeof userField === 'object' && userField._id) {
        return userField._id.toString();
    }
    // If it's an ObjectId, convert to string
    return userField.toString();
};

/**
 * Helper function to check if user has permission on collection
 */
export const hasPermission = (collection, userId, requiredPermission) => {
    // Owner has all permissions
    const ownerId = getUserId(collection.createdBy);
    if (ownerId === userId.toString()) {
        return true;
    }

    // Check collaborator permissions
    const collaborator = collection.collaborators?.find(
        collab => getUserId(collab.user) === userId.toString()
    );

    if (!collaborator) {
        return false;
    }

    // Permission hierarchy: view < edit < admin
    const permissionLevels = { view: 1, edit: 2, admin: 3 };
    const userLevel = permissionLevels[collaborator.permission] || 0;
    const requiredLevel = permissionLevels[requiredPermission] || 0;

    return userLevel >= requiredLevel;
};


/** Compare access grants, ignoring population, array order and invitation display metadata. */
export const sameCollaboratorGrants = (current = [], snapshot = []) => {
    const grants = entries => entries.map(entry => [getUserId(entry.user), entry.permission || 'view'])
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify(grants(current)) === JSON.stringify(grants(snapshot));
};

/** Return unique collection members to notify, excluding the actor. */
export const getCollectionMemberIds = (collection, excludedUserId, { includeOwner = true } = {}) => {
    const excluded = String(excludedUserId);
    const ids = new Set();
    if (includeOwner) {
        const ownerId = getUserId(collection.createdBy);
        if (ownerId && ownerId !== excluded) ids.add(ownerId);
    }
    for (const collaborator of collection.collaborators || []) {
        const memberId = getUserId(collaborator.user);
        if (memberId && memberId !== excluded) ids.add(memberId);
    }
    return [...ids];
};
