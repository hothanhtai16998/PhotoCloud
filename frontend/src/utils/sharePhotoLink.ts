import { shareService } from './shareService';

export async function sharePhotoLink(data: ShareData): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      await navigator.share(data);
      return 'shared';
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    // If native sharing is unavailable or denied, copying still gives a usable link.
  }
  return await shareService.copyToClipboard(data.url || '') ? 'copied' : 'failed';
}
