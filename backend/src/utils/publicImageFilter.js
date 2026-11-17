// Preserve visibility of legacy records without a moderation status.
export const publicImageFilter = () => ({
    $or: [
        { moderationStatus: 'approved' },
        { moderationStatus: { $exists: false } },
        { moderationStatus: null },
    ],
});
