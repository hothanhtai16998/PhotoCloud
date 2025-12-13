import { useEffect } from 'react';

export function useMetaTags(siteDescription?: string) {
  useEffect(() => {
    if (!siteDescription) return;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', siteDescription);
    }
  }, [siteDescription]);
}

