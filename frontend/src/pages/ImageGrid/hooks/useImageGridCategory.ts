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
  const [categoryName, setCategoryName] = useState<string | null>(null);

  // Determine category: from route param or query param (backward compatibility)
  const categoryFromQuery = searchParams.get('category');
  // If using route-based category, wait until we resolve the slug -> name mapping
  // to avoid a brief fetch of 'all' that causes flashing
  const category: string | null = categorySlug
    ? categoryName // null until resolved
    : categoryFromQuery || 'all';

  // Fetch categories to convert slug to name
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await categoryService.fetchCategories();

        // If we have a category slug, convert it to name
        if (categorySlug) {
          const name = getCategoryNameFromSlug(categorySlug, fetchedCategories);
          setCategoryName(name);
        } else {
          setCategoryName(null);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategoryName(null);
      }
    };
    loadCategories();
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
