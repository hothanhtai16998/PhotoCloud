import { readFile } from 'fs/promises';
import { join } from 'path';
import { convertGifToVideo } from './videoConverter.js';
import { logger } from './logger.js';

async function testGifConversion() {
    try {
        // Path to the test GIF
        const gifPath = join(process.cwd(), '..', 'frontend', 'src', 'assets', '9mb.gif');
        
        logger.info(`[TEST] Reading GIF from: ${gifPath}`);
        const gifBuffer = await readFile(gifPath);
        const gifSizeMB = gifBuffer.length / (1024 * 1024);
        logger.info(`[TEST] GIF size: ${gifSizeMB.toFixed(2)}MB`);
        
        const filename = `test-${Date.now()}`;
        const bucket = 'photo-app-images';
        
        logger.info(`[TEST] Starting conversion test...`);
        const startTime = Date.now();
        
        const result = await convertGifToVideo(gifBuffer, filename, bucket);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        if (result) {
            logger.info(`[TEST] ✅ Conversion successful in ${duration}s!`);
            logger.info(`[TEST] Video URL: ${result.videoUrl}`);
            logger.info(`[TEST] Thumbnail URL: ${result.thumbnailUrl}`);
            logger.info(`[TEST] Duration: ${result.duration}s`);
        } else {
            logger.warn(`[TEST] ❌ Conversion returned null`);
        }
        
        process.exit(0);
    } catch (error) {
        logger.error(`[TEST] ❌ Test failed:`, error);
        process.exit(1);
    }
}

testGifConversion();

