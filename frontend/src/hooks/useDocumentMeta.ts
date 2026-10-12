import { useEffect } from 'react';
import { BRAND } from '@/constants/brand';

interface DocumentMetaOptions {
  /** Page title segment (ví dụ: 'Đặt lịch'). Kết hợp với `BRAND.nameLong` thành "PhotoCloud Studio — Đặt lịch". */
  title?: string;
  /** Meta description tuỳ trang. Mặc định dùng `BRAND.metaDescription`. */
  description?: string;
  /** Open Graph image (absolute URL hoặc path bắt đầu bằng /). */
  ogImage?: string;
  /** No-index cho route này (admin, private...). Mặc định false. */
  noIndex?: boolean;
}

const META_SELECTOR = 'meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[property="og:image"], meta[name="twitter:title"], meta[name="twitter:description"], meta[name="twitter:image"], meta[name="robots"]';

function upsertMeta(selector: string, attribute: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const [attr, value] = selector.replace('meta[', '').replace(']', '').split('=');
    el.setAttribute(attr, value.replace(/['"]/g, ''));
    document.head.appendChild(el);
  }
  el.setAttribute(attribute, content);
}

function setTitle(title?: string) {
  const fullTitle = title ? `${BRAND.nameLong} — ${title}` : `${BRAND.nameLong} — ${BRAND.tagline}`;
  if (document.title !== fullTitle) document.title = fullTitle;
}

/**
 * useDocumentMeta — set per-route title + description + OG.
 * Mọi page-level component nên gọi hook này ở đầu để SEO đồng nhất.
 *
 * @example
 *   useDocumentMeta({ title: 'Đặt lịch' });
 *   useDocumentMeta({ title: 'Admin', noIndex: true });
 */
export function useDocumentMeta(options: DocumentMetaOptions = {}): void {
  const { title, description, ogImage, noIndex = false } = options;

  useEffect(() => {
    setTitle(title);

    if (description) {
      upsertMeta('meta[name="description"]', 'content', description);
      upsertMeta('meta[property="og:description"]', 'content', description);
      upsertMeta('meta[name="twitter:description"]', 'content', description);
    }

    if (ogImage) {
      upsertMeta('meta[property="og:image"]', 'content', ogImage);
      upsertMeta('meta[name="twitter:image"]', 'content', ogImage);
    }

    if (title) {
      const fullTitle = `${BRAND.nameLong} — ${title}`;
      upsertMeta('meta[property="og:title"]', 'content', fullTitle);
      upsertMeta('meta[name="twitter:title"]', 'content', fullTitle);
    }

    if (noIndex) {
      upsertMeta('meta[name="robots"]', 'content', 'noindex, nofollow');
    } else {
      upsertMeta('meta[name="robots"]', 'content', 'index, follow');
    }

    // Cleanup khi unmount: không cần (document sẽ re-render route mới).
    return () => {
      // Reset description về default nếu route không specify
      if (!description) {
        upsertMeta('meta[name="description"]', 'content', BRAND.metaDescription);
      }
    };
  }, [title, description, ogImage, noIndex]);
}
