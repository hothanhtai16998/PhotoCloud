import type { Plugin } from 'vite';

/**
 * Vite plugin to make CSS non-render-blocking
 * Uses the "print media trick" - sets CSS links to media="print" initially,
 * then switches to "all" when loaded, preventing render blocking
 */
export function nonBlockingCSS(): Plugin {
  return {
    name: 'non-blocking-css',
    transformIndexHtml(html) {
      // Find all CSS link tags and make them non-blocking
      return html.replace(
        /<link([^>]*rel=["']stylesheet["'][^>]*)>/gi,
        (match, attrs) => {
          // Skip if already marked as non-blocking
          if (attrs.includes('data-non-blocking')) {
            return match;
          }
          
          // Add data-non-blocking attribute and set media="print"
          // Browser will download but not block rendering
          // We'll switch to "all" via script when loaded
          let newAttrs = attrs;
          
          // If media attribute already exists, preserve it temporarily
          const mediaMatch = attrs.match(/media=["']([^"']+)["']/i);
          const originalMedia = mediaMatch ? mediaMatch[1] : 'all';
          
          // Set to print media to make non-blocking
          if (mediaMatch) {
            newAttrs = attrs.replace(/media=["'][^"']+["']/i, 'media="print" data-original-media="' + originalMedia + '"');
          } else {
            newAttrs = attrs + ' media="print" data-original-media="all"';
          }
          
          // Add data-non-blocking marker
          if (!newAttrs.includes('data-non-blocking')) {
            newAttrs += ' data-non-blocking="true"';
          }
          
          // Add onload handler to switch media when loaded
          if (!newAttrs.includes('onload=')) {
            newAttrs += ' onload="this.media=this.dataset.originalMedia||\'all\'"';
          }
          
          return `<link${newAttrs}>`;
        }
      );
    },
  };
}

