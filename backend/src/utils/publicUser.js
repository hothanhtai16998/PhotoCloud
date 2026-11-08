// Public profile response; intentionally excludes private account fields.
export function publicUser(user) {
    return {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        instagram: user.instagram || '',
        twitter: user.twitter || '',
        facebook: user.facebook || '',
        createdAt: user.createdAt,
        pinnedImages: user.pinnedImages || [],
    };
}
