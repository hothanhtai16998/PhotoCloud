import api from '@/lib/axios';
import type { Image } from '@/types/image';

export type DownloadSize = 'small' | 'medium' | 'large' | 'original';

/**
 * Extract filename from response headers or generate from image data
 */
function extractFileName(response: { headers: Record<string, string> }, image: Image): string {
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (fileNameMatch && fileNameMatch[1]) {
            return fileNameMatch[1];
        }
    }

    // Fallback: generate filename from image title
    const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
    return `${sanitizedTitle}.${urlExtension}`;
}

/**
 * Trigger browser download with blob URL
 */
function triggerDownload(blobUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Download an image by ID
 * Uses backend proxy to avoid CORS issues
 * Defaults to 'original' size for best resolution downloads
 */
export async function downloadImage(image: Image, size?: DownloadSize): Promise<void> {
    if (!image._id) {
        throw new Error('Lỗi khi lấy ID của ảnh');
    }

    // Default to 'original' for best resolution (imageUrl) instead of 'medium' (regularUrl)
    const downloadSize = size || 'original';
    const url = `/images/${image._id}/download?size=${downloadSize}`;

    const response = await api.get(url, {
        responseType: 'blob',
        withCredentials: true,
    });

    const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'image/webp'
    });
    const blobUrl = URL.createObjectURL(blob);

    const fileName = extractFileName(response as { headers: Record<string, string> }, image);
    triggerDownload(blobUrl, fileName);

    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);
}

/**
 * Download image with error handling (returns success/failure)
 */
export async function downloadImageSafe(
    image: Image,
    size?: DownloadSize
): Promise<{ success: boolean; error?: Error }> {
    try {
        await downloadImage(image, size);
        return { success: true };
    } catch (error) {
        console.error('Failed to download image:', error);
        return { success: false, error: error as Error };
    }
}

