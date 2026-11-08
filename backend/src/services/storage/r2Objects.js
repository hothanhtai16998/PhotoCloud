import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import { r2Client } from '../../config/r2Client.js';

// Get bucket name
export const getBucketName = () => env.R2_BUCKET_NAME;

// Get public URL base
const getPublicUrlBase = () => {
  // R2: Use custom domain or R2.dev subdomain
  return env.R2_PUBLIC_URL || `https://pub-${env.R2_ACCOUNT_ID}.r2.dev`;
};

// Get public URL for uploaded file
// Note: R2 custom domains serve files directly from bucket root, so we keep the full key path
const getPublicUrl = (key) => {
  const publicUrlBase = getPublicUrlBase();

  // For R2 storage, include the full key
  // The key already includes the folder structure (e.g., "photo-app-images/filename.webp")
  return `${publicUrlBase}/${key}`;
};

export const uploadToR2 = async (buffer, key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable', // Cache for 1 year, immutable for better performance
    });

    await r2Client.send(command);

    // Return public URL (handles custom domain bucket name stripping)
    return getPublicUrl(key);
  } catch (error) {
    // Provide more detailed error information
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.Code || error.code || 'UNKNOWN';
    console.error('R2 Upload Error:', {
      code: errorCode,
      message: errorMessage,
      bucket: getBucketName(),
      key: key,
    });
    throw new Error(`Failed to upload to R2 (${errorCode}): ${errorMessage}`);
  }
};

export const deleteImageFromR2 = async (
  publicId,
  folder = 'photo-app-images'
) => {
  try {
    // Use prefix-based deletion so we don't have to keep this in sync
    // with all the different formats/sizes we generate (webp, avif, original, etc.)
    const prefix = `${folder}/${publicId}`;
    const keysToDelete = [];

    let continuationToken = undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: getBucketName(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await r2Client.send(listCommand);
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            keysToDelete.push(obj.Key);
          }
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    if (!keysToDelete.length) {
      return;
    }

    // Delete all matching objects in parallel
    await Promise.all(
      keysToDelete.map((key) => {
        const command = new DeleteObjectCommand({
          Bucket: getBucketName(),
          Key: key,
        });
        return r2Client.send(command);
      })
    );
  } catch (error) {
    // Log error but don't throw - deletion is not critical
    console.error(`Failed to delete image from R2: ${error.message}`);
  }
};

export const deleteAvatarFromR2 = async (publicId) => {
  try {
    const extension = 'webp';
    const key = `${publicId}.${extension}`;
    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });
    await r2Client.send(command);
  } catch (error) {
    // Log error but don't throw - deletion is not critical
    console.error(`Failed to delete avatar from R2: ${error.message}`);
  }
};

export const getImageFromR2 = async (imageUrl) => {
  try {
    // Extract R2 key from URL
    // Handle both full URLs and keys
    let key;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Extract key from URL
      // Format: https://custom-domain.com/bucket/key or https://pub-account-id.r2.dev/bucket/key
      const url = new URL(imageUrl);
      key = url.pathname.startsWith('/')
        ? url.pathname.substring(1)
        : url.pathname;
    } else {
      key = imageUrl;
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const response = await r2Client.send(command);
    return {
      Body: response.Body,
      ContentType: response.ContentType || 'image/webp',
      ContentLength: response.ContentLength,
    };
  } catch (error) {
    console.error('R2 Get Error:', {
      message: error.message,
      code: error.Code || error.code,
      imageUrl,
    });
    throw new Error(`Failed to get image from R2: ${error.message}`);
  }
};

export const generatePresignedUploadUrl = async (
  key,
  contentType,
  expiresIn = 300
) => {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  return getSignedUrl(r2Client, command, { expiresIn });
};

export async function getObjectFromR2(key) {
  const params = {
    Bucket: getBucketName(),
    Key: key,
  };
  const command = new GetObjectCommand(params);
  return await r2Client.send(command);
}

export async function deleteObjectByKey(key) {
  const params = {
    Bucket: getBucketName(),
    Key: key,
  };
  const command = new DeleteObjectCommand(params);
  return await r2Client.send(command);
}
