import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '../../utils/logger.js';
import { uploadToR2 } from '../storage/r2Objects.js';
import { runMediaCommand } from './mediaCommand.js';
import { withMediaTempDirectory } from './mediaTempFiles.js';

const THUMBNAIL_FILTER =
  "scale='min(500,iw)':'min(500,ih)':force_original_aspect_ratio=decrease";

async function toolAvailable(tool) {
  try {
    await runMediaCommand(tool, ['-version']);
    return true;
  } catch {
    logger.warn(`${tool} not available, skipping optional video processing`);
    return false;
  }
}

async function extractThumbnail(input, output) {
  await runMediaCommand('ffmpeg', [
    '-y',
    '-i',
    input,
    '-vf',
    THUMBNAIL_FILTER,
    '-frames:v',
    '1',
    output,
  ]);
}

async function probeDuration(input) {
  const { stdout } = await runMediaCommand('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    input,
  ]);
  return parseFloat(stdout.trim());
}

/** Optional GIF conversion; a failure returns null so upload can retain the original GIF. */
export async function convertGifToVideo(
  gifBuffer,
  filename,
  bucket = 'photo-app-images'
) {
  try {
    if (!(await toolAvailable('ffmpeg'))) return null;
    const sizeMB = gifBuffer.length / (1024 * 1024);
    if (sizeMB < 2 || sizeMB > 50) return null;
    return await withMediaTempDirectory(async (directory) => {
      const input = join(directory, 'input.gif');
      const video = join(directory, 'output.mp4');
      const thumbnail = join(directory, 'thumbnail.jpg');
      await writeFile(input, gifBuffer);
      await runMediaCommand('ffmpeg', [
        '-y',
        '-i',
        input,
        '-vf',
        "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,fps=15",
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        video,
      ]);
      await extractThumbnail(input, thumbnail);
      const duration = (await probeDuration(video)) || 0;
      const [videoBuffer, thumbnailBuffer] = await Promise.all([
        readFile(video),
        readFile(thumbnail).catch(() => null),
      ]);
      const [videoUrl, thumbnailUrl] = await Promise.all([
        uploadToR2(videoBuffer, `${bucket}/${filename}.mp4`, 'video/mp4'),
        thumbnailBuffer
          ? uploadToR2(
              thumbnailBuffer,
              `${bucket}/${filename}-thumb.jpg`,
              'image/jpeg'
            )
          : null,
      ]);
      return { videoUrl, thumbnailUrl: thumbnailUrl || videoUrl, duration };
    });
  } catch (error) {
    logger.error(
      `[VIDEO CONVERTER] Error converting GIF to video for ${filename}:`,
      error
    );
    return null;
  }
}

/** Optional thumbnail; caller retains its video-URL fallback when unavailable. */
export async function generateVideoThumbnail(
  videoBuffer,
  filename,
  bucket = 'photo-app-images'
) {
  try {
    if (!(await toolAvailable('ffmpeg'))) return null;
    return await withMediaTempDirectory(async (directory) => {
      const input = join(directory, 'input.mp4');
      const thumbnail = join(directory, 'thumbnail.jpg');
      await writeFile(input, videoBuffer);
      await extractThumbnail(input, thumbnail);
      return uploadToR2(
        await readFile(thumbnail),
        `${bucket}/${filename}-thumb.jpg`,
        'image/jpeg'
      );
    });
  } catch (error) {
    logger.error('Error generating video thumbnail:', error.message);
    return null;
  }
}

export async function getVideoDuration(videoBuffer) {
  try {
    if (!(await toolAvailable('ffprobe'))) return null;
    return await withMediaTempDirectory(async (directory) => {
      const input = join(directory, 'input.mp4');
      await writeFile(input, videoBuffer);
      const duration = await probeDuration(input);
      return Number.isNaN(duration) ? null : duration;
    });
  } catch (error) {
    logger.error('Error getting video duration:', error.message);
    return null;
  }
}
