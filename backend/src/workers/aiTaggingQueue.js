/**
 * AI Tagging Background Job Queue
 * Processes AI tagging asynchronously after image upload
 */

import { logger } from '../utils/logger.js';
import { generateAITags, mergeTags } from '../utils/aiTaggingService.js';
import { translateTags, getTargetLanguage } from '../utils/tagTranslator.js';
import Image from '../models/Image.js';
import { getObjectFromR2 } from '../libs/s3.js';
import { streamToBuffer } from '../utils/imageHelpers.js';

// Queue for AI tagging jobs
const aiTaggingQueue = [];
let activeAITaggingJobs = 0;
const MAX_CONCURRENT_AI_JOBS = 2; // Limit concurrent AI API calls

/**
 * Add AI tagging job to queue
 * @param {Object} jobData - Job data with imageId, buffer, mimetype, userTags
 */
export function addAITaggingJob(jobData) {
    aiTaggingQueue.push(jobData);
    processAITaggingQueue();
    return { enqueued: true, queueLength: aiTaggingQueue.length };
}

/**
 * Process AI tagging queue
 */
async function processAITaggingQueue() {
    if (activeAITaggingJobs >= MAX_CONCURRENT_AI_JOBS || aiTaggingQueue.length === 0) {
        return;
    }

    const job = aiTaggingQueue.shift();
    activeAITaggingJobs++;

    try {
        await processAITaggingJob(job);
    } catch (err) {
        logger.error('[AI Tagging Queue] Job failed', {
            error: err?.message,
            imageId: job?.imageId,
        });
    } finally {
        activeAITaggingJobs--;
        setImmediate(processAITaggingQueue);
    }
}

/**
 * Process a single AI tagging job
 * @param {Object} job - Job data
 */
async function processAITaggingJob(job) {
    const { imageId, buffer, mimetype, userTags } = job;
    const startTime = Date.now();

    try {
        logger.info(`[AI Tagging Queue] Processing AI tags for image ${imageId}`);

        // Generate AI tags (in English from Google Vision API)
        const aiTagsEnglish = await generateAITags(buffer, mimetype);
        
        if (aiTagsEnglish.length === 0) {
            logger.info(`[AI Tagging Queue] No AI tags generated for image ${imageId}`);
            // Update image with user tags only
            await Image.findByIdAndUpdate(imageId, {
                $set: { tags: userTags || [] },
            }, { new: true });
            return;
        }

        // Get target language (default: Vietnamese)
        const targetLanguage = await getTargetLanguage();
        
        // Automatically translate English tags to Vietnamese (or target language)
        // Uses MyMemory API (free) or Google API (if configured)
        const aiTagsTranslated = await translateTags(aiTagsEnglish, targetLanguage);

        // Merge with user tags (use translated tags for display)
        const mergedTags = mergeTags(userTags || [], aiTagsTranslated);

        // Store translated tags (Vietnamese) - automatically translated!
        await Image.findByIdAndUpdate(imageId, {
            $set: { 
                tags: mergedTags, // Vietnamese tags (automatically translated)
            },
        }, { new: true });

        const duration = Date.now() - startTime;
        logger.info(`[AI Tagging Queue] ✅ Updated image ${imageId} with ${mergedTags.length} Vietnamese tags (${aiTagsEnglish.length} English → ${aiTagsTranslated.length} ${targetLanguage}) in ${duration}ms`);

    } catch (error) {
        logger.error(`[AI Tagging Queue] Failed to process AI tagging for image ${imageId}:`, error);
        // Don't throw - AI tagging is optional, image upload already succeeded
    }
}

/**
 * Get queue status
 */
export function getAITaggingQueueStatus() {
    return {
        queueLength: aiTaggingQueue.length,
        activeJobs: activeAITaggingJobs,
        maxConcurrent: MAX_CONCURRENT_AI_JOBS,
    };
}

