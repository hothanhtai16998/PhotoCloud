/**
 * ShareService - Utility functions for sharing images
 * Provides functions to generate share links and embed codes
 */

export interface ShareData {
  url: string;
  title: string;
  imageUrl: string;
}

/**
 * Generate share links for different platforms
 */
export const shareService = {
  /**
   * Generate Facebook share URL
   */
  generateFacebookShareUrl: (shareData: ShareData): string => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
  },

  /**
   * Generate Twitter share URL
   */
  generateTwitterShareUrl: (shareData: ShareData): string => {
    const text = shareData.title || 'Check out this photo';
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareData.url)}`;
  },

  /**
   * Generate Pinterest share URL
   */
  generatePinterestShareUrl: (shareData: ShareData): string => {
    return `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareData.url)}&media=${encodeURIComponent(shareData.imageUrl)}&description=${encodeURIComponent(shareData.title || 'Photo')}`;
  },

  /**
   * Generate email share URL
   */
  generateEmailShareUrl: (shareData: ShareData): string => {
    const subject = shareData.title || 'Photo';
    const body = `${shareData.title || 'Check out this photo'}\n\n${shareData.url}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },

  /**
   * Generate embed code for an image
   * @param imageUrl - URL of the image to embed
   * @param width - Optional width (default: 800)
   * @param height - Optional height (default: auto)
   * @param alt - Optional alt text
   * @returns HTML embed code
   */
  generateEmbedCode: (
    imageUrl: string,
    options?: {
      width?: number;
      height?: number;
      alt?: string;
      linkUrl?: string;
    }
  ): string => {
    const width = options?.width || 800;
    const height = options?.height || 'auto';
    const alt = options?.alt || 'Photo';
    const linkUrl = options?.linkUrl;

    if (linkUrl) {
      // Embed with link
      return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${imageUrl}" alt="${alt}" width="${width}" ${height !== 'auto' ? `height="${height}"` : ''} />
</a>`;
    } else {
      // Simple image embed
      return `<img src="${imageUrl}" alt="${alt}" width="${width}" ${height !== 'auto' ? `height="${height}"` : ''} />`;
    }
  },

  /**
   * Copy text to clipboard
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          return successful;
        } catch (_err) {
          document.body.removeChild(textArea);
          return false;
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  },
};

