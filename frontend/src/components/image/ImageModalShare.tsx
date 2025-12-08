import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Share2, Mail, Link as LinkIcon, Code, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateImageSlug } from '@/lib/utils';
import { shareService } from '@/utils/shareService';
import type { Image } from '@/types/image';
import { t } from '@/i18n';

interface ImageModalShareProps {
  image: Image;
}

export const ImageModalShare = memo(({ image }: ImageModalShareProps) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [positionBelow, setPositionBelow] = useState(false);
  const [embedWidth, setEmbedWidth] = useState(800);
  const [embedHeight, setEmbedHeight] = useState<'auto' | number>('auto');
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const embedCodeRef = useRef<HTMLTextAreaElement>(null);

  // Check available space and position menu accordingly
  useEffect(() => {
    if (!showShareMenu || !shareButtonRef.current) return;

    const checkPosition = () => {
      const buttonRect = shareButtonRef.current?.getBoundingClientRect();

      if (buttonRect) {
        const spaceAbove = buttonRect.top;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        // Estimate menu height (usually around 300-350px)
        const estimatedMenuHeight = 350;
        const requiredSpace = estimatedMenuHeight + 20; // 20px for gap

        // If not enough space above but enough below, position below
        if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
          setPositionBelow(true);
        } else {
          setPositionBelow(false);
        }
      }
    };

    // Check position immediately and after menu renders
    checkPosition();
    const timer = setTimeout(checkPosition, 50);
    const timer2 = setTimeout(checkPosition, 200); // Check again after animation

    // Also check on scroll/resize
    window.addEventListener('scroll', checkPosition, true);
    window.addEventListener('resize', checkPosition);

    // Use ResizeObserver for more accurate detection
    let resizeObserver: ResizeObserver | null = null;
    if (shareMenuRef.current) {
      resizeObserver = new ResizeObserver(checkPosition);
      resizeObserver.observe(shareMenuRef.current);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('scroll', checkPosition, true);
      window.removeEventListener('resize', checkPosition);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [showShareMenu]);

  // Close share menu when clicking outside
  useEffect(() => {
    if (!showShareMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        shareButtonRef.current &&
        !shareButtonRef.current.contains(target) &&
        !target.closest('.share-menu')
      ) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  // Get share URL and text
  const getShareData = useCallback(() => {
    const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
    // Use /photos/:slug for better SEO and sharing (instead of /?image=slug)
    const shareUrl = `${window.location.origin}/photos/${slug}`;
    const shareText = `Check out this photo: ${image.imageTitle || 'Untitled'}`;
    return { shareUrl, shareText };
  }, [image._id, image.imageTitle]);

  // Handle share to Facebook
  // Note: Facebook requires Open Graph meta tags on the shared page
  // The shared URL will be scraped for og:image, og:title, og:description
  const handleShareFacebook = useCallback(() => {
    const { shareUrl } = getShareData();
    // Facebook sharer only accepts URL - it will scrape the page for OG tags
    // The page at shareUrl needs to have proper Open Graph meta tags
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  }, [getShareData]);

  // Handle share to Pinterest
  const handleSharePinterest = useCallback(() => {
    const { shareUrl } = getShareData();
    const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(image.imageUrl)}&description=${encodeURIComponent(image.imageTitle || 'Photo')}`;
    window.open(pinterestUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  }, [getShareData, image.imageUrl, image.imageTitle]);

  // Handle share to Twitter
  // Note: Twitter requires Twitter Card meta tags on the shared page
  // The shared URL will be scraped for twitter:card, twitter:image, etc.
  const handleShareTwitter = useCallback(() => {
    const { shareUrl, shareText } = getShareData();
    // Twitter intent accepts text and URL - it will scrape the page for Twitter Card tags
    // The page at shareUrl needs to have proper Twitter Card meta tags
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  }, [getShareData]);

  // Handle share via Email
  const handleShareEmail = useCallback(() => {
    const { shareUrl, shareText } = getShareData();
    const emailUrl = `mailto:?subject=${encodeURIComponent(image.imageTitle || 'Photo')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.location.href = emailUrl;
    setShowShareMenu(false);
  }, [getShareData, image.imageTitle]);

  // Handle share via Web Share API
  const handleShareVia = useCallback(async () => {
    const { shareUrl, shareText } = getShareData();

    if (navigator.share) {
      try {
        await navigator.share({
          title: image.imageTitle || 'Photo',
          text: shareText,
          url: shareUrl,
        });
        toast.success(t('share.shared'));
        setShowShareMenu(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          toast.error(t('share.shareFailed'));
        }
      }
    } else {
      toast.error(t('share.browserNotSupported'));
    }
  }, [getShareData, image.imageTitle]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    const { shareUrl } = getShareData();
    try {
      await shareService.copyToClipboard(shareUrl);
      toast.success(t('share.linkCopied'));
      setShowShareMenu(false);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error(t('share.linkCopyFailed'));
    }
  }, [getShareData]);

  // Handle embed code
  const handleEmbedCode = useCallback(() => {
    setShowShareMenu(false);
    setShowEmbedModal(true);
  }, []);

  // Generate embed code
  const embedCode = useMemo(() => {
    const { shareUrl } = getShareData();
    const imageUrl = image.regularUrl || image.smallUrl || image.imageUrl;
    return shareService.generateEmbedCode(imageUrl, {
      width: embedWidth,
      height: embedHeight === 'auto' ? undefined : embedHeight,
      alt: image.imageTitle || 'Photo',
      linkUrl: shareUrl,
    });
  }, [image, embedWidth, embedHeight, getShareData]);

  // Copy embed code
  const handleCopyEmbedCode = useCallback(async () => {
    try {
      const success = await shareService.copyToClipboard(embedCode);
      if (success) {
        toast.success(t('share.embedCopied'));
        // Select the textarea text for visual feedback
        if (embedCodeRef.current) {
          embedCodeRef.current.select();
        }
      } else {
        toast.error(t('share.embedCopyFailed'));
      }
    } catch (error) {
      console.error('Failed to copy embed code:', error);
      toast.error(t('share.embedCopyFailed'));
    }
  }, [embedCode]);

  // Handle share button click (opens menu)
  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  }, [showShareMenu]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={shareButtonRef}
        className={`modal-footer-btn modal-share-btn ${showShareMenu ? 'active' : ''}`}
        onClick={handleShare}
        title={`${t('share.share')} (Ctrl/Cmd + S)`}
        aria-label={t('share.sharePhoto')}
      >
        <Share2 size={18} />
        <span>{t('share.share')}</span>
        <kbd className="keyboard-hint">⌘S</kbd>
      </button>
      {/* Share Menu */}
      {showShareMenu && (
        <div
          ref={shareMenuRef}
          className={`share-menu-wrapper ${positionBelow ? 'position-below' : ''}`}
        >
          <div className="share-menu">
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleShareFacebook();
              }}
            >
              <div className="share-menu-icon facebook-icon">f</div>
              <span>Facebook</span>
            </button>
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleSharePinterest();
              }}
            >
              <div className="share-menu-icon pinterest-icon">P</div>
              <span>Pinterest</span>
            </button>
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleShareTwitter();
              }}
            >
              <div className="share-menu-icon twitter-icon">X</div>
              <span>Twitter</span>
            </button>
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleShareEmail();
              }}
            >
              <Mail size={20} className="share-menu-icon-svg" />
              <span>Email</span>
            </button>
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleShareVia();
              }}
            >
              <Share2 size={20} className="share-menu-icon-svg" />
              <span>Share via...</span>
            </button>
            <div className="share-menu-divider" />
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink();
              }}
            >
              <LinkIcon size={20} className="share-menu-icon-svg" />
              <span>Copy link</span>
            </button>
            <button
              className="share-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                handleEmbedCode();
              }}
            >
              <Code size={20} className="share-menu-icon-svg" />
              <span>Embed code</span>
            </button>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedModal && (
        <div
          className="embed-modal-overlay"
          onClick={() => setShowEmbedModal(false)}
        >
          <div
            className="embed-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="embed-modal-header">
              <h3>Embed Code</h3>
              <button
                className="embed-modal-close"
                onClick={() => setShowEmbedModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="embed-modal-content">
              <div className="embed-options">
                <div className="embed-option">
                  <label htmlFor="embed-width">Width (px)</label>
                  <input
                    id="embed-width"
                    type="number"
                    min="100"
                    max="2000"
                    value={embedWidth}
                    onChange={(e) => setEmbedWidth(parseInt(e.target.value) || 800)}
                  />
                </div>
                <div className="embed-option">
                  <label htmlFor="embed-height">Height</label>
                  <select
                    id="embed-height"
                    value={embedHeight === 'auto' ? 'auto' : embedHeight}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmbedHeight(value === 'auto' ? 'auto' : parseInt(value) || 'auto');
                    }}
                  >
                    <option value="auto">Auto</option>
                    <option value="400">400px</option>
                    <option value="600">600px</option>
                    <option value="800">800px</option>
                    <option value="1000">1000px</option>
                  </select>
                </div>
              </div>
              <div className="embed-code-container">
                <label htmlFor="embed-code-text">HTML Code</label>
                <textarea
                  id="embed-code-text"
                  ref={embedCodeRef}
                  className="embed-code-textarea"
                  value={embedCode}
                  readOnly
                  rows={6}
                  onClick={(e) => {
                    (e.target as HTMLTextAreaElement).select();
                  }}
                />
              </div>
              <div className="embed-modal-actions">
                <button
                  className="embed-copy-btn"
                  onClick={handleCopyEmbedCode}
                >
                  <LinkIcon size={16} />
                  Copy code
                </button>
                <button
                  className="embed-close-btn"
                  onClick={() => setShowEmbedModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ImageModalShare.displayName = 'ImageModalShare';

