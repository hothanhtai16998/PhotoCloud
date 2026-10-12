import { useEffect } from 'react';
import { BRAND } from '@/constants/brand';

/**
 * Schema.org JSON-LD types supported.
 * Tham khảo: https://schema.org/PhotographyBusiness
 */
type SchemaType = 'Organization' | 'PhotographyBusiness' | 'Service' | 'FAQPage' | 'Article' | 'Photographer' | 'BreadcrumbList';

export interface StructuredDataOptions {
  type: SchemaType;
  data: Record<string, unknown>;
  /** Optional id — dùng để dedupe khi nhiều schema cùng loại. */
  id?: string;
}

/**
 * useStructuredData — inject Schema.org JSON-LD vào <head>.
 * Tự cleanup khi unmount.
 *
 * @example
 *   useStructuredData({
 *     type: 'FAQPage',
 *     data: { mainEntity: [{ '@type': 'Question', name: '...', acceptedAnswer: {...} }] }
 *   });
 */
export function useStructuredData(options: StructuredDataOptions): void {
  const { type, data, id = `schema-${type}` } = options;

  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': type,
      ...data,
    });

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [type, data, id]);
}

/** Helpers cho từng loại schema phổ biến. */
export const schemaHelpers = {
  organization(): StructuredDataOptions {
    return {
      type: 'Organization',
      id: 'org',
      data: {
        name: BRAND.nameLong,
        url: BRAND.siteUrl,
        logo: `${BRAND.siteUrl}/logo.svg`,
        description: BRAND.metaDescription,
        sameAs: [
          BRAND.social?.instagram,
          BRAND.social?.facebook,
          BRAND.social?.tiktok,
        ].filter(Boolean),
      },
    };
  },
  photographyBusiness(): StructuredDataOptions {
    return {
      type: 'PhotographyBusiness',
      id: 'business',
      data: {
        name: BRAND.nameLong,
        image: `${BRAND.siteUrl}/og-image.svg`,
        url: BRAND.siteUrl,
        telephone: BRAND.phone,
        email: BRAND.email,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Ho Chi Minh City',
          addressCountry: 'VN',
        },
        priceRange: '₫₫',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: BRAND.stats?.averageRating ?? 4.9,
          reviewCount: BRAND.stats?.bookingsCompleted ?? 500,
        },
      },
    };
  },
  faqPage(items: Array<{ q: string; a: string }>): StructuredDataOptions {
    return {
      type: 'FAQPage',
      id: 'faq',
      data: {
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    };
  },
  article(opts: { title: string; description: string; url: string; image?: string; datePublished: string }): StructuredDataOptions {
    return {
      type: 'Article',
      id: `article-${opts.url}`,
      data: {
        headline: opts.title,
        description: opts.description,
        image: opts.image ?? `${BRAND.siteUrl}/og-image.svg`,
        datePublished: opts.datePublished,
        author: { '@type': 'Organization', name: BRAND.nameLong },
        publisher: {
          '@type': 'Organization',
          name: BRAND.nameLong,
          logo: { '@type': 'ImageObject', url: `${BRAND.siteUrl}/logo.png` },
        },
        mainEntityOfPage: opts.url,
      },
    };
  },
  service(opts: { name: string; description: string; price?: number }): StructuredDataOptions {
    return {
      type: 'Service',
      id: `service-${opts.name}`,
      data: {
        name: opts.name,
        description: opts.description,
        provider: { '@type': 'PhotographyBusiness', name: BRAND.nameLong },
        ...(opts.price && {
          offers: {
            '@type': 'Offer',
            price: opts.price,
            priceCurrency: 'VND',
          },
        }),
      },
    };
  },
};
