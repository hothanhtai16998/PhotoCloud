import { publicImageFilter } from '../../utils/publicImageFilter.js';
import { hasPermission } from './collectionHelpers.js';
import Collection from '../../models/Collection.js';
import { logger } from '../../utils/logger.js';
import { isValidObjectId } from '../../utils/inputUtils.js';
import mongoose from 'mongoose';

export const getUserCollections = async (req, res) => {
    try {
        const userId = req.user?._id;

        const browse = req.query.scope === 'browse';
        if (!userId && !browse) return res.status(401).json({ success: false, message: 'Đăng nhập để xem bộ sưu tập cá nhân.' });

        const loadCollections = async () => {
            // Use aggregation to get collections with sample images (2-3 per collection)
            return await Collection.aggregate([
            {
                $match: {
            $or: [
                        ...(browse ? [{ isPublic: true }] : []),
                        ...(userId ? [
                            { createdBy: new mongoose.Types.ObjectId(userId) },
                            { 'collaborators.user': new mongoose.Types.ObjectId(userId) },
                        ] : []),
            ],
                },
            },
            {
                $lookup: {
                    from: 'images', localField: 'images', foreignField: '_id',
                    pipeline: [{ $match: publicImageFilter() }, { $project: { _id: 1 } }], as: 'existingImages',
                },
            },
            {
                $addFields: {
                    validImageIds: {
                        $filter: {
                            input: { $ifNull: ['$images', []] }, as: 'imageId',
                            cond: { $in: ['$$imageId', '$existingImages._id'] },
                        },
                    },
                },
            },
            // The browse surface only publishes collections with visible surviving images.
            // Personal pickers still need empty collections so images can be added.
            ...(browse ? [{ $match: { 'validImageIds.0': { $exists: true } } }] : []),
            {
                $addFields: {
                    sampleImageIds: { $slice: ['$validImageIds', 0, 3] },
                    coverReference: {
                        $cond: [
                            { $in: ['$coverImage', '$validImageIds'] }, '$coverImage',
                            { $arrayElemAt: ['$validImageIds', 0] },
                        ],
                    },
                },
            },
            {
                $lookup: {
                    from: 'images',
                    localField: 'coverReference',
                    foreignField: '_id',
                    as: 'coverImageData',
                    pipeline: [
                        { $match: publicImageFilter() },
                        {
                            $project: {
                                _id: 1,
                                thumbnailUrl: 1,
                                smallUrl: 1,
                                imageUrl: 1,
                                imageTitle: 1,
                                width: 1,
                                height: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'images',
                    localField: 'sampleImageIds',
                    foreignField: '_id',
                    as: 'sampleImagesData',
                    pipeline: [
                        { $match: publicImageFilter() },
                        {
                            $project: {
                                _id: 1,
                                thumbnailUrl: 1,
                                smallUrl: 1,
                                imageUrl: 1,
                                imageTitle: 1,
                                width: 1,
                                height: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdByData',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                displayName: 1,
                                avatarUrl: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'collaborators.user',
                    foreignField: '_id',
                    as: 'collaboratorsData',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                displayName: 1,
                                avatarUrl: 1,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    isPublic: 1,
                    tags: 1,
                    views: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    coverImage: { $arrayElemAt: ['$coverImageData', 0] },
                    sampleImages: '$sampleImagesData', // First 3 images as samples
                    imageCount: { $size: '$validImageIds' },
                    createdBy: { $arrayElemAt: ['$createdByData', 0] },
                    collaborators: {
                        $map: {
                            input: '$collaborators',
                            as: 'collab',
                            in: {
                                user: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: '$collaboratorsData',
                                                as: 'user',
                                                cond: { $eq: ['$$user._id', '$$collab.user'] },
                                            },
                                        },
                                        0,
                                    ],
                                },
                                permission: '$$collab.permission',
                                invitedBy: '$$collab.invitedBy',
                                invitedAt: '$$collab.invitedAt',
                            },
                        },
                    },
                },
            },
            { $sort: { createdAt: -1 } },
            ]);
        };
        // Do not reuse list snapshots after image moderation changes.
        const collections = await loadCollections();

        res.json({
            success: true,
            collections: collections.map(collection => {
                if (userId && hasPermission(collection, userId, 'view')) return collection;
                const { collaborators: _collaborators, ...publicCollection } = collection;
                return publicCollection;
            }),
        });
    } catch (error) {
        logger.error('Error fetching user collections:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collections',
        });
    }
};

/**
 * Get a single collection by ID
 */
export const getCollectionById = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user?._id;

        if (!isValidObjectId(collectionId)) {
            return res.status(400).json({ success: false, message: 'Invalid collection ID' });
        }

        const collection = await Collection.findOne({
            _id: collectionId,
            ...(userId ? { $or: [
                { createdBy: userId }, // User's own collection
                { isPublic: true }, // Or public collection
                { 'collaborators.user': userId }, // Or user is a collaborator
            ] } : { isPublic: true }),
        })
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({ path: 'coverImage', select: 'thumbnailUrl smallUrl imageUrl imageTitle', match: publicImageFilter() })
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .populate({
                path: 'images',
                match: publicImageFilter(),
                select: 'thumbnailUrl smallUrl regularUrl imageUrl imageTitle location uploadedBy views downloads createdAt width height',
                populate: {
                    path: 'uploadedBy',
                    select: 'username displayName avatarUrl',
                },
            })
            .lean();

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        res.json({
            success: true,
            collection: {
                ...collection,
                ...(!userId || !hasPermission(collection, userId, 'view') ? { collaborators: [] } : {}),
                imageCount: collection.images ? collection.images.length : 0,
            },
        });
        // A statistics write must not delay content or turn a successful read into 500.
        if (collection.createdBy?._id?.toString() !== userId?.toString() && collection.isPublic) {
            try {
                await Collection.findByIdAndUpdate(collectionId, { $inc: { views: 1 } });
            } catch (error) {
                logger.error('Failed to record collection view:', error);
            }
        }
    } catch (error) {
        logger.error('Error fetching collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collection',
        });
    }
};
