import { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { categoryService } from '@/services/categoryService';
import { getCategoryNameFromSlug } from '@/utils/categorySlug';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';

export function useImageGridCategory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const actualLocation = useContext(ActualLocationContext);
  const actualPathname = actualLocation?.pathname;

  // Get category slug from route params (for /t/:categorySlug)
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [resolved, setResolved] = useState<{slug: string; name: string | null} | null>(null);

  // Determine category: from route param or query param (backward compatibility)
  const categoryFromQuery = searchParams.get('category');
  // If using route-based category, wait until we resolve the slug -> name mapping
  // to avoid a brief fetch of 'all' that causes flashing
  const category: string | null = categorySlug
    ? (resolved?.slug === categorySlug ? resolved.name : null)
    : categoryFromQuery || 'all';

  useEffect(() => {
    if (!categorySlug) return;
    let active = true;
    void categoryService.fetchCategories().then(categories => {
      if (active) setResolved({slug: categorySlug, name: getCategoryNameFromSlug(categorySlug, categories)});
    }).catch(error => {
      if (active) { console.error(error); setResolved({slug: categorySlug, name: null}); }
    });
    return () => { active = false; };
  }, [categorySlug]);

  // Clean up query params if using route-based category (backward compatibility)
  useEffect(() => {
    const isOnHomeRoute = !actualPathname || actualPathname === '/';
    if (!isOnHomeRoute) return;

    // Only clean up query params if we're on homepage and category is 'all'
    if (category === 'all' && categoryFromQuery) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('category');
      const queryString = newSearchParams.toString();
      const nextPath = queryString ? `?${queryString}` : '/';
      navigate(nextPath, { replace: true });
    }
  }, [category, categoryFromQuery, searchParams, navigate, actualPathname]);

  return {
    category,
    categorySlug,
  };
}

