import mongoose from 'mongoose';
import Collection from '../../models/Collection.js';
import Image from '../../models/Image.js';
import User from '../../models/User.js';
import { logger } from '../../utils/logger.js';

// Permission cache to reduce database queries
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if user has permission to join a collection room
 * @param {string} userId - User ID
 * @param {string} collectionId - Collection ID
 * @returns {Promise<boolean>} True if user has permission
 */
export const canJoinCollectionRoom = async (userId, collectionId) => {
  const cacheKey = `collection:${userId}:${collectionId}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.hasPermission;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return false;
    }

    const collection = await Collection.findOne({
      _id: collectionId,
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) }, // Owner
        { isPublic: true }, // Public collection
        { 'collaborators.user': new mongoose.Types.ObjectId(userId) }, // Collaborator
      ],
    }).lean();

    const hasPermission = !!collection;

    // Cache the result
    permissionCache.set(cacheKey, {
      hasPermission,
      timestamp: Date.now(),
    });

    return hasPermission;
  } catch (error) {
    logger.error(`Error checking collection room permission: ${error.message}`);
    return false;
  }
};

/**
 * Check if user has permission to join an image room
 * For now, all images are public, but we can add private image logic later
 * @param {string} userId - User ID
 * @param {string} imageId - Image ID
 * @returns {Promise<boolean>} True if user has permission
 */
export const canJoinImageRoom = async (userId, imageId) => {
  const cacheKey = `image:${userId}:${imageId}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.hasPermission;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return false;
    }

    const image = await Image.findById(imageId).lean();
    const hasPermission = !!image; // All images are public for now

    // Cache the result
    permissionCache.set(cacheKey, {
      hasPermission,
      timestamp: Date.now(),
    });

    return hasPermission;
  } catch (error) {
    logger.error(`Error checking image room permission: ${error.message}`);
    return false;
  }
};

/**
 * Check if user has permission to join a profile room
 * All profiles are public for now, but we can add private profile logic later
 * @param {string} userId - User ID requesting access
 * @param {string} targetUserId - Target user ID
 * @returns {Promise<boolean>} True if user has permission
 */
export const canJoinProfileRoom = async (userId, targetUserId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return false;
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId).lean();
    return !!targetUser; // All profiles are public for now
  } catch (error) {
    logger.error(`Error checking profile room permission: ${error.message}`);
    return false;
  }
};

/**
 * Clear permission cache for a specific resource (called when permissions change)
 * @param {string} resourceType - 'collection', 'image', or 'profile'
 * @param {string} resourceId - Resource ID
 */
export const clearPermissionCache = (resourceType, resourceId) => {
  const keysToDelete = [];
  for (const key of permissionCache.keys()) {
    if (key.includes(`${resourceType}:`) && key.includes(`:${resourceId}`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => permissionCache.delete(key));
};
