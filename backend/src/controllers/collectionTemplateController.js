import { asyncHandler } from '../middlewares/asyncHandler.js';
import mongoose from 'mongoose';
import CollectionTemplate from '../models/CollectionTemplate.js';
import Collection from '../models/Collection.js';
import { logger } from '../utils/logger.js';

/**
 * Get all templates (system + user's own)
 */
export const getTemplates = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { category } = req.query;

    const query = {
        $or: [
            { isSystemTemplate: true },
            { createdBy: userId },
        ],
    };

    if (category) {
        query.category = category;
    }

    const templates = await CollectionTemplate.find(query)
        .populate('createdBy', 'username displayName avatarUrl')
        .sort({ isSystemTemplate: -1, usageCount: -1, createdAt: -1 })
        .lean();

    res.json({
        success: true,
        templates,
    });
});

/**
 * Get a single template by ID
 */
export const getTemplateById = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await CollectionTemplate.findOne({
        _id: templateId,
        $or: [
            { isSystemTemplate: true },
            { createdBy: userId },
        ],
    })
        .populate('createdBy', 'username displayName avatarUrl')
        .lean();

    if (!template) {
        return res.status(404).json({
            success: false,
            message: 'Template not found',
        });
    }

    res.json({
        success: true,
        template,
    });
});

/**
 * Create a new template
 */
export const createTemplate = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { name, description, templateName, category, defaultTags, defaultIsPublic, iconUrl } = req.body;

    if (!name || String(name || '').trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Template name is required',
        });
    }

    if (!templateName || String(templateName || '').trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Template display name is required',
        });
    }

    // Process tags
    let processedTags = [];
    if (Array.isArray(defaultTags)) {
        processedTags = defaultTags
            .map(tag => String(tag || '').trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .slice(0, 10);
    }

    const template = new CollectionTemplate({
        name: String(name || '').trim(),
        description: String(description || '').trim() || '',
        templateName: String(templateName || '').trim(),
        category: category || 'other',
        defaultTags: processedTags,
        defaultIsPublic: defaultIsPublic !== undefined ? defaultIsPublic : true,
        createdBy: userId,
        isSystemTemplate: false,
        iconUrl: String(iconUrl || '').trim() || undefined,
    });

    await template.save();

    const populatedTemplate = await CollectionTemplate.findById(template._id)
        .populate('createdBy', 'username displayName avatarUrl')
        .lean();

    res.status(201).json({
        success: true,
        template: populatedTemplate,
    });
});

/**
 * Create a collection from a template
 */
export const createCollectionFromTemplate = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { templateId } = req.params;
    const { name, description, isPublic, tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    // Get template
    const template = await CollectionTemplate.findOne({
        _id: templateId,
        $or: [
            { isSystemTemplate: true },
            { createdBy: userId },
        ],
    });

    if (!template) {
        return res.status(404).json({
            success: false,
            message: 'Template not found',
        });
    }

    // Use template defaults, but allow overrides
    const collectionName = String(name || '').trim() || template.templateName;
    const collectionDescription = String(description || '').trim() || template.description || '';
    const collectionIsPublic = isPublic !== undefined ? isPublic : template.defaultIsPublic;

    // Merge template tags with provided tags
    const templateTags = template.defaultTags || [];
    const providedTags = Array.isArray(tags)
        ? tags.map(tag => String(tag || '').trim().toLowerCase()).filter(tag => tag.length > 0)
        : [];
    const mergedTags = [...new Set([...templateTags, ...providedTags])].slice(0, 10);

    // Create collection
    const collection = new Collection({
        name: collectionName,
        description: collectionDescription,
        createdBy: userId,
        images: [],
        isPublic: collectionIsPublic,
        tags: mergedTags,
    });

    await collection.save();

    // Increment template usage count
    await CollectionTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: 1 },
    });

    // Create version for new collection
    const { createCollectionVersion } = await import('../utils/collectionVersionHelper.js');
    await createCollectionVersion(
        collection._id,
        userId,
        'created',
        { description: `Collection created from template: ${template.templateName}` }
    );

    const populatedCollection = await Collection.findById(collection._id)
        .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
        .lean();

    res.status(201).json({
        success: true,
        collection: {
            ...populatedCollection,
            imageCount: 0,
        },
    });
});

/**
 * Update a template (only user's own templates)
 */
export const updateTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.user._id;
    const { name, description, templateName, category, defaultTags, defaultIsPublic, iconUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await CollectionTemplate.findOne({
        _id: templateId,
        createdBy: userId,
        isSystemTemplate: false, // Can't update system templates
    });

    if (!template) {
        return res.status(404).json({
            success: false,
            message: 'Template not found or you do not have permission to update it',
        });
    }

    // Update fields
    if (name !== undefined) template.name = String(name || '').trim();
    if (description !== undefined) template.description = String(description || '').trim() || '';
    if (templateName !== undefined) template.templateName = String(templateName || '').trim();
    if (category !== undefined) template.category = category;
    if (defaultIsPublic !== undefined) template.defaultIsPublic = defaultIsPublic;
    if (iconUrl !== undefined) template.iconUrl = String(iconUrl || '').trim() || undefined;

    // Process tags
    if (defaultTags !== undefined) {
        template.defaultTags = Array.isArray(defaultTags)
            ? defaultTags
                .map(tag => String(tag || '').trim().toLowerCase())
                .filter(tag => tag.length > 0)
                .slice(0, 10)
            : [];
    }

    await template.save();

    const populatedTemplate = await CollectionTemplate.findById(template._id)
        .populate('createdBy', 'username displayName avatarUrl')
        .lean();

    res.json({
        success: true,
        template: populatedTemplate,
    });
});

/**
 * Delete a template (only user's own templates)
 */
export const deleteTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ success: false, message: 'Invalid template ID' });
    }

    const template = await CollectionTemplate.findOneAndDelete({
        _id: templateId,
        createdBy: userId,
        isSystemTemplate: false, // Can't delete system templates
    });

    if (!template) {
        return res.status(404).json({
            success: false,
            message: 'Template not found or you do not have permission to delete it',
        });
    }

    res.json({
        success: true,
        message: 'Template deleted successfully',
    });
});

/**
 * Save a collection as a template
 */
export const saveCollectionAsTemplate = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { collectionId } = req.params;
    const { templateName, category } = req.body;

    // Get collection
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return res.status(400).json({ success: false, message: 'Invalid collection ID' });
    }

    const collection = await Collection.findOne({
        _id: collectionId,
        createdBy: userId,
    });

    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Collection not found',
        });
    }

    if (!templateName || String(templateName || '').trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Template name is required',
        });
    }

    // Create template from collection
    const template = new CollectionTemplate({
        name: collection.name,
        description: collection.description || '',
        templateName: String(templateName || '').trim(),
        category: category || 'other',
        defaultTags: collection.tags || [],
        defaultIsPublic: collection.isPublic,
        createdBy: userId,
        isSystemTemplate: false,
        coverImage: collection.coverImage, // Store reference for potential icon
    });

    await template.save();

    const populatedTemplate = await CollectionTemplate.findById(template._id)
        .populate('createdBy', 'username displayName avatarUrl')
        .lean();

    res.status(201).json({
        success: true,
        template: populatedTemplate,
    });
});

